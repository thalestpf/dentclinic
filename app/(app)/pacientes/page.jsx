'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

export default function PacientesPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState([]);
  const [conveniosLista, setConveniosLista] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo' });
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [clinicaId, setClinicaId] = useState(null);
  const [clinicaCarregada, setClinicaCarregada] = useState(false);

  const obterClinicaIdDaSessao = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return null;

    const { data: byUserId } = await supabase
      .from('user_roles')
      .select('clinica_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (byUserId?.clinica_id) return byUserId.clinica_id;

    const { data: byId } = await supabase
      .from('user_roles')
      .select('clinica_id')
      .eq('id', session.user.id)
      .maybeSingle();
    if (byId?.clinica_id) return byId.clinica_id;

    const { data: byEmail } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('email', session.user.email)
      .maybeSingle();
    if (byEmail?.clinica_id) return byEmail.clinica_id;

    const clinicaLocal = localStorage.getItem('clinica_id');
    if (clinicaLocal) return clinicaLocal;

    return null;
  };

  useEffect(() => {
    carregarConvenios();
  }, []);

  const carregarConvenios = async () => {
    try {
      const { data } = await supabase
        .from('convenios')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      setConveniosLista(data || []);
    } catch {
      setConveniosLista([]);
    }
  };

  useEffect(() => {
    let ativo = true;

    const carregarClinicaId = async () => {
      try {
        const clinica = await obterClinicaIdDaSessao();
        if (ativo) {
          setClinicaId(clinica);
        }
      } catch (err) {
        console.error('Erro ao carregar clinica_id:', err);
        if (ativo) setClinicaId(null);
      } finally {
        if (ativo) setClinicaCarregada(true);
      }
    };

    carregarClinicaId();

    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!clinicaCarregada) return;
    carregarPacientes(clinicaId);
  }, [clinicaCarregada, clinicaId]);

  const carregarPacientes = async (filterClinicaId = null) => {
    try {
      setLoading(true);

      // Buscar pacientes sem filtro por clínica por enquanto
      // (user_roles pode não ter o usuário cadastrado ainda)
      let query = supabase
        .from('pacientes')
        .select('*')
        .order('nome', { ascending: true });

      if (filterClinicaId) {
        query = query.eq('clinica_id', filterClinicaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar pacientes:', error.message);
        return;
      }

      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf.includes(busca)
  );

  const handleNovo = () => {
    setEditId(null);
    setForm({ nome: '', cpf: '', telefone: '', email: '', nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo' });
    setModal('novo');
  };

  const handleEditar = (paciente) => {
    setEditId(paciente.id);
    setForm({
      nome: paciente.nome || '',
      cpf: paciente.cpf || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      nascimento: paciente.nascimento || '',
      convenio: paciente.convenio || '',
      endereco: paciente.endereco || '',
      observacoes: paciente.observacoes || '',
      status: paciente.status || 'ativo',
    });
    setModal('editar');
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Deseja realmente excluir este paciente?')) return;

    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPacientes(pacientes.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir paciente');
    }
  };

  const handleAbrir = (paciente) => {
    localStorage.setItem('prontuario_paciente_id', paciente.id);
    localStorage.setItem('prontuario_paciente_nome', paciente.nome || '');
    router.push(`/prontuario?paciente=${paciente.id}`);
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.cpf || !form.telefone || !form.email) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    try {
      // Montar dados e garantir clinica_id
      if (!clinicaId) {
        alert('Não conseguimos identificar a clínica associada à sua conta. Tente sair e entrar novamente ou contate o suporte.');
        return;
      }

      const dadosPaciente = {
        nome: form.nome,
        cpf: form.cpf || null,
        telefone: form.telefone || null,
        email: form.email || null,
        nascimento: form.nascimento || null,
        convenio: form.convenio || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null,
        status: form.status || 'ativo',
        clinica_id: clinicaId,
      };

      if (modal === 'novo') {
        const { data, error } = await supabase
          .from('pacientes')
          .insert([dadosPaciente])
          .select();

        if (error) {
          console.error('Erro ao inserir:', error.message);
          alert('Erro ao salvar paciente: ' + error.message);
          return;
        }
        setPacientes([...pacientes, data[0]]);
      } else {
        const { error } = await supabase
          .from('pacientes')
          .update(dadosPaciente)
          .eq('id', editId);

        if (error) {
          console.error('Erro ao atualizar:', error.message);
          alert('Erro ao salvar paciente: ' + error.message);
          return;
        }
        setPacientes(pacientes.map(p =>
          p.id === editId ? { ...p, ...dadosPaciente } : p
        ));
      }

      setModal(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar paciente');
    }
  };

  const handleFecharModal = () => {
    setModal(null);
    setForm({ nome: '', cpf: '', telefone: '', email: '', nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo' });
  };

  const ativos = pacientes.filter(p => p.status === 'ativo').length;
  const percentualAtivos = pacientes.length > 0 ? ((ativos / pacientes.length) * 100).toFixed(0) : '0';
  const novosEsteMes = pacientes.filter(p => {
    if (!p.ultima_visita) return false;
    const ultimaVisita = new Date(p.ultima_visita);
    const mesAtual = new Date();
    return ultimaVisita.getMonth() === mesAtual.getMonth() && ultimaVisita.getFullYear() === mesAtual.getFullYear();
  }).length;

  if (loading) {
    return <div style={s.main}><p>Carregando...</p></div>;
  }

  return (
    <div style={s.main}>
      <PageHeader
        title="Pacientes"
        subtitle="Gerencie os dados de seus pacientes"
      >
        <Button variant="ghost">Exportar</Button>
        <Button onClick={handleNovo}>+ Novo Paciente</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Total cadastrado" value={pacientes.length} delta={`${ativos} ativos`} />
        <KpiCard label="Ativos" value={ativos} delta={`${percentualAtivos}% do total`} />
        <KpiCard label="Novos este mês" value={novosEsteMes} delta="últimas visitas" />
      </div>

      <Card style={s.searchCard}>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={s.searchInput}
        />
      </Card>

      <Card>
        <CardTitle>Pacientes cadastrados</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>CPF</th>
              <th style={s.th}>Telefone</th>
              <th style={s.th}>Convênio</th>
              <th style={s.th}>Última Visita</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhum paciente encontrado
                </td>
              </tr>
            ) : (
              pacientesFiltrados.map(paciente => (
                <tr key={paciente.id} style={paciente.origem==='whatsapp' ? { background:'#F0FFF4' } : {}}>
                  <td style={s.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {paciente.nome}
                      {paciente.origem==='whatsapp' && <span style={{ fontSize:9, padding:'2px 6px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:600, whiteSpace:'nowrap' }}>WhatsApp</span>}
                    </div>
                  </td>
                  <td style={s.td}>{paciente.cpf}</td>
                  <td style={s.td}>{paciente.telefone}</td>
                  <td style={s.td}>{paciente.convenio}</td>
                  <td style={s.td}>{paciente.ultima_visita ? new Date(paciente.ultima_visita).toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={s.td}>
                    <Badge color={paciente.status === 'ativo' ? 'green' : 'gray'}>
                      {paciente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.acaoBotao} onClick={() => handleAbrir(paciente)}>Prontuário</button>
                      <button style={s.acaoBotao} onClick={() => handleEditar(paciente)}>Editar</button>
                      <button style={s.acaoBotao} onClick={() => handleExcluir(paciente.id)}>Excluir</button>
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
              {modal === 'novo' ? 'Novo Paciente' : 'Editar Paciente'}
            </h2>

            <div style={s.formGroup}>
              <label style={s.label}>Nome Completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={s.input}
                placeholder="Ex: Ana Souza"
              />
            </div>

            <div style={s.formRow}>
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
              <div style={s.formGroup}>
                <label style={s.label}>Data de Nascimento</label>
                <input
                  type="date"
                  value={form.nascimento}
                  onChange={(e) => setForm({ ...form, nascimento: e.target.value })}
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Telefone *</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  style={s.input}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={s.input}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Convênio</label>
              <select
                value={form.convenio}
                onChange={(e) => setForm({ ...form, convenio: e.target.value })}
                style={s.input}
              >
                <option value="">Selecione um convênio</option>
                {conveniosLista.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Endereço</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                style={s.input}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                style={{ ...s.input, minHeight: 80, fontFamily: "'DM Sans', sans-serif" }}
                placeholder="Informações adicionais do paciente"
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

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={handleFecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar}>Salvar Paciente</Button>
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

