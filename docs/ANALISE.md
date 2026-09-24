# Análise antes da reconstrução

Base: ZIP `browth-suplementos-modelo-3d-real 1.zip`, analisado em 23/09/2026. O original foi extraído separadamente antes de escrever a reconstrução.

## Estrutura e tecnologias encontradas

O arquivo continha cerca de 14 mil entradas, incluindo `node_modules`, e aproximadamente 130 MB descompactados. A aplicação usa HTML, CSS e JavaScript sem framework, Node.js/Express no backend, Firebase Admin, Firebase Authentication e Cloud Firestore. Jest/Supertest verificavam partes do projeto Node.

`public/index.html` possui aproximadamente 4.900 linhas, com grande bloco de estilos e várias telas no mesmo documento. `public/index.js` concentra catálogo, login, carrinho, pedidos, filtros e manipulação do DOM em aproximadamente 74 KB. `experience.css` e `interactions.js` acrescentam efeitos visuais e integração com model-viewer. `products.js` contém 17 produtos. `app-logic.js` extrai algumas funções puras. O backend tem `server.js`, `order-service.js` e `seed-products.js`.

## Achados

| Achado | Consequência | Tratamento |
|---|---|---|
| Dois arquivos de conta de serviço com `private_key` preenchido, um na raiz e outro em backend | Credenciais administrativas foram incluídas no pacote | Removidos; instrução de revogação e nova credencial fora de public |
| `.env` incluído no ZIP original | Distribuição de configuração privada | Apenas `.env.example` sem credenciais nesta entrega |
| Firestore carregado no navegador e no servidor | Diverge da arquitetura pedida | Todas as leituras/gravações comerciais agora passam por API PHP e Supabase |
| Carrinho local e Firestore mantidos por caminhos diferentes | Mais pontos de falha de sincronização | Fluxo visitante/usuário separado com mesclagem idempotente |
| Pedido usa valores do banco, mas não transaciona reserva de estoque e gravação | Falhas/concorrência podem produzir inconsistência; não havia baixa de estoque | Função PostgreSQL com bloqueio de linhas e transação |
| POST de pedido sem chave de idempotência | Nova tentativa pode criar mais de um pedido | Chave por tentativa e unicidade por usuário no banco |
| `normalizarItens` limita cada entrada a 100 antes de agregar duplicatas | Duplicatas podem ultrapassar o limite agregado | Carrinho com chave primária por usuário/produto e restrição de 1 a 100 |
| Uso de `innerHTML` em templates de catálogo/pedidos | Dados externos devem ser escapados para evitar XSS | Escape de texto/atributos e caminhos de imagens limitados a assets locais |
| HTML/CSS/JS extensos, telas e lógica misturadas | Manutenção e isolamento de erros difíceis | CSS separado, módulos de autenticação/configuração, serviços PHP |
| QR Pix estático/placeholder | Abrir QR não confirma recebimento | Estado aguardando pagamento; confirmação apenas no servidor por operador |

A mensagem antiga “sessão inválida ou expirada” é genérica e pode ter diferentes causas. O arquivo não prova qual ocorreu no ambiente do usuário. A nova versão renova o ID Token após um HTTP 401 uma única vez e distingue falha de configuração/serviço (503) de credencial inválida (401). O guia exige o mesmo projeto Firebase no cliente e no servidor.

## Reaproveitamento

- Cinco imagens BROWTH de whey, creatina, pré-treino, hipercalórico e vitaminas.
- Os 17 IDs, nomes, categorias, preços e descrições curtas do catálogo, convertidos em seed SQL. Valores são exemplos.
- Paleta pedida, logotipo tipográfico serifado/itálico, contrastes e atmosfera escura.
- Modelo GLB original, com carregamento somente quando solicitado na página de whey.
- Intenção da busca tolerante a acentos e do cálculo de valores pelo servidor.
- Créditos do grupo no rodapé.

Não foram copiados banners, imagens, textos ou código da Growth. A abertura direta do site de referência retornou uma verificação de navegador; os resultados públicos de páginas do domínio oficial confirmaram categorias e navegação de carrinho, sem permitir uma inspeção completa do checkout. A implementação usa a organização de e-commerce descrita no pedido, sem alegar reprodução detalhada do site.

## O que saiu da versão reconstruída

`node_modules`, `package.json`, `package-lock.json`, backend Node, seed Firestore, SDK Firestore, regras/configuração de hospedagem Firebase e testes Jest específicos do backend antigo. Não são necessariamente arquivos inúteis no projeto original; tornaram-se desnecessários para a nova arquitetura. Os JSON privados e `.env` não foram transportados.

Os antigos guias e relatório foram substituídos pela documentação desta versão. O GLB duplicado na raiz não foi incluído; há uma única cópia em `public/assets/`. O questionário de recomendação automática de suplementos foi retirado; a navegação usa categorias e produtos, sem inventar orientação individual de saúde.

## Decisões e limites

- PHP 8.2+ atende ao requisito PHP 8+ e à linha 7 do SDK PHP Kreait. Kreait é um SDK comunitário de administração Firebase para PHP, não um SDK PHP oficial do Google.
- PHP fala com PostgreSQL hospedado via Data API HTTPS do Supabase. Não usa PDO PostgreSQL nem depende de PostgreSQL local.
- Chave secreta Supabase fica apenas no servidor. As tabelas habilitam RLS e revogam acesso dos papéis públicos. Como service_role ignora RLS, a API sempre deriva uid do token e aplica filtros de propriedade.
- IDs Firebase são texto; não se tenta tratá-los como UUID de Supabase Auth.
- Não há migração automática de usuários comerciais, carrinhos ou pedidos do Firestore antigo. Manter o mesmo projeto Firebase preserva as contas de autenticação; perfis comerciais são criados no primeiro acesso à API. O ZIP não continha exportação dos dados remotos.
- Frete fixo e Pix manual são funcionalidades explícitas. Nenhum pagamento foi executado nesta tarefa.

## Referências técnicas consultadas

- https://firebase-php.readthedocs.io/8.2.0/authentication.html — ID Token e verificação de revogação (API também disponível na linha 7 utilizada).
- https://firebase.google.com/docs/web/setup — SDK Web e configuração do app.
- https://supabase.com/docs/guides/getting-started/api-keys — chaves secretas e service_role.
- https://supabase.com/docs/guides/database/functions — funções SQL e privilégios.
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS.
