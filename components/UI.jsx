'use client';

/* ── Button ── */
export function Button({ children, variant = 'primary', onClick, style }) {
  const base = {
    padding: '10px 18px',
    borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s, border-color 0.2s',
    ...style,
  };
  const variants = {
    primary: { background: '#1A1A1A', color: '#fff' },
    ghost: { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E8E8E8' },
    danger: { background: '#E74C3C', color: '#fff' },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick}>
      {children}
    </button>
  );
}

/* ── Badge ── */
export function Badge({ children, color = 'green' }) {
  const colors = {
    green: { background: '#E8F5E9', color: '#27AE60' },
    yellow: { background: '#FFF9E6', color: '#F39C12' },
    red: { background: '#FDECEA', color: '#E74C3C' },
    blue: { background: '#E6F1FB', color: '#185FA5' },
    gray: { background: '#F1EFE8', color: '#5F5E5A' },
  };
  return (
    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, ...colors[color] }}>
      {children}
    </span>
  );
}

/* ── Card ── */
export function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 22, border: '1.5px solid #EFEFEF', ...style }}>
      {children}
    </div>
  );
}

/* ── CardTitle ── */
export function CardTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{children}</span>
      {action && <span style={{ fontSize: 11, color: '#AAA', cursor: 'pointer' }}>{action}</span>}
    </div>
  );
}

/* ── KPI Card ── */
export function KpiCard({ label, value, delta, deltaType = 'up', barWidth }) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, letterSpacing: '-0.5px', margin: '8px 0 4px' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 300, color: deltaType === 'up' ? '#27AE60' : '#E74C3C' }}>
        {delta}
      </div>
      {barWidth !== undefined && (
        <div style={{ height: 3, background: '#F0F0F0', borderRadius: 2, marginTop: 14 }}>
          <div style={{ height: '100%', width: `${barWidth}%`, background: '#A8D5C2', borderRadius: 2 }} />
        </div>
      )}
    </Card>
  );
}

/* ── Page Header ── */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, letterSpacing: '-0.5px', fontWeight: 400 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13, color: '#888', fontWeight: 300, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  );
}
