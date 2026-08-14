#!/usr/bin/env node
// Gera os SVGs do README de perfil (estilo terminal charmbracelet).
// Uso: node gen-assets.js <dir-de-saida>

const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/home/user/alessandrocaetanob/assets';

// ── paleta (charmtone + clássicos lipgloss) ─────────────────────────────
const C = {
  bg: '#201F26',      // Pepper
  bg2: '#2D2C36',     // BBQ
  line: '#3A3943',    // Char
  fg: '#FFFAF1',      // Butter
  muted: '#858392',   // Squid
  purple: '#6B50FF',  // Charple
  purple2: '#7D56F4', // roxo clássico lipgloss
  lilac: '#C5ADF9',
  pink: '#FF5F87',
  pink2: '#F25D94',
  magenta: '#FF60FF', // Dolly
  mint: '#00FFB2',    // Julep
  green: '#04B575',
  yellow: '#FDD877',
  blue: '#00A4FF',    // Malibu
};

const MONO = `'JetBrains Mono','Fira Code','Cascadia Code','SF Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// digitação: revela o comando caractere a caractere via máscara com passos
// discretos. O markup guarda o estado final (largura cheia, com folga p/
// fontes mais largas) e a animação parte de 0 com begin="0s": em qualquer
// renderizador sem SMIL o conteúdo aparece completo, estático.
let maskSeq = 0;
const SLACK = 40;
function typing(x, y, h, nChars, cw, begin, cps = 20) {
  const id = `typ${maskSeq++}`;
  const T = nChars / cps;
  const total = begin + T;
  const full = (nChars * cw + SLACK).toFixed(1);
  const vals = ['0'];
  const keys = ['0'];
  for (let i = 1; i < nChars; i++) {
    vals.push((i * cw).toFixed(1));
    keys.push(((begin + ((i - 1) * T) / nChars) / total).toFixed(4));
  }
  vals.push(full);
  keys.push(((begin + ((nChars - 1) * T) / nChars) / total).toFixed(4));
  const mask = `<mask id="${id}"><rect x="${x}" y="${y}" width="${full}" height="${h}" fill="white"><animate attributeName="width" values="${vals.join(';')}" keyTimes="${keys.join(';')}" calcMode="discrete" dur="${total.toFixed(2)}s" begin="0s" fill="freeze"/></rect></mask>`;
  return { id, mask, end: total };
}

// fade + deslize com atraso embutido nos keyTimes (begin="0s"): sem SMIL,
// o elemento fica no estado final visível do markup.
function fadeSlide(delay, dy = 8, dur = 0.4) {
  const total = delay + dur;
  const p = (delay / total).toFixed(4);
  return `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${p};1" dur="${total.toFixed(2)}s" begin="0s" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="0 ${dy};0 ${dy};0 0" keyTimes="0;${p};1" dur="${total.toFixed(2)}s" begin="0s" fill="freeze"/>`;
}

// aparição simples (sem deslize), mesmo padrão de degradação graciosa
function fadeIn(delay, dur = 0.3) {
  const total = delay + dur;
  const p = (delay / total).toFixed(4);
  return `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${p};1" dur="${total.toFixed(2)}s" begin="0s" fill="freeze"/>`;
}

// estrela de quatro pontas (substitui o caractere ✦, que vira tofu em
// algumas fontes móveis)
function sparkle(x, y, scale, cor, animVals, dur, delay = 0) {
  const begin = delay ? ` begin="${delay}s"` : '';
  return `<path d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z" fill="${cor}" transform="translate(${x} ${y}) scale(${scale})"><animate attributeName="opacity" values="${animVals}" dur="${dur}s"${begin} repeatCount="indefinite"/></path>`;
}

// janela de terminal estilo charm
function chrome(w, h, title, gradId) {
  return `
  <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="14" fill="${C.bg}" stroke="url(#${gradId})" stroke-width="2.5"/>
  <circle cx="30" cy="30" r="6.5" fill="${C.pink}"/>
  <circle cx="52" cy="30" r="6.5" fill="${C.yellow}"/>
  <circle cx="74" cy="30" r="6.5" fill="${C.green}"/>
  <text x="${w / 2}" y="35" text-anchor="middle" font-family="${MONO}" font-size="13.5" fill="${C.muted}">${esc(title)}</text>
  <line x1="3" y1="50" x2="${w - 3}" y2="50" stroke="${C.line}" stroke-width="1.4"/>`;
}

const borderGrad = (id) => `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.pink}"/>
      <stop offset="50%" stop-color="${C.magenta}"/>
      <stop offset="100%" stop-color="${C.purple}"/>
    </linearGradient>`;

