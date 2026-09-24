<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
require dirname(__DIR__).'/src/bootstrap.php';
use Browth\{Auth,HttpError,RateLimit,Validation};
function respond(mixed $value,int $status=200): never {http_response_code($status);echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;}
function body(): array {
 if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json')) throw new HttpError(415,'Envie JSON.');
 $raw=file_get_contents('php://input',false,null,0,32769);
 if (strlen($raw)>32768) throw new HttpError(413,'Requisição muito grande.');
 try {$data=json_decode($raw,true,32,JSON_THROW_ON_ERROR);} catch (JsonException $e) {throw new HttpError(400,'JSON inválido.');}
 if (!is_array($data) || array_is_list($data)) throw new HttpError(400,'Envie um objeto JSON.');return $data;
}
try {
 $origin=$_SERVER['HTTP_ORIGIN']??'';
 $allowed=array_map('trim',explode(',',env('APP_ORIGINS','http://localhost:8000')));
 if ($origin && !in_array($origin,$allowed,true)) throw new HttpError(403,'Origem não autorizada.');
 if ($origin) {header('Access-Control-Allow-Origin: '.$origin);header('Vary: Origin');}
 header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');header('Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key');
 $method=$_SERVER['REQUEST_METHOD'];
 if ($method==='OPTIONS') {http_response_code(204);exit;}
 RateLimit::check('ip:'.($_SERVER['REMOTE_ADDR']??'unknown'),180);
 $path=rtrim(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),'/');
 if ($path==='/api/config' && $method==='GET') respond([
  'firebase'=>['apiKey'=>env('FIREBASE_API_KEY'),'authDomain'=>env('FIREBASE_AUTH_DOMAIN'),'projectId'=>env('FIREBASE_PROJECT_ID'),'appId'=>env('FIREBASE_APP_ID')],
  'shipping_cents'=>shipping(),
  'pix'=>['qr_path'=>preg_match('~^/assets/[a-zA-Z0-9_.-]+\.png$~D',env('PIX_QR_PATH'))?env('PIX_QR_PATH'):'','copy_paste'=>env('PIX_COPY_PASTE')]
 ]);
 if ($path==='/api/health' && $method==='GET') respond(['ok'=>true,'service'=>'BROWTH API']);
 $db=database();
 if ($path==='/api/products' && $method==='GET') respond($db->request('GET','products',['active'=>'eq.true','select'=>'id,name,category,description,image,price_cents,stock','order'=>'name.asc','limit'=>500]));
 if (preg_match('~^/api/products/([^/]+)$~',$path,$m) && $method==='GET') {
  $list=$db->request('GET','products',['id'=>'eq.'.Validation::product($m[1]),'active'=>'eq.true','limit'=>1]);
  if (!$list) throw new HttpError(404,'Produto não encontrado.');respond($list[0]);
 }
 $valid=(in_array($path,['/api/me','/api/cart','/api/orders','/api/quote'],true) || preg_match('~^/api/(cart/[A-Za-z0-9_-]+|orders/[a-fA-F0-9-]+)$~',$path));
 if (!$valid) throw new HttpError(404,'Rota não encontrada.');
 $user=Auth::user();$uid=$user['uid'];
 RateLimit::check('uid:'.$uid,$method==='GET'?120:40);
 // uid, nome e e-mail sempre vêm do Firebase verificado, nunca do body.
 $db->request('POST','profiles',['on_conflict'=>'uid'],$user,'resolution=merge-duplicates,return=minimal');
 if ($path==='/api/me' && $method==='GET') respond($user);
 if ($path==='/api/cart' && $method==='GET') respond($db->request('GET','cart_items',['uid'=>'eq.'.$uid,'select'=>'product_id,quantity,product:products(id,name,category,image,price_cents,stock,active)','order'=>'product_id.asc']));
 if (preg_match('~^/api/cart/([^/]+)$~',$path,$m) && $method==='PUT') {
  $data=body();$db->rpc('set_cart_item',['p_uid'=>$uid,'p_product'=>Validation::product($m[1]),'p_quantity'=>Validation::quantity($data['quantity']??null)]);respond(['ok'=>true]);
 }
 if ($path==='/api/quote' && $method==='GET') {
  $items=$db->request('GET','cart_items',['uid'=>'eq.'.$uid,'select'=>'quantity,product:products(price_cents,stock,active)']);$subtotal=0;
  if (!$items) throw new HttpError(409,'O carrinho está vazio.');
  foreach ($items as $item) {
   if (!$item['product']['active'] || $item['quantity']>$item['product']['stock']) throw new HttpError(409,'Revise o estoque dos produtos no carrinho.');
   $subtotal+=$item['quantity']*$item['product']['price_cents'];
  }
  respond(['subtotal_cents'=>$subtotal,'shipping_cents'=>shipping(),'total_cents'=>$subtotal+shipping()]);
 }
 if ($path==='/api/orders' && $method==='POST') {
  RateLimit::check('checkout:'.$uid,10);$data=body();$address=Validation::address($data['address']??null);
  $key=Validation::uuid($_SERVER['HTTP_IDEMPOTENCY_KEY']??'');$expected=$data['expected_total_cents']??null;
  if (!is_int($expected) || $expected<=0 || $expected>2147483647) throw new HttpError(422,'Total inválido. Atualize o checkout.');
  $hash=hash('sha256',json_encode([$address,$expected],JSON_THROW_ON_ERROR));
  $result=$db->rpc('checkout',['p_uid'=>$uid,'p_key'=>$key,'p_hash'=>$hash,'p_address'=>$address,'p_shipping'=>shipping(),'p_expected'=>$expected]);
  respond($result,201);
 }
 if ($path==='/api/orders' && $method==='GET') {
  $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
  if ($offset===false) throw new HttpError(422,'Página inválida.');
  respond($db->request('GET','orders',['uid'=>'eq.'.$uid,'select'=>'id,status,subtotal_cents,shipping_cents,total_cents,created_at,order_items(*)','order'=>'created_at.desc,id.asc','limit'=>20,'offset'=>$offset]));
 }
 if (preg_match('~^/api/orders/([^/]+)$~',$path,$m) && $method==='GET') {
  $orders=$db->request('GET','orders',['id'=>'eq.'.Validation::uuid($m[1]),'uid'=>'eq.'.$uid,'select'=>'id,status,address,subtotal_cents,shipping_cents,total_cents,created_at,order_items(*)','limit'=>1]);
  if (!$orders) throw new HttpError(404,'Pedido não encontrado.');respond($orders[0]);
 }
 throw new HttpError(405,'Método não permitido.');
} catch (HttpError $e) {respond(['error'=>$e->getMessage()],$e->status);
} catch (Throwable $e) {error_log('Browth error: '.get_class($e));respond(['error'=>'Erro interno. Tente novamente.'],500);}
