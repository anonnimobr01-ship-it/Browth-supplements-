<?php
declare(strict_types=1);
namespace Browth;
final class RateLimit {
 public static function check(string $key,int $limit): void {
  $dir=dirname(__DIR__).'/storage/rate';
  if (!is_dir($dir) && !@mkdir($dir,0700,true) && !is_dir($dir)) throw new HttpError(503,'Servidor temporariamente indisponível.');
  $file=$dir.'/'.hash('sha256',$key).'.json';$fp=fopen($file,'c+');
  if (!$fp || !flock($fp,LOCK_EX)) throw new HttpError(503,'Servidor temporariamente indisponível.');
  try {
   $state=json_decode(stream_get_contents($fp),true);$now=time();
   if (!$state || $now-($state['start']??0)>=60) $state=['start'=>$now,'count'=>0];
   if (++$state['count']>$limit) {header('Retry-After: 60');throw new HttpError(429,'Muitas tentativas. Aguarde um minuto.');}
   ftruncate($fp,0);rewind($fp);fwrite($fp,json_encode($state));
  } finally {flock($fp,LOCK_UN);fclose($fp);}
  if (random_int(1,100)===1) foreach (glob($dir.'/*.json')?:[] as $old) if (filemtime($old)<$now-3600) @unlink($old);
 }
}
