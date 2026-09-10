# Lista de testes — C-13

**Vem Pro Abate** · escrita a 10 de setembro de 2026

> **Para que serve.** Esta lista é o guião do **C-14** (sessão de robustez) e do **C-15**
> (browsers e telemóveis). Existe por escrito por uma razão simples: testar de cabeça é
> testar o que se lembra, e o que se lembra é o que já se sabe que funciona.
>
> **Como marcar.** ✅ passou · ❌ falhou (abrir um X- no `TAREFAS.md`) · ⏭️ não se aplica hoje.
> Um teste que falha **não se corrige a meio da sessão**: anota-se e segue-se. Parar para
> corrigir faz perder o resto da lista, que é onde estão os erros que ninguém previu.

---

## 0 · O que já foi verificado, e como

Isto não é para repetir — é para não se perder. Um teste feito e não registado volta a ser
feito, ou pior, dá-se por feito sem ter sido.

| O quê | Quando | Como |
|---|---|---|
| Ciclo completo à mesa | 08/09 | QR → sessão → ronda → cozinha → stock → conta → fechar, contra o Aiven |
| Ciclo de take away | 10/09 | Encomenda → consulta pelo número → cozinha → confirmar → stock desceu |
| Cadeia de movimentos de stock | 09/09 e 10/09 | Entrada, quebra e consumo por três origens; verificação a zero |
| Último administrador | 09/09 | Recusa quando é o último, passa quando há dois |
| Sessão desativada | 10/09 | O mesmo token deixa de servir na hora e volta a servir quando reativada |
| Reservas, ramos A e B | 10/09 | Horários, lotação, limite dos 3, consulta por código, preço à data |
| Reordenar categorias | 10/09 | Lista completa aceite, lista incompleta recusada com o que falta |

---

## 1 · O cliente à mesa

- [ ] Ler o QR de uma mesa **sem sessão aberta** → abre uma
- [ ] Ler o QR da **mesma mesa noutro telemóvel** → entra na mesma sessão, não cria outra
- [ ] Ler um QR **inventado** (mudar uma letra no endereço) → recusa, sem revelar nada
- [ ] Pedir **um item**, depois **outro** → duas rondas na mesma conta, total somado
- [ ] Pedir **50 itens do mesmo produto** → ou passa, ou recusa com motivo; nunca meio pedido
- [ ] Pedir um produto que **acabou de esgotar** noutro separador → recusa com o nome do produto
- [ ] Pedir **sem nada no carrinho** → o botão não deve deixar
- [ ] **Voltar atrás** no browser a meio do pedido e voltar → carrinho intacto
- [ ] Deixar a página aberta **duas horas** e pedir → responde ou explica; não fica calado
- [ ] Pedir a conta e **tentar pedir mais** → recusa com "chama um empregado"
- [ ] Depois de a conta fechar, **recarregar a página** → não mostra a conta de outra pessoa

## 2 · Take away

- [ ] Encomendar com **nome e telemóvel válidos** → devolve número
- [ ] **Telemóvel com letras** → recusa e **diz que é o telefone** *(era o X-13)*
- [ ] **Nome com 1 caractere** → recusa
- [ ] Consultar **pelo número** → mostra o estado
- [ ] Consultar um **número inventado** → 404, sem revelar nada
- [ ] Confirmar que a resposta **não traz telefone nem email**

## 3 · Reservas

- [ ] Reservar para **amanhã** → passa
- [ ] Reservar para **hoje** → recusa
- [ ] Reservar para **uma segunda-feira** → recusa
- [ ] Reservar para **daqui a 2 anos** → recusa
- [ ] **12 pessoas** → recusa ou encaminha para telefone
- [ ] **Telemóvel com 8 dígitos**, e **com espaços** → o primeiro recusa, o segundo passa
- [ ] **Nome com HTML lá dentro** *(o X-01)* → guardado como texto, nunca executado
- [ ] **4 reservas com o mesmo telemóvel no mesmo dia** → a quarta recusa
- [ ] 4 reservas com o mesmo telemóvel em **dias diferentes** → todas passam
- [ ] Percorrer as **4 páginas da ementa** sem escolher nada → chega ao fim sem rebentar
- [ ] Voltar da página 4 à 1 → **quantidades preservadas**
- [ ] Reservar até **encher um horário** → o horário seguinte deixa de aparecer disponível

