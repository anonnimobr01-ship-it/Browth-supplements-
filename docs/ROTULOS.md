# Fichas de rótulo por produto

O catálogo atual contém nome, preço e descrição curta, mas não contém fotos do verso da embalagem nem fichas técnicas. Por isso, todas as 17 versões em `public/product-labels.json` começam com `verified: false`. A página do produto mostra cada campo como não cadastrado. **Não preencher dados a partir do nome comercial, imagem frontal ou de outra versão.**

Para completar uma ficha, obtenha o rótulo ou ficha técnica oficial daquela versão e confira:

- Lista de ingredientes completa, na ordem do rótulo (`composition`).
- Declarações de alergênicos (`allergens.contains`, `allergens.may_contain`), copiadas do rótulo. Valores padronizados `milk`, `lactose`, `gluten`; outros ingredientes podem ser registrados pelo nome que constar na embalagem.
- Todas as advertências e restrições de uso (`restrictions`).
- Porção (`serving`) e linhas da tabela nutricional (`nutrition`, com `name` e `amount`).
- Fonte auditável (`source`), como nome e data da ficha técnica do fornecedor.
- Confirmação de dieta `diet.vegetarian`, `diet.vegan` e alegações explícitas `free_from.milk`, `free_from.lactose`, `free_from.gluten`. Só usar `true` quando houver confirmação específica. `null` significa desconhecido.

Depois de revisar a ficha inteira, definir `verified: true` para aquela versão. O filtro só considera compatibilidade alimentar para versões verificadas com declaração específica `true`. Uma lista vazia de alergênicos **não** autoriza marcar um produto como livre do ingrediente. Para qualquer dado pendente, manter `verified: false` e os campos em `null`.

O questionário usa categorias como auxílio de navegação; não calcula necessidades nutricionais, doses nem substitui orientação profissional. Pessoas menores de 18 anos, maiores de 59 anos, gestantes, lactantes ou que relatem uso de medicamentos/condições de saúde não recebem correspondências automáticas enquanto não houver avaliação individual.

Referências: [Anvisa — perguntas frequentes](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares/perguntas-frequentes/), [Anvisa — leia o rótulo](https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares/lembre-se-de-ler-o-rotulo-com-atencao), [NIH ODS — suplementos e atividade física](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/).
