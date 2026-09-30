# Avaliações de produtos

Abra um produto e use “Avaliações dos clientes”. Visitantes podem publicar nome público, comentário de 10 a 2000 caracteres e uma nota inteira de 1 a 5, sem login. A identificação é feita por cookie aleatório HttpOnly: no mesmo navegador, enviar novamente atualiza a avaliação do produto. Apagar cookies ou usar outro navegador permite outra avaliação; este mecanismo não verifica compra nem identidade. Não são exibidos selos de compra verificada.

## Supabase

Migração aplicada: `supabase/migrations/20260930182044_product_reviews.sql`.

A tabela `public.product_reviews` tem RLS ativo e acesso direto revogado para anon/authenticated. O PHP usa a chave do servidor já configurada. O identificador interno de visitante nunca aparece na API pública. Os comentários são renderizados como texto, sem HTML.

Para moderar, abra Table Editor → product_reviews no Supabase. Mude `published` para `false` para ocultar uma avaliação. Mude para `true` para publicá-la novamente. Atualizar uma avaliação no site não modifica esse estado. A nota média e a quantidade são recalculadas automaticamente após inserir, editar, ocultar ou excluir uma avaliação.

`products.catalog_attributes.rating` e `rating_count` alimentam os cards, a ordenação “Melhor avaliados” e o filtro de avaliação mínima. Produtos sem avaliações não recebem nota inventada. Os demais atributos permanecem preservados.

## API

- GET `/api/products/{id}/reviews?offset=0`: até 10 avaliações públicas, resumo, próxima página e avaliação deste navegador.
- POST na mesma rota: JSON com `author_name`, `comment` e `rating`. Salva ou atualiza a avaliação deste navegador. Há validação de tamanho/nota, verificação da origem e limite de envio por visitante/IP.

O modo `?demo=1` não publica avaliações.

## Validação

Sintaxe dos módulos JavaScript e testes existentes de filtragem verificados. Teste SQL transacional confirmou a atualização da média após inserir/editar e a remoção da nota ao ocultar; rollback removeu os dados de teste. A migração está registrada no Supabase.
