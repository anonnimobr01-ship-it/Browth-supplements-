# BROWTH SUPPLEMENTS — Arquitetura e mapa do projeto

> **Snapshot verificado:** 2026-10-13 · branch `main` · árvore Git `9b96e3193561ebf39899f0541252479adc79e342`.  
> **Uso:** índice de leitura rápida para IA e desenvolvedores. Leia este documento primeiro e abra **somente os arquivos da funcionalidade solicitada**. Isto é um snapshot, não substitui inspecionar código alterado posteriormente. Sem credenciais, dados pessoais ou tokens.

## 1. Resumo em 30 segundos

E-commerce **BROWTH SUPPLEMENTS**: frontend SPA em **HTML/CSS/JavaScript vanilla**, backend **PHP 8.2+** com REST/JSON, autenticação **Firebase Authentication** (e-mail/senha e Google) e banco **PostgreSQL Supabase** via PostgREST. Catálogo de suplementos fictícios, filtragem em 8 perguntas, versões de produtos, avaliações sem login, carrinho visitante e autenticado, checkout com Pix **manual** e gestão de pedido por CLI.

**Hospedagem:** arquivos estáticos na **Vercel**, rota `/api/:path*` reescrita para API PHP no **Render** (`vercel.json`). Backend chama Supabase e valida ID tokens Firebase. `public/js/config.js` mantém `API_BASE='/api'`. A lista `APP_ORIGINS` no Render deve conter a(s) origem(ns) exata(s) do frontend; divergência causa **403 Origem não autorizada**.

```text
Navegador (Vercel: public/ HTML/CSS/JS)
  ├─ Firebase Web SDK → Firebase Authentication
  └─ /api/* → Vercel rewrite → Render (PHP public/api.php)
                 ├─ src/Auth.php → verifica Firebase ID token nas rotas privadas
                 ├─ src/Validation.php + src/RateLimit.php
                 └─ src/Supabase.php → Supabase PostgREST (chave somente no servidor)
                                               └─ PostgreSQL public.*
```

**Regra crítica:** nunca copiar `SUPABASE_SECRET_KEY`, conta de serviço Firebase ou arquivos `.env` para `public/`, Vercel ou documentação. Firebase Web config é pública; credenciais administrativas não.

## 2. Roteamento por arquivo — abra apenas o necessário

| Pedido/problema | Leia primeiro | Dependências |
|---|---|---|
| Layout, home, catálogo, produto, carrinho e checkout UI | `public/js/app.js` | `public/styles.css`, `public/quiz.css`, `public/index.html` |
| URLs da API e fetch no frontend | `public/js/app.js` (função `api`) | `public/js/config.js`, `vercel.json` |
| Backend, validação de rotas, CORS e avaliações POST | `public/api.php` | `src/bootstrap.php`, `src/Supabase.php` |
| Login Google, cadastro, logout, reset | `public/js/auth.js` | `src/Auth.php`, `public/api.php` |
| Filtros, pesquisa, classificação | `public/js/profile-filter.js` | `tests/profile-filter.mjs`, `public/js/app.js` |
| Versões/pesos/sabores Whey | `public/js/product-variants.js` | `tests/whey-variants.mjs`, `database/whey-variants.json` |
| Avaliações, nota média e moderação | `public/js/reviews.js` | `public/api.php`, `supabase/migrations/20260930182044_product_reviews.sql`, `docs/AVALIACOES.md` |
| Carrinho, estoque, pagamento e pedidos | `public/api.php` | SQL functions `set_cart_item`, `checkout`, `transition_order`, `bin/order.php` |
| Banco SQL e novos produtos | `database/*.sql` | `public/demo-products.json`, `public/product-labels.json` |
| Rótulos, imagens | `public/product-labels.json`, `public/assets/` | `tools/generate-packaging.mjs`, `docs/ROTULOS.md` |
| Erros HTTP, permissões e segurança | `src/Supabase.php`, `src/RateLimit.php`, `src/Validation.php` | `public/api.php`, Supabase Advisors |
| Deploy | `vercel.json`, `dockerfile` | `router.php`, `public/.htaccess`, `docs/PUBLICACAO.md` |

## 3. Árvore funcional condensada

