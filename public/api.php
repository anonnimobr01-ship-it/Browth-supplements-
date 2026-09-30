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
 if ($path==='/api/products' && $method==='GET') {
  $ranges=['all'=>[0,null],'0-5000'=>[0,5000],'5000-10000'=>[5000,10000],'10000-15000'=>[10000,15000],'15000-25000'=>[15000,25000],'25000-plus'=>[25001,null]];
  $budget=$_GET['budget']??'all';$category=$_GET['category']??'';
  if(!is_string($budget)||!isset($ranges[$budget])||!is_string($category)||mb_strlen($category)>80||preg_match('/[(),*]/',$category))throw new HttpError(422,'Filtros inválidos.');
  $query=['active'=>'eq.true','select'=>'*','order'=>'name.asc,id.asc','limit'=>500];
  [$minimum,$maximum]=$ranges[$budget];
  $query['and']='(price_cents.gte.'.$minimum.($maximum===null?'':',price_cents.lte.'.$maximum).')';
  if($category!=='')$query['category']='eq.'.$category;
  $products=[];
  // Page through Supabase; never silently truncate a catalog at 500 rows.
  for($offset=0;$offset<10000;$offset+=500){
   $page=$db->request('GET','products',$query+['offset'=>$offset]);
   foreach($page as $row){$public=array_intersect_key($row,array_flip(['id','name','category','description','image','price_cents','stock','active','catalog_attributes']));$public['catalog_attributes']=is_array($row['catalog_attributes']??null)?$row['catalog_attributes']:[];$products[]=$public;}
   if(count($page)<500)respond($products);
  }
  throw new HttpError(503,'Catálogo muito amplo. Refine os filtros por categoria ou preço.');
 }

 if (preg_match('~^/api/products/([^/]+)/reviews$~',$path,$m) && in_array($method,['GET','POST'],true)) {
  $id=Validation::product($m[1]);
  $product=$db->request('GET','products',['id'=>'eq.'.$id,'active'=>'eq.true','limit'=>1]);
  if(!$product)throw new HttpError(404,'Produto não encontrado.');
  $token=$_COOKIE['browth_review_visitor']??'';
  if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token)) {
   $token=bin2hex(random_bytes(32));
   setcookie('browth_review_visitor',$token,['expires'=>time()+31536000,'path'=>'/','secure'=>str_starts_with(env('APP_ORIGINS'), 'https://')||(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'httponly'=>true,'samesite'=>'Lax']);
  }
  $visitor=hash('sha256',$token);
  if($method==='POST') {
   RateLimit::check('review:'.$visitor,5);
   RateLimit::check('review-ip:'.($_SERVER['REMOTE_ADDR']??'unknown'),20);
   $data=body();$name=$data['author_name']??null;$comment=$data['comment']??null;$rating=$data['rating']??null;
   if(!is_string($name)||!is_string($comment)||!is_int($rating)||$rating<1||$rating>5)throw new HttpError(422,'Informe nome, comentário e nota de 1 a 5.');
   $name=trim($name);$comment=trim($comment);
   if(mb_strlen($name)<2||mb_strlen($name)>80||mb_strlen($comment)<10||mb_strlen($comment)>2000)throw new HttpError(422,'Use um nome de 2 a 80 caracteres e um comentário de 10 a 2000 caracteres.');
   $db->request('POST','product_reviews',['on_conflict'=>'product_id,visitor_hash'],['product_id'=>$id,'visitor_hash'=>$visitor,'author_name'=>$name,'rating'=>$rating,'comment'=>$comment,'updated_at'=>gmdate('c')],'resolution=merge-duplicates,return=minimal');
   $product=$db->request('GET','products',['id'=>'eq.'.$id,'limit'=>1]);
  }
  $offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100000]]);
  if($offset===false)throw new HttpError(422,'Página inválida.');
  $fields='id,author_name,rating,comment,created_at,updated_at';
  $rows=$db->request('GET','product_reviews',['product_id'=>'eq.'.$id,'published'=>'eq.true','select'=>$fields,'order'=>'created_at.desc,id.asc','offset'=>$offset,'limit'=>11]);
  $own=$db->request('GET','product_reviews',['product_id'=>'eq.'.$id,'visitor_hash'=>'eq.'.$visitor,'select'=>$fields.',published','limit'=>1]);
  $attrs=$product[0]['catalog_attributes']??[];
  respond(['reviews'=>array_slice($rows,0,10),'has_more'=>count($rows)>10,'own'=>$own[0]??null,'summary'=>['average'=>$attrs['rating']??null,'count'=>$attrs['rating_count']??0]]);
 }
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
