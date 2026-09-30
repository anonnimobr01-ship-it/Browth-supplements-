# Novos produtos e identidade visual

Os 10 produtos foram cadastrados com as imagens fornecidas pelo projeto. Preços e estoques iniciais são editáveis em public.products no Supabase; o estoque inicial é 50 unidades por item.

| Produto | Preço inicial |
|---|---:|
| PLANT PROTEIN BROWTH CHOCOLATE 600G | R$ 129,90 |
| PLANT PROTEIN BROWTH BAUNILHA 600G | R$ 129,90 |
| PROTEIN BAR BROWTH CHOCOLATE 60G | R$ 9,90 |
| VEGAN PROTEIN BAR BROWTH FRUTAS VERMELHAS 50G | R$ 11,90 |
| PROTEIN SHAKE BROWTH CHOCOLATE 250ML | R$ 12,90 |
| PLANT SHAKE BROWTH BAUNILHA 250ML | R$ 14,90 |
| PASTA DE AMENDOIM BROWTH CREMOSA 500G | R$ 29,90 |
| AVEIA PROTEICA BROWTH CHOCOLATE 1KG | R$ 59,90 |
| MULTIVITAMÍNICO BROWTH 60 CÁPSULAS | R$ 49,90 |
| MULTIVITAMÍNICO BROWTH 60 COMPRIMIDOS | R$ 44,90 |

O SQL database/005_new_products.sql pode ser executado novamente: IDs já existentes não têm preços, estoques nem avaliações sobrescritos. O arquivo new-products-20260930.json registra o cadastro inicial.

Categorias, sabores, apresentação e quantidades foram lidos das imagens. As linhas Plant e Vegan foram identificadas como vegetais. Não foram inventados ingredientes, tabelas nutricionais, ausência de lactose/glúten/açúcar/cafeína nem avaliações. Filtros rígidos excluem produtos quando a informação exigida não está cadastrada.

A logo fornecida aparece no cabeçalho, rodapé e favicon. As imagens foram convertidas para WebP para reduzir o carregamento.
