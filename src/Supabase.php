<?php
declare(strict_types=1);
namespace Browth;
final class Supabase {
 public function __construct(private string $url,private string $key) {
  if (!preg_match('~^https://[a-z0-9-]+\.supabase\.co$~D',$url) || !$key) throw new HttpError(503,'Banco de dados não configurado no servidor.');
 }
 public function request(string $method,string $path,array $query=[],?array $body=null,string $prefer=''): mixed {
  $curl=curl_init($this->url.'/rest/v1/'.$path.($query?'?'.http_build_query($query,'','&',PHP_QUERY_RFC3986):''));
  $headers=['apikey: '.$this->key,'Content-Type: application/json','Accept: application/json'];
  // Chaves secretas novas usam apikey; JWT service_role legado também usa Bearer.
  if (!str_starts_with($this->key,'sb_secret_')) $headers[]='Authorization: Bearer '.$this->key;
  if ($prefer) $headers[]='Prefer: '.$prefer;
  curl_setopt_array($curl,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>20,CURLOPT_FOLLOWLOCATION=>false]);
  if ($body!==null) curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($body,JSON_THROW_ON_ERROR));
  $raw=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);
  if ($raw===false || $status===0) throw new HttpError(503,'Banco indisponível. Tente novamente.');
  $data=json_decode($raw,true);
  if ($status>=400) {
   $message=is_array($data)?($data['message']??''):'';
   foreach (['INSUFFICIENT_STOCK'=>'Estoque insuficiente. Revise o carrinho.','PRODUCT_UNAVAILABLE'=>'Produto indisponível.','EMPTY_CART'=>'O carrinho está vazio.','PRICE_CHANGED'=>'Os valores mudaram. Atualize o checkout.','IDEMPOTENCY_CONFLICT'=>'Esta tentativa pertence a outro pedido. Reabra o checkout.','CART_LIMIT'=>'Limite de 50 produtos por carrinho.','INVALID_TRANSITION'=>'Mudança de status não permitida.','ORDER_NOT_FOUND'=>'Pedido não encontrado.'] as $code=>$text) {
    if (str_contains($message,$code)) throw new HttpError(409,$text);
   }
   error_log('Supabase HTTP '.$status.' code '.($data['code']??'unknown'));
   throw new HttpError(503,'Não foi possível acessar os dados. Verifique a configuração do servidor.');
  }
  return $data;
 }
 public function rpc(string $name,array $params): mixed {return $this->request('POST','rpc/'.$name,[],$params);}
}