// ════════════════════════════════════════════════════════════════════════
// 1. header.svg
// ════════════════════════════════════════════════════════════════════════
function header() {
  const W = 840, H = 310, X = 36;
  maskSeq = 0;
  const t1 = typing(X, 78, 26, 8, 10.4, 0.4);           // $ whoami
  const t2 = typing(X, 196, 26, 14, 10.4, 2.7);         // $ cat foco.txt

  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Terminal: Alessandro Caetano Beltrão, Cloud &amp; Infrastructure Engineer. Foco em IA, DevOps, Kubernetes e Azure.">
  <defs>
    ${borderGrad('hdrBorder')}
    <linearGradient id="nomeGrad" x1="${X}" y1="0" x2="480" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${C.pink}"/>
      <stop offset="55%" stop-color="${C.magenta}"/>
      <stop offset="100%" stop-color="${C.lilac}"/>
    </linearGradient>
    <linearGradient id="corpoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF9CE3"/>
      <stop offset="100%" stop-color="${C.pink2}"/>
    </linearGradient>
    ${t1.mask}
    ${t2.mask}
  </defs>

  ${chrome(W, H, 'alessandro@hyperius: ~', 'hdrBorder')}

  <g mask="url(#${t1.id})">
    <text x="${X}" y="97" font-family="${MONO}" font-size="17" fill="${C.mint}">$ <tspan fill="${C.fg}">whoami</tspan></text>
  </g>
  <g>
    <text x="${X}" y="134" font-family="${MONO}" font-size="27" font-weight="bold" fill="url(#nomeGrad)">Alessandro Caetano Beltrão</text>
    ${fadeSlide(t1.end + 0.15)}
  </g>
  <g>
    <text x="${X}" y="163" font-family="${MONO}" font-size="16" fill="${C.lilac}">Cloud &amp; Infrastructure Engineer</text>
    ${fadeSlide(t1.end + 0.45, 6)}
  </g>

  <g mask="url(#${t2.id})">
    <text x="${X}" y="215" font-family="${MONO}" font-size="17" fill="${C.mint}">$ <tspan fill="${C.fg}">cat foco.txt</tspan></text>
  </g>
  <g>
    <text x="${X}" y="245" font-family="${MONO}" font-size="16"><tspan fill="${C.pink}">IA</tspan><tspan fill="${C.muted}"> · </tspan><tspan fill="${C.mint}">DevOps</tspan><tspan fill="${C.muted}"> · </tspan><tspan fill="${C.blue}">Kubernetes</tspan><tspan fill="${C.muted}"> · </tspan><tspan fill="${C.lilac}">Azure</tspan></text>
    ${fadeSlide(t2.end + 0.2, 6)}
  </g>

  <g>
    <text x="${X}" y="281" font-family="${MONO}" font-size="17" fill="${C.mint}">$</text>
    <rect x="${X + 18}" y="267" width="10" height="18" fill="${C.pink}">
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" begin="${(t2.end + 0.8).toFixed(2)}s" repeatCount="indefinite"/>
    </rect>
    ${fadeIn(t2.end + 0.8)}
  </g>

  <!-- sparkles -->
  ${sparkle(628, 105, 1.1, C.lilac, '0.15;1;0.15', 2.8)}
  ${sparkle(793, 146, 0.8, C.pink, '1;0.15;1', 3.4)}
  ${sparkle(650, 252, 0.9, C.mint, '0.3;1;0.3', 3.1, 0.9)}

  <!-- byte, o fantasminha de terminal -->
  <g transform="translate(716 178)">
    <animateTransform attributeName="transform" type="translate" values="716 178; 716 168; 716 178" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"/>
    <ellipse cx="0" cy="54" rx="34" ry="7" fill="#000000" opacity="0.35">
      <animate attributeName="rx" values="34;28;34" dur="2.6s" repeatCount="indefinite"/>
    </ellipse>
    <line x1="0" y1="-58" x2="0" y2="-74" stroke="${C.lilac}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="-80" r="6" fill="${C.lilac}">
      <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="6;7.5;6" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <path d="M -42,32 L -42,-12 C -42,-40 -20,-58 0,-58 C 20,-58 42,-40 42,-12 L 42,32 L 28,22 L 14,32 L 0,22 L -14,32 L -28,22 Z" fill="url(#corpoGrad)" stroke="${C.bg}" stroke-width="3"/>
    <g>
      <ellipse cx="-14" cy="-16" rx="4.5" ry="8" fill="${C.bg}"/>
      <ellipse cx="14" cy="-16" rx="4.5" ry="8" fill="${C.bg}"/>
      <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.92;0.95;0.98;1" dur="4.5s" repeatCount="indefinite"/>
    </g>
    <circle cx="-26" cy="-4" r="5.5" fill="#FFB3DE" opacity="0.85"/>
    <circle cx="26" cy="-4" r="5.5" fill="#FFB3DE" opacity="0.85"/>
    <path d="M -5,-2 Q 0,3 5,-2" stroke="${C.bg}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
  return svg;
}

