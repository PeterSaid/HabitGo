import React from 'react';

/** Simple SVG charts (spec section 50): weekly bars, monthly line, donut, calendar grid. */

export function BarChart({ data, height = 130 }: { data: { label: string; value: number; max: number; highlight?: boolean }[]; height?: number }) {
  const width = 320;
  const gap = 10;
  const barW = (width - gap * (data.length - 1)) / data.length;
  const max = Math.max(1, ...data.map((d) => d.max));
  return (
    <svg viewBox={`0 0 ${width} ${height + 22}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="weekly chart">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 8);
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={0} width={barW} height={height} rx={8} fill="var(--surface-2)" />
            {d.value > 0 && (
              <rect x={x} y={height - h} width={barW} height={h} rx={8} fill={d.highlight ? 'var(--primary)' : 'var(--primary-light)'} />
            )}
            <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize="11" fill="var(--text-3)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ points, height = 130 }: { points: { label: string; value: number }[]; height?: number }) {
  const width = 320;
  const pad = 8;
  if (points.length < 2) return null;
  const max = Math.max(100, ...points.map((p) => p.value));
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [pad + i * step, height - (p.value / max) * (height - 14) - 4] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${path} L${coords[coords.length - 1][0]},${height} L${coords[0][0]},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height + 6}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="monthly chart">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineFill)" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} fill="var(--primary)" />
      ))}
    </svg>
  );
}

export function Donut({ percent, size = 120, stroke = 12, children }: { percent: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }} role="img" aria-label={`${percent}%`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--teal)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.2,0.7,0.3,1)' }}
        />
      </svg>
      <div className="center" style={{ position: 'absolute', inset: 0, flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export function MiniRing({ percent, size = 40, stroke = 5, color = 'var(--primary)' }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${filled} ${c - filled}`} />
    </svg>
  );
}

/** GitHub-style heatmap for the last N days (habit details). */
export function Heatmap({ days }: { days: { date: string; status: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 4 }}>
      {days.map((d) => (
        <div key={d.date} className={`heatmap-cell ${d.status}`} title={d.date} />
      ))}
    </div>
  );
}
