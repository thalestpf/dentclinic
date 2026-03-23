import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = () => {
    if (!email || !password) {
      showToast('Preencha e-mail e senha.', true);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Login realizado com sucesso!');
      setTimeout(() => onLogin(), 800);
    }, 1800);
  };

  return (
    <div style={s.root}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2C9 2 6 4.5 6 8c0 2 .5 3.5 1 5l1 5c.3 1.2 1 2 2 2h4c1 0 1.7-.8 2-2l1-5c.5-1.5 1-3 1-5 0-3.5-3-6-6-6z" />
            </svg>
          </div>
          <span style={s.brandName}>DentClinic</span>
        </div>
        <div>
          <h1 style={s.hero}>Gestão <em style={{ fontStyle: 'italic', color: '#A8D5C2' }}>inteligente</em><br />para sua clínica</h1>
          <p style={s.heroSub}>Agenda, prontuários e financeiro em um só lugar. Simples e eficiente.</p>
        </div>
        <div style={s.stats}>
          {[['98%','Satisfação'],['+500','Clínicas'],['24/7','Suporte']].map(([n,l]) => (
            <div key={l}>
              <div style={s.statNum}>{n}</div>
              <div style={s.statLabel}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Bem-vindo de volta</h2>
          <p style={s.cardSub}>Acesse sua clínica</p>

          <div style={{ marginTop: 28 }}>
            {/* Email */}
            <div style={s.field}>
              <label style={s.label}>E-mail</label>
              <input style={s.input} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {/* Password */}
            <div style={s.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={s.label}>Senha</label>
                <span style={s.forgot} onClick={() => showToast('Link de recuperação enviado!')}>Esqueci a senha</span>
              </div>
              <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {/* Remember */}
            <div style={s.remember} onClick={() => setRemember(!remember)}>
              <div style={{ ...s.checkbox, ...(remember ? s.checkboxChecked : {}) }}>
                {remember && <span style={{ fontSize: 10, color: '#fff', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>Manter conectado</span>
            </div>
            {/* Submit */}
            <button
              style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div style={s.divider}>
              <span style={s.dividerLine} />
              <span style={s.dividerText}>ou acesse como</span>
              <span style={s.dividerLine} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Dentista', 'Secretária'].map(role => (
                <button key={role} style={s.roleBtn} onClick={() => { onLogin(); }}>
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, ...(toast.error ? s.toastError : {}) }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#F7F5F2', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden' },
  left: { width: '45%', background: '#1A1A1A', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandIcon: { width: 36, height: 36, background: '#E8F4F0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff', letterSpacing: '-0.3px' },
  hero: { fontFamily: "'DM Serif Display', serif", fontSize: 38, fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300, maxWidth: 260 },
  stats: { display: 'flex', gap: 32 },
  statNum: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff', letterSpacing: '-0.5px' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  card: { width: '100%', maxWidth: 340 },
  cardTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px' },
  cardSub: { fontSize: 13, color: '#888', fontWeight: 300, marginTop: 4 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#888', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 },
  input: { width: '100%', padding: '13px 16px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#1A1A1A', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  forgot: { fontSize: 11, color: '#888', cursor: 'pointer' },
  remember: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 },
  checkbox: { width: 16, height: 16, border: '1.5px solid #E0E0E0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexShrink: 0 },
  checkboxChecked: { background: '#1A1A1A', borderColor: '#1A1A1A' },
  btn: { width: '100%', padding: 14, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  btnLoading: { background: '#555', cursor: 'not-allowed' },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' },
  dividerLine: { flex: 1, height: 1, background: '#EFEFEF' },
  dividerText: { fontSize: 11, color: '#C0C0C0', letterSpacing: '0.5px', textTransform: 'uppercase' },
  roleBtn: { padding: 11, border: '1.5px solid #EFEFEF', borderRadius: 10, background: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#1A1A1A', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 300, zIndex: 100 },
  toastError: { background: '#C0392B' },
};