// ════════════════════════════════════════════════════════════════════════
// 2. carreira.svg — a carreira como um git log
// ════════════════════════════════════════════════════════════════════════
function carreira() {
  const W = 840, H = 352, X = 36;
  const FS = 15, CW = FS * 0.602;
  maskSeq = 100;

  const cmd = 'git log --reverse --oneline carreira';
  const t = typing(X, 72, 24, cmd.length + 2, 17 * 0.602, 0.35, 22);

  // cada linha: [hash, refs (ou null), mensagem]
  const linhas = [
    ['ba5e013', ['tag: unb', C.pink], 'bacharelado em Engenharia de Software · UnB'],
    ['5bda7f3', ['tag: spb', C.pink], 'Software Público Brasileiro · empacotamento p/ Red Hat'],
    ['c1cd0e5', null, 'pipelines de CI/CD para ambientes internos e externos'],
    ['1afa9c2', null, 'infraestrutura p/ Icatu, Nubank, Odontoprev, Carrefour, BMW...'],
    ['c0ffee1', ['tag: coppe', C.pink], 'mestrado em Eng. de Sistemas e Computação · PESC/COPPE/UFRJ'],
    ['a2040f5', ['tag: 4x-azure', C.pink], 'AZ-104 · AZ-204 · AZ-305 · AZ-400'],
    ['7e0a91c', ['HEAD -> agora', C.mint], 'IA · DevOps · Kubernetes'],
  ];

  // valida largura (não pode estourar a janela)
  const budget = Math.floor((W - X - 30) / CW);
  for (const [h2, refs, msg] of linhas) {
    const total = 2 + h2.length + 1 + (refs ? refs[0].length + 3 : 0) + msg.length;
    if (total > budget) throw new Error(`linha longa (${total} > ${budget}): ${msg}`);
  }

  let y = 116;
  const passo = 27;
  let body = '';
  linhas.forEach(([hash, refs, msg], i) => {
    const begin = t.end + 0.25 + i * 0.28;
    const refPart = refs
      ? `<tspan fill="${C.muted}">(</tspan><tspan fill="${refs[1]}">${esc(refs[0])}</tspan><tspan fill="${C.muted}">) </tspan>`
      : '';
    body += `  <g>
    <text x="${X}" y="${y}" font-family="${MONO}" font-size="${FS}"><tspan fill="${C.purple2}">*</tspan> <tspan fill="${C.yellow}">${hash}</tspan> ${refPart}<tspan fill="${C.fg}">${esc(msg)}</tspan></text>
    ${fadeSlide(begin, 7, 0.35)}
  </g>\n`;
    y += passo;
  });

  const fimY = y + 10;
  const cursorBegin = (t.end + 0.25 + linhas.length * 0.28 + 0.3).toFixed(2);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="git log da carreira: Bacharelado em Engenharia de Software na UnB; empacotamento para Red Hat no Software Público Brasileiro; pipelines de CI/CD; infraestrutura para grandes clientes; Mestrado no PESC COPPE/UFRJ; certificações Azure AZ-104, AZ-204, AZ-305 e AZ-400; hoje: IA, DevOps e Kubernetes.">
  <defs>
    ${borderGrad('carBorder')}
    ${t.mask}
  </defs>
  ${chrome(W, H, 'alessandro@hyperius: ~/carreira', 'carBorder')}
  <g mask="url(#${t.id})">
    <text x="${X}" y="89" font-family="${MONO}" font-size="17" fill="${C.mint}">$ <tspan fill="${C.fg}">${cmd}</tspan></text>
  </g>
${body}
  <g>
    <text x="${X}" y="${fimY + 14}" font-family="${MONO}" font-size="16" fill="${C.mint}">$</text>
    <rect x="${X + 17}" y="${fimY}" width="9" height="17" fill="${C.pink}">
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" begin="${cursorBegin}s" repeatCount="indefinite"/>
    </rect>
    ${fadeIn(parseFloat(cursorBegin))}
  </g>
</svg>`;
}

// ════════════════════════════════════════════════════════════════════════
// 3. certificacoes.svg — cards estilo lipgloss
// ════════════════════════════════════════════════════════════════════════
function certificacoes() {
  const W = 840, H = 168;
  const cardW = 198, cardH = 156, gap = 16;
  const certs = [
    { code: 'AZ-104', l1: 'Azure Administrator', nivel: 'Associate', cor: C.lilac },
    { code: 'AZ-204', l1: 'Azure Developer', nivel: 'Associate', cor: C.blue },
    { code: 'AZ-305', l1: 'Azure Solutions Architect', nivel: 'Expert', cor: C.pink },
    { code: 'AZ-400', l1: 'DevOps Engineer', nivel: 'Expert', cor: C.magenta },
  ];

  let body = '';
  certs.forEach((c, i) => {
    const x = i * (cardW + gap);
    const begin = 0.25 + i * 0.18;
    const cx = x + cardW / 2;
    const expert = c.nivel === 'Expert';
    const chipW = expert ? 72 : 84;
    const fsNome = c.l1.length > 20 ? 11 : 12;
    body += `  <g>
    <rect x="${x + 1.5}" y="7.5" width="${cardW - 3}" height="${cardH - 3}" rx="12" fill="${C.bg}" stroke="${expert ? `url(#certGrad${i})` : c.cor}" stroke-width="2"/>
    <text x="${cx}" y="38" text-anchor="middle" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${C.muted}">MICROSOFT</text>
    <text x="${cx}" y="52" text-anchor="middle" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${C.muted}">CERTIFIED</text>
    <text x="${cx}" y="88" text-anchor="middle" font-family="${MONO}" font-size="26" font-weight="bold" fill="${c.cor}">${c.code}</text>
    <text x="${cx}" y="112" text-anchor="middle" font-family="${MONO}" font-size="${fsNome}" fill="${C.fg}">${esc(c.l1)}</text>
    <rect x="${cx - chipW / 2}" y="124" width="${chipW}" height="20" rx="10" fill="${C.bg2}"/>
    <text x="${cx}" y="138" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${expert ? C.yellow : C.mint}">${expert ? '★ ' : ''}${c.nivel}</text>
    ${fadeSlide(begin, 10, 0.45)}
  </g>\n`;
  });

  const grads = certs
    .map((c, i) =>
      c.nivel === 'Expert'
        ? `<linearGradient id="certGrad${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c.cor}"/><stop offset="100%" stop-color="${C.purple}"/></linearGradient>`
        : ''
    )
    .join('\n    ');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Certificações Microsoft: AZ-104 Azure Administrator Associate, AZ-204 Azure Developer Associate, AZ-305 Azure Solutions Architect Expert, AZ-400 DevOps Engineer Expert.">
  <defs>
    ${grads}
  </defs>
${body}</svg>`;
}