```text
/
├── public/
│   ├── index.html                 # entrada SPA
│   ├── styles.css, quiz.css       # estilos gerais/questionário
│   ├── api.php                    # dispatcher completo /api/*
│   ├── js/
│   │   ├── app.js                # UI, navegação, chamadas REST, carrinho, pedidos
│   │   ├── auth.js               # Firebase Web SDK
│   │   ├── config.js             # API_BASE='/api'
│   │   ├── profile-filter.js     # regras de filtros/pesquisa
│   │   ├── product-variants.js   # combinações Whey
│   │   └── reviews.js            # componente avaliações
│   ├── assets/                    # imagens e outros recursos (omitidos do índice)
│   ├── demo-products.json        # catálogo local de demonstração
│   └── product-labels.json       # rótulos ilustrativos e fotos do verso
├── src/
│   ├── bootstrap.php             # Composer, env(), database(), frete
│   ├── Auth.php                  # validação Firebase Admin
│   ├── Supabase.php              # cliente HTTP PostgREST/RPC
│   ├── RateLimit.php             # contador em arquivos storage/rate/
│   ├── Validation.php            # validação quantidade, produto, UUID, endereço
│   └── HttpError.php             # exceções HTTP
├── database/
│   ├── 004_catalog_filters.sql, 005_new_products.sql, 006_whey_flavors.sql
│   └── new-products-20260930.json, whey-variants.json
├── supabase/migrations/
│   └── 20260930182044_product_reviews.sql
├── bin/order.php                 # operador muda status de pedido via CLI
├── tests/
│   ├── validation.php
│   ├── profile-filter.mjs
│   └── whey-variants.mjs
├── tools/generate-packaging.mjs
├── docs/                         # documentação histórica e este mapa
├── router.php                    # servidor PHP local
├── dockerfile                    # ambiente PHP Render
├── vercel.json                   # build frontend estático + rewrite /api/*
├── composer.json, composer.lock  # dependências PHP
├── .gitignore, .dockerignore
└── secrets/, storage/            # diretórios privados; somente .gitkeep no Git
```

**Atenção à documentação legada:** `README.md` menciona `database/001_schema.sql`, `002_seed.sql`, `003_verify.sql` e `.env.example`, mas esses arquivos **não aparecem na árvore atual** de `main`. Não presumir sua existência. `docs/ANALISE.md` descreve uma versão antiga Node/Firestore, **não** a arquitetura atual.

## 4. API PHP — métodos e proteção

Base **`/api`**, respostas JSON. `public/api.php` é a fonte de verdade para rotas e contratos.

| Método | Caminho | Acesso | Efeito |
|---|---|---|---|
| GET | `/health` | público | saúde do processo, não garante banco |
| GET | `/config` | público | Firebase Web config, frete, Pix manual |
| GET | `/products` | público | produtos ativos, filtro preço/categoria e paginação interna |
| GET | `/products/{id}` | público | detalhe do produto ativo |
| GET | `/products/{id}/reviews` | público | lista paginada, média e avaliação do navegador |
| POST | `/products/{id}/reviews` | público | publica/atualiza avaliação usando cookie HttpOnly e hash |
| GET | `/me` | Firebase token | perfil; sincroniza `profiles` |
| GET | `/cart` | Firebase token | carrinho do usuário |
| PUT | `/cart/{id}` | Firebase token | altera quantidade (0 remove) via RPC |
| GET | `/quote` | Firebase token | cálculo de subtotal, frete e total |
| POST | `/orders` | Firebase token | checkout transacional com `Idempotency-Key` |
| GET | `/orders` | Firebase token | histórico paginado |
| GET | `/orders/{uuid}` | Firebase token | detalhe de pedido do titular |

**HTTP típicos:** 401 autenticação; 403 origem não autorizada; 404 não encontrado; 409 regra de negócio; 422 entrada inválida; 429 limite; 503 erro de serviço. `src/Supabase.php` atualmente converte diferentes erros de PostgREST em HTTP 503 (consultar logs backend para código subjacente).

**Avaliações:** nota 1–5, nome 2–80 caracteres, texto 10–2000; cookie `browth_review_visitor`; upsert por `(product_id,visitor_hash)`. Trigger `refresh_product_review_rating` atualiza `products.catalog_attributes.rating` e `rating_count`. Sem autenticação obrigatória, sem comprovante de compra; `published` serve à moderação.

**Checkout:** valores oficiais e estoque vêm do banco; `Idempotency-Key` evita duplicação por reenvio. Pix é **manual**, sem gateway/webhook: `awaiting_payment → paid → shipped` ou `awaiting_payment → cancelled`; gerenciar via `php bin/order.php UUID status`, não por `UPDATE orders.status` direto. Não criar pedidos ou alterar pagamentos reais em testes.

## 5. Supabase — snapshot do schema real

Projeto Supabase: **Browth suplements**, região `sa-east-1`; PostgreSQL **17**. Snapshot 2026-10-13: **35 produtos, 3 perfis, 11 itens de carrinho, 5 pedidos, 11 itens de pedido e 3 avaliações** (contagens variam com o uso). **Seis tabelas** no esquema `public`, todas com RLS ligado:

