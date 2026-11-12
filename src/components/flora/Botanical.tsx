import { useId, type ReactNode } from 'react';
import { useTheme } from '../../lib/theme';

/*
 * Ботанічна лінійна графіка для теми «bloom».
 * Усе будується з кількох примітивів (пелюстка, квітка, лист, бутон, ягода) у локальних координатах:
 * основа елемента — у (0, 0), кінчик — угору (−y). Градієнти задані в objectBoundingBox,
 * тож вони «повертаються» разом з елементом і завжди йдуть від основи до краю.
 * У темній темі компоненти нічого не рендерять.
 */

interface Props {
  /** Колір ліній (CSS-значення). За замовчуванням — var(--flower-line). */
  color?: string;
  className?: string;
  /** Біла версія для синіх карток */
  inverse?: boolean;
}

interface Ids {
  petal: string;
  leaf: string;
}

const f = (n: number) => Math.round(n * 100) / 100;

// ---------- Примітиви ----------

function petalPath(L: number, W: number): string {
  const top = 0.78 * L;
  let d = `M0 0 C${f(-0.35 * W)} ${f(-0.1 * L)} ${f(-0.64 * W)} ${f(-0.45 * L)} ${f(-0.5 * W)} ${f(-top)}`;
  // хвилястий край: 4 «фестони» по дузі від лівого до правого краю
  const arc = (t: number, k = 1) => {
    const a = Math.PI * (1 - t);
    return [0.5 * W * Math.cos(a) * k, -top - 0.22 * L * Math.sin(a) * k - (k - 1) * top * 0.02];
  };
  const n = 4;
  for (let i = 1; i <= n; i++) {
    const [cx, cy] = arc((i - 0.5) / n, 1.16);
    const [x, y] = arc(i / n);
    d += ` Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
  }
  d += ` C${f(0.64 * W)} ${f(-0.45 * L)} ${f(0.35 * W)} ${f(-0.1 * L)} 0 0Z`;
  return d;
}

function petalVeins(L: number, W: number, count: number): string {
  const top = 0.78 * L;
  const half = (count - 1) / 2;
  let d = '';
  for (let j = -half; j <= half; j++) {
    const x = (j / Math.max(half, 1)) * 0.36 * W;
    const s = Math.sqrt(Math.max(0, 1 - (x / (0.5 * W)) ** 2));
    const yEdge = top + 0.22 * L * s;
    d += `M0 ${f(-0.1 * L)} Q${f(x * 0.45)} ${f(-0.5 * L)} ${f(x)} ${f(-yEdge * 0.86)} `;
  }
  return d;
}

function Flower({ x, y, r, rot = 0, ids }: { x: number; y: number; r: number; rot?: number; ids: Ids }) {
  const L = r * 0.9;
  const W = r * 0.98;
  const rc = r * 0.15;
  const stamens: ReactNode[] = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + 0.11;
    const len = rc * (i % 2 ? 2.05 : 2.45);
    const x1 = Math.cos(a) * rc * 1.05;
    const y1 = Math.sin(a) * rc * 1.05;
    const x2 = Math.cos(a) * len;
    const y2 = Math.sin(a) * len;
    stamens.push(
      <g key={i}>
        <path d={`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`} className="fl-thin" />
        <circle cx={f(x2)} cy={f(y2)} r={f(Math.max(0.7, r * 0.022))} className="fl-dot" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k} transform={`rotate(${k * 72}) translate(0 ${f(-r * 0.1)})`}>
          <path d={petalPath(L, W)} fill={`url(#${ids.petal})`} />
          <path d={petalVeins(L, W, r > 18 ? 5 : 3)} className="fl-thin" />
        </g>
      ))}
      {stamens}
      <circle r={f(rc)} fill={`url(#${ids.petal})`} />
    </g>
  );
}

