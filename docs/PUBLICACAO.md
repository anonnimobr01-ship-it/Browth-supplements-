# Executar e publicar

A forma mais simples é hospedar frontend e PHP no mesmo domínio. Configure a raiz pública como `BROWTH_SUPPLEMENTS/public`, PHP 8.2+, Composer, HTTPS, saída HTTPS para Firebase/Google/Supabase e escrita em `storage/`. Instale dependências com `composer install --no-dev --optimize-autoloader`. Nunca sirva a raiz do projeto nem use `php -S` em produção.

Apache: habilite `mod_rewrite`, `AllowOverride All` para `public/` e a transmissão de Authorization ao PHP. O `.htaccess` incluído encaminha `/api/*` para `api.php`. Evite hospedar em subpasta: os assets usam URLs absolutas na raiz do domínio.

Exemplo Nginx (ajuste caminho e socket PHP-FPM):

```nginx
server {
    listen 80;
    server_name loja.exemplo.com;
    root /var/www/browth/public;
    index index.html;
    client_max_body_size 32k;
    location / { try_files $uri $uri/ =404; }
    location ~ ^/api/ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/browth/public/api.php;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
    location ~ \.php$ { return 404; }
    location ~ /\. { deny all; }
}
```

Adicione TLS na hospedagem/proxy. Defina `APP_ORIGINS=https://loja.exemplo.com` e autorize esse domínio no Firebase. Verifique `https://loja.exemplo.com/api/products` e teste login em navegador. Se receber 401 somente no servidor publicado, confira se Authorization chega ao PHP e se as configurações Firebase correspondem ao mesmo projeto.

## Frontend e backend separados

É possível publicar só o conteúdo de `public/` como frontend estático, **excluindo `api.php` e `.htaccess`**. O PHP deve estar em uma hospedagem que realmente execute PHP. Edite `public/js/config.js` para `API_BASE = 'https://api.exemplo.com/api'`. Adicione a origem exata do frontend em `APP_ORIGINS` no backend e nos domínios autorizados Firebase.

As imagens pertencem ao frontend. Publique o QR em `public/assets/pix-qrcode.png` no frontend caso use Pix manual. Nunca coloque chave secreta Supabase no config.js ou em variáveis que sejam incorporadas ao JavaScript. Somente a configuração Web pública Firebase é retornada por `/api/config`.

## Operação

- Produtos: edite no Supabase Table Editor; valores são centavos inteiros e estoque nunca negativo.
- Pedidos: use `bin/order.php`; não altere status diretamente pelo Table Editor.
- Pedidos pendentes retêm estoque. Cancele administrativamente quando necessário; não há agendamento automático.
- O limite em arquivo requer armazenamento gravável; em mais de uma instância aplique limite centralizado na infraestrutura.
- Faça backup remoto do banco e restrinja acesso ao painel Supabase e à conta de serviço.
- Não há migração de pedidos Firestore: exporte e planeje a transformação separadamente, se houver dados reais.
