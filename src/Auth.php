<?php
declare(strict_types=1);
namespace Browth;
use Kreait\Firebase\Factory;
final class Auth {
 public static function user(): array {
  $header=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';
  if (!preg_match('/^Bearer (\S+)$/D',$header,$matches)) throw new HttpError(401,'Entre na sua conta para continuar.');
  $file=env('FIREBASE_CREDENTIALS');
  if (!preg_match('~^(?:/|[a-zA-Z]:[\\\\/])~',$file)) $file=dirname(__DIR__).'/'.$file;
  if (!is_file($file) || !env('FIREBASE_PROJECT_ID')) throw new HttpError(503,'Autenticação não configurada no servidor.');
  try {
   $auth=(new Factory())->withServiceAccount($file)->withProjectId(env('FIREBASE_PROJECT_ID'))->createAuth();
   $token=$auth->verifyIdToken($matches[1],true);
   $uid=$token->claims()->get('sub');
   $record=$auth->getUser($uid);
   return ['uid'=>$uid,'email'=>$record->email??'','name'=>$record->displayName??''];
  } catch (\Kreait\Firebase\Exception\Auth\FailedToVerifyToken|\Kreait\Firebase\Exception\Auth\RevokedIdToken|\Kreait\Firebase\Exception\Auth\UserNotFound|\Kreait\Firebase\Exception\Auth\UserDisabled $e) {
   throw new HttpError(401,'Sessão inválida ou expirada. Entre novamente.');
  } catch (\Throwable $e) {throw new HttpError(503,'Não foi possível verificar a sessão agora.');}
 }
}