| Tabela | Chave | Campos principais | Relações |
|---|---|---|---|
| `profiles` | `uid` texto (Firebase UID) | email, name, created_at | 1:N orders, cart_items |
| `products` | `id` texto | name, category, description, image, price_cents, stock, active, catalog_attributes JSONB | 1:N cart_items, order_items, product_reviews |
| `cart_items` | `(uid,product_id)` | quantity | FK profiles + products |
| `orders` | `id` UUID | uid, idempotency_key, request_hash, address JSONB, subtotal_cents, shipping_cents, total_cents, status, datas | FK profiles |
| `order_items` | `(order_id,product_id)` | name, image, quantity, price_cents | FK orders + products |
| `product_reviews` | `id` UUID | product_id, visitor_hash, author_name, rating, comment, published, datas | FK products, UNIQUE (product_id, visitor_hash) |

Funções PostgreSQL confirmadas: `set_cart_item`, `checkout`, `transition_order`, `refresh_product_review_rating`, `rls_auto_enable`. Event trigger `ensure_rls` ativa RLS automaticamente em novas tabelas públicas. Migração registrada no Supabase: `20260930182044_product_reviews`. As mudanças antigas do schema podem existir no banco sem correspondentes scripts versionados nesta árvore.

**Permissões confirmadas:** `anon` não pode executar essas cinco funções. Correção anterior retirou `EXECUTE` público de `rls_auto_enable()`; `service_role` continua autorizado. As seis tabelas têm **RLS sem políticas** por arquitetura: acesso direto de `anon/authenticated` está fechado; API PHP usa chave de servidor e faz autenticação/autorização. **Não desativar RLS nem conceder acesso público para “resolver” erros**.

**Advisors em 2026-10-13:** segurança apenas seis avisos INFO `rls_enabled_no_policy` (previstos pela arquitetura); performance: faltam índices nas FKs `cart_items(product_id)` e `order_items(product_id)`; índice `orders_user_date` sem uso registrado (não remover sem medir). Não houve alteração de schema nesta documentação.

## 6. Principais fluxos e limites

- **Catálogo:** página chama `GET /api/products`; categorias/preços consultados no servidor, outras combinações de filtros/ordenação aplicadas por `profile-filter.js` no navegador. Modo `?demo=1` usa JSON local e não grava.
- **Login:** Firebase Web autentica, frontend obtém ID token, PHP valida com SDK Firebase Admin, usa UID verificado para `profiles/cart/orders`. Firebase SDK é importado dinamicamente do CDN.
- **Carrinho:** anônimo usa localStorage; autenticado usa `cart_items` via API e função SQL `set_cart_item`. Migração do carrinho visitante utiliza quantidade máxima entre as entradas, não soma automática.
- **Pedidos:** `GET /quote` e `POST /orders` usam regras no servidor; endereço brasileiro validado; RPC `checkout` gerencia persistência/estoque.
- **Avaliações:** sem login; identidade pseudônima por cookie + hash, trigger para média e opção de ocultar por `published=false` no banco.
- **Rate limiting:** `src/RateLimit.php` grava contadores locais em `storage/rate/`. Não é compartilhado entre múltiplas instâncias Render.
- **Configuração:** variáveis servidor `APP_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FIREBASE_* `, `SHIPPING_CENTS`, `PIX_*`; não guardar valores em Markdown.

## 7. Como testar e como analisar mais rápido

Testes existentes no GitHub (existência verificada, **não equivalem a cobertura completa**):

```bash
composer install
composer test                    # tests/validation.php
node tests/profile-filter.mjs
node tests/whey-variants.mjs
```

Para uma análise futura:
1. Comece aqui e confira se o snapshot Git ainda corresponde à `main`.
2. Abra apenas os módulos indicados na tabela §2 e os testes relevantes.
3. Para erros de produção, compare **código Git + configuração Render/Vercel/Firebase + Supabase schema/logs**, sem supor que configuração de hospedagem esteja no Git.
4. Para SQL, use consulta de leitura ou transação com rollback e verifique RLS/permissões antes de alterar.
5. Após mudança funcional, atualize **este arquivo** (data, rotas, fluxo, tabelas, alertas); se possível adicione testes direcionados. Nunca salve segredo ou endereço residencial de clientes no Git.

**Limitação da varredura:** inventário da árvore e inspeção direta dos módulos/documentos-chave; arquivos binários de assets, cada linha do JavaScript grande, histórico de commits e configuração secreta dos provedores não foram auditados individualmente. Portanto isto é um **mapa de arquitetura confirmado**, não certificação de que todos os arquivos são seguros.

## 8. Referências internas

- [README](../README.md) (algumas instruções antigas, validar existência dos arquivos)
- [API](API.md)
- [Avaliações](AVALIACOES.md)
- [Filtragem](FILTRAGEM.md)
- [Publicação](PUBLICACAO.md)
- [Rótulos](ROTULOS.md)
- [Verificações históricas](VERIFICACAO.md)

**Instrução curta para IA:** “Leia `docs/ARQUITETURA_ATUAL.md` primeiro. Para este pedido, abra só os arquivos mapeados no §2. Confirme diferenças na `main` e no Supabase antes de editar. Não exponha segredos.”
