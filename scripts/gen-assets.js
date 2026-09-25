#!/usr/bin/env node
// Gera os SVGs do README de perfil numa estética industrial inspirada na UI de
// Arknights: Endfield: painéis claros/escuros, amarelo ácido, cantos
// chanfrados, microtexto de HUD. Nenhum asset do jogo é usado.
//
// Uso: node scripts/gen-assets.js [dir-de-saida]        (padrão: ./assets)
// Saída: <dir>/light/*.svg e <dir>/dark/*.svg (variantes -en para textos em inglês)
//
// As fontes (Barlow Condensed e JetBrains Mono, ambas OFL, em scripts/fonts)
// vão embutidas em cada SVG, porque SVG carregado via <img> não baixa fonte
// externa. Com o pyftsubset (pip install fonttools brotli) cada arquivo leva
// só os glifos que usa; sem ele, leva o subset latin inteiro de cada fonte.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'assets'));
const FONT_DIR = path.join(__dirname, 'fonts');
const METRICS = JSON.parse(fs.readFileSync(path.join(FONT_DIR, 'metrics.json'), 'utf8'));

// ── paleta ──────────────────────────────────────────────────────────────
const YELLOW = '#FFE600';
const ON_YELLOW = '#111111';
const THEMES = {
  light: {
    bg: '#F2F2EF', bg2: '#E4E4E0', ink: '#111111', muted: '#66666A', line: '#C9C9C4',
    cross: '#CFCFC9', frame: '#1A1A1A', rule: '#BDBDB7', cyan: '#0090AD',
    expert: '#111111', hlOp: 0.4,
  },
  dark: {
    bg: '#0B0B0C', bg2: '#18181B', ink: '#F0F0F0', muted: '#8C8C8C', line: '#2C2C31',
    cross: '#26262B', frame: '#3A3A40', rule: '#3A3A40', cyan: '#3FD0F0',
    expert: YELLOW, hlOp: 0.12,
  },
};

// ── fontes ──────────────────────────────────────────────────────────────
const COND = `'Bahnschrift','Barlow Condensed','Roboto Condensed','Arial Narrow',sans-serif`;
const MONO = `'JetBrains Mono','Cascadia Mono',Consolas,Menlo,monospace`;
const FONTS = {
  h: { file: 'barlow-condensed-latin-700-normal', fam: 'efh', w: 700, stack: COND },
  s: { file: 'barlow-condensed-latin-600-normal', fam: 'efs', w: 600, stack: COND },
  m: { file: 'barlow-condensed-latin-500-normal', fam: 'efm', w: 500, stack: COND },
  c: { file: 'jetbrains-mono-latin-400-normal', fam: 'efc', w: 400, stack: MONO },
  cb: { file: 'jetbrains-mono-latin-700-normal', fam: 'efcb', w: 700, stack: MONO },
};

const HAS_SUBSET = spawnSync('pyftsubset', ['--help'], { stdio: 'ignore' }).status === 0;
if (!HAS_SUBSET) console.warn('aviso: pyftsubset não encontrado, embutindo o subset latin inteiro');
const subsetCache = new Map();

function fontData(file, chars) {
  const src = path.join(FONT_DIR, `${file}.woff2`);
  if (!HAS_SUBSET) return fs.readFileSync(src).toString('base64');
  const text = [...new Set(chars + ' ')].sort().join('');
  const key = `${file}|${text}`;
  if (subsetCache.has(key)) return subsetCache.get(key);
  const tmp = path.join(os.tmpdir(), `efsub-${process.pid}-${subsetCache.size}.woff2`);
  const r = spawnSync('pyftsubset', [
    src, `--text=${text}`, '--flavor=woff2', `--output-file=${tmp}`,
    '--layout-features=kern',
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`pyftsubset falhou para ${file}: ${r.stderr}`);
  const b64 = fs.readFileSync(tmp).toString('base64');
  fs.unlinkSync(tmp);
  subsetCache.set(key, b64);
  return b64;
}

// largura do texto em px, pelas métricas reais da fonte (sem kerning).
// Lança erro se algum caractere não existir na fonte, para não virar tofu.
function measure(f, s, size, ls = 0) {
  const m = METRICS[FONTS[f].file];
  let w = 0;
  for (const ch of s) {
    if (!(ch in m)) throw new Error(`glifo ausente em ${FONTS[f].file}: "${ch}" em "${s}"`);
    w += m[ch] * size + ls;
  }
  return w;
}

// maior tamanho (passo de 0,5) em que o texto cabe em maxW
function fit(f, s, maxW, maxSize, ls = 0, minSize = 10) {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    if (measure(f, s, size, ls) <= maxW) return size;
  }
  throw new Error(`"${s}" não cabe em ${maxW}px nem com ${minSize}px`);
}

