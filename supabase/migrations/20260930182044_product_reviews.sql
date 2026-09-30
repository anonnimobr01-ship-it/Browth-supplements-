CREATE TABLE public.product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
 author_name text NOT NULL CHECK (char_length(btrim(author_name)) BETWEEN 2 AND 80),
 rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment text NOT NULL CHECK (char_length(btrim(comment)) BETWEEN 10 AND 2000),
 published boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (product_id, visitor_hash)
);
CREATE INDEX product_reviews_public_page ON public.product_reviews(product_id, created_at DESC, id) WHERE published;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO service_role;
CREATE FUNCTION public.refresh_product_review_rating() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE pid text; total integer; average numeric;
BEGIN
 pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
 PERFORM 1 FROM public.products WHERE id = pid FOR UPDATE;
 SELECT count(*)::integer, round(avg(rating)::numeric, 2) INTO total, average
 FROM public.product_reviews WHERE product_id = pid AND published;
 UPDATE public.products SET catalog_attributes =
 (coalesce(catalog_attributes, '{}'::jsonb) - 'rating' - 'rating_count') ||
 jsonb_build_object('rating_count', total) ||
 CASE WHEN total > 0 THEN jsonb_build_object('rating', average) ELSE '{}'::jsonb END
 WHERE id = pid;
 RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_product_review_rating() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_product_review_rating() TO service_role;
CREATE TRIGGER product_review_rating AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_product_review_rating();
-- Start with actual review totals; do not retain illustrative ratings.
UPDATE public.products SET catalog_attributes = (coalesce(catalog_attributes,'{}'::jsonb) - 'rating' - 'rating_count') || '{"rating_count":0}'::jsonb;
