-- Verificações de segurança e de atomicidade. Rodar após schema + seed, em projeto de teste.
-- Tudo que o teste grava é revertido ao final.
BEGIN;
DO $$
DECLARE k uuid:=gen_random_uuid(); o jsonb; same_order jsonb; initial_stock integer; price integer;
BEGIN
 IF has_table_privilege('anon','public.orders','SELECT') THEN RAISE EXCEPTION 'anon pode ler pedidos'; END IF;
 IF has_table_privilege('authenticated','public.cart_items','UPDATE') THEN RAISE EXCEPTION 'authenticated pode alterar carrinhos'; END IF;
 IF has_function_privilege('anon','public.checkout(text,uuid,text,jsonb,integer,integer)','EXECUTE') THEN RAISE EXCEPTION 'checkout público'; END IF;
 INSERT INTO public.profiles(uid,name) VALUES('test-browth-transaction','Teste');
 SELECT stock,price_cents INTO initial_stock,price FROM public.products WHERE id='whey1kg';
 IF initial_stock IS NULL OR initial_stock<2 THEN RAISE EXCEPTION 'Seed com estoque necessário'; END IF;
 PERFORM public.set_cart_item('test-browth-transaction','whey1kg',2);
 BEGIN
  PERFORM public.checkout('test-browth-transaction',k,'hash','{}',1990,1);
  RAISE EXCEPTION 'Preço adulterado foi aceito';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'PRICE_CHANGED' THEN RAISE; END IF;
 END;
 IF (SELECT stock FROM public.products WHERE id='whey1kg')<>initial_stock THEN RAISE EXCEPTION 'Rollback falhou'; END IF;
 o:=public.checkout('test-browth-transaction',k,'hash','{}',1990,price*2+1990);
 same_order:=public.checkout('test-browth-transaction',k,'hash','{}',1990,price*2+1990);
 IF o->>'id'<>same_order->>'id' THEN RAISE EXCEPTION 'Pedido duplicado'; END IF;
 IF (SELECT stock FROM public.products WHERE id='whey1kg')<>initial_stock-2 THEN RAISE EXCEPTION 'Estoque incorreto'; END IF;
 IF EXISTS(SELECT 1 FROM public.cart_items WHERE uid='test-browth-transaction') THEN RAISE EXCEPTION 'Carrinho não foi limpo'; END IF;
 BEGIN
  PERFORM public.checkout('test-browth-transaction',k,'outro-hash','{}',1990,price*2+1990);
  RAISE EXCEPTION 'Chave reutilizada com body diferente foi aceita';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
 END;
 PERFORM public.transition_order((o->>'id')::uuid,'cancelled');
 PERFORM public.transition_order((o->>'id')::uuid,'cancelled');
 IF (SELECT stock FROM public.products WHERE id='whey1kg')<>initial_stock THEN RAISE EXCEPTION 'Estorno de estoque incorreto'; END IF;
 RAISE NOTICE 'Verificações transacionais passaram.';
END $$;
ROLLBACK;
