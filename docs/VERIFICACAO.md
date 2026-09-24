# Verificação da entrega — 23/09/2026

## Executado

- PHP 8.3: validação de sintaxe de todos os arquivos próprios, sem erros.
- Testes PHP: 16 verificações passaram (quantidades, IDs, UUID, CEP, UF, campos obrigatórios, tipos inesperados e limites de texto).
- Composer: instalação efetiva, validação do manifesto e auditoria de dependências. O lock foi resolvido para plataforma PHP 8.2, compatível com o mínimo documentado.
- HTTP com servidor PHP: health/config retornam 200; configuração ausente do banco retorna 503; origem não autorizada retorna 403; acesso a `.env`, travessia e caminho de credencial retorna 404.
- SQL em **PGlite, mecanismo PostgreSQL isolado usado só na validação**: schema + seed + teste transacional executados. 17 produtos inseridos. Testados privilégios públicos, preço adulterado, rollback, idempotência, conflito de chave, baixa de estoque, limpeza do carrinho e cancelamento com devolução única de estoque. Esse ambiente de teste não faz parte da aplicação e não precisa ser instalado pelo usuário.
- Navegador Firefox automatizado: busca, adição ao carrinho, alteração de quantidade, persistência após recarregar, compra pela página de produto, bloqueio do checkout na demonstração e erro visível quando falta configuração real. Sem erros JavaScript registrados.
- Interface inspecionada em desktop (1440 px) e celular (390 px). Sem transbordamento horizontal da página no celular. Categorias usam rolagem horizontal intencional.
- Checkout autenticado testado com respostas simuladas de autenticação/API: preenchimento, envio de total/endereço, renovação de token após 401, repetição após falha com mesma chave e detalhe do pedido. Isso verifica a integração da interface, não autenticação externa real.

## Ainda depende dos seus serviços

Não houve login real Google/e-mail, verificação de um token real, criação de tabelas no seu Supabase, acesso à sua Data API, pedido persistido no seu projeto, transação Pix nem deploy. As credenciais antigas não foram utilizadas. O carregamento remoto do visualizador 3D depende de CDN; o modelo e a imagem original foram preservados e a interface trata falha de carregamento.

A instalação do Composer traz bibliotecas Google relacionadas como dependências transitivas do SDK Kreait; a aplicação instancia **somente o componente Auth** e não usa Firestore, Storage ou Realtime Database.

## Aceite após configurar

1. Execute os SQL 001 e 002 no Supabase de teste e, depois, o 003. Verifique o aviso de sucesso e o rollback ao final.
2. Configure `.env` com novas credenciais e rode PHP. Confirme catálogo real sem `?demo=1`.
3. Cadastre duas contas diferentes. Teste logout, login, recuperação de senha e Google no domínio autorizado.
4. Monte um carrinho como visitante, entre e recarregue. Confira que o carrinho foi salvo apenas na conta correta.
5. Adicione produtos e finalize com endereço válido. Confira pedido, itens, total em centavos e baixa de estoque no banco.
6. Em outra conta, consulte o UUID do pedido da primeira pela API: deve retornar 404. Sem Bearer deve retornar 401 quando o backend estiver configurado.
7. Repita POST idêntico com a mesma Idempotency-Key: mesmo pedido e nenhuma baixa adicional. Tente total adulterado e estoque insuficiente: 409 e nenhuma gravação parcial.
8. Confirme pagamento somente após verificar recebimento real. Teste `paid → shipped` e, em outro pedido pendente, `cancelled`; confira estoque devolvido uma única vez.
9. Simule perda de conexão após confirmar: consulte Meus pedidos antes de iniciar nova compra. Verifique responsividade e Google na hospedagem final.

Limite: não foi executado teste de carga/concorrência em múltiplas conexões remotas. A implementação usa bloqueios de estoque em ordem estável e transações; valide a capacidade na infraestrutura escolhida antes de tráfego real.
