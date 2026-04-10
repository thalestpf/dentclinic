'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../../components/UI';
import { supabase } from '@/lib/supabase-client';

export default function ClinicasSuperAdminPage() {
  const [clinicas, setClinicas] = useState([]);
  const [dentistas, setDentistas] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', cpf: '', responsavel: '', telefone: '', email: '', endereco: '', cidade: '', status: 'ativo' });
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
        alert('Erro: Sem sessão de usuário');
        return;
      }

      console.log('✅ Sessão encontrada:', session.user.id);

      const { data: userData, error: userError } = await supabase
        .from('user_roles')
        .select('role, clinica_id')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar user_roles:', userError);
        throw userError;
      }

      console.log('✅ User data:', userData);

      // Carregar clínicas (super_admin vê tudo)
      let clinicasQuery = supabase.from('clinicas').select('*');

      if (userData.role !== 'super_admin' && userData.clinica_id) {
        console.log('🔒 Filtrando clínicas por clinica_id:', userData.clinica_id);
        clinicasQuery = clinicasQuery.eq('id', userData.clinica_id);
      } else {
        console.log('🔓 Super admin - carregando todas as clínicas');
      }

      const { data: clinicasData, error: clinicasError } = await clinicasQuery;

      if (clinicasError) {
        console.error('Erro ao carregar clinicas:', clinicasError);
        throw clinicasError;
      }

      console.log(`✅ Clínicas carregadas: ${clinicasData?.length || 0}`);
      setClinicas(clinicasData || []);

      // Carregar dentistas (super_admin vê tudo)
      let dentistasQuery = supabase.from('dentistas').select('*');

      if (userData.role !== 'super_admin' && userData.clinica_id) {
        dentistasQuery = dentistasQuery.eq('clinica_id', userData.clinica_id);
      }

      const { data: dentistasData, error: dentistasError } = await dentistasQuery;

      if (dentistasError) {
        console.error('Erro ao carregar dentistas:', dentistasError);
        throw dentistasError;
      }

      console.log(`✅ Dentistas carregados: ${dentistasData?.length || 0}`);
      setDentistas(dentistasData || []);
    } catch (error) {
      console.error('Erro ao carregar:', error.message);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clinicasFiltradas = clinicas.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj.includes(busca) ||
    c.cpf.includes(busca) ||
    c.cidade.toLowerCase().includes(busca.toLowerCase())
  );

  const getDentistasClinica = (clinicaId) => {
    return dentistas.filter(d => d.clinica_id === clinicaId);
  };

  const handleNovo = () => {
    setEditId(null);
    setForm({ nome: '', cnpj: '', cpf: '', responsavel: '', telefone: '', email: '', endereco: '', cidade: '', status: 'ativo' });
    setModal('novo');
  };

  const handleEditar = (clinica) => {
    setEditId(clinica.id);
    setForm({
      nome: clinica.nome || '',
      cnpj: clinica.cnpj || '',
      cpf: clinica.cpf || '',
      responsavel: clinica.responsavel || '',
      telefone: clinica.telefone || '',
      email: clinica.email || '',
      endereco: clinica.endereco || '',
      cidade: clinica.cidade || '',
      status: clinica.status || 'ativo',
    });
    setModal('editar');
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta clínica?')) return;

    try {
      const { error } = await supabase
        .from('clinicas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setClinicas(clinicas.filter(c => c.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir clínica');
    }
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.cnpj || !form.cpf || !form.email) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (modal === 'novo') {
        // CREATE
        const { data, error } = await supabase
          .from('clinicas')
          .insert([form])
          .select();

        if (error) throw error;
        setClinicas([...clinicas, data[0]]);
      } else {
        // UPDATE
        const { error } = await supabase
          .from('clinicas')
          .update(form)
          .eq('id', editId);

        if (error) throw error;
        setClinicas(clinicas.map(c =>
          c.id === editId ? { ...c, ...form } : c
        ));
      }

      setModal(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar clínica');
    }
  };

  const handleFecharModal = () => {
    setModal(null);
    setForm({ nome: '', cnpj: '', cpf: '', responsavel: '', telefone: '', email: '', endereco: '', cidade: '', status: 'ativo' });
  };

  const ativos = clinicas.filter(c => c.status === 'ativo').length;

  if (loading) {
    return <div style={s.main}><p>Carregando...</p></div>;
  }

  return (
    <div style={s.main}>
      <PageHeader
        title="Gerenciar Clínicas"
        subtitle="Cadastro e controle de clínicas do sistema"
      >
        <Button variant="ghost">Exportar</Button>
        <Button onClick={handleNovo}>+ Nova Clínica</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Total de clínicas" value={clinicas.length} delta={`${ativos} ativas`} />
        <KpiCard label="Ativas" value={ativos} delta={`${clinicas.length - ativos} inativas`} />
      </div>

      <Card style={s.searchCard}>
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ, CPF ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={s.searchInput}
        />
      </Card>

      <Card>
        <CardTitle>Clínicas cadastradas</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>Responsável</th>
              <th style={s.th}>CNPJ</th>
              <th style={s.th}>CPF</th>
              <th style={s.th}>Cidade</th>
              <th style={s.th}>Dentistas</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clinicasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhuma clínica encontrada
                </td>
              </tr>
            ) : (
              clinicasFiltradas.map(clinica => (
                <tr key={clinica.id}>
                  <td style={s.td}>{clinica.nome}</td>
                  <td style={s.td}>{clinica.responsavel || 'N/A'}</td>
                  <td style={s.td}>{clinica.cnpj}</td>
                  <td style={s.td}>{clinica.cpf || 'N/A'}</td>
                  <td style={s.td}>{clinica.cidade}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {getDentistasClinica(clinica.id).length} dentista{getDentistasClinica(clinica.id).length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={s.td}>
                    <Badge color={clinica.status === 'ativo' ? 'green' : 'gray'}>
                      {clinica.status === 'ativo' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.acaoBotao} onClick={() => handleEditar(clinica)}>Editar</button>
                      <button style={s.acaoBotao} onClick={() => handleExcluir(clinica.id)}>Excluir</button>
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
              {modal === 'novo' ? 'Nova Clínica' : 'Editar Clínica'}
            </h2>

            <div style={s.formGroup}>
              <label style={s.label}>Nome da Clínica *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={s.input}
                placeholder="Ex: Clínica Dental Senior"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Responsável</label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                style={s.input}
                placeholder="Nome do responsável"
              />
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>CNPJ *</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  style={s.input}
                  placeholder="12.345.678/0001-90"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>CPF *</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  style={s.input}
                  placeholder="123.456.789-00"
                />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                style={s.input}
                placeholder="(11) 3000-0000"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={s.input}
                placeholder="contato@clinica.com"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Endereço</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                style={s.input}
                placeholder="Rua, número"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                style={s.input}
                placeholder="São Paulo"
              />
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
              <div style={s.dentistasSection}>
                <div style={s.dentistasTitle}>Dentistas vinculados:</div>
                {getDentistasClinica(editId).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#AAA', margin: '8px 0' }}>Nenhum dentista vinculado</p>
                ) : (
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {getDentistasClinica(editId).map(d => (
                      <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid #EFEFEF' }}>
                        • {d.nome} ({d.especialidade}) - CRO: {d.cro}
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#AAA', marginTop: 12, fontStyle: 'italic' }}>
                  Para vincular/desvincular dentistas, acesse "Gerenciar Dentistas"
                </p>
              </div>
            )}

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={handleFecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar}>Salvar Clínica</Button>
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
  dentistasSection: { padding: 16, background: '#F8F8F8', borderRadius: 8, marginBottom: 16, border: '1px solid #EFEFEF' },
  dentistasTitle: { fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 8 },
  modalButtons: { display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' },
};
