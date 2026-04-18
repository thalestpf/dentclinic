'use client';

import { useEffect, useState } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const especialidades = ['Geral', 'Ortodontia', 'Implantodontia', 'Endodontia', 'Periodontia', 'Pediodontia'];

export default function DentistasSuperAdminPage() {
  const [dentistas, setDentistas] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [tipoEdicao, setTipoEdicao] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', especialidade: '', cro: '', clinica_id: '', status: 'ativo' });
  const [senhaTemp, setSenhaTemp] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Sem sessao');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('user_roles')
        .select('role, clinica_id')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      let clinicasQuery = supabase.from('clinicas').select('*');
      if (userData.role !== 'super_admin' && userData.clinica_id) {
        clinicasQuery = clinicasQuery.eq('id', userData.clinica_id);
      }

      const { data: clinicasData, error: clinicasError } = await clinicasQuery;
      if (clinicasError) throw clinicasError;
      setClinicas(clinicasData || []);

      let dentistasQuery = supabase.from('dentistas').select('*');
      if (userData.role !== 'super_admin' && userData.clinica_id) {
        dentistasQuery = dentistasQuery.eq('clinica_id', userData.clinica_id);
      }

      const { data: dentistasData, error: dentistasError } = await dentistasQuery;
      if (dentistasError) throw dentistasError;
      setDentistas(dentistasData || []);

      const params = userData.role !== 'super_admin' && userData.clinica_id
        ? `?clinica_id=${userData.clinica_id}`
        : '';

      const resSecretarias = await fetch(`/api/secretarias${params}`);
      const secretariasData = await resSecretarias.json();
      setSecretarias(Array.isArray(secretariasData) ? secretariasData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showFeedback('error', 'Erro ao carregar dados do Supabase');
    } finally {
      setLoading(false);
    }
  };

  const dentistasFiltrados = dentistas.filter((d) =>
    d.nome.toLowerCase().includes(busca.toLowerCase())
    || d.email.toLowerCase().includes(busca.toLowerCase())
    || (d.cro && d.cro.includes(busca))
  );

  const secretariasFiltradas = secretarias.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase())
    || s.email.toLowerCase().includes(busca.toLowerCase())
  );

  const getNomeClinica = (clinica_id) => {
    const clinic = clinicas.find((c) => c.id === clinica_id);
    return clinic ? clinic.nome : 'N/A';
  };

  const handleNovoOuEditar = (tipo) => {
    const clinicaId = clinicas.length > 0 ? clinicas[0].id : null;
    const clinicaAtual = clinicas.find((c) => c.id === clinicaId);

    if (tipo === 'dentista') {
      const limiteDentistas = clinicaAtual?.limite_dentistas ?? 5;
      const totalDentistas = dentistas.filter((d) => d.clinica_id === clinicaId && d.status === 'ativo').length;
      if (totalDentistas >= limiteDentistas) {
        showFeedback('warning', `Limite atingido: seu plano permite ate ${limiteDentistas} dentista(s).`);
        return;
      }
      setForm({ nome: '', email: '', especialidade: '', cro: '', clinica_id: clinicaId || '', status: 'ativo' });
    } else {
      const limiteSecretarias = clinicaAtual?.limite_secretarias ?? 3;
      const totalSecretarias = secretarias.filter((s) => s.clinica_id === clinicaId).length;
      if (totalSecretarias >= limiteSecretarias) {
        showFeedback('warning', `Limite atingido: seu plano permite ate ${limiteSecretarias} secretaria(s).`);
        return;
      }
      setForm({ nome: '', email: '', clinica_id: clinicaId || '', status: 'ativo' });
    }

    setTipoEdicao(tipo);
    setEditId(null);
    setModal('novo');
  };

  const handleEditar = (pessoa, tipo) => {
    setEditId(pessoa.id);
    setTipoEdicao(tipo);
    setForm({ ...pessoa });
    setModal('editar');
  };

  const handleExcluir = async (id, tipo) => {
    const msg = tipo === 'dentista' ? 'dentista' : 'secretaria';
    if (!window.confirm(`Deseja realmente excluir este(a) ${msg}?`)) return;

    try {
      const tabela = tipo === 'dentista' ? 'dentistas' : 'user_roles';
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      if (error) throw error;

      if (tipo === 'dentista') {
        setDentistas(dentistas.filter((d) => d.id !== id));
      } else {
        setSecretarias(secretarias.filter((s) => s.id !== id));
      }

      showFeedback('success', `${tipo === 'dentista' ? 'Dentista' : 'Secretaria'} excluido(a) com sucesso.`);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showFeedback('error', `Erro ao excluir ${msg}.`);
    }
  };

  const handleSalvar = async () => {
    if (tipoEdicao === 'dentista') {
      if (!form.nome || !form.email || !form.cro || !form.clinica_id) {
        showFeedback('warning', 'Preencha os campos obrigatorios.');
        return;
      }
    } else if (!form.nome || !form.email || !form.clinica_id) {
      showFeedback('warning', 'Preencha os campos obrigatorios.');
      return;
    }

    try {
      const tabela = tipoEdicao === 'dentista' ? 'dentistas' : 'user_roles';

      if (modal === 'novo') {
        const { data, error } = await supabase.from(tabela).insert([form]).select();
        if (error) throw error;

        if (tipoEdicao === 'dentista') {
          setDentistas([...dentistas, data[0]]);
        } else {
          setSecretarias([...secretarias, data[0]]);
        }

        showFeedback('success', `${tipoEdicao === 'dentista' ? 'Dentista' : 'Secretaria'} criado(a) com sucesso.`);
      } else {
        const { error } = await supabase.from(tabela).update(form).eq('id', editId);
        if (error) throw error;

        if (tipoEdicao === 'dentista') {
          setDentistas(dentistas.map((d) => (d.id === editId ? { ...d, ...form } : d)));
        } else {
          setSecretarias(secretarias.map((s) => (s.id === editId ? { ...s, ...form } : s)));
        }

        if (senhaTemp && senhaTemp.trim()) {
          const resPassword = await fetch('/api/dentistas/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email,
              novaSenha: senhaTemp,
            }),
          });

          const dataPassword = await resPassword.json();
          if (!resPassword.ok) {
            console.error('Erro ao atualizar senha:', dataPassword);
            showFeedback('warning', 'Usuario atualizado, mas houve erro ao alterar senha.');
          } else {
            showFeedback('success', 'Usuario e senha atualizados com sucesso.');
          }
        } else {
          showFeedback('success', `${tipoEdicao === 'dentista' ? 'Dentista' : 'Secretaria'} atualizado(a) com sucesso.`);
        }
      }

      setModal(null);
      setSenhaTemp('');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showFeedback('error', 'Erro ao salvar usuario.');
    }
  };

  const handleFecharModal = () => {
    setModal(null);
    setTipoEdicao(null);
    setForm({ nome: '', email: '', especialidade: '', cro: '', clinica_id: '', status: 'ativo' });
    setSenhaTemp('');
  };

  const totalPessoas = dentistas.length + secretarias.length;
  const ativos = dentistas.filter((d) => d.status === 'ativo').length + secretarias.filter((s) => s.status !== 'inativo').length;
  const numClinicas = clinicas.length;

  if (loading) {
    return <div style={s.main}><p>Carregando...</p></div>;
  }

  return (
    <div style={s.main}>
      {feedback && (
        <div
          style={{
            ...s.feedback,
            ...(feedback.type === 'success' ? s.feedbackSuccess : {}),
            ...(feedback.type === 'error' ? s.feedbackError : {}),
            ...(feedback.type === 'warning' ? s.feedbackWarning : {}),
          }}
        >
          {feedback.message}
        </div>
      )}

      <PageHeader
        title="Gerenciar Dentistas e Secretarias"
        subtitle="Cadastro e controle de dentistas e secretarias da clinica"
      >
        <Button variant="ghost">Exportar</Button>
        <Button onClick={() => handleNovoOuEditar('secretaria')}>+ Nova Secretaria</Button>
        <Button onClick={() => handleNovoOuEditar('dentista')}>+ Novo Dentista</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Total de pessoas" value={totalPessoas} delta={`${ativos} ativos`} />
        <KpiCard label="Total de dentistas" value={dentistas.length} delta={`${dentistas.filter((d) => d.status === 'ativo').length} ativos`} />
        <KpiCard label="Total de secretarias" value={secretarias.length} delta={`${secretarias.filter((s) => s.status !== 'inativo').length} ativas`} />
        <KpiCard label="Total de clinicas" value={numClinicas} delta="cadastradas" />
      </div>

      <Card style={s.searchCard}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou CRO..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={s.searchInput}
        />
      </Card>

      <Card>
        <CardTitle>Dentistas cadastrados</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>CRO</th>
              <th style={s.th}>Especialidade</th>
              <th style={s.th}>Clinica</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {dentistasFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhum dentista encontrado
                </td>
              </tr>
            ) : (
              dentistasFiltrados.map((dentista) => (
                <tr key={dentista.id}>
                  <td style={s.td}>{dentista.nome}</td>
                  <td style={s.td}>{dentista.email}</td>
                  <td style={s.td}>{dentista.cro}</td>
                  <td style={s.td}>{dentista.especialidade}</td>
                  <td style={s.td}>{getNomeClinica(dentista.clinica_id)}</td>
                  <td style={s.td}>
                    <Badge color={dentista.status === 'ativo' ? 'green' : 'gray'}>
                      {dentista.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.acaoBotao} onClick={() => handleEditar(dentista, 'dentista')}>Editar</button>
                      <button style={s.acaoBotao} onClick={() => handleExcluir(dentista.id, 'dentista')}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <CardTitle>Secretarias cadastradas</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Clinica</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {secretariasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhuma secretaria encontrada
                </td>
              </tr>
            ) : (
              secretariasFiltradas.map((secretaria) => (
                <tr key={secretaria.id}>
                  <td style={s.td}>{secretaria.nome}</td>
                  <td style={s.td}>{secretaria.email}</td>
                  <td style={s.td}>{getNomeClinica(secretaria.clinica_id)}</td>
                  <td style={s.td}>
                    <Badge color={secretaria.status !== 'inativo' ? 'green' : 'gray'}>
                      {secretaria.status !== 'inativo' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.acaoBotao} onClick={() => handleEditar(secretaria, 'secretaria')}>Editar</button>
                      <button style={s.acaoBotao} onClick={() => handleExcluir(secretaria.id, 'secretaria')}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {modal && (
        <div style={s.modalOverlay} onClick={handleFecharModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={s.modalTitle}>
                  {modal === 'novo'
                    ? (tipoEdicao === 'dentista' ? 'Novo Dentista' : 'Nova Secretaria')
                    : (tipoEdicao === 'dentista' ? 'Editar Dentista' : 'Editar Secretaria')}
                </h2>
                <p style={s.modalSubtitle}>Revise os dados abaixo e clique em salvar para concluir.</p>
              </div>
              <button style={s.modalClose} onClick={handleFecharModal} aria-label="Fechar modal">x</button>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Nome Completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={s.input}
                placeholder="Ex: Dr. Silva"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={s.input}
                placeholder="usuario@clinic.com"
              />
            </div>

            {tipoEdicao === 'dentista' && (
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>CRO *</label>
                  <input
                    type="text"
                    value={form.cro || ''}
                    onChange={(e) => setForm({ ...form, cro: e.target.value })}
                    style={s.input}
                    placeholder="123456"
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Especialidade</label>
                  <select
                    value={form.especialidade || ''}
                    onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                    style={s.input}
                  >
                    <option value="">Selecione uma especialidade</option>
                    {especialidades.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={s.formGroup}>
              <label style={s.label}>Clinica *</label>
              <select
                value={form.clinica_id}
                onChange={(e) => setForm({ ...form, clinica_id: e.target.value })}
                style={s.input}
              >
                <option value="">Selecione uma clinica</option>
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={s.input}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            {modal === 'editar' && (
              <div style={s.passwordBox}>
                <div style={s.passwordTitle}>Alterar senha</div>
                <div style={s.formGroup}>
                  <label style={s.label}>Nova Senha (opcional)</label>
                  <input
                    type="password"
                    value={senhaTemp}
                    onChange={(e) => setSenhaTemp(e.target.value)}
                    style={s.input}
                    placeholder="Deixe vazio para manter a senha atual"
                  />
                </div>
              </div>
            )}

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={handleFecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar}>
                Salvar {tipoEdicao === 'dentista' ? 'Dentista' : 'Secretaria'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8', position: 'relative' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 },
  searchCard: { marginBottom: 24 },
  searchInput: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acoes: { display: 'flex', gap: 8 },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(12,16,22,0.45)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    maxWidth: 680,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #ECECEC',
    boxShadow: '0 22px 44px rgba(16, 24, 40, 0.18)',
  },
  modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 30, marginBottom: 4, color: '#1A1A1A', lineHeight: 1.05 },
  modalSubtitle: { margin: 0, fontSize: 12, color: '#7A7A7A' },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #E6E6E6',
    background: '#FAFAFA',
    cursor: 'pointer',
    fontSize: 16,
    color: '#555',
  },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 },
  input: { width: '100%', padding: '11px 12px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  passwordBox: { background: '#FBFCFD', border: '1px solid #E9EDF2', borderRadius: 12, padding: 14, marginTop: 6 },
  passwordTitle: { fontSize: 12, fontWeight: 700, color: '#556070', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' },
  modalButtons: { display: 'flex', gap: 12, marginTop: 22, justifyContent: 'flex-end' },
  feedback: {
    position: 'fixed',
    top: 18,
    right: 18,
    zIndex: 1200,
    padding: '10px 14px',
    borderRadius: 10,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid transparent',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  feedbackSuccess: { background: '#1F8E50', borderColor: '#187844' },
  feedbackError: { background: '#C74242', borderColor: '#A93535' },
  feedbackWarning: { background: '#B2731A', borderColor: '#985E0F' },
};