// ════════════════════════════════════════════════════════════════════════
// 4. clientes.svg — letreiro infinito
// ════════════════════════════════════════════════════════════════════════
function clientes() {
  const W = 840, H = 64;
  const nomes = [
    'Icatu Seguros', 'Nubank', 'Odontoprev', 'CNseg', 'Movida', 'Carrefour',
    'BMW', 'Inbenta', 'Caixa Capitalização', 'Prudential', 'Firjan',
  ];
  const cores = [C.purple2, C.pink, C.blue, C.green, C.magenta, C.yellow];
  const FS = 13.5, CW = FS * 0.62, PAD = 30, GAP = 14, pillH = 32, pillY = 16;

  // monta uma cópia da fila de pílulas e mede a largura total
  let x = 0;
  const pills = nomes.map((n, i) => {
    const wTxt = Math.round(n.length * CW);
    const w = wTxt + PAD;
    const pill = { n, x, w, wTxt, cor: cores[i % cores.length] };
    x += w + GAP;
    return pill;
  });
  const W1 = x; // largura de uma cópia completa (com gap final — loop perfeito)

  const copia = pills
    .map(
      (p) => `    <g>
      <rect x="${p.x}" y="${pillY}" width="${p.w}" height="${pillH}" rx="16" fill="${C.bg2}" stroke="${p.cor}" stroke-width="1.3" stroke-opacity="0.75"/>
      <text x="${p.x + p.w / 2}" y="${pillY + 21}" text-anchor="middle" font-family="${MONO}" font-size="${FS}" fill="${C.fg}" textLength="${p.wTxt}" lengthAdjust="spacingAndGlyphs">${esc(p.n)}</text>
    </g>`
    )
    .join('\n');

  const dur = Math.round(W1 / 34); // ~34 px/s

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clientes atendidos: ${nomes.join(', ')}.">
  <defs>
    <clipPath id="cliClip"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="12"/></clipPath>
    <linearGradient id="fadeL" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${C.bg}"/><stop offset="100%" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
    <linearGradient id="fadeR" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${C.bg}" stop-opacity="0"/><stop offset="100%" stop-color="${C.bg}"/></linearGradient>
    <style>
      .fila { animation: rolar ${dur}s linear infinite; }
      @keyframes rolar { from { transform: translateX(0); } to { transform: translateX(-${W1}px); } }
      @media (prefers-reduced-motion: reduce) { .fila { animation: none; } }
    </style>
  </defs>
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="12" fill="${C.bg}" stroke="${C.line}" stroke-width="1.5"/>
  <g clip-path="url(#cliClip)">
    <g class="fila">
${copia}
      <g transform="translate(${W1} 0)">
${copia}
      </g>
    </g>
    <rect x="3" y="3" width="46" height="${H - 6}" fill="url(#fadeL)"/>
    <rect x="${W - 49}" y="3" width="46" height="${H - 6}" fill="url(#fadeR)"/>
  </g>
</svg>`;
}

// ════════════════════════════════════════════════════════════════════════
// 5. divisor.svg
// ════════════════════════════════════════════════════════════════════════
function divisor() {
  const W = 840, H = 10;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="divGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${C.pink}"/>
      <stop offset="50%" stop-color="${C.purple}"/>
      <stop offset="100%" stop-color="${C.mint}"/>
    </linearGradient>
    <linearGradient id="brilho" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="divClip"><rect x="0" y="3" width="${W}" height="4" rx="2"/></clipPath>
  </defs>
  <rect x="0" y="3" width="${W}" height="4" rx="2" fill="url(#divGrad)"/>
  <g clip-path="url(#divClip)">
    <rect x="-160" y="3" width="150" height="4" fill="url(#brilho)">
      <animate attributeName="x" values="-160;${W + 20};${W + 20}" keyTimes="0;0.45;1" dur="6s" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>`;
}

