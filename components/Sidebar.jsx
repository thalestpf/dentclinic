'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { getModulosPlano } from '@/lib/planos-modulos';
import { resolverNome, nomePareceCEmail } from '@/lib/resolver-nome';

const navItems = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <GridIcon />, roles: ['dentista', 'secretaria', 'super_admin'] },
      { id: 'agenda', label: 'Agenda', icon: <CalendarIcon />, roles: ['dentista', 'secretaria'] },
      { id: 'pacientes', label: 'Pacientes', icon: <UserIcon />, roles: ['dentista', 'secretaria'] },
      { id: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon />, roles: ['dentista', 'secretaria'] },
      { id: 'prontuario', label: 'Prontuário', icon: <FileIcon />, roles: ['dentista'] },
      { id: 'orcamento', label: 'Orçamento', icon: <ClipboardIcon />, roles: ['dentista', 'secretaria'] },
    ],
  },
  {
    section: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro', icon: <DollarIcon />, roles: ['dentista', 'secretaria'] },
      { id: 'estoque', label: 'Estoque', icon: <BoxIcon />, roles: ['dentista', 'secretaria'] },
      { id: 'relatorios', label: 'Relatórios', icon: <ChartIcon />, roles: ['dentista'] },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { id: 'configuracoes', label: 'Configurações', icon: <SettingsIcon />, roles: ['dentista'] },
    ],
  },
  {
    section: 'Super Admin',
    items: [
      { id: 'super-admin/clinicas', label: 'Gerenciar Clínicas', icon: <BuildingIcon />, roles: ['super_admin'] },
      { id: 'super-admin/dentistas', label: 'Gerenciar Dentistas', icon: <UsersIcon />, roles: ['super_admin'] },
      { id: 'super-admin/criar-usuario', label: 'Criar Usuário', icon: <UserPlusIcon />, roles: ['super_admin'] },
      { id: 'super-admin/planos-clinicas', label: 'Planos por Clínica', icon: <TargetIcon />, roles: ['super_admin'] },
      { id: 'super-admin/planos', label: 'Preços', icon: <CreditCardIcon />, roles: ['super_admin'] },
      { id: 'super-admin/integracoes', label: 'Integrações', icon: <PlugIcon />, roles: ['super_admin'] },
    ],
  },
];