function leafPath(L: number, W: number) {
  return `M0 0 C${f(0.75 * W)} ${f(-0.22 * L)} ${f(0.55 * W)} ${f(-0.72 * L)} 0 ${f(-L)} C${f(-0.55 * W)} ${f(-0.72 * L)} ${f(-0.75 * W)} ${f(-0.22 * L)} 0 0Z`;
}

function Leaf({ x, y, L, W, rot, ids, pairs = 4 }: { x: number; y: number; L: number; W: number; rot: number; ids: Ids; pairs?: number }) {
  let veins = `M0 ${f(-0.02 * L)} Q${f(0.05 * W)} ${f(-0.5 * L)} 0 ${f(-0.94 * L)} `;
  for (let i = 0; i < pairs; i++) {
    const t = 0.2 + (i / pairs) * 0.55;
    const hw = 0.5 * W * Math.sin(Math.PI * Math.min(0.95, t + 0.14)) * 0.82;
    for (const s of [-1, 1]) {
      veins += `M0 ${f(-t * L)} Q${f(s * hw * 0.45)} ${f(-(t + 0.05) * L)} ${f(s * hw)} ${f(-(t + 0.14) * L)} `;
    }
  }
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`}>
      <path d={leafPath(L, W)} fill={`url(#${ids.leaf})`} />
      <path d={veins} className="fl-thin" />
    </g>
  );
}

function Bud({ x, y, L, W, rot, ids }: { x: number; y: number; L: number; W: number; rot: number; ids: Ids }) {
  const body = `M0 0 C${f(0.55 * W)} ${f(-0.15 * L)} ${f(0.5 * W)} ${f(-0.7 * L)} 0 ${f(-L)} C${f(-0.5 * W)} ${f(-0.7 * L)} ${f(-0.55 * W)} ${f(-0.15 * L)} 0 0Z`;
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`}>
      <path d={body} fill={`url(#${ids.petal})`} />
      <path d={`M${f(-0.12 * W)} ${f(-0.2 * L)} Q${f(0.2 * W)} ${f(-0.6 * L)} ${f(0.02 * W)} ${f(-0.96 * L)}`} className="fl-thin" />
      <path d={`M${f(0.16 * W)} ${f(-0.18 * L)} Q${f(0.3 * W)} ${f(-0.45 * L)} ${f(0.22 * W)} ${f(-0.7 * L)}`} className="fl-thin" />
      {/* чашолистки */}
      {[-38, 0, 38].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={leafPath(L * 0.46, W * 0.36)} fill={`url(#${ids.leaf})`} />
          <path d={`M0 ${f(-0.04 * L)} L0 ${f(-0.38 * L)}`} className="fl-thin" />
        </g>
      ))}
    </g>
  );
}

function Berry({ x, y, r, ids }: { x: number; y: number; r: number; ids: Ids }) {
  const calyx = [0, 72, 144, 216, 288].map((a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `M${f(x)} ${f(y - r)} L${f(x + Math.cos(rad) * r * 0.32)} ${f(y - r + Math.sin(rad) * r * 0.32)} `;
  });
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={`url(#${ids.petal})`} />
      <path d={calyx.join('')} className="fl-thin" />
      <path d={`M${f(x - r * 0.55)} ${f(y - r * 0.05)} A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(x - r * 0.1)} ${f(y - r * 0.55)}`} className="fl-thin" />
    </g>
  );
}

// ---------- Обгортка ----------

