# Regras para o Claude neste repositório

> **Porque é que este ficheiro existe.** A 29/10 o Guilherme disse: *"andas a gastar
> muito, pareces a gasolina"*. Tinha razão. As regras abaixo não são conselhos gerais —
> **cada uma vem de um desperdício que eu cometi mesmo neste projeto**, e está escrito
> qual foi. Uma regra sem o erro que a motivou é a primeira a ser ignorada.
>
> O ficheiro é lido automaticamente no início de cada sessão. **Ler isto custa menos de
> 2 000 tokens; não ler custou-me mais de 30 000 num só dia.**

---

## 1 · NUNCA leias estes ficheiros inteiros

| Ficheiro | KB | O que fazer |
|---|---|---|
| `frontend/cliente/css/tailwind.css` | 100+ | **Nunca.** É gerado e minificado: uma linha só. |
| `docs/TAREFAS.md` | 229 | Só intervalos de linhas, ou contar com `node -e`. **Uma linha deste ficheiro chega a ter 4 000 caracteres.** |
| `docs/RELATORIO.docx` · `docs/apresentacao.pptx` | 1 MB cada | Só por `python-docx`/`python-pptx`, e só a parte precisa. |
| `package-lock.json` | — | Nunca. |
| `database/diagrama-er.png` | 442 | É uma imagem: só com o Read se **precisares mesmo de ver**. |

**O erro que gerou esta regra:** corri `findstr /s /n /i "dialog" css\*.css *.html` para saber
se o `<dialog>` já era usado nas páginas do cliente. Apanhou o `tailwind.css` minificado
e **despejou o ficheiro inteiro na resposta** — uma linha de 100 KB. A pergunta
respondia-se com `git grep -l dialog -- frontend/cliente` em 20 tokens.

**A regra prática:** limita sempre o alvo antes de procurar, e prefere `-l` (só nomes) a
ver linhas. Se precisas de linhas, exclui o que é gerado:

```
git grep -n "coisa" -- frontend/cliente ":(exclude)*tailwind.css"
```

---

## 2 · Conta, não listes

Antes de pedir uma lista, pergunta se um número chega. Quase sempre chega.

- `git status --short | find /c /v ""` em vez de `git status`
- `git grep -c` em vez de `git grep -n`
- Um `node -e` que imprime **só a resposta** em vez de texto para eu filtrar depois

**O erro:** pedi a lista completa das tarefas abertas três vezes na mesma sessão quando
duas delas só precisavam do total. O `npm run tarefas` dá o resumo em 10 linhas.

---

## 3 · O `node -e` é mais barato do que o `findstr`

Num `node -e` eu decido o que sai. Num `findstr` sai a linha toda, e neste repositório as
linhas são enormes.

```
node -e "const{execSync}=require('child_process');..."   // imprime 3 linhas
findstr /n "X-27" docs\TAREFAS.md                        // imprime 4 000 caracteres
```

**E o `findstr` do Windows parte-se com `--`, `/` e aspas dentro do padrão.** Já me
custou três tentativas falhadas seguidas numa só pergunta. Em caso de dúvida: `node -e`.

---

## 4 · Correr os testes: alvo primeiro, suite toda só antes de entregar

- `node frontend/testes/contar.js` → **28 suites, ~18 minutos**, cada uma abre um Chromium.
- Depois de mexer no CSS ou no HTML de uma página, corre **as 2 ou 3 suites que tocam
  nessa página** (`git grep -l nome-da-pagina -- frontend/testes`), não as 28.
- A contagem completa é para **antes de entregar** e para fechar o X-27, não para cada
  alteração.
- O `contar.js` retoma: se uma corrida for interrompida, a seguinte salta o que já mediu.

---

## 5 · Levar a árvore para o contentor: um `tar`, e só quando muda

As suites correm num contentor Linux; o repositório está no Windows do Guilherme.

```
tar -cf _tmp\arvore.tar frontend assets      # no Windows
tar -xf .../arvore.tar                       # no contentor
```

- **`frontend` E `assets`.** Levei só o `frontend` uma vez e 21 verificações reprovaram
  porque as fotografias não existiam — quase reportei 21 falhas inventadas.
- **Mudou um ficheiro só? Leva esse ficheiro só** (`device_stage_files`), não a árvore de
  5 MB. Fiz o tar completo quatro vezes num dia por preguiça.

---

## 6 · Lê o ficheiro uma vez

Depois de um `edit_block`, o resultado **já mostra** o estado do ficheiro à volta da
alteração. Não voltes a lê-lo para confirmar. O `Edit` dá erro se não aplicar.

**O erro:** reli o `menu.css` e o `menu.js` a seguir a editá-los, por hábito.

---

## 7 · Factos do ambiente — não voltes a descobri-los

Estão aqui para não serem medidos outra vez a cada sessão.

```
Testes (contentor):   NODE_PATH=/home/claude/.npm-global/lib/node_modules
                      PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
                      executablePath: '/opt/pw-browsers/chromium'   ← 24 suites têm isto
                      escrito à mão; só correm no contentor (é a causa do X-26)
Windows:              sem MySQL, sem backend/.env.local  (a "tarde do §4" da folha)
                      o PowerShell come os $ — usa shell: "cmd"
                      o `head` não existe no cmd
npm scripts:          vivem em backend/package.json, NÃO na raiz
Site publicado:       https://vemproabate.vercel.app
API:                  https://vem-pro-abate-api.onrender.com/api  (adormece: 1.ª chamada ~50s)
Mesa 4 (token real):  msa_x5f1s8gy3n     (as dez estão no database/seed.sql)
Repositório:          privado (confirmado pela API do GitHub a 29/10)
```

---

## 8 · Verificar sem gastar

Verificar é obrigatório neste projeto. Barato não é o contrário de rigoroso:

- **Uma medição que imprime um número** vale mais do que um despejo que eu leio.
- **Compara ficheiros com código**, não com os olhos: `ImageChops.difference` disse-me em
  uma linha que duas capturas de 390×844 só diferiam no anel de foco. Olhar para as duas
  imagens custava 3 000 tokens e dava menos certeza.
- **Vê uma imagem quando o que importa é o aspecto** — e aí vê mesmo, que foi assim que
  apanhei o "17 tabelas" no PNG do diagrama. Não cortes aqui.

---

## 9 · Escreve menos ao Guilherme

- A resposta começa pela conclusão. Se ele precisar do porquê, pergunta.
- Mensagens para o João: ele pede-as; não as escrevas por iniciativa própria.
- As mensagens de commit podem ser longas — ficam no repositório e servem o relatório.
  **As respostas no chat não.**

---

## 10 · Coisas deste projeto que não se negoceiam

Estas não são sobre tokens, mas gastam-se mais tokens a repará-las do que a cumpri-las.

- **Medir antes de afirmar.** Nunca escrevas um "porquê" que não mediste (X-28).
- **Controlo negativo** em cada verificação nova: prova que ela sabe reprovar.
- **Empurrar não é publicar** (`npm run publicado`) e **commitar não é empurrar** (X-21).
- **Nunca tocar em `.env`/`.env.local`** — a guarda é por desenho, não a contornes.
- **Não correr `Stop-Process -Name node -Force`**: mata o servidor do estágio dele.
- **Português europeu**, sempre.