const bottomItems = [
  { id: 'dashboard', label: 'Início', icon: <GridIcon /> },
  { id: 'agenda', label: 'Agenda', icon: <CalendarIcon /> },
  { id: 'pacientes', label: 'Pacientes', icon: <UserIcon /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon /> },
  { id: 'prontuario', label: 'Prontuário', icon: <FileIcon /> },
  { id: 'financeiro', label: 'Financeiro', icon: <DollarIcon /> },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [role, setRole] = useState(null);
  const [hasProntuarioContext, setHasProntuarioContext] = useState(false);
  const [userName, setUserName] = useState('Usuário');
  const [userRole, setUserRole] = useState('');
  const [clinicaName, setClinicaName] = useState('');
  const [modulosHabilitados, setModulosHabilitados] = useState(null); // null = sem restrição (super_admin)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    carregarDadosUsuario();
  }, []);
  useEffect(() => {
    const syncProntuarioContext = () => {
      const selectedPacienteId = localStorage.getItem('prontuario_paciente_id');
      setHasProntuarioContext(Boolean(selectedPacienteId));
    };

    syncProntuarioContext();
    window.addEventListener('storage', syncProntuarioContext);
    return () => window.removeEventListener('storage', syncProntuarioContext);
  }, [pathname]);

  const carregarDadosUsuario = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      const userEmail = session.user.email;

      const { data: userData } = await supabase
        .from('user_roles')
        .select('role, clinica_id, nome')
        .eq('id', userId)
        .maybeSingle();

      if (userData) {
        setRole(userData.role);

        const nomeFinal = (!userData.nome || nomePareceCEmail(userData.nome))
          ? await resolverNome(userEmail, supabase)
          : userData.nome;
        setUserName(nomeFinal);

        if (userData.role === 'super_admin') {
          setUserRole('Super Admin');
          setClinicaName('Todas as clínicas');
          setModulosHabilitados(null);
        } else {
          const roleLabel = userData.role === 'secretaria' ? 'Secretária' : 'Dentista';
          setUserRole(roleLabel);

          let clinicaId = userData.clinica_id;

          // Fallback: buscar clinica_id na tabela dentistas se não veio de user_roles
          if (!clinicaId) {
            const { data: dentistaFallback } = await supabase
              .from('dentistas')
              .select('clinica_id')
              .eq('email', userEmail)
              .maybeSingle();
            clinicaId = dentistaFallback?.clinica_id || localStorage.getItem('clinica_id') || localStorage.getItem('dentclinic_clinica_id');
          }

          if (clinicaId) {
            carregarClinica(clinicaId);
            carregarPlanoClinica(clinicaId);
          }
        }
      } else {
        // Sem entrada em user_roles: email cadastrado só via tabela dentistas
        const { data: dentistaData } = await supabase
          .from('dentistas')
          .select('nome, clinica_id')
          .eq('email', userEmail)
          .maybeSingle();

        const roleLocal = localStorage.getItem('dentclinic_role') || 'dentista';
        const localName = localStorage.getItem('dentclinic_name');
        const nameLocal = dentistaData?.nome || (!nomePareceCEmail(localName) ? localName : null) || userEmail;
        const clinicaIdLocal = dentistaData?.clinica_id || localStorage.getItem('clinica_id');

        setRole(roleLocal);
        if (roleLocal === 'super_admin') setUserRole('Super Admin');
        else if (roleLocal === 'secretaria') setUserRole('Secretária');
        else setUserRole('Dentista');

        setUserName(nameLocal);
        if (clinicaIdLocal) carregarClinica(clinicaIdLocal);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const carregarPlanoClinica = (clinicaId) => {
    try {
      const clinicasPlanos = JSON.parse(localStorage.getItem('clinicas_planos') || '[]');
      const vinculo = clinicasPlanos.find(cp => cp.clinica_id === clinicaId && cp.ativo);
      if (vinculo?.plano_nome) {
        setModulosHabilitados(getModulosPlano(vinculo.plano_nome));
      } else {
        setModulosHabilitados(null); // sem plano = sem restrição (evitar bloqueio acidental)
      }
    } catch {
      setModulosHabilitados(null);
    }
  };

  const carregarClinica = async (clinicaId) => {
    try {
      const res = await fetch('/api/clinica');
      if (!res.ok) return;
      const clinicas = await res.json();
      const clinica = Array.isArray(clinicas) ? clinicas.find(c => c.id === clinicaId) : null;
      if (clinica?.nome) setClinicaName(clinica.nome);
    } catch (error) {
      console.error('Erro ao carregar clínica:', error);
    }
  };

  const currentPage = pathname.replace('/', '') || 'dashboard';
  const navigate = (id) => router.push(`/${id}`);

  // Filtrar navItems baseado no role e no plano da clínica
  const filteredNavItems = navItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.id === 'prontuario' && !hasProntuarioContext) return false;
      if (!item.roles || !item.roles.includes(role)) return false;
      // Super admin não tem restrição de plano
      if (role === 'super_admin') return true;
      // Se há plano configurado, verificar se o módulo está habilitado
      if (modulosHabilitados !== null) {
        const moduloHabilitado = item.id === 'whatsapp'
          ? (modulosHabilitados.includes('whatsapp') || modulosHabilitados.includes('integracao_whatsapp'))
          : modulosHabilitados.includes(item.id);
        if (!moduloHabilitado) return false;
      }
      return true;
    }),
  })).filter(section => section.items.length > 0);

  const filteredBottomItems = bottomItems.filter(item => {
    if (item.id === 'prontuario' && !hasProntuarioContext) return false;
    return true;
  });

  if (isMobile) {
    return (
      <nav style={styles.bottomNav}>
        {filteredBottomItems.map(item => (
          <button
            key={item.id}
            style={{ ...styles.bottomItem, ...(currentPage === item.id ? styles.bottomItemActive : {}) }}
            onClick={() => navigate(item.id)}
          >
            <span style={{ display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
            <span style={styles.bottomLabel}>{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandIcon}><ToothIcon /></div>
        <div>
          <span style={styles.brandName}>DentClinic</span>
          {clinicaName && (
            <div style={styles.brandClinica}>{clinicaName}</div>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filteredNavItems.map((group) => (
          <div key={group.section}>
            <div style={styles.sectionLabel}>{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                style={{ ...styles.navItem, ...(currentPage === item.id ? styles.navItemActive : {}) }}
                onClick={() => navigate(item.id)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={styles.userArea}>
        <div style={styles.avatar}>{userName.charAt(0)}{userName.split(' ').pop().charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.userName}>{userName}</div>
          <div style={styles.userRole}>{userRole}</div>
          {clinicaName && <div style={styles.clinicaName}>📍 {clinicaName}</div>}
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          style={styles.logoutButton}
          title="Sair"
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}

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
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5 4.5 16A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path d="M9.5 8.5c.2 1.5 1.3 3.3 2.6 4.6 1.3 1.3 3.1 2.4 4.6 2.6" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="13" r="1" /><path d="M12 17v3M6.3 6.7a6 6 0 1 0 10.4 7.4" /><path d="M7 12a5 5 0 0 1 5-5" />
    </svg>
  );
}
function CreditCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
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
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

const styles = {
  sidebar: { width: 220, background: '#1A1A1A', display: 'flex', flexDirection: 'column', padding: '28px 0', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px 28px' },
  brandIcon: { width: 32, height: 32, background: '#E8F4F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#fff', letterSpacing: '-0.3px', display: 'block' },
  brandClinica: { fontSize: 10, color: '#A8D5C2', marginTop: 2, fontWeight: 500, letterSpacing: '0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 },
  sectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 24px 8px', marginTop: 8 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 24px', background: 'transparent', border: 'none', borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' },
  navItemActive: { background: 'rgba(255,255,255,0.07)', color: '#fff', borderLeftColor: '#A8D5C2' },
  navIcon: { display: 'flex', alignItems: 'center' },
  userArea: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 'auto' },
  avatar: { width: 32, height: 32, background: '#A8D5C2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#1A1A1A', flexShrink: 0 },
  userName: { fontSize: 12, color: '#fff' },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  clinicaName: { fontSize: 9, color: '#A8D5C2', marginTop: 4, fontWeight: 500 },
  logoutButton: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1A1A1A', display: 'flex', zIndex: 100, borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' },
  bottomItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' },
  bottomItemActive: { color: '#A8D5C2' },
  bottomLabel: { fontSize: 10, letterSpacing: '0.2px' },
};

