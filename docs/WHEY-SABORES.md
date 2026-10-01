# Whey: pesos e sabores

Os anúncios antigos whey300, whey750, whey1kg e whey3kg são Chocolate e mantêm seus IDs, estoques, preços e avaliações. Os novos IDs acrescentam -baunilha ou -morango. Cada combinação usa seu próprio produto no carrinho, checkout e avaliações.

A escolha de peso preserva o sabor; a escolha de sabor preserva o peso. O cadastro usa family, weight_grams, size, flavors e flavor_names em catalog_attributes, sem mudar o esquema existente. Os novos SKUs herdam o preço do Chocolate do mesmo peso no momento da criação, com estoque inicial de 50 unidades.

Executar database/006_whey_flavors.sql atualiza imagens e metadados dos quatro anúncios e insere oito variantes, sem recriar as existentes. Ajustes posteriores de preço e estoque devem ser feitos por SKU em public.products.

As imagens próprias de cada peso e sabor ficam em public/assets/whey*.webp. Os mockups não constituem documentação nutricional; as novas variantes não recebem tabela ou rótulo de verso copiados de outro sabor. O modelo 3D antigo não é exibido para as novas variantes, pois usa outra arte fixa.

Validação das combinações: node tests/whey-variants.mjs.
