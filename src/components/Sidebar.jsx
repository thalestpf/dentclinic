import React from 'react';

const navItems = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
      { id: 'agenda', label: 'Agenda', icon: <CalendarIcon /> },
      { id: 'prontuario', label: 'Prontuário', icon: <FileIcon /> },
    ],
  },
  {
    section: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro', icon: <DollarIcon /> },
      { id: 'estoque', label: 'Estoque', icon: <BoxIcon /> },
      { id: 'relatorios', label: 'Relatórios', icon: <ChartIcon /> },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { id: 'pacientes', label: 'Pacientes', icon: <UserIcon /> },
      { id: 'configuracoes', label: 'Configurações', icon: <SettingsIcon /> },
    ],
  },
];

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <ToothIcon />
        </div>
        <span style={styles.brandName}>DentClinic</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map((group) => (
          <div key={group.section}>
            <div style={styles.sectionLabel}>{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                style={{
                  ...styles.navItem,
                  ...(currentPage === item.id ? styles.navItemActive : {}),
                }}
                onClick={() => onNavigate(item.id)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={styles.userArea}>
        <div style={styles.avatar}>DS</div>
        <div>
          <div style={styles.userName}>Dra. Silva</div>
          <div style={styles.userRole}>Administrador</div>
        </div>
      </div>
    </aside>
  );
}

/* ── SVG Icons ── */
function ToothIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2C9 2 6 4.5 6 8c0 2 .5 3.5 1 5l1 5c.3 1.2 1 2 2 2h4c1 0 1.7-.8 2-2l1-5c.5-1.5 1-3 1-5 0-3.5-3-6-6-6z" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </svg>
  );
}

/* ── Styles ── */
const styles = {
  sidebar: {
    width: 220,
    background: '#1A1A1A',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 0',
    flexShrink: 0,
    minHeight: '100vh',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 24px 28px',
  },
  brandIcon: {
    width: 32, height: 32,
    background: '#E8F4F0',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 18,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  sectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    padding: '8px 24px 8px',
    marginTop: 8,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '11px 24px',
    background: 'transparent',
    border: 'none',
    borderLeft: '2px solid transparent',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    borderLeftColor: '#A8D5C2',
  },
  navIcon: { display: 'flex', alignItems: 'center' },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    marginTop: 'auto',
  },
  avatar: {
    width: 32, height: 32,
    background: '#A8D5C2',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 500, color: '#1A1A1A', flexShrink: 0,
  },
  userName: { fontSize: 12, color: '#fff' },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
};
