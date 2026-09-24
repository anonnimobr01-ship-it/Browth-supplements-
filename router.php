<?php
// Apenas para php -S. Produção: document root public/.
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (str_starts_with($path,'/api/')) {require __DIR__.'/public/api.php';return true;}
if (preg_match('~(?:^|/)\.|\.php(?:/|$)|\.\\.~i',$path)) {http_response_code(404);return true;}
$base=realpath(__DIR__.'/public');$file=realpath($base.$path);
if ($file && str_starts_with($file,$base.DIRECTORY_SEPARATOR) && is_file($file)) return false;
if ($path!=='/' && $path!=='/index.html') {http_response_code(404);return true;}
readfile($base.'/index.html');
