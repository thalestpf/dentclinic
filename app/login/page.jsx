'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Preencha e-mail e senha.', true);
      return;
    }

    setLoading(true);

    try {
      // Login com Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast('Email ou senha inválidos', true);
        setLoading(false);
        return;
      }

      // Buscar metadata do usuário
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role, clinica_id, nome')
        .eq('id', data.user.id)
        .maybeSingle();

      // Salvar no localStorage para uso em toda a aplicação
      const role = userRole?.role || 'dentista';
      const nome = userRole?.nome || data.user.email;
      const clinicaId = userRole?.clinica_id || '';
      localStorage.setItem('dentclinic_logged_in', '1');
      localStorage.setItem('dentclinic_role', role);
      localStorage.setItem('dentclinic_name', nome);
      if (clinicaId) localStorage.setItem('clinica_id', clinicaId);

      showToast('Login realizado com sucesso!');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (error) {
      showToast('Erro de conexão. Tente novamente.', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 980px), (max-height: 760px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            flex: 1 1 100% !important;
            padding: 20px !important;
          }
          .login-card {
            max-width: 420px !important;
          }
        }
      `}</style>
      {/* Left panel */}
      <div className="login-left-panel" style={s.left}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2C9 2 6 4.5 6 8c0 2 .5 3.5 1 5l1 5c.3 1.2 1 2 2 2h4c1 0 1.7-.8 2-2l1-5c.5-1.5 1-3 1-5 0-3.5-3-6-6-6z" />
            </svg>
          </div>
          <span style={s.brandName}>DentClinic</span>
        </div>
        <div>
          <h1 style={s.hero}>Gestão <em style={{ fontStyle: 'italic', color: '#A8D5C2' }}>inteligente</em><br />para sua clínica</h1>
          <p style={s.heroSub}>Agenda, prontuários e financeiro em um só lugar. Simples e eficiente.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right-panel" style={s.right}>
        <div className="login-card" style={s.card}>
          <h2 style={s.title}>Entrar na conta</h2>
          <p style={s.subtitle}>Acesse seu painel de controle</p>

          {toast && (
            <div style={{ ...s.toast, background: toast.error ? '#F8D7DA' : '#D4EDDA', color: toast.error ? '#721C24' : '#155724' }}>
              {toast.msg}
            </div>
          )}

          <form onSubmit={handleLogin} style={s.form}>
            <div style={s.formGroup}>
              <label style={s.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={s.input}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" style={s.button} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100dvh', height: '100dvh', background: '#fff', overflow: 'hidden' },
  left: { flex: 1, background: 'linear-gradient(135deg, #1A1A1A 0%, #2D3436 100%)', padding: '44px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48 },
  brand: { display: 'flex', alignItems: 'center', gap: 16 },
  brandIcon: { width: 64, height: 64, background: '#A8D5C2', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 34, fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display', serif" },
  hero: { fontSize: 'clamp(34px, 4vw, 48px)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2, marginBottom: 16, fontFamily: "'DM Serif Display', serif" },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5, maxWidth: 520 },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 40px', overflowY: 'auto' },
  card: { width: '100%', maxWidth: 400 },
  title: { fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px 0', fontFamily: "'DM Serif Display', serif" },
  subtitle: { fontSize: 14, color: '#888', margin: '0 0 32px 0' },
  toast: { padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 500, color: '#1A1A1A' },
  input: { padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' },
  button: { padding: '12px 16px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
};
