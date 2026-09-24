<?php
declare(strict_types=1);
$root=dirname(__DIR__);
if (!is_file($root.'/vendor/autoload.php')) {
 http_response_code(503);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>'Execute composer install na pasta do projeto.']);exit;
}
require $root.'/vendor/autoload.php';
Dotenv\Dotenv::createImmutable($root)->safeLoad();
function env(string $key,string $default=''): string {
 $value=$_ENV[$key]??$_SERVER[$key]??getenv($key);
 return $value===false || $value===null ? $default : (string)$value;
}
function database(): Browth\Supabase {return new Browth\Supabase(rtrim(env('SUPABASE_URL'),'/'),env('SUPABASE_SECRET_KEY'));}
function shipping(): int {
 $value=env('SHIPPING_CENTS','1990');
 if (!ctype_digit($value) || (int)$value>100000) throw new Browth\HttpError(503,'Frete não configurado.');
 return (int)$value;
}
