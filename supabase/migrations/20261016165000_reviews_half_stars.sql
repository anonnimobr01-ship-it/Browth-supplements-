-- Permite avaliações de zero a cinco estrelas, de 0,5 em 0,5.
-- Executar antes de publicar a interface/API de avaliações com meias estrelas.
ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE public.product_reviews
  ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);
ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_rating_check
  CHECK (rating >= 0 AND rating <= 5 AND (rating * 2) = trunc(rating * 2));
