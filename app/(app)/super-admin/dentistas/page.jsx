'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const especialidades = ['Geral', 'Ortodontia', 'Implantodontia', 'Endodontia', 'Periodontia', 'Pediodontia'];

export default function DentistasSuperAdminPage() {
  const [dentistas, setDentistas] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [tipoEdicao, setTipoEdicao] = useState(null); // 'dentista' ou 'secretaria'
  const [form, setForm] = useState({ nome: '', email: '', especialidade: '', cro: '', clinica_id: '', status: 'ativo' });
  const [senhaTemp, setSenhaTemp] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Obter sessão e role do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Sem sessão');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('user_roles')
        .select('role, clinica_id')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      // Carregar clínicas (super_admin vê tudo)
      let clinicasQuery = supabase.from('clinicas').select('*');

      if (userData.role !== 'super_admin' && userData.clinica_id) {
        clinicasQuery = clinicasQuery.eq('id', userData.clinica_id);
      }

      const { data: clinicasData, error: clinicasError } = await clinicasQuery;

      if (clinicasError) throw clinicasError;
      setClinicas(clinicasData || []);

      // Carregar dentistas (super_admin vê tudo)
      let dentistasQuery = supabase.from('dentistas').select('*');

      if (userData.role !== 'super_admin' && userData.clinica_id) {
        dentistasQuery = dentistasQuery.eq('clinica_id', userData.clinica_id);
      }

      const { data: dentistasData, error: dentistasError } = await dentistasQuery;

      if (dentistasError) throw dentistasError;
      setDentistas(dentistasData || []);

      // Carregar secretárias via API Route (bypassa RLS com service_role)
      const params = userData.role !== 'super_admin' && userData.clinica_id
        ? `?clinica_id=${userData.clinica_id}`
        : '';
      const resSecretarias = await fetch(`/api/secretarias${params}`);
      const secretariasData = await resSecretarias.json();
      setSecretarias(Array.isArray(secretariasData) ? secretariasData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados do Supabase');
    } finally {
      setLoading(false);
    }
  };

  const dentistasFiltrados = dentistas.filter(d =>
    d.nome.toLowerCase().includes(busca.toLowerCase()) ||
    d.email.toLowerCase().includes(busca.toLowerCase()) ||
    (d.cro && d.cro.includes(busca))
  );

  const secretariasFiltradas = secretarias.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    s.email.toLowerCase().includes(busca.toLowerCase())
  );

  const getNomeClinica = (clinica_id) => {
    const clinic = clinicas.find(c => c.id === clinica_id);
    return clinic ? clinic.nome : 'N/A';
  };

  const handleNovoOuEditar = (tipo) => {
    const clinicaId = clinicas.length > 0 ? clinicas[0].id : null;
    const clinicaAtual = clinicas.find(c => c.id === clinicaId);

    if (tipo === 'dentista') {
      const limiteDentistas = clinicaAtual?.limite_dentistas ?? 5;
      const totalDentistas = dentistas.filter(d => d.clinica_id === clinicaId && d.status === 'ativo').length;
      if (totalDentistas >= limiteDentistas) {
        alert(`Limite atingido: seu plano permite até ${limiteDentistas} dentista(s). Faça upgrade para adicionar mais.`);
        return;
      }
      setForm({ nome: '', email: '', especialidade: '', cro: '', clinica_id: clinicaId || '', status: 'ativo' });
    } else {
      const limiteSecretarias = clinicaAtual?.limite_secretarias ?? 3;
      const totalSecretarias = secretarias.filter(s => s.clinica_id === clinicaId).length;
      if (totalSecretarias >= limiteSecretarias) {
        alert(`Limite atingido: seu plano permite até ${limiteSecretarias} secretária(s). Faça upgrade para adicionar mais.`);
        return;
      }
      setForm({ nome: '', email: '', clinica_id: clinicaId || '', status: 'ativo' });
    }

    setTipoEdicao(tipo);
    setEditId(null);
    setModal('novo');
  };

  if (loading) {
    return <div style={s.main}><p>Carregando...</p></div>;
  }

  const handleEditar = (pessoa, tipo) => {
    setEditId(pessoa.id);
    setTipoEdicao(tipo);
    setForm({ ...pessoa });
    setModal('editar');
  };

  const handleExcluir = async (id, tipo) => {
    const msg = tipo === 'dentista' ? 'dentista' : 'secretária';
    if (!window.confirm(`Deseja realmente excluir este(a) ${msg}?`)) return;

    try {
      const tabela = tipo === 'dentista' ? 'dentistas' : 'user_roles';
      const { error } = await supabase
        .from(tabela)
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (tipo === 'dentista') {
        setDentistas(dentistas.filter(d => d.id !== id));
      } else {
        setSecretarias(secretarias.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert(`Erro ao excluir ${msg}`);
    }
  };

  const handleSalvar = async () => {
    if (tipoEdicao === 'dentista') {
      if (!form.nome || !form.email || !form.cro || !form.clinica_id) {
        alert('Preencha os campos obrigatórios');
        return;
      }
    } else {
      if (!form.nome || !form.email || !form.clinica_id) {
        alert('Preencha os campos obrigatórios');
        return;
      }
    }

    try {
      const tabela = tipoEdicao === 'dentista' ? 'dentistas' : 'user_roles';

      if (modal === 'novo') {
        // CREATE
        const { data, error } = await supabase
          .from(tabela)
          .insert([form])
          .select();

        if (error) throw error;

        if (tipoEdicao === 'dentista') {
          setDentistas([...dentistas, data[0]]);
        } else {
          setSecretarias([...secretarias, data[0]]);
        }
      } else {
        // UPDATE
        const { error } = await supabase
          .from(tabela)
          .update(form)
          .eq('id', editId);

        if (error) throw error;

        if (tipoEdicao === 'dentista') {
          setDentistas(dentistas.map(d =>
            d.id === editId ? { ...d, ...form } : d
          ));
        } else {
          setSecretarias(secretarias.map(s =>
            s.id === editId ? { ...s, ...form } : s
          ));
        }

        // Se houver nova senha, atualizar no Supabase Auth via API
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
            alert('Usuário atualizado, mas erro ao alterar senha: ' + dataPassword.error);
          } else {
            alert('Usuário e senha atualizados com sucesso!');
          }
        }
      }

      setModal(null);
      setSenhaTemp('');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar usuário');
    }
  };

  const handleFecharModal = () => {
    setModal(null);
    setTipoEdicao(null);
    setForm({ nome: '', email: '', especialidade: '', cro: '', clinica_id: '', status: 'ativo' });
    setSenhaTemp('');
  };

  const totalPessoas = dentistas.length + secretarias.length;
  const ativos = dentistas.filter(d => d.status === 'ativo').length + secretarias.filter(s => s.status !== 'inativo').length;
  const numClinicas = clinicas.length;

  return (
    <div style={s.main}>
      <PageHeader
        title="Gerenciar Dentistas e Secretárias"
        subtitle="Cadastro e controle de dentistas e secretárias da clínica"
      >
        <Button variant="ghost">Exportar</Button>
        <Button onClick={() => handleNovoOuEditar('secretaria')}>+ Nova Secretária</Button>
        <Button onClick={() => handleNovoOuEditar('dentista')}>+ Novo Dentista</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Total de pessoas" value={totalPessoas} delta={`${ativos} ativos`} />
        <KpiCard label="Total de dentistas" value={dentistas.length} delta={dentistas.filter(d => d.status === 'ativo').length + ' ativos'} />
        <KpiCard label="Total de secretárias" value={secretarias.length} delta={secretarias.filter(s => s.status !== 'inativo').length + ' ativas'} />
        <KpiCard label="Total de clínicas" value={numClinicas} delta="cadastradas" />
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
              <th style={s.th}>Clínica</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
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
              dentistasFiltrados.map(dentista => (
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
        <CardTitle>Secretárias cadastradas</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Clínica</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {secretariasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhuma secretária encontrada
                </td>
              </tr>
            ) : (
              secretariasFiltradas.map(secretaria => (
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
            <h2 style={s.modalTitle}>
              {modal === 'novo'
                ? (tipoEdicao === 'dentista' ? 'Novo Dentista' : 'Nova Secretária')
                : (tipoEdicao === 'dentista' ? 'Editar Dentista' : 'Editar Secretária')
              }
            </h2>

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
                    {especialidades.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={s.formGroup}>
              <label style={s.label}>Clínica *</label>
              <select
                value={form.clinica_id}
                onChange={(e) => setForm({ ...form, clinica_id: e.target.value })}
                style={s.input}
              >
                <option value="">Selecione uma clínica</option>
                {clinicas.map(c => (
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
            )}

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={handleFecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar}>
                Salvar {tipoEdicao === 'dentista' ? 'Dentista' : 'Secretária'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 },
  searchCard: { marginBottom: 24 },
  searchInput: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acoes: { display: 'flex', gap: 8 },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500, transition: 'background 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 24, color: '#1A1A1A' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalButtons: { display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' },
};
