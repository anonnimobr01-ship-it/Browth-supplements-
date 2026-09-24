<?php
declare(strict_types=1);
namespace Browth;
final class Validation {
 public static function quantity(mixed $value): int {
  if (!is_int($value) || $value<0 || $value>100) throw new HttpError(422,'Quantidade deve ser um inteiro de 0 a 100.');
  return $value;
 }
 public static function product(string $id): string {
  if (!preg_match('/^[A-Za-z0-9_-]{1,80}$/D',$id)) throw new HttpError(422,'Produto inválido.');
  return $id;
 }
 public static function uuid(string $id): string {
  if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/Di',$id)) throw new HttpError(422,'Identificador inválido.');
  return strtolower($id);
 }
 public static function address(mixed $data): array {
  if (!is_array($data)) throw new HttpError(422,'Preencha o endereço.');
  $out=[];
  foreach (['name'=>120,'phone'=>20,'cep'=>9,'street'=>160,'number'=>20,'complement'=>100,'district'=>100,'city'=>100,'state'=>2] as $key=>$max) {
   if (!is_string($data[$key]??'')) throw new HttpError(422,'Endereço inválido.');
   $value=trim($data[$key]??'');
   if (($key!=='complement' && $value==='') || mb_strlen($value)>$max || preg_match('/[\x00-\x1f]/',$value)) throw new HttpError(422,'Verifique o campo: '.$key.'.');
   $out[$key]=$value;
  }
  $out['cep']=preg_replace('/\D/','',$out['cep']);$out['phone']=preg_replace('/\D/','',$out['phone']);$out['state']=strtoupper($out['state']);
  if (!preg_match('/^\d{8}$/D',$out['cep']) || !preg_match('/^\d{10,11}$/D',$out['phone']) || !in_array($out['state'],explode(' ','AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'),true)) throw new HttpError(422,'Confira CEP, telefone com DDD e UF.');
  return $out;
 }
}
