/**
 * servir.js — abre o site num endereço que o telemóvel consegue abrir.
 * =====================================================================
 * ── PARA QUE É QUE ISTO SERVE ────────────────────────────────────────
 * A F-27 pede para experimentar tudo num telemóvel real, e isso não se
 * faz abrindo os ficheiros com duplo clique: um ficheiro aberto assim
 * fica em `file:///C:/...`, que só existe neste computador e que o
 * telemóvel não alcança de maneira nenhuma. Além disso o navegador
 * trata `file://` como origem especial e bloqueia parte do que a
 * aplicação faz (o `localStorage` entre páginas e o `fetch`), por isso
 * um problema que aparecesse ali podia ser do protocolo e não nosso.
 *
 * Isto põe a pasta `frontend/` num endereço `http://` normal, na rede
 * de casa, e escreve no ecrã o endereço a escrever no telemóvel.
 *
 * ── NÃO SUBSTITUI O BACKEND ──────────────────────────────────────────
 * Serve ficheiros e mais nada: não responde a `/api/...`. Não precisa,
 * porque o `MODO_SIMULACAO` continua ligado e o `api.js` responde
 * sozinho a tudo o que ainda não está no servidor. Quando quiseres
 * experimentar contra a API verdadeira, põe o backend a correr ao lado
 * (`npm start` na pasta `backend`) — são dois programas em dois portos
 * diferentes, e não se estorvam.
 *
 * ── CORRER ───────────────────────────────────────────────────────────
 *   node frontend/servir.js
 *   node frontend/servir.js 8080      (outro porto, se o 5173 estiver ocupado)
 *
 * O computador e o telemóvel têm de estar na MESMA rede Wi-Fi. Se o
 * endereço não abrir no telemóvel, é quase sempre o firewall do Windows
 * a pedir autorização na primeira vez — autoriza em "redes privadas".
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = __dirname;                       // a pasta `frontend`
const PORTO = Number(process.argv[2]) || 5173;

/* Tipos. O que não estiver aqui vai como `application/octet-stream`, que
 * o navegador descarrega em vez de interpretar — é o lado seguro: mais
 * vale um ficheiro que não abre do que um script servido como texto. */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

/* Onde é que isto abre, para a página inicial não ser uma lista de
 * pastas. A `index.html` do cliente é o sítio por onde se entra. */
const ENTRADA = '/cliente/index.html';

/**
 * Quão provável é que o telemóvel alcance este endereço. Menor é melhor.
 *
 * Esta ordem não é enfeite. À primeira tentativa este computador
 * mostrou `169.254.83.107 (Tailscale)` em cima e `192.168.0.20
 * (Ethernet 2)` em baixo, e eu dizia "experimenta de cima para baixo" —
 * ou seja, mandava-o começar pelo único endereço que NÃO podia
 * funcionar. O 169.254.x.x é o que uma placa de rede inventa quando não
 * recebeu endereço nenhum, e não é alcançável a partir de outro
 * aparelho. Os 192.168.x.x, 10.x.x.x e 172.16-31.x.x são os da rede de
 * casa, e é um desses que o telemóvel precisa.
 */
function pontuar(ip) {
  if (/^169\.254\./.test(ip)) return 3;                        // sem endereço
  if (/^192\.168\./.test(ip)) return 0;                        // rede de casa
  if (/^10\./.test(ip)) return 0;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 0;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return 2;  // VPN (Tailscale)
  return 1;
}

function enderecosDaRede() {
  const fora = [];
  for (const [nome, lista] of Object.entries(os.networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) {
        fora.push({ nome, ip: i.address, peso: pontuar(i.address) });
      }
    }
  }
  return fora.sort((a, b) => a.peso - b.peso);
}

/**
 * Traduz o caminho pedido num ficheiro dentro da RAIZ — ou em `null`.
 *
 * O `null` é a parte que importa. Um pedido pode trazer `../../` ou
 * `%2e%2e%2f` e tentar ler ficheiros de fora da pasta (as chaves do
 * `.env`, por exemplo). Por isso o caminho é resolvido primeiro e só
 * depois comparado com a raiz: se não ficar debaixo dela, não se serve.
 * Isto é um servidor de teste, mas vai estar aberto à rede de casa.
 */
function resolver(url) {
  let pedido;
  try {
    pedido = decodeURIComponent(new URL(url, 'http://x').pathname);
  } catch {
    return null;                              // percentagens mal escritas
  }
  if (pedido === '/') pedido = ENTRADA;

  const destino = path.resolve(RAIZ, '.' + pedido);
  const dentro = destino === RAIZ || destino.startsWith(RAIZ + path.sep);
  if (!dentro) return null;

  let st;
  try {
    st = fs.statSync(destino);
  } catch {
    return null;
  }
  if (st.isDirectory()) {
    const indice = path.join(destino, 'index.html');
    return fs.existsSync(indice) ? indice : null;
  }
  return st.isFile() ? destino : null;
}

const servidor = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Só GET. Isto serve ficheiros, não recebe nada.');
  }

  const ficheiro = resolver(req.url);
  if (!ficheiro) {
    console.log(`  404  ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(
      '<meta charset="utf-8"><title>404</title>' +
      '<p style="font:16px system-ui;padding:2rem">Não existe aqui: <code>' +
      String(req.url).replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;')) +
      '</code></p><p style="font:16px system-ui;padding:0 2rem">' +
      `<a href="${ENTRADA}">Voltar ao início</a></p>`);
  }

  const tipo = TIPOS[path.extname(ficheiro).toLowerCase()] || 'application/octet-stream';
  const tamanho = fs.statSync(ficheiro).size;

  /* Sem cache. Durante a F-27 vou mexer no CSS e voltar a carregar no
   * telemóvel dezenas de vezes; se o telemóvel guardar a folha antiga,
   * passo a tarde a afinar uma coisa que já estava feita. */
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': tamanho,
    'Cache-Control': 'no-store',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(ficheiro).pipe(res);
});

servidor.on('error', erro => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`\nO porto ${PORTO} já está ocupado por outro programa.`);
    console.error(`Experimenta:  node frontend/servir.js ${PORTO + 1}\n`);
    process.exit(1);
  }
  throw erro;
});

servidor.listen(PORTO, '0.0.0.0', () => {
  const linha = '─'.repeat(58);
  console.log(`\n${linha}`);
  console.log(`  Pasta servida:  ${RAIZ}`);
  console.log(`  Neste PC:       http://localhost:${PORTO}${ENTRADA}`);
  const rede = enderecosDaRede();
  if (rede.length === 0) {
    console.log('  No telemóvel:   (não encontrei nenhum endereço de rede —');
    console.log('                   o Wi-Fi está ligado?)');
  } else {
    rede.forEach((r, i) => {
      const etiqueta = i === 0 ? '  No telemóvel:  ' : '                 ';
      const nota = r.peso === 3 ? '  ← esta placa não tem endereço; não vai dar'
                 : r.peso === 2 ? '  ← VPN, só dá se o telemóvel estiver nela'
                 : '';
      console.log(`${etiqueta} http://${r.ip}:${PORTO}${ENTRADA}   (${r.nome})${nota}`);
    });
    if (rede.length > 1) {
      console.log('                  (há mais do que uma; a primeira é a mais provável)');
    }
  }
  console.log(`${linha}`);
  console.log('  Ctrl+C para parar.\n');
});