function Frame({ viewBox, color, className, inverse, children }: Props & { viewBox: string; children: (ids: Ids) => ReactNode }) {
  const theme = useTheme();
  const raw = useId().replace(/:/g, '');
  if (theme !== 'bloom') return null;
  const ids = { petal: `fl-p-${raw}`, leaf: `fl-l-${raw}` };
  const from = inverse ? 'var(--flower-fill-inverse-from)' : 'var(--flower-fill-from)';
  const to = inverse ? 'var(--flower-fill-inverse-to)' : 'var(--flower-fill-to)';
  const stroke = color ?? (inverse ? 'var(--flower-line-inverse)' : 'var(--flower-line)');
  return (
    <span className="flora-clip" aria-hidden="true">
      <svg viewBox={viewBox} className={className} aria-hidden="true" focusable="false"
        style={{ stroke, color: stroke, fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' }}>
        <defs>
          {[ids.petal, ids.leaf].map((id) => (
            <linearGradient key={id} id={id} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" style={{ stopColor: from }} />
              <stop offset="1" style={{ stopColor: to }} />
            </linearGradient>
          ))}
        </defs>
        {children(ids)}
      </svg>
    </span>
  );
}

/** Горизонтальна гілка: 3 квітки різного розміру, бутони, листя, ягоди */
export function BotanicalSpray(props: Props) {
  return (
    <Frame viewBox="0 0 360 170" {...props}>
      {(ids) => (
        <g>
          {/* стебла */}
          <path d="M6 150 C70 140 120 118 170 100 S270 66 352 40" />
          <path d="M96 128 C100 104 104 92 106 80" />
          <path d="M214 86 C222 70 236 60 252 52" />
          <path d="M150 106 C160 124 178 136 196 140" />
          <path d="M300 54 C306 70 318 82 332 88" />
          <path d="M60 140 C56 122 48 112 40 104" />
          {/* листя */}
          <Leaf x={140} y={110} L={44} W={22} rot={-120} ids={ids} />
          <Leaf x={186} y={95} L={40} W={20} rot={20} ids={ids} />
          <Leaf x={270} y={62} L={36} W={18} rot={-110} ids={ids} />
          <Leaf x={60} y={140} L={34} W={17} rot={150} ids={ids} />
          <Leaf x={320} y={48} L={30} W={15} rot={40} ids={ids} />
          {/* ягоди */}
          <Berry x={198} y={142} r={7} ids={ids} />
          <Berry x={186} y={150} r={5.5} ids={ids} />
          <Berry x={209} y={152} r={5} ids={ids} />
          <Berry x={335} y={92} r={5.5} ids={ids} />
          {/* бутони */}
          <Bud x={40} y={104} L={26} W={15} rot={-50} ids={ids} />
          <Bud x={252} y={52} L={24} W={14} rot={60} ids={ids} />
          {/* квітки */}
          <Flower x={106} y={70} r={26} rot={8} ids={ids} />
          <Flower x={176} y={58} r={36} rot={-12} ids={ids} />
          <Flower x={300} y={44} r={20} rot={20} ids={ids} />
        </g>
      )}
    </Frame>
  );
}

/** Вертикальна гілочка: одна квітка, два бутони */
export function BotanicalSprig(props: Props) {
  return (
    <Frame viewBox="0 0 120 240" {...props}>
      {(ids) => (
        <g>
          <path d="M62 236 C58 200 64 160 60 120 S58 80 60 66" />
          <path d="M60 170 C48 156 36 146 26 140" />
          <path d="M61 130 C74 118 84 108 92 96" />
          <Leaf x={61} y={205} L={40} W={20} rot={-38} ids={ids} />
          <Leaf x={60} y={186} L={36} W={18} rot={40} ids={ids} />
          <Leaf x={60} y={150} L={28} W={14} rot={-30} ids={ids} />
          <Bud x={26} y={140} L={26} W={15} rot={-55} ids={ids} />
          <Bud x={92} y={96} L={22} W={13} rot={40} ids={ids} />
          <Flower x={60} y={52} r={32} rot={-6} ids={ids} />
        </g>
      )}
    </Frame>
  );
}

/** Одна квітка — для логотипа */
export function BotanicalBlossom(props: Props) {
  return (
    <Frame viewBox="0 0 64 64" {...props}>
      {(ids) => <Flower x={32} y={32} r={27} rot={-8} ids={ids} />}
    </Frame>
  );
}
