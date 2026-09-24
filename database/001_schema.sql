-- Executar no SQL Editor de um projeto Supabase NOVO. Não requer PostgreSQL local.
BEGIN;
CREATE TABLE public.profiles (
 uid text PRIMARY KEY CHECK(length(uid) BETWEEN 1 AND 128),
 email text NOT NULL DEFAULT '', name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
 id text PRIMARY KEY CHECK(id ~ '^[A-Za-z0-9_-]{1,80}$'),
 name text NOT NULL, category text NOT NULL, description text NOT NULL DEFAULT '',
 image text NOT NULL, price_cents integer NOT NULL CHECK(price_cents>0),
 stock integer NOT NULL DEFAULT 0 CHECK(stock>=0), active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.cart_items (
 uid text REFERENCES public.profiles(uid) ON DELETE CASCADE,
 product_id text REFERENCES public.products(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 PRIMARY KEY(uid,product_id)
);
CREATE TABLE public.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uid text NOT NULL REFERENCES public.profiles(uid),
 idempotency_key uuid NOT NULL, request_hash text NOT NULL,
 address jsonb NOT NULL, subtotal_cents integer NOT NULL CHECK(subtotal_cents>0),
 shipping_cents integer NOT NULL CHECK(shipping_cents>=0),
 total_cents integer NOT NULL CHECK(total_cents=subtotal_cents+shipping_cents),
 status text NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','paid','shipped','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(uid,idempotency_key)
);
CREATE INDEX orders_user_date ON public.orders(uid,created_at DESC);
CREATE TABLE public.order_items (
 order_id uuid REFERENCES public.orders(id), product_id text REFERENCES public.products(id),
 name text NOT NULL, image text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 price_cents integer NOT NULL CHECK(price_cents>0), PRIMARY KEY(order_id,product_id)
);
-- O navegador não acessa a Data API. Apenas PHP, usando chave secreta do servidor.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.products,public.cart_items,public.orders,public.order_items FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.products,public.cart_items,public.orders,public.order_items TO service_role;

CREATE FUNCTION public.set_cart_item(p_uid text,p_product text,p_quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE available integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid,0));
 IF p_quantity IS NULL OR p_quantity<0 OR p_quantity>100 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
 IF p_quantity=0 THEN DELETE FROM public.cart_items WHERE uid=p_uid AND product_id=p_product; RETURN; END IF;
 SELECT stock INTO available FROM public.products WHERE id=p_product AND active;
 IF available IS NULL THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
 IF p_quantity>available THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cart_items WHERE uid=p_uid AND product_id=p_product)
 AND (SELECT count(*) FROM public.cart_items WHERE uid=p_uid)>=50 THEN RAISE EXCEPTION 'CART_LIMIT'; END IF;
 INSERT INTO public.cart_items(uid,product_id,quantity) VALUES(p_uid,p_product,p_quantity)
 ON CONFLICT(uid,product_id) DO UPDATE SET quantity=excluded.quantity;
END $$;

CREATE FUNCTION public.checkout(p_uid text,p_key uuid,p_hash text,p_address jsonb,p_shipping integer,p_expected integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing public.orders; rec record; subtotal bigint:=0; order_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid,0));
 SELECT * INTO existing FROM public.orders WHERE uid=p_uid AND idempotency_key=p_key;
 IF FOUND THEN
  IF existing.request_hash<>p_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN to_jsonb(existing);
 END IF;
 IF p_shipping IS NULL OR p_shipping<0 OR p_expected IS NULL THEN RAISE EXCEPTION 'INVALID_TOTAL'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cart_items WHERE uid=p_uid) THEN RAISE EXCEPTION 'EMPTY_CART'; END IF;
 -- Ordem estável evita deadlock entre compras de usuários diferentes.
 FOR rec IN SELECT p.*,c.quantity FROM public.cart_items c JOIN public.products p ON p.id=c.product_id
  WHERE c.uid=p_uid ORDER BY p.id FOR UPDATE OF p LOOP
  IF NOT rec.active THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
  IF rec.stock<rec.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
  subtotal:=subtotal+rec.price_cents::bigint*rec.quantity;
 END LOOP;
 IF subtotal+p_shipping<>p_expected THEN RAISE EXCEPTION 'PRICE_CHANGED'; END IF;
 INSERT INTO public.orders(uid,idempotency_key,request_hash,address,subtotal_cents,shipping_cents,total_cents)
 VALUES(p_uid,p_key,p_hash,p_address,subtotal,p_shipping,subtotal+p_shipping) RETURNING id INTO order_id;
 INSERT INTO public.order_items(order_id,product_id,name,image,quantity,price_cents)
 SELECT order_id,p.id,p.name,p.image,c.quantity,p.price_cents FROM public.cart_items c JOIN public.products p ON p.id=c.product_id WHERE c.uid=p_uid;
 UPDATE public.products p SET stock=p.stock-c.quantity FROM public.cart_items c WHERE c.uid=p_uid AND c.product_id=p.id;
 DELETE FROM public.cart_items WHERE uid=p_uid;
 SELECT * INTO existing FROM public.orders WHERE id=order_id;
 RETURN to_jsonb(existing);
END $$;

-- Operação administrativa: somente CLI PHP/SQL Editor. Nunca exposta como rota pública.
CREATE FUNCTION public.transition_order(p_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_status text; rec record;
BEGIN
 SELECT status INTO current_status FROM public.orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF current_status=p_status THEN RETURN; END IF;
 IF NOT ((current_status='awaiting_payment' AND p_status IN ('paid','cancelled')) OR (current_status='paid' AND p_status='shipped')) THEN
  RAISE EXCEPTION 'INVALID_TRANSITION';
 END IF;
 IF p_status='cancelled' THEN
  FOR rec IN SELECT product_id,quantity FROM public.order_items WHERE order_id=p_id ORDER BY product_id LOOP
   UPDATE public.products SET stock=stock+rec.quantity WHERE id=rec.product_id;
  END LOOP;
 END IF;
 UPDATE public.orders SET status=p_status,updated_at=now() WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.set_cart_item(text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.checkout(text,uuid,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.transition_order(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_cart_item(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkout(text,uuid,text,jsonb,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid,text) TO service_role;
COMMIT;
