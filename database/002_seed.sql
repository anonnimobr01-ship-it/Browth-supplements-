-- Catálogo original; preços e estoque de exemplo. Revisar antes de vender.
INSERT INTO public.products (id,name,category,image,description,price_cents,stock) VALUES
('whey300','WHEY BROWTH 300G','Whey','/assets/whey.png','Whey Protein Browth de 300g.',3990,50),
('whey750','WHEY BROWTH 750G','Whey','/assets/whey.png','Whey Protein Browth de 750g.',7490,50),
('whey1kg','WHEY BROWTH 1KG','Whey','/assets/whey.png','Whey Protein Browth de 1kg.',9990,50),
('whey3kg','WHEY BROWTH 3KG','Whey','/assets/whey.png','Whey Protein Browth de 3kg.',24990,50),
('creatina300','CREATINA BROWTH 300G','Creatina','/assets/creatina.png','Creatina Browth de 300g.',7990,50),
('creatina600','CREATINA BROWTH 600G','Creatina','/assets/creatina.png','Creatina Browth de 600g.',13990,50),
('creatina1kg','CREATINA BROWTH 1KG','Creatina','/assets/creatina.png','Creatina Browth de 1kg.',19990,50),
('creatina2kg','CREATINA BROWTH 2KG','Creatina','/assets/creatina.png','Creatina Browth de 2kg.',34990,50),
('pre300','PRÉ-TREINO BROWTH 300G','Pré-Treino','/assets/pre-treino.png','Pré-Treino Browth de 300g.',8990,50),
('pre600','PRÉ-TREINO BROWTH 600G','Pré-Treino','/assets/pre-treino.png','Pré-Treino Browth de 600g.',15990,50),
('pre1kg','PRÉ-TREINO BROWTH 1KG','Pré-Treino','/assets/pre-treino.png','Pré-Treino Browth de 1kg.',22990,50),
('hiper1kg','HIPERCALÓRICO BROWTH 1KG','Hipercalórico','/assets/hipercalorico.png','Hipercalórico Browth de 1kg.',9990,50),
('hiper2kg','HIPERCALÓRICO BROWTH 2KG','Hipercalórico','/assets/hipercalorico.png','Hipercalórico Browth de 2kg.',17990,50),
('hiper3kg','HIPERCALÓRICO BROWTH 3KG','Hipercalórico','/assets/hipercalorico.png','Hipercalórico Browth de 3kg.',24990,50),
('vitaminaMorango','VITAMINAS BROWTH - MORANGO','Vitaminas','/assets/vitaminas.png','Vitaminas Browth sabor morango.',8990,50),
('vitaminaLaranja','VITAMINAS BROWTH - LARANJA','Vitaminas','/assets/vitaminas.png','Vitaminas Browth sabor laranja.',8990,50),
('vitaminaLimao','VITAMINAS BROWTH - LIMÃO','Vitaminas','/assets/vitaminas.png','Vitaminas Browth sabor limão.',8990,50)
ON CONFLICT (id) DO NOTHING;