## 4 · Cozinha e balcão

- [ ] **Aceitar** uma ronda → o stock desce **e** fica um movimento com quem aceitou
- [ ] **Anular** uma ronda aceite → o stock volta **e** fica um movimento de reposição
- [ ] Anular uma ronda **ainda não aceite** → não mexe no stock (nada tinha saído)
- [ ] Tentar **recuar** um estado (`entregue` → `pronto`) → recusa e diz quais são os válidos
- [ ] **Dois separadores** a aceitar a mesma ronda ao mesmo tempo → um passa, o outro explica
- [ ] Aceitar uma ronda cujo stock **acabou entretanto** → recusa com o nome do produto
- [ ] Uma ronda com **28 minutos** → aparece a vermelho *(era o X-15)*
- [ ] Fechar uma sessão → **o total congela** e não muda se um preço mudar depois

## 5 · Aplicação de gestão

- [ ] Login com **6 tentativas erradas** → bloqueia à quinta, e só aquela conta
- [ ] Login com um email **que não existe** → demora o mesmo que uma password errada
- [ ] Aceder ao dashboard **sem sessão** → manda para o login
- [ ] Entrar como **cozinha** e abrir um ecrã de administração pelo endereço → 403
- [ ] Chamar `gestao/mesas/qrcodes` com sessão de **cozinha** → 403
- [ ] Fazer um **acerto** de stock com sessão de cozinha → 403 com alternativa explicada
- [ ] Deixar o dashboard aberto **9 horas** → o token expira e manda para o login
- [ ] **Desativar uma categoria com produtos** → recusa à primeira, com o número
- [ ] Confirmar e **contar a ementa do cliente** antes e depois → desceu exactamente esse número
- [ ] Editar o **preço** de um produto com stock → a quantidade **não** muda
- [ ] Mandar `quantidade_atual` no PATCH do produto → 400, e **o preço também não passa**
- [ ] Criar um produto com stock → aparece um **movimento nº 1** com `antes = 0`
- [ ] **Desativar o único administrador** → recusa, com a mensagem na segunda pessoa
- [ ] Promover outra conta e repetir → passa

## 6 · Dados e limites

- [ ] **Observações com 500 caracteres** → guardadas ou recusadas com limite; nunca cortadas em silêncio
- [ ] Nome de categoria **repetido**, com acentos ou maiúsculas diferentes → recusa
- [ ] Preço com **três casas decimais** → arredondado no servidor
- [ ] Preço **negativo** → recusa
- [ ] Recriar a base e **contar**: 18 tabelas, 1 vista, 25 produtos, 15 movimentos
- [ ] Verificar a **cadeia de movimentos** → as duas consultas a zero

## 7 · Browsers e ecrãs *(C-15)*

- [ ] Chrome, Edge, Firefox — os três ecrãs de gestão e a página da mesa
- [ ] **Safari num iPhone** — é o que mais difere, e metade dos clientes usa-o
- [ ] Android real *(a F-27, nunca feita)*
- [ ] 1920, 1440, 768 e 390 px de largura → **sem scroll horizontal**
- [ ] Nenhum alvo de toque abaixo de **44 px**
- [ ] A janela de "Ajustar stock" **abre centrada** *(estava encostada ao canto)*

## 8 · Sem internet *(parte do C-27)*

- [ ] Wi-Fi **desligado**: seguir a `FOLHA-EMERGENCIA.md` do princípio ao fim
- [ ] Confirmar que as páginas **não caem** sem as fontes do Google — e ver como ficam *(a F-68)*
- [ ] Confirmar que **nenhum ecrã** tenta a nuvem e fica à espera
- [ ] Cronometrar: **quanto tempo** do portátil fechado até ao primeiro pedido na cozinha

---

## O que esta lista não cobre, e é de propósito

**Carga.** Não vamos simular 200 pessoas a pedir ao mesmo tempo. O restaurante tem 10 mesas,
e o que interessa testar é o que acontece com **duas pessoas ao mesmo tempo** — que é o caso
real e é onde estão os erros de concorrência que já apanhámos.

**Segurança a sério.** Não somos auditores. Testam-se as coisas que sabemos ter feito de
propósito (as permissões, o HTML no nome, a injeção pelos `?`), não as que não sabemos.

**O que só o Guilherme pode julgar.** O aspecto. Está fora daqui porque não se marca com
✅ ou ❌.
