# Configuração inicial do painel ADM

1. Execute no SQL Editor do Supabase a migração `supabase/migrations/20261106160000_admin_access.sql`.
2. Faça login no site com a conta que será o primeiro administrador. Isso sincroniza o UID, nome e e-mail na tabela `profiles`.
3. No Firebase Console, localize o usuário em Authentication → Users e copie o UID.
4. No Supabase SQL Editor, execute substituindo o UID pelo valor copiado:

```sql
INSERT INTO public.admin_users (uid)
VALUES ('COLE_AQUI_O_UID_FIREBASE');
```

5. Acesse `https://SEU-DOMINIO/admin.html` e entre com a conta autorizada.

A tabela tem RLS habilitado, sem políticas para usuários públicos. Somente a API PHP, após validar o Firebase ID token e consultar `admin_users`, concede acesso. Não adicione políticas públicas e não coloque a chave secreta do Supabase no navegador.

Administradores adicionais podem ser cadastrados no painel, desde que já tenham feito login uma vez. Um administrador não pode remover a si próprio e o último administrador não pode ser removido. Para recuperação de acesso, use o procedimento SQL com um UID verificado no Firebase Console.
