'use client';

import { useState, useEffect } from 'react';
import { Button, Card, PageHeader } from '../../../../components/UI';

export default function CriarUsuarioPage() {
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    email: '',
    senha: '',
    nome: '',
    role: 'dentista',
    clinica_id: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('clinicas');
    if (saved) {
      setClinicas(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'DentClinic_2024_SuperSecret_Thales_Hash_Key_9a8b7c6d',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `✅ Usuário ${form.nome} criado com sucesso!` });
        setForm({ email: '', senha: '', nome: '', role: 'dentista', clinica_id: '' });
      } else {
        setMessage({ type: 'error', text: `❌ Erro: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Erro: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.main}>
      <PageHeader
        title="Criar Usuário"
        subtitle="Cadastre novos dentistas, secretárias ou administradores"
      />

      <Card style={{ maxWidth: 500, margin: '0 auto', padding: 32 }}>
        {message && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              background: message.type === 'success' ? '#D4EDDA' : '#F8D7DA',
              color: message.type === 'success' ? '#155724' : '#721C24',
              fontSize: 13,
              border: `1px solid ${message.type === 'success' ? '#C3E6CB' : '#F5C6CB'}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={s.input}
              placeholder="usuario@clinica.com"
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Nome Completo *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              style={s.input}
              placeholder="Ex: Dr. Silva"
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Senha *</label>
            <input
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              style={s.input}
              placeholder="Mínimo 8 caracteres"
            />
            <small style={{ color: '#888', marginTop: 4, display: 'block' }}>
              Senha não será exposta em logs ou console
            </small>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Papel *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={s.input}
            >
              <option value="dentista">Dentista</option>
              <option value="secretaria">Secretária</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Clínica *</label>
            <select
              value={form.clinica_id}
              onChange={(e) => setForm({ ...form, clinica_id: e.target.value })}
              style={s.input}
              required
            >
              <option value="">Selecione uma clínica</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <Button
            style={{ width: '100%', padding: '12px 16px', marginTop: 20 }}
            disabled={loading}
          >
            {loading ? 'Criando...' : '+ Criar Usuário'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: '#1A1A1A' },
  input: { padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
};