function check(what, w, max) {
  if (w > max) throw new Error(`${what} estoura: ${w.toFixed(1)} > ${max}`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => +(+v).toFixed(2);

// documento SVG: registra os glifos usados por fonte para o subset
class Doc {
  constructor() { this.used = {}; }

  use(f, s) {
    measure(f, s, 1);
    const set = (this.used[f] ||= new Set());
    for (const ch of s) set.add(ch);
    return esc(s);
  }

  // content: string, ou lista de trechos { s, f?, fill?, size? } em tspans
  text({ x, y, f, size, fill, ls, anchor, op, extra = '' }, content) {
    const a = [`x="${n(x)}"`, `y="${n(y)}"`, `class="${f}"`, `font-size="${size}"`];
    if (fill) a.push(`fill="${fill}"`);
    if (ls) a.push(`letter-spacing="${ls}"`);
    if (anchor) a.push(`text-anchor="${anchor}"`);
    if (op != null) a.push(`opacity="${op}"`);
    const inner = typeof content === 'string'
      ? this.use(f, content)
      : content.map((sp) => {
        const at = (sp.f ? ` class="${sp.f}"` : '') + (sp.fill ? ` fill="${sp.fill}"` : '') + (sp.size ? ` font-size="${sp.size}"` : '');
        return `<tspan${at}>${this.use(sp.f || f, sp.s)}</tspan>`;
      }).join('');
    return `<text ${a.join(' ')}${extra}>${inner}</text>`;
  }

  css() {
    return Object.entries(this.used).map(([k, chars]) => {
      const F = FONTS[k];
      const b64 = fontData(F.file, [...chars].join(''));
      return `@font-face{font-family:'${F.fam}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${F.w};}.${k}{font-family:'${F.fam}',${F.stack};font-weight:${F.w};}`;
    }).join('');
  }

  // monta o SVG final. body é gerado antes para o css() conhecer os glifos.
  svg({ w, h, label, defs = '', css = '', body }) {
    const role = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
    const style = this.css() + css;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve"${role}>
  <defs>${style ? `<style>${style}</style>` : ''}${defs}</defs>
${body}
</svg>`;
  }
}

// ── formas ──────────────────────────────────────────────────────────────
// retângulo com cantos chanfrados (tl, tr, br, bl = tamanho do corte)
function cham(x, y, w, h, c = {}) {
  const { tl = 0, tr = 0, br = 0, bl = 0 } = c;
  return `M${n(x + tl)},${n(y)} H${n(x + w - tr)} L${n(x + w)},${n(y + tr)} V${n(y + h - br)} L${n(x + w - br)},${n(y + h)} H${n(x + bl)} L${n(x)},${n(y + h - bl)} V${n(y + tl)} Z`;
}

const diamond = (cx, cy, r) => `M${n(cx)},${n(cy - r)} L${n(cx + r)},${n(cy)} L${n(cx)},${n(cy + r)} L${n(cx - r)},${n(cy)} Z`;

// seta ↗ desenhada (a fonte não tem o glifo)
const arrowNE = (x, y, s, cor, sw = 1.8) =>
  `<path d="M${n(x)},${n(y + s)} L${n(x + s)},${n(y)} M${n(x + s * 0.3)},${n(y)} H${n(x + s)} V${n(y + s * 0.7)}" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="square"/>`;

// código de barras decorativo, determinístico pela semente
function barcode(x, y, w, h, seed, fill) {
  let hsh = 2166136261;
  for (const ch of seed) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { hsh ^= hsh << 13; hsh ^= hsh >>> 17; hsh ^= hsh << 5; return (hsh >>> 0) / 4294967296; };
  let cx = x;
  let out = '';
  for (;;) {
    const bw = [1, 1, 2, 3][Math.floor(rnd() * 4)];
    if (cx + bw > x + w) break;
    out += `<rect x="${n(cx)}" y="${n(y)}" width="${bw}" height="${h}" fill="${fill}"/>`;
    cx += bw + [1, 2, 2, 3][Math.floor(rnd() * 4)];
  }
  return out;
}

const hazardDef = (id) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${ON_YELLOW}"/><rect width="5" height="10" fill="${YELLOW}"/></pattern>`;

// grade de cruzes de registro
const crossDef = (id, th) => `<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M16,12 V20 M12,16 H20" stroke="${th.cross}" stroke-width="1"/></pattern><linearGradient id="${id}Fade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.35" stop-color="#fff"/></linearGradient>`;

// área com a grade de cruzes, em múltiplos de 32 para não cortar nenhuma cruz
// e entra da esquerda com degradê
const crossArea = (id, x, y, w, h) => `<mask id="${id}Mask"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}Fade)"/></mask><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" mask="url(#${id}Mask)"/>`;

// painel padrão: chanfro no canto superior direito e inferior esquerdo
const PANEL_C = { tr: 22, bl: 22 };
const panelPath = (W, H) => cham(1.5, 1.5, W - 3, H - 3, PANEL_C);
const panel = (th, W, H) => `<path d="${panelPath(W, H)}" fill="${th.bg}" stroke="${th.frame}" stroke-width="1.5"/>`;

// colchete amarelo no canto inferior direito
const bracketBR = (W, H) => `<path d="M${W - 44},${H - 9} H${W - 9} V${H - 44}" fill="none" stroke="${YELLOW}" stroke-width="3"/>`;

// faixa superior: aba amarela, microtexto e régua
function strip(d, th, W, tab, micro) {
  const tw = measure('h', tab, 14, 2.2) + 32;
  let s = `<path d="${cham(1.5, 1.5, tw, 30, { br: 12 })}" fill="${YELLOW}"/>`;
  s += d.text({ x: 15, y: 21.5, f: 'h', size: 14, ls: 2.2, fill: ON_YELLOW }, tab);
  s += d.text({ x: tw + 16, y: 20.5, f: 'c', size: 10.5, ls: 1, fill: th.muted }, micro);
  s += `<line x1="24" y1="44.5" x2="${W - 24}" y2="44.5" stroke="${th.line}" stroke-width="1"/>`;
  for (let x = 24; x <= W - 24; x += 32) {
    s += `<line x1="${x}" y1="44.5" x2="${x}" y2="${(x - 24) % 128 === 0 ? 50 : 47.5}" stroke="${th.line}" stroke-width="1"/>`;
  }
  s += `<rect x="24" y="43" width="64" height="3" fill="${YELLOW}"/>`;
  return { svg: s, tabW: tw };
}

// ── animação ────────────────────────────────────────────────────────────
// O markup guarda o estado final e a animação parte do zero via keyTimes com
// begin="0s": em renderizador sem SMIL o conteúdo aparece completo e parado.
const EASE = 'calcMode="spline" keySplines="0 0 1 1;0.2 0.7 0.2 1"';

function reveal(delay, { dx = 0, dy = 0, dur = 0.45 } = {}) {
  const total = (delay + dur).toFixed(2);
  const p = (delay / (delay + dur)).toFixed(4);
  let s = `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${p};1" dur="${total}s" fill="freeze"/>`;
  if (dx || dy) {
    s += `<animateTransform attributeName="transform" type="translate" values="${dx} ${dy};${dx} ${dy};0 0" keyTimes="0;${p};1" dur="${total}s" fill="freeze" ${EASE}/>`;
  }
  return s;
}

// máscara que revela da esquerda para a direita
function wipeMask(id, x, y, w, h, delay, dur = 0.7) {
  const total = (delay + dur).toFixed(2);
  const p = (delay / (delay + dur)).toFixed(4);
  return `<mask id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#fff"><animate attributeName="width" values="0;0;${n(w)}" keyTimes="0;${p};1" dur="${total}s" fill="freeze" ${EASE}/></rect></mask>`;
}

// ── textos ──────────────────────────────────────────────────────────────
const NAME = 'Alessandro Caetano Beltrão';
const ROLE = 'Cloud & Infrastructure Engineer';

const STR = {
  pt: {
    specialty: 'IA · DEVOPS · KUBERNETES · AZURE',
    education: 'MESTRADO · PESC/COPPE/UFRJ',
    sla: 'SLA 99,9%',
    headerLabel: `Ficha de operador: ${NAME}, ${ROLE}. Especialidade: IA, DevOps, Kubernetes e Azure. Quatro certificações Microsoft. Mestrado no PESC/COPPE/UFRJ.`,
    carreira: [
      ['EDU', 'Bacharelado em Engenharia de Software', 'UnB', true],
      ['INTL', 'Intercâmbio acadêmico', 'Auckland University of Technology, NZ'],
      ['OSS', 'Empacotamento de sistemas para Red Hat', 'Software Público Brasileiro'],
      ['CI/CD', 'Pipelines de CI/CD para ambientes internos e externos'],
      ['INFRA', 'Infraestrutura para grandes clientes', 'seguros, finanças, varejo, automotivo'],
      ['EDU', 'Mestrado em Engenharia de Sistemas e Computação', 'PESC/COPPE/UFRJ', true],
      ['CERT', 'Quatro certificações Microsoft Azure', 'AZ-104 · AZ-204 · AZ-305 · AZ-400', true],
      ['NOW', 'IA, DevOps e Kubernetes', 'foco atual'],
    ],
    carreiraLabel: 'Trajetória: bacharelado em Engenharia de Software na UnB; intercâmbio na Auckland University of Technology; empacotamento de sistemas para Red Hat no Software Público Brasileiro; pipelines de CI/CD; infraestrutura para grandes clientes; mestrado em Engenharia de Sistemas e Computação no PESC/COPPE/UFRJ; certificações Microsoft AZ-104, AZ-204, AZ-305 e AZ-400; foco atual em IA, DevOps e Kubernetes.',
    projeto: 'Cofre cloud-native de acessos remotos, direto do navegador e sem cliente instalado',
    projetoLabel: 'Smooth Operator: cofre cloud-native de acessos remotos (RDP, SSH e VNC) direto do navegador, com RBAC, MFA via TOTP, OIDC/SAML e transferência de arquivos.',
  },
  en: {
    specialty: 'AI · DEVOPS · KUBERNETES · AZURE',
    education: 'M.SC. · PESC/COPPE/UFRJ',
    sla: 'SLA 99.9%',
    headerLabel: `Operator file: ${NAME}, ${ROLE}. Specialty: AI, DevOps, Kubernetes and Azure. Four Microsoft certifications. M.Sc. from PESC/COPPE/UFRJ.`,
    carreira: [
      ['EDU', 'B.Sc. in Software Engineering', 'University of Brasília (UnB)', true],
      ['INTL', 'Exchange program', 'Auckland University of Technology, NZ'],
      ['OSS', 'Packaging systems for Red Hat', 'Brazilian Public Software (SPB)'],
      ['CI/CD', 'CI/CD pipelines for internal and external environments'],
      ['INFRA', 'Infrastructure for large clients', 'insurance, finance, retail, automotive'],
      ['EDU', 'M.Sc. in Systems Engineering and Computer Science', 'PESC/COPPE/UFRJ', true],
      ['CERT', 'Four Microsoft Azure certifications', 'AZ-104 · AZ-204 · AZ-305 · AZ-400', true],
      ['NOW', 'AI, DevOps and Kubernetes', 'current focus'],
    ],
    carreiraLabel: 'Career: B.Sc. in Software Engineering at the University of Brasília; exchange program at Auckland University of Technology; packaging systems for Red Hat at Brazilian Public Software; CI/CD pipelines; infrastructure for large clients; M.Sc. in Systems Engineering and Computer Science at PESC/COPPE/UFRJ; Microsoft certifications AZ-104, AZ-204, AZ-305 and AZ-400; current focus on AI, DevOps and Kubernetes.',
    projeto: 'Cloud-native remote access vault that runs in the browser, no client to install',
    projetoLabel: 'Smooth Operator: cloud-native remote access vault (RDP, SSH and VNC) in the browser, with RBAC, TOTP MFA, OIDC/SAML and file transfer.',
  },
};

const CLIENTES = [
  'Icatu Seguros', 'Nubank', 'Odontoprev', 'CNseg', 'Movida', 'Carrefour',
  'BMW', 'Inbenta', 'Caixa Capitalização', 'Prudential', 'Firjan',
];

const CERTS = [
  { id: 'az104', code: 'AZ-104', name: 'AZURE ADMINISTRATOR', level: 'ASSOCIATE', lv: 2, full: 'Microsoft Certified: Azure Administrator Associate' },
  { id: 'az204', code: 'AZ-204', name: 'AZURE DEVELOPER', level: 'ASSOCIATE', lv: 2, full: 'Microsoft Certified: Azure Developer Associate' },
  { id: 'az305', code: 'AZ-305', name: 'AZURE SOLUTIONS ARCHITECT', level: 'EXPERT', lv: 3, full: 'Microsoft Certified: Azure Solutions Architect Expert' },
  { id: 'az400', code: 'AZ-400', name: 'DEVOPS ENGINEER', level: 'EXPERT', lv: 3, full: 'Microsoft Certified: DevOps Engineer Expert' },
];

const STACK = [
  ['CLOUD', ['Azure', 'AKS', 'Entra ID', 'Azure DevOps', 'Azure Functions', 'Container Apps']],
  ['INFRA & DEVOPS', ['Kubernetes', 'Traefik', 'ingress-nginx', 'CI/CD', 'IaC']],
  ['NETWORK & SECURITY', ['FortiGate', 'Zero Trust', 'Tailscale']],
  ['AUTOMATION', ['n8n', 'PowerShell', 'Microsoft Graph']],
];

const PROJ_CHIPS = ['RDP', 'SSH', 'VNC', 'RBAC', 'MFA / TOTP', 'OIDC / SAML', 'FILE TRANSFER'];

// ════════════════════════════════════════════════════════════════════════
// header: ficha de operador
// ════════════════════════════════════════════════════════════════════════
function header(th, lang) {
  const d = new Doc();
  const S = STR[lang];
  const W = 840, H = 312, X = 36;
  const nome = NAME.toUpperCase();
  const cargo = ROLE.toUpperCase();

  const nomeSize = fit('h', nome, 520, 46, 1);
  const nomeW = measure('h', nome, nomeSize, 1);
  check('cargo', 104 - X + measure('s', cargo, 19, 2), 520);

  const top = strip(d, th, W, 'OPERATOR FILE', '// PERSONNEL RECORD');
  let body = panel(th, W, H);
  body += `<g clip-path="url(#hdrClip)">${crossArea('hdrCross', 544, 64, W - 544, H - 64)}
    <g opacity="0.55"><rect x="2" y="-12" width="${W - 4}" height="2" fill="${YELLOW}"><animate attributeName="y" values="-12;${H + 4};${H + 4}" keyTimes="0;0.28;1" dur="9s" begin="0.2s" repeatCount="indefinite"/></rect></g></g>`;
  body += top.svg;
  body += barcode(640, 12, 84, 14, 'ACB-0001', th.muted);
  body += d.text({ x: W - 44, y: 23.5, f: 'cb', size: 10.5, ls: 1, fill: th.ink, anchor: 'end' }, 'ACB-0001');

  // nome e cargo
  body += `<g>${d.text({ x: X, y: 78, f: 'c', size: 10, ls: 2, fill: th.muted }, 'NAME')}${reveal(0.2)}</g>`;
  body += `<g mask="url(#nomeWipe)">${d.text({ x: X, y: 121, f: 'h', size: nomeSize, ls: 1, fill: th.ink }, nome)}</g>`;
  body += `<g><rect x="${X}" y="131.5" width="56" height="5" fill="${YELLOW}"/>${d.text({ x: 104, y: 141, f: 's', size: 19, ls: 2, fill: th.ink }, cargo)}${reveal(0.8, { dx: -12 })}</g>`;

  // campos
  const fields = [
    ['SPECIALTY', S.specialty],
    ['CLEARANCE', '4× MICROSOFT CERTIFIED'],
    ['EDUCATION', S.education],
    ['STATUS', null],
  ];
  fields.forEach(([label, valor], i) => {
    const fx = X + (i % 2) * 272;
    const fy = 172 + Math.floor(i / 2) * 62;
    let g = `<line x1="${fx}" y1="${fy}" x2="${fx + 250}" y2="${fy}" stroke="${th.line}" stroke-width="1"/>`;
    g += `<rect x="${fx}" y="${fy + 8}" width="5" height="5" fill="${YELLOW}"/>`;
    g += d.text({ x: fx + 12, y: fy + 14, f: 'c', size: 10, ls: 1.8, fill: th.muted }, label);
    if (valor) {
      check(label, measure('s', valor, 17, 0.8), 250);
      g += d.text({ x: fx, y: fy + 40, f: 's', size: 17, ls: 0.8, fill: th.ink }, valor);
    } else {
      g += `<circle cx="${fx + 5}" cy="${fy + 34}" r="4.5" fill="${th.cyan}"><animate attributeName="opacity" values="1;1;0.25;1" keyTimes="0;0.6;0.8;1" dur="1.6s" repeatCount="indefinite"/></circle>`;
      g += d.text({ x: fx + 17, y: fy + 40, f: 's', size: 17, ls: 0.8, fill: th.ink }, [
        { s: 'ONLINE' },
        { s: `  // ${S.sla}`, f: 'c', fill: th.muted, size: 11 },
      ]);
    }
    body += `<g>${g}${reveal(1.1 + i * 0.15, { dx: -14 })}</g>`;
  });

  // emblema de mira
  const cx = 700, cy = 166;
  body += `<g>
    <line x1="${cx - 116}" y1="${cy}" x2="${cx - 66}" y2="${cy}" stroke="${th.muted}" stroke-width="1"/>
    <line x1="${cx + 66}" y1="${cy}" x2="${cx + 116}" y2="${cy}" stroke="${th.muted}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - 108}" x2="${cx}" y2="${cy - 66}" stroke="${th.muted}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy + 66}" x2="${cx}" y2="${cy + 108}" stroke="${th.muted}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="94" fill="none" stroke="${th.muted}" stroke-width="1" stroke-dasharray="1.5 6.5">
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="60s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="80" fill="none" stroke="${th.ink}" stroke-width="1.3" stroke-dasharray="96 10 30 10 150 10 40 10 80 67">
      <animateTransform attributeName="transform" type="rotate" from="360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="40s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="80" fill="none" stroke="${YELLOW}" stroke-width="5" stroke-dasharray="64 439">
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="10s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="${th.line}" stroke-width="1"/>
    <path d="${diamond(cx, cy, 34)}" fill="${YELLOW}"/>
    <path d="${diamond(cx, cy, 42)}" fill="none" stroke="${th.ink}" stroke-width="1"/>
    ${d.text({ x: cx, y: cy + 7, f: 'h', size: 20, ls: 1.5, fill: ON_YELLOW, anchor: 'middle' }, 'ACB')}
  </g>`;

  // barra de sincronização
  const sy = cy + 118;
  let sync = d.text({ x: cx - 74, y: sy, f: 'c', size: 10, ls: 1.5, fill: th.muted }, 'SYNC');
  for (let i = 0; i < 10; i++) {
    const t0 = (0.6 + i * 0.12).toFixed(2);
    sync += `<rect x="${cx - 36 + i * 8}" y="${sy - 8}" width="6" height="8" fill="${YELLOW}">${reveal(+t0, { dur: 0.1 })}</rect>`;
  }
  sync += d.text({ x: cx + 76, y: sy, f: 'cb', size: 10, ls: 1, fill: th.ink, anchor: 'end' }, '100%');
  body += sync;

  body += `<rect x="${X}" y="${H - 16}" width="120" height="6" fill="url(#hdrHaz)"/>`;
  body += bracketBR(W, H);

  return d.svg({
    w: W, h: H, label: S.headerLabel, body,
    defs: `<clipPath id="hdrClip"><path d="${panelPath(W, H)}"/></clipPath>${crossDef('hdrCross', th)}${hazardDef('hdrHaz')}${wipeMask('nomeWipe', X - 2, 80, nomeW + 12, 52, 0.35)}`,
  });
}

// ════════════════════════════════════════════════════════════════════════
// badges de contato
// ════════════════════════════════════════════════════════════════════════
const ICONES = {
  email: () => `<rect x="9" y="11" width="18" height="14" rx="1.5" fill="none" stroke="${ON_YELLOW}" stroke-width="1.8"/><path d="M9.8,12.4 L18,18.8 L26.2,12.4" fill="none" stroke="${ON_YELLOW}" stroke-width="1.8" stroke-linejoin="round"/>`,
  linkedin: (d) => `<rect x="10" y="10" width="16" height="16" rx="2" fill="none" stroke="${ON_YELLOW}" stroke-width="1.8"/>${d.text({ x: 18, y: 22.5, f: 'h', size: 12, fill: ON_YELLOW, anchor: 'middle' }, 'in')}`,
  scholar: () => `<path d="M18,10 L7,15.5 L18,21 L29,15.5 Z" fill="none" stroke="${ON_YELLOW}" stroke-width="1.8" stroke-linejoin="round"/><path d="M12,18.4 V22.6 C12,25.2 24,25.2 24,22.6 V18.4" fill="none" stroke="${ON_YELLOW}" stroke-width="1.8"/><line x1="27.2" y1="16.6" x2="27.2" y2="22" stroke="${ON_YELLOW}" stroke-width="1.6"/>`,
};

function badge(th, label, icone) {
  const d = new Doc();
  const H = 36, FS = 14, LS = 1.8;
  const tw = measure('s', label, FS, LS);
  const W = Math.ceil(36 + 14 + tw + 14 + 11 + 12);
  const body = `<path d="${cham(0.75, 0.75, W - 1.5, H - 1.5, { tl: 8, br: 8 })}" fill="${th.bg}" stroke="${th.frame}" stroke-width="1.2"/>
  <path d="${cham(0.75, 0.75, 36, H - 1.5, { tl: 8 })}" fill="${YELLOW}"/>
  ${ICONES[icone](d)}
  ${d.text({ x: 50, y: 23, f: 's', size: FS, ls: LS, fill: th.ink }, label)}
  ${arrowNE(W - 23, 13.5, 9, th.muted, 1.6)}`;
  return d.svg({ w: W, h: H, label, body });
}

// ════════════════════════════════════════════════════════════════════════
// carreira: log de operações
// ════════════════════════════════════════════════════════════════════════
function carreira(th, lang) {
  const d = new Doc();
  const S = STR[lang];
  const W = 840, X = 36, Y0 = 62, PASSO = 40;
  const RAIL = 84, CHIP = 106, TXT = 178;
  const linhas = S.carreira;
  const H = Y0 + linhas.length * PASSO + 40;

  const top = strip(d, th, W, 'OPERATION LOG', `// CAREER · ${String(linhas.length).padStart(2, '0')} ENTRIES · ASC`);
  let body = panel(th, W, H) + top.svg;

  const cy0 = Y0 + PASSO / 2;
  const cyN = Y0 + (linhas.length - 1) * PASSO + PASSO / 2;
  const railLen = cyN - cy0;
  body += `<line x1="${RAIL}" y1="${cy0}" x2="${RAIL}" y2="${cyN}" stroke="${th.line}" stroke-width="2" stroke-dasharray="${railLen}" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" values="${railLen};${railLen};0" keyTimes="0;0.2;1" dur="1.6s" fill="freeze"/></line>`;

  linhas.forEach(([cat, titulo, org, marco], i) => {
    const cy = Y0 + i * PASSO + PASSO / 2;
    const atual = i === linhas.length - 1;
    let g = '';
    if (atual) {
      g += `<rect x="${CHIP - 8}" y="${cy - 17}" width="${W - 24 - (CHIP - 8)}" height="34" fill="${YELLOW}" opacity="${th.hlOp}"/>`;
      g += `<rect x="${CHIP - 8}" y="${cy - 17}" width="3" height="34" fill="${YELLOW}"/>`;
    } else {
      g += `<line x1="${CHIP}" y1="${cy + 20}" x2="${W - 36}" y2="${cy + 20}" stroke="${th.line}" stroke-width="1" stroke-dasharray="2 4"/>`;
    }
    g += d.text({ x: X, y: cy + 4.5, f: 'cb', size: 12, ls: 1, fill: th.muted }, String(i + 1).padStart(2, '0'));

    // nó no trilho
    if (atual) {
      g += `<path d="${diamond(RAIL, cy, 9)}" fill="none" stroke="${YELLOW}" stroke-width="1.5"><animate attributeName="d" values="${diamond(RAIL, cy, 8)};${diamond(RAIL, cy, 17)}" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"/></path>`;
      g += `<path d="${diamond(RAIL, cy, 8)}" fill="${YELLOW}" stroke="${th.ink}" stroke-width="1.5"/>`;
    } else {
      g += `<path d="${diamond(RAIL, cy, 6)}" fill="${marco ? YELLOW : th.bg}" stroke="${th.ink}" stroke-width="1.5"/>`;
    }

    // categoria
    g += `<rect x="${CHIP}" y="${cy - 10}" width="60" height="20" fill="${atual ? YELLOW : th.bg2}"/>`;
    g += d.text({ x: CHIP + 30, y: cy + 4, f: 'cb', size: 10.5, ls: 1, fill: atual ? ON_YELLOW : th.ink, anchor: 'middle' }, cat);

    // título // organização
    const spans = [{ s: titulo }];
    let w = measure('s', titulo, 17, 0.3);
    if (org) {
      spans.push({ s: '  //  ', f: 'c', fill: th.muted, size: 11 }, { s: org, f: 'm', fill: th.muted, size: 16 });
      w += measure('c', '  //  ', 11, 0.3) + measure('m', org, 16, 0.3);
    }
    check(`carreira "${titulo}"`, TXT + w, atual ? W - 120 : W - 40);
    g += d.text({ x: TXT, y: cy + 6, f: 's', size: 17, ls: 0.3, fill: th.ink }, spans);
    if (atual) g += d.text({ x: W - 40, y: cy + 4, f: 'cb', size: 10, ls: 1.5, fill: th.ink, anchor: 'end' }, 'CURRENT');

    body += `<g>${g}${reveal(0.3 + i * 0.13, { dx: -12, dur: 0.4 })}</g>`;
  });

  body += d.text({ x: X, y: H - 16, f: 'c', size: 10, ls: 1.5, fill: th.muted }, '// END OF LOG');
  body += `<rect x="${W - 196}" y="${H - 22}" width="120" height="6" fill="url(#carHaz)"/>`;
  body += bracketBR(W, H);

  return d.svg({ w: W, h: H, label: S.carreiraLabel, body, defs: hazardDef('carHaz') });
}

// ════════════════════════════════════════════════════════════════════════
// clientes: letreiro infinito
// ════════════════════════════════════════════════════════════════════════
function clientes(th) {
  const d = new Doc();
  const W = 840, H = 76, LW = 150;
  const FS = 15, LS = 1.2, PAD = 14, GAP = 26, chipH = 32, chipY = (H - chipH) / 2;

  let x = 0;
  const chips = CLIENTES.map((nome) => {
    const up = nome.toUpperCase();
    const w = measure('s', up, FS, LS) + PAD * 2 + 4;
    const c = { up, x, w };
    x += w + GAP;
    return c;
  });
  const W1 = x; // uma cópia completa, com o gap final: o loop fecha sem salto

  const copia = chips.map((c) => `<path d="${cham(c.x, chipY, c.w, chipH, { tl: 7, br: 7 })}" fill="${th.bg2}"/><rect x="${n(c.x)}" y="${chipY + 7}" width="3" height="${chipH - 14}" fill="${YELLOW}"/>${d.text({ x: c.x + PAD + 4, y: chipY + 21.5, f: 's', size: FS, ls: LS, fill: th.ink }, c.up)}<path d="${diamond(c.x + c.w + GAP / 2, H / 2, 3)}" fill="${th.muted}"/>`).join('\n      ');

  const dur = Math.round(W1 / 34);
  const body = `  ${`<path d="${cham(1.5, 1.5, W - 3, H - 3, { tr: 14, bl: 14 })}" fill="${th.bg}" stroke="${th.frame}" stroke-width="1.5"/>`}
  <g clip-path="url(#cliClip)">
    <g transform="translate(${LW + 18} 0)">
      <g class="fila">
      ${copia}
      <g transform="translate(${n(W1)} 0)">
      ${copia}
      </g>
      </g>
    </g>
    <rect x="${LW}" y="1.5" width="44" height="${H - 3}" fill="url(#fadeL)"/>
    <rect x="${W - 50}" y="1.5" width="48.5" height="${H - 3}" fill="url(#fadeR)"/>
  </g>
  <path d="${cham(1.5, 1.5, LW, H - 3, { bl: 14 })}" fill="${YELLOW}"/>
  ${d.text({ x: 16, y: 30, f: 'h', size: 16, ls: 2.4, fill: ON_YELLOW }, 'CONTRACT')}
  ${d.text({ x: 16, y: 48, f: 'h', size: 16, ls: 2.4, fill: ON_YELLOW }, 'PARTNERS')}
  ${d.text({ x: 16, y: 64, f: 'cb', size: 9.5, ls: 1, fill: ON_YELLOW }, `${CLIENTES.length} ENTRIES`)}`;

  return d.svg({
    w: W, h: H, label: `Clientes: ${CLIENTES.join(', ')}.`, body,
    css: `.fila{animation:rolar ${dur}s linear infinite}@keyframes rolar{from{transform:translateX(0)}to{transform:translateX(-${n(W1)}px)}}@media (prefers-reduced-motion:reduce){.fila{animation:none}}`,
    defs: `<clipPath id="cliClip"><path d="${cham(1.5, 1.5, W - 3, H - 3, { tr: 14, bl: 14 })}"/></clipPath><linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="${th.bg}"/><stop offset="1" stop-color="${th.bg}" stop-opacity="0"/></linearGradient><linearGradient id="fadeR" x1="0" x2="1"><stop offset="0" stop-color="${th.bg}" stop-opacity="0"/><stop offset="1" stop-color="${th.bg}"/></linearGradient>`,
  });
}

// ════════════════════════════════════════════════════════════════════════
// certificações: um card por arquivo, cada um com seu link
// ════════════════════════════════════════════════════════════════════════
const CERT_W = 196, CERT_H = 192;
const CERT_NOME = Math.min(...CERTS.map((c) => fit('s', c.name, CERT_W - 30, 16, 0.6, 12)));

function cert(th, c, i) {
  const d = new Doc();
  const W = CERT_W, H = CERT_H, X = 15;
  const expert = c.level === 'EXPERT';
  const tab = `CLEARANCE LV.${c.lv}`;
  const tabW = measure('h', tab, 11.5, 1.4) + 24;

  let g = `<path d="${cham(1, 1, W - 2, H - 2, { tr: 16, bl: 16 })}" fill="${th.bg}" stroke="${expert ? th.expert : th.frame}" stroke-width="${expert ? 1.8 : 1.3}"/>`;
  g += `<path d="${cham(1, 1, tabW, 24, { br: 10 })}" fill="${YELLOW}"/>`;
  g += d.text({ x: 10, y: 17, f: 'h', size: 11.5, ls: 1.4, fill: ON_YELLOW }, tab);
  g += d.text({ x: W - 22, y: 16.5, f: 'c', size: 9, ls: 0.8, fill: th.muted, anchor: 'end' }, `0${i + 1}/04`);
  if (expert) g += `<rect x="${W - 46}" y="34" width="30" height="6" fill="url(#crtHaz)"/>`;
  g += d.text({ x: X, y: 50, f: 'c', size: 9, ls: 1.6, fill: th.muted }, 'MICROSOFT CERTIFIED');
  g += d.text({ x: X - 1, y: 98, f: 'h', size: 46, ls: 0.5, fill: th.ink }, c.code);
  g += d.text({ x: X, y: 121, f: 's', size: CERT_NOME, ls: 0.6, fill: th.ink }, c.name);

  const lw = measure('h', c.level, 11, 1.6) + 20;
  g += expert
    ? `<path d="${cham(X, 133, lw, 20, { tl: 6 })}" fill="${YELLOW}"/>`
    : `<path d="${cham(X + 0.6, 133.6, lw - 1.2, 18.8, { tl: 6 })}" fill="none" stroke="${th.ink}" stroke-width="1.2"/>`;
  g += d.text({ x: X + 10, y: 147.5, f: 'h', size: 11, ls: 1.6, fill: expert ? ON_YELLOW : th.ink }, c.level);

  g += `<line x1="${X}" y1="166" x2="${W - X}" y2="166" stroke="${th.line}" stroke-width="1"/>`;
  g += d.text({ x: X + 16, y: 181, f: 'cb', size: 9.5, ls: 1.4, fill: th.ink }, 'VERIFY');
  g += arrowNE(X + 1, 173.5, 8, th.ink, 1.6);
  g += barcode(W - 76, 173, 58, 9, c.code, th.muted);

  return d.svg({
    w: W, h: H, label: `${c.full} (${c.code})`,
    body: `<g>${g}${reveal(0.2 + i * 0.15, { dy: 8 })}</g>`,
    defs: expert ? hazardDef('crtHaz') : '',
  });
}

// ════════════════════════════════════════════════════════════════════════
// stack: loadout em módulos
// ════════════════════════════════════════════════════════════════════════
function stack(th) {
  const d = new Doc();
  const W = 840, M = 24, GAP = 12, BY = 62;
  const MW = (W - 2 * M - 3 * GAP) / 4;
  const maxItens = Math.max(...STACK.map(([, itens]) => itens.length));
  const BH = 64 + maxItens * 24 + 34;
  const H = BY + BH + 26;

  const top = strip(d, th, W, 'LOADOUT', `// TECH STACK · ${String(STACK.length).padStart(2, '0')} MODULES`);
  let body = panel(th, W, H) + top.svg;

  STACK.forEach(([nome, itens], i) => {
    const x = M + i * (MW + GAP);
    let g = `<path d="${cham(x, BY, MW, BH, { tr: 12 })}" fill="${th.bg2}"/>`;
    g += d.text({ x: x + 12, y: BY + 20, f: 'cb', size: 10, ls: 1.2, fill: th.muted }, `M-0${i + 1}`);
    g += `<rect x="${x + MW - 30}" y="${BY + 12}" width="6" height="6" fill="${YELLOW}"/>`;
    const fs = fit('h', nome, MW - 24, 17, 1.4, 13);
    g += d.text({ x: x + 12, y: BY + 44, f: 'h', size: fs, ls: 1.4, fill: th.ink }, nome);
    g += `<rect x="${x + 12}" y="${BY + 52}" width="32" height="3" fill="${YELLOW}"/>`;
    itens.forEach((item, j) => {
      const iy = BY + 80 + j * 24;
      check(`stack "${item}"`, measure('m', item, 16, 0.3), MW - 40);
      g += `<rect x="${x + 13}" y="${iy - 8}" width="5" height="5" fill="${th.ink}"/>`;
      g += d.text({ x: x + 26, y: iy, f: 'm', size: 16, ls: 0.3, fill: th.ink }, item);
    });
    // contador de slots no rodapé do módulo
    const sy = BY + BH - 16;
    g += d.text({ x: x + 12, y: sy + 4, f: 'c', size: 9, ls: 1, fill: th.muted }, `SLOTS ${itens.length}/${maxItens}`);
    for (let k = 0; k < maxItens; k++) {
      const on = k < itens.length;
      g += `<rect x="${x + MW - 12 - (maxItens - k) * 9}" y="${sy - 4}" width="6" height="8" fill="${on ? YELLOW : 'none'}" stroke="${on ? YELLOW : th.muted}" stroke-width="1"/>`;
    }
    body += `<g>${g}${reveal(0.2 + i * 0.15, { dy: 10 })}</g>`;
  });
  body += bracketBR(W, H);

  const label = 'Stack: ' + STACK.map(([nome, itens]) => `${nome.toLowerCase()}: ${itens.join(', ')}`).join('; ') + '.';
  return d.svg({ w: W, h: H, label, body });
}

// ════════════════════════════════════════════════════════════════════════
// projeto em destaque
// ════════════════════════════════════════════════════════════════════════
function projeto(th, lang) {
  const d = new Doc();
  const S = STR[lang];
  const W = 840, H = 222, X = 50;

  const top = strip(d, th, W, 'ACTIVE PROJECT', '// REPO alessandrocaetanob/smooth-operator');
  let body = panel(th, W, H);
  body += `<g clip-path="url(#prjClip)">${crossArea('prjCross', 608, 64, W - 608, H - 64)}</g>`;
  body += top.svg;
  body += barcode(W - 150, 12, 90, 14, 'smooth-operator', th.muted);
  body += `<rect x="24" y="62" width="8" height="${H - 62 - 24}" fill="url(#prjHaz)"/>`;

  body += `<g mask="url(#prjWipe)">${d.text({ x: X, y: 106, f: 'h', size: 46, ls: 1.5, fill: th.ink }, 'SMOOTH OPERATOR')}</g>`;
  check('tagline', measure('m', S.projeto, 18, 0.2), W - X - 36);
  body += `<g>${d.text({ x: X, y: 136, f: 'm', size: 18, ls: 0.2, fill: th.ink }, S.projeto)}${reveal(0.7, { dx: -10 })}</g>`;

  // botão
  const bw = 186, bh = 34, bx = W - 36 - bw, by = 158;
  let chips = '';
  let cx = X;
  PROJ_CHIPS.forEach((chip, i) => {
    const w = measure('cb', chip, 10.5, 1) + 18;
    chips += `<g><path d="${cham(cx + 0.5, 163.5, w - 1, 23, { tl: 5 })}" fill="${th.bg}" stroke="${th.frame}" stroke-width="1"/>${d.text({ x: cx + 9, y: 179, f: 'cb', size: 10.5, ls: 1, fill: th.ink }, chip)}${reveal(1 + i * 0.08, { dy: 6, dur: 0.3 })}</g>`;
    cx += w + 7;
  });
  check('chips do projeto', cx, bx - 14);
  body += chips;
  body += `<path d="${cham(bx, by, bw, bh, { tl: 10 })}" fill="${YELLOW}"/>`;
  body += d.text({ x: bx + 16, y: by + 22.5, f: 'h', size: 14.5, ls: 2, fill: ON_YELLOW }, 'VIEW REPOSITORY');
  body += arrowNE(bx + bw - 28, by + 11.5, 11, ON_YELLOW, 2.2);
  body += bracketBR(W, H);

  const tw = measure('h', 'SMOOTH OPERATOR', 46, 1.5);
  return d.svg({
    w: W, h: H, label: S.projetoLabel, body,
    defs: `<clipPath id="prjClip"><path d="${panelPath(W, H)}"/></clipPath>${crossDef('prjCross', th)}${hazardDef('prjHaz')}${wipeMask('prjWipe', X - 2, 60, tw + 12, 56, 0.2)}`,
  });
}

// ════════════════════════════════════════════════════════════════════════
// divisor
// ════════════════════════════════════════════════════════════════════════
function divisor(th) {
  const d = new Doc();
  const W = 840, H = 16;
  let body = `<line x1="0" y1="8.5" x2="${W - 22}" y2="8.5" stroke="${th.rule}" stroke-width="1"/>`;
  body += `<rect x="0" y="7" width="96" height="3" fill="${YELLOW}"/>`;
  for (let x = 120, k = 0; x <= W - 48; x += 24, k++) {
    body += `<line x1="${x}" y1="${k % 4 === 0 ? 3.5 : 5.5}" x2="${x}" y2="8.5" stroke="${th.rule}" stroke-width="1"/>`;
  }
  body += `<path d="${diamond(W - 11, 8.5, 5)}" fill="none" stroke="${th.rule}" stroke-width="1.2"/>`;
  body += `<rect x="-140" y="7" width="120" height="3" fill="url(#glint)"><animate attributeName="x" values="-140;${W};${W}" keyTimes="0;0.45;1" dur="7s" repeatCount="indefinite"/></rect>`;
  return d.svg({
    w: W, h: H, body,
    defs: `<linearGradient id="glint" x1="0" x2="1"><stop offset="0" stop-color="${YELLOW}" stop-opacity="0"/><stop offset="0.5" stop-color="${YELLOW}" stop-opacity="0.9"/><stop offset="1" stop-color="${YELLOW}" stop-opacity="0"/></linearGradient>`,
  });
}

// ── escreve tudo ────────────────────────────────────────────────────────
const ASSETS = [
  ['header', header, true],
  ['carreira', carreira, true],
  ['projeto', projeto, true],
  ['clientes', clientes],
  ['stack', stack],
  ['divisor', divisor],
  ['badge-email', (th) => badge(th, 'E-MAIL', 'email')],
  ['badge-linkedin', (th) => badge(th, 'LINKEDIN', 'linkedin')],
  ['badge-scholar', (th) => badge(th, 'GOOGLE SCHOLAR', 'scholar')],
  ...CERTS.map((c, i) => [`cert-${c.id}`, (th) => cert(th, c, i)]),
];

for (const [tema, th] of Object.entries(THEMES)) {
  const dir = path.join(OUT, tema);
  fs.mkdirSync(dir, { recursive: true });
  for (const [nome, fn, i18n] of ASSETS) {
    const saidas = i18n ? [[nome, 'pt'], [`${nome}-en`, 'en']] : [[nome, 'pt']];
    for (const [arq, lang] of saidas) {
      const svg = fn(th, lang);
      fs.writeFileSync(path.join(dir, `${arq}.svg`), svg.trim() + '\n');
      console.log('ok', `${tema}/${arq}.svg`, `${(Buffer.byteLength(svg) / 1024).toFixed(1)}kB`);
    }
  }
}
