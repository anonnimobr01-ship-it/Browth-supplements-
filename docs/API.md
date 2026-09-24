# API REST

Base `/api`. Respostas JSON. Erros: `{ "error": "mensagem" }`. Não envie senha, uid, preço unitário ou status do pedido no corpo; autenticação é exclusiva do Firebase e preços são lidos do banco.

Rotas privadas exigem `Authorization: Bearer FIREBASE_ID_TOKEN`. O frontend solicita token atual ao Firebase SDK e faz uma renovação forçada somente após 401. CORS aceita exclusivamente as origens separadas por vírgula em `APP_ORIGINS`; Bearer não usa cookies de sessão PHP.

| Método | Rota | Acesso | Função |
|---|---|---|---|
| GET | `/health` | Público | Processo API respondendo; não comprova conexão com serviços |
| GET | `/config` | Público | Configuração Firebase Web, frete e instruções Pix; nunca segredos |
| GET | `/products` | Público | Até 500 produtos ativos; busca/ordenação na interface |
| GET | `/products/{id}` | Público | Um produto ativo |
| GET | `/me` | Privado | Perfil derivado do Firebase; sincroniza perfil no Supabase |
| GET | `/cart` | Privado | Carrinho do titular com produtos e preços atuais |
| PUT | `/cart/{id}` | Privado | Quantidade absoluta `{ "quantity": 2 }`; zero remove |
| GET | `/quote` | Privado | Subtotal, frete e total em centavos; verifica disponibilidade |
| POST | `/orders` | Privado | Cria pedido transacional/idempotente |
| GET | `/orders?offset=0` | Privado | 20 pedidos próprios por página |
| GET | `/orders/{uuid}` | Privado | Pedido próprio e itens; de outro usuário retorna 404 |

POST `/orders` requer `Idempotency-Key: UUID` e corpo:

```json
{
  "expected_total_cents": 11980,
  "address": {
    "name": "Nome do destinatário",
    "phone": "34999991234",
    "cep": "38400000",
    "street": "Rua Exemplo",
    "number": "10",
    "complement": "",
    "district": "Centro",
    "city": "Uberlândia",
    "state": "MG"
  }
}
```

`expected_total_cents` é apenas o total que o cliente confirmou: nunca substitui o preço do banco. Se não corresponder ao cálculo da transação, retorna 409. Carrinho vazio, falta de estoque, produto inativo e conflito de chave também retornam 409. Repetir chave e conteúdo retorna o mesmo pedido (201) sem nova baixa de estoque; reutilizar a chave com conteúdo diferente falha.

O frontend preserva chave e conteúdo da tentativa em sessionStorage até confirmar sucesso. Após falha ambígua de rede, repita sem alterar dados ou consulte Meus pedidos antes de iniciar outra compra.

HTTPs principais: 400 JSON inválido; 401 token inválido/ausente; 403 origem; 404 inexistente/não pertence ao usuário; 405 método; 409 conflito comercial; 413 corpo excessivo; 415 mídia; 422 validação; 429 limite; 503 configuração/serviço indisponível.

Limites locais por minuto: 180 requisições/IP, até 120 acessos/usuário (mutações aplicam limite 40), 10 tentativas de checkout/usuário. A implementação em arquivo atende instância única; em múltiplas instâncias configure limitação compartilhada na infraestrutura. Não confia em X-Forwarded-For enviado pelo cliente.
