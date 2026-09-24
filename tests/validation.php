<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/HttpError.php';
require dirname(__DIR__).'/src/Validation.php';
use Browth\{Validation,HttpError};
$checks=0;
function check(bool $condition,string $description): void {global $checks;if(!$condition)throw new RuntimeException($description);$checks++;}
function reject(callable $fn): void {try{$fn();}catch(HttpError $e){check($e->status===422,'HTTP 422 esperado');return;}throw new RuntimeException('Entrada inválida aceita');}
check(Validation::quantity(0)===0,'Remover item');check(Validation::quantity(100)===100,'Limite aceito');
foreach([-1,101,1.5,'2',true,null] as $input)reject(fn()=>Validation::quantity($input));
check(Validation::product('vitaminaMorango')==='vitaminaMorango','ID original preservado');reject(fn()=>Validation::product('../profiles'));
reject(fn()=>Validation::uuid('pedido-invalido'));
$address=['name'=>'Pedro','phone'=>'(34) 99999-1234','cep'=>'38400-000','street'=>'Rua Exemplo','number'=>'10','complement'=>'','district'=>'Centro','city'=>'Uberlândia','state'=>'mg'];
$a=Validation::address($address);check($a['cep']==='38400000'&&$a['state']==='MG','Normalização');
reject(fn()=>Validation::address([...$address,'cep'=>'123']));reject(fn()=>Validation::address([...$address,'state'=>'ZZ']));reject(fn()=>Validation::address([...$address,'name'=>['x']]));
reject(fn()=>Validation::address([...$address,'name'=>str_repeat('a',121)]));
echo "$checks verificações passaram.\n";
