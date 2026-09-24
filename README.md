# BROWTH SUPPLEMENTS

E-commerce com identidade preta, vinho e vermelha, catálogo original, carrinho e pedidos. Frontend em HTML/CSS/JavaScript puro; API em PHP; Firebase apenas para autenticação; dados no PostgreSQL online do Supabase.

## Comece aqui

1. Use **PHP 8.2 ou superior** e Composer. Habilite `curl`, `mbstring`, `openssl` e `fileinfo` no PHP. Não precisa instalar Node.js, MySQL ou PostgreSQL.
2. No Supabase, crie um projeto e execute no **SQL Editor**, nesta ordem: `database/001_schema.sql` e `database/002_seed.sql`. Use um projeto novo: o primeiro script cria as tabelas e não substitui estruturas existentes.
3. No Firebase, ative **Authentication → Email/Password e Google**. Cadastre um app Web e copie sua configuração. Autorize `localhost` e o domínio de produção em Authentication → Settings → Authorized domains.
4. Copie `.env.example` para `.env`. Preencha a configuração Web Firebase, URL Supabase e chave secreta Supabase (`sb_secret_...`; também aceita JWT `service_role` legado).
5. Gere uma **nova** chave privada de conta de serviço Firebase e salve em `secrets/firebase-admin.json`. O projeto Firebase dessa chave deve ser o mesmo usado no frontend. Não reaproveite as credenciais do ZIP antigo.
6. Na pasta que contém `composer.json`, execute:

```sh
composer install
php -S localhost:8000 -t public router.php
```

Abra **http://localhost:8000**. O `composer.lock` incluído fixa as dependências verificadas nesta entrega; mantenha-o no repositório. Não desative a validação TLS se a rede bloquear os downloads.

### Windows / XAMPP sem editar variáveis de ambiente

Use o caminho do PHP diretamente, em um terminal na raiz do projeto:

```bat
copy .env.example .env
C:\xampp\php\php.exe C:\caminho\composer.phar install
C:\xampp\php\php.exe -S localhost:8000 -t public router.php
```

Ajuste apenas o caminho de `composer.phar`. O arquivo `.env` configura o projeto sem alterar variáveis do Windows. Use o servidor acima ou configure um VirtualHost Apache apontando **exclusivamente para `public/`**. Não abra o projeto pelo `file://` nem publique sua raiz dentro de `htdocs` sem proteção.

## O que está implementado

- Catálogo com 17 produtos originais, busca sem distinção de acentos, categorias e ordenação de preço.
- Página de produto, versões, estoque e visualização opcional do modelo 3D original.
- Cadastro/login por e-mail e senha, Google, recuperação de senha e logout via Firebase.
- Carrinho visitante no navegador; carrinho autenticado no Supabase. Na entrada, a mesclagem usa o maior valor por produto para não duplicar itens em novas tentativas.
- API verifica Firebase ID Token, inclusive revogação, em todas as rotas pessoais.
- Checkout com endereço brasileiro, frete fixo configurável, preço e estoque verificados no servidor.
- Transação atômica para pedido, itens, baixa de estoque e limpeza do carrinho; chave de idempotência evita duplicação por repetição da mesma tentativa.
- Histórico paginado, detalhe de pedido e confirmação administrativa de Pix.
- Layout responsivo, navegação por teclado, estados vazios/erro e mensagens acessíveis.

## Prévia sem credenciais

Com o servidor iniciado, abra **http://localhost:8000/?demo=1**. Esse modo usa um catálogo de exemplo separado e permite testar navegação/carrinho, mas **não cria contas, pedidos ou pagamentos**. Uma falha da API real nunca ativa a demonstração silenciosamente.

## Pix e operação da loja

O pagamento é **manual**, sem gateway ou webhook. Para exibir um QR estático sem valor, coloque a imagem em `public/assets/pix-qrcode.png` e defina `PIX_QR_PATH=/assets/pix-qrcode.png`. Opcionalmente, preencha `PIX_COPY_PASTE` com o código real fornecido pelo banco. Confira se o código permite o valor de cada pedido. Não há geração de QR dinâmico nem botão de “já paguei”.

O administrador confere o pagamento no banco e executa, no servidor:

```sh
php bin/order.php UUID-DO-PEDIDO paid
php bin/order.php UUID-DO-PEDIDO shipped
```

Para cancelar pedido ainda não pago e devolver estoque:

```sh
php bin/order.php UUID-DO-PEDIDO cancelled
```

Sem QR configurado, a tela informa que aguarda instruções da loja. Pedidos pendentes reservam estoque até pagamento ou cancelamento; não existe expiração automática. Gerencie produtos/preços/estoque pelo Table Editor do Supabase. **Nunca atualize status de pedido diretamente**, pois isso ignora as regras de transição e devolução de estoque. Cancelamento de pedido pago exige conciliação/estorno e ainda não está automatizado.

O frete é **fixo para o Brasil**, definido em centavos por `SHIPPING_CENTS`, e não consulta transportadora ou CEP. Não existe cartão, cálculo real de prazo, emissão fiscal, reembolso ou painel administrativo web nesta entrega. Preços e estoques iniciais são exemplos; revise também rótulos, composição, imagens, regras de entrega e dados comerciais antes de vender.

## Estrutura

```text
public/       HTML, CSS, JavaScript, imagens e ponto de entrada da API
src/          autenticação, validação, acesso Supabase e limite de requisições
secrets/      conta de serviço (fora da pasta pública, ignorada no Git)
database/     schema, catálogo inicial e teste SQL transacional
bin/          operação administrativa por CLI
storage/      limites de requisição por IP/usuário (precisa de escrita)
tests/        testes PHP de validação
docs/         análise do original, API, publicação e verificação
```

## Testes

```sh
composer test
```

Execute também `database/003_verify.sql` no SQL Editor de um **projeto de teste** já semeado: valida bloqueio de acesso público, rollback, idempotência, estoque e cancelamento; desfaz os próprios dados ao final. Consulte `docs/VERIFICACAO.md` para o que foi efetivamente testado nesta entrega e o roteiro de integração com seus serviços.

## Segurança

O ZIP recebido continha **dois JSON com chave privada de conta de serviço Firebase**. Foram excluídos desta versão. Revogue as chaves antigas no Google Cloud IAM → Service Accounts → Keys e gere novas. Se os arquivos já estiveram no Git, removê-los do último commit não elimina o histórico; a revogação continua necessária.

Somente `public/` pode ficar acessível pela web. `.env`, `secrets/`, `storage/` e `vendor/` ficam fora dela. A configuração Web do Firebase é pública por design; a chave privada Firebase e a chave secreta Supabase nunca são enviadas ao navegador. As tabelas têm RLS habilitada e acesso de `anon`/`authenticated` revogado: a API usa `service_role`, que exige validação de usuário e filtros de propriedade no PHP. Nenhuma senha é salva no Supabase.

Créditos: Nathan Rafael, Mateus Araújo e Pedro Monteiro.