// ════════════════════════════════════════════════════════════════════════
// 6. badges de contato
// ════════════════════════════════════════════════════════════════════════
function badge(label, cor, icone) {
  const FS = 12.5, CW = FS * 0.62, LS = 1.2;
  const wTxt = Math.round(label.length * (CW + LS));
  const W = 44 + wTxt + 18, H = 34;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="${C.bg}" stroke="${cor}" stroke-width="1.6"/>
  ${icone(cor)}
  <text x="42" y="${H / 2 + 4.5}" font-family="${MONO}" font-size="${FS}" letter-spacing="${LS}" fill="${C.fg}">${esc(label)}</text>
</svg>`;
}

const icones = {
  email: (cor) => `<rect x="15" y="11" width="17" height="12.5" rx="2.5" fill="none" stroke="${cor}" stroke-width="1.7"/>
  <path d="M 15.5,12.5 L 23.5,19 L 31.5,12.5" fill="none" stroke="${cor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  linkedin: (cor) => `<rect x="15" y="9.5" width="16" height="16" rx="3.5" fill="none" stroke="${cor}" stroke-width="1.7"/>
  <text x="23" y="22" text-anchor="middle" font-family="${MONO}" font-size="10.5" font-weight="bold" fill="${cor}">in</text>`,
  scholar: (cor) => `<path d="M 23.5,9 L 12.5,15 L 23.5,21 L 34.5,15 Z" fill="none" stroke="${cor}" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="M 17.5,18.2 L 17.5,22.5 C 17.5,24.4 29.5,24.4 29.5,22.5 L 29.5,18.2" fill="none" stroke="${cor}" stroke-width="1.7" stroke-linecap="round"/>
  <line x1="33" y1="15.8" x2="33" y2="21.5" stroke="${cor}" stroke-width="1.5" stroke-linecap="round"/>`,
};

// ── escreve tudo ────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const arquivos = {
  'header.svg': header(),
  'carreira.svg': carreira(),
  'certificacoes.svg': certificacoes(),
  'clientes.svg': clientes(),
  'divisor.svg': divisor(),
  'badge-email.svg': badge('E-MAIL', C.pink, icones.email),
  'badge-linkedin.svg': badge('LINKEDIN', C.blue, icones.linkedin),
  'badge-scholar.svg': badge('GOOGLE SCHOLAR', C.lilac, icones.scholar),
};
for (const [nome, conteudo] of Object.entries(arquivos)) {
  fs.writeFileSync(path.join(OUT, nome), conteudo.trim() + '\n');
  console.log('ok', nome, `${(conteudo.length / 1024).toFixed(1)}kB`);
}
