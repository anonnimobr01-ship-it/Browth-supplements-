<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require dirname(__DIR__).'/src/bootstrap.php';
try {
 if ($argc!==3 || !in_array($argv[2],['paid','shipped','cancelled'],true)) throw new RuntimeException('Uso: php bin/order.php UUID paid|shipped|cancelled');
 database()->rpc('transition_order',['p_id'=>Browth\Validation::uuid($argv[1]),'p_status'=>$argv[2]]);
 echo "Pedido atualizado. Confirme pagamento no banco antes de usar paid.\n";
} catch (Throwable $e) {fwrite(STDERR,$e->getMessage()."\n");exit(1);}
