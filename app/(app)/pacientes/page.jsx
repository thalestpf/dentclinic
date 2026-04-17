'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import { Users, UserCheck, UserPlus, Search, Filter } from 'lucide-react';

// Cores de avatar por inicial
const CORES_AVATAR = ['#A8D5C2', '#B5CFF5', '#F5D5A8', '#D5B5F5', '#F5A8B5', '#A8D5F5', '#B5F5D5', '#F5C4A8'];
function corAvatar(nome) {
  if (!nome) return CORES_AVATAR[0];
  return CORES_AVATAR[nome.charCodeAt(0) % CORES_AVATAR.length];
}
function iniciais(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0][0].toUpperCase();
}
function calcularIdade(nascimento) {
  if (!nascimento) return null;
  const diff = Date.now() - new Date(nascimento).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function PacientesPage() {
  const router = useRouter();

  const [pacientes, setPacientes]           = useState([]);
  const [conveniosLista, setConveniosLista] = useState([]);
  const [modal, setModal]                   = useState(null); // null | 'novo' | 'editar'
  const [editId, setEditId]                 = useState(null);
  const [form, setForm]                     = useState({
    nome: '', cpf: '', telefone: '', email: '',
    nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo',
  });
  const [busca, setBusca]                   = useState('');
  const [filtroStatus, setFiltroStatus]     = useState('todos');
  const [loading, setLoading]               = useState(true);
  const [clinicaId, setClinicaId]           = useState(null);
  const [feedback, setFeedback]             = useState(null); // {msg, tipo}
  const [salvando, setSalvando]             = useState(false);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  // FIX: clinicaId via localStorage (chave correta)
  useEffect(() => {
    const id = localStorage.getItem('dentclinic_clinica_id');
    setClinicaId(id || null);
  }, []);

  useEffect(() => {
    carregarConvenios();
  }, []);

  const carregarConvenios = async () => {
    try {
      const { data } = await supabase
        .from('convenios')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setConveniosLista(data || []);
    } catch {
      setConveniosLista([]);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, [clinicaId]);

  const carregarPacientes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('pacientes').select('*').order('nome');
      // FIX: só filtra por clínica se tiver o ID
      if (clinicaId) query = query.eq('clinica_id', clinicaId);

      const { data, error } = await query;
      if (error) throw error;
      setPacientes(data || []);
    } catch {
      showFeedback('Erro ao carregar pacientes', 'erro');
    } finally {
      setLoading(false);
    }
  };

  // FIX: CPF null-safe + filtro de status
  const pacientesFiltrados = pacientes.filter(p => {
    const termoBusca = busca.toLowerCase();
    const matchBusca = p.nome?.toLowerCase().includes(termoBusca) || (p.cpf || '').includes(busca);
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  // FIX: novosEsteMes usa criado_em
  const ativos = pacientes.filter(p => p.status === 'ativo').length;
  const percentualAtivos = pacientes.length > 0 ? Math.round((ativos / pacientes.length) * 100) : 0;
  const mesAtual = new Date();
  const novosEsteMes = pacientes.filter(p => {
    if (!p.criado_em) return false;
    const d = new Date(p.criado_em);
    return d.getMonth() === mesAtual.getMonth() && d.getFullYear() === mesAtual.getFullYear();
  }).length;

  const handleNovo = () => {
    setEditId(null);
    setForm({ nome: '', cpf: '', telefone: '', email: '', nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo' });
    setModal('novo');
  };

  const handleEditar = (p) => {
    setEditId(p.id);
    setForm({
      nome: p.nome || '', cpf: p.cpf || '', telefone: p.telefone || '',
      email: p.email || '', nascimento: p.nascimento || '', convenio: p.convenio || '',
      endereco: p.endereco || '', observacoes: p.observacoes || '', status: p.status || 'ativo',
    });
    setModal('editar');
  };

  const handleExcluir = async (id) => {
    if (!confirm('Deseja realmente excluir este paciente?')) return;
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id);
      if (error) throw error;
      setPacientes(prev => prev.filter(p => p.id !== id));
      showFeedback('Paciente excluído');
    } catch {
      showFeedback('Erro ao excluir paciente', 'erro');
    }
  };

  const handleAbrir = (p) => {
    localStorage.setItem('prontuario_paciente_id', p.id);
    localStorage.setItem('prontuario_paciente_nome', p.nome || '');
    router.push(`/prontuario?paciente=${p.id}`);
  };

  const handleSalvar = async () => {
    if (!form.nome.trim() || !form.cpf.trim() || !form.telefone.trim() || !form.email.trim()) {
      showFeedback('Preencha os campos obrigatórios (Nome, CPF, Telefone, Email)', 'erro');
      return;
    }
    if (!clinicaId) {
      showFeedback('Clínica não identificada. Faça login novamente.', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        cpf: form.cpf.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        nascimento: form.nascimento || null,
        convenio: form.convenio || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null,
        status: form.status || 'ativo',
        clinica_id: clinicaId,
      };

      if (modal === 'novo') {
        const { data, error } = await supabase.from('pacientes').insert([dados]).select();
        if (error) throw error;
        setPacientes(prev => [...prev, data[0]].sort((a, b) => a.nome.localeCompare(b.nome)));
        showFeedback('Paciente cadastrado com sucesso!');
      } else {
        const { error } = await supabase.from('pacientes').update(dados).eq('id', editId);
        if (error) throw error;
        setPacientes(prev => prev.map(p => p.id === editId ? { ...p, ...dados } : p));
        showFeedback('Paciente atualizado com sucesso!');
      }
      setModal(null);
    } catch (err) {
      showFeedback('Erro ao salvar: ' + (err.message || 'tente novamente'), 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleFecharModal = () => {
    setModal(null);
    setForm({ nome: '', cpf: '', telefone: '', email: '', nascimento: '', convenio: '', endereco: '', observacoes: '', status: 'ativo' });
  };

  return (
    <div style={s.main}>

      {/* Feedback toast */}
      {feedback && (
        <div style={{ position:'fixed', top:24, right:24, zIndex:999, padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
          {feedback.tipo==='sucesso'?'✅':'❌'} {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div>
          <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, letterSpacing:'-0.5px', fontWeight:400 }}>Pacientes</h1>
          <p style={{ fontSize:13, color:'#888', fontWeight:300, marginTop:2 }}>Gerencie os dados de seus pacientes</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={s.btnGhost} onClick={carregarPacientes}>Atualizar</button>
          <button style={s.btnPrimary} onClick={handleNovo}>+ Novo Paciente</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Total cadastrado</div>
              <div style={s.kpiValue}>{loading ? '—' : pacientes.length}</div>
              <div style={{ fontSize:12, color:'#27AE60', marginTop:2 }}>{ativos} ativos</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#F0FAF6' }}>
              <Users size={18} color="#6BBF9E" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:`${Math.min(pacientes.length * 5, 100)}%`, background:'#A8D5C2' }} /></div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Ativos</div>
              <div style={s.kpiValue}>{loading ? '—' : ativos}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{percentualAtivos}% do total</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#EEF4FF' }}>
              <UserCheck size={18} color="#5B8DEF" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:`${percentualAtivos}%`, background:'#5B8DEF' }} /></div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Novos este mês</div>
              <div style={s.kpiValue}>{loading ? '—' : novosEsteMes}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>cadastrados em {mesAtual.toLocaleDateString('pt-BR',{month:'long'})}</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#FFF8EE' }}>
              <UserPlus size={18} color="#F5A623" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:`${Math.min(novosEsteMes * 10, 100)}%`, background:'#F5A623' }} /></div>
        </div>
      </div>

      {/* Barra de busca + filtro */}
      <div style={s.searchBar}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={14} color="#BBB" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...s.searchInput, paddingLeft:36 }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Filter size={14} color="#AAA" />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={s.filtroSelect}
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
        <div style={{ fontSize:12, color:'#AAA', whiteSpace:'nowrap' }}>
          {pacientesFiltrados.length} paciente{pacientesFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela */}
      <div style={s.tableCard}>
        <div style={{ padding:'16px 20px', borderBottom:'1.5px solid #F5F5F5', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>Pacientes cadastrados</span>
        </div>

        {loading ? (
          <div style={{ padding:32, display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3,4].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div style={s.emptyState}>
            <Users size={40} color="#E0E0E0" />
            <div style={{ fontSize:14, color:'#CCC', marginTop:10, fontWeight:500 }}>
              {busca ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </div>
            {!busca && (
              <button style={s.emptyBtn} onClick={handleNovo}>+ Cadastrar primeiro paciente</button>
            )}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={{ background:'#FAFAFA' }}>
                <th style={s.th}>Paciente</th>
                <th style={s.th}>CPF</th>
                <th style={s.th}>Contato</th>
                <th style={s.th}>Convênio</th>
                <th style={s.th}>Última visita</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientesFiltrados.map((p, idx) => {
                const cor   = corAvatar(p.nome);
                const idade = calcularIdade(p.nascimento);
                return (
                  <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom:'1px solid #F5F5F5' }}>
                    {/* Nome + avatar */}
                    <td style={{ ...s.td, minWidth:200 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:cor + '33', border:`2px solid ${cor}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:700, color:cor.replace('F5','80').replace('A8','60') }}>
                          {iniciais(p.nome)}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', display:'flex', alignItems:'center', gap:6 }}>
                            {p.nome}
                            {p.origem==='whatsapp' && <span style={{ fontSize:9, padding:'2px 6px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:600 }}>WhatsApp</span>}
                          </div>
                          {idade !== null && <div style={{ fontSize:11, color:'#AAA', marginTop:1 }}>{idade} anos</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, fontFamily:'monospace', fontSize:12, color:'#555' }}>{p.cpf || '—'}</td>
                    <td style={s.td}>
                      <div style={{ fontSize:12, color:'#555' }}>{p.telefone || '—'}</div>
                      {p.email && <div style={{ fontSize:11, color:'#AAA', marginTop:1 }}>{p.email}</div>}
                    </td>
                    <td style={s.td}>
                      {p.convenio
                        ? <span style={{ fontSize:11, padding:'3px 8px', background:'#EEF4FF', color:'#5B8DEF', borderRadius:6, fontWeight:500 }}>{p.convenio}</span>
                        : <span style={{ fontSize:12, color:'#CCC' }}>—</span>}
                    </td>
                    <td style={{ ...s.td, fontSize:12, color:'#888' }}>
                      {p.ultima_visita ? new Date(p.ultima_visita).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={s.td}>
                      <Badge color={p.status === 'ativo' ? 'green' : 'gray'}>
                        {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td style={s.td}>
                      <div style={s.acoes}>
                        <button style={s.btnProntuario} onClick={() => handleAbrir(p)}>Prontuário</button>
                        <button style={s.btnEditar} onClick={() => handleEditar(p)}>Editar</button>
                        <button style={s.btnExcluir} onClick={() => handleExcluir(p.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal novo/editar */}
      {modal && (
        <div style={s.overlay} onClick={handleFecharModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            {/* Header do modal */}
            <div style={s.modalHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(168,213,194,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {modal === 'novo' ? <UserPlus size={18} color="#A8D5C2" /> : <UserCheck size={18} color="#A8D5C2" />}
                </div>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:'#fff' }}>
                    {modal === 'novo' ? 'Novo Paciente' : 'Editar Paciente'}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                    {modal === 'novo' ? 'Preencha os dados do novo paciente' : `Editando: ${form.nome}`}
                  </div>
                </div>
              </div>
              <button style={s.closeBtn} onClick={handleFecharModal}>✕</button>
            </div>

            {/* Feedback no modal */}
            {feedback && (
              <div style={{ margin:'0 24px', padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}` }}>
                {feedback.tipo==='sucesso'?'✅':'❌'} {feedback.msg}
              </div>
            )}

            {/* Formulário */}
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Nome Completo *</label>
                <input type="text" style={s.input} placeholder="Ex: Ana Souza" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} />
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>CPF *</label>
                  <input type="text" style={s.input} placeholder="123.456.789-00" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Data de Nascimento</label>
                  <input type="date" style={s.input} value={form.nascimento} onChange={e=>setForm({...form,nascimento:e.target.value})} />
                </div>
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Telefone *</label>
                  <input type="tel" style={s.input} placeholder="(11) 99999-0000" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Email *</label>
                  <input type="email" style={s.input} placeholder="email@exemplo.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Convênio</label>
                <select style={s.input} value={form.convenio} onChange={e=>setForm({...form,convenio:e.target.value})}>
                  <option value="">Sem convênio (particular)</option>
                  {conveniosLista.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Endereço</label>
                <input type="text" style={s.input} placeholder="Rua, número, bairro, cidade" value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})} />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Observações</label>
                <textarea style={{ ...s.input, minHeight:70, fontFamily:"'DM Sans',sans-serif", resize:'vertical' }} placeholder="Informações adicionais do paciente" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Status</label>
                <select style={s.input} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:8, justifyContent:'flex-end' }}>
                <button style={s.btnGhost} onClick={handleFecharModal} disabled={salvando}>Cancelar</button>
                <button
                  style={{ ...s.btnPrimary, opacity: salvando ? 0.7 : 1, cursor: salvando ? 'not-allowed' : 'pointer' }}
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? '⏳ Salvando...' : (modal === 'novo' ? 'Cadastrar Paciente' : 'Salvar Alterações')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex:1, padding:28, overflowY:'auto', background:'#F5F6FA', display:'flex', flexDirection:'column', gap:16 },

  /* Botões do header */
  btnPrimary: { padding:'10px 18px', background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  btnGhost:   { padding:'10px 18px', background:'#fff', color:'#1A1A1A', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },

  /* KPI Cards */
  kpiGrid:   { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 },
  kpiCard:   { background:'#fff', borderRadius:14, padding:'20px 20px 16px', border:'1.5px solid #EFEFEF', display:'flex', flexDirection:'column', gap:14 },
  kpiLabel:  { fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500, marginBottom:6 },
  kpiValue:  { fontFamily:"'DM Serif Display',serif", fontSize:34, letterSpacing:'-1px', color:'#1A1A1A', lineHeight:1 },
  kpiIcon:   { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  kpiBarBg:  { height:4, background:'#F5F5F5', borderRadius:2 },
  kpiBar:    { height:'100%', borderRadius:2 },

  /* Busca */
  searchBar:   { display:'flex', alignItems:'center', gap:12, background:'#fff', borderRadius:12, border:'1.5px solid #EFEFEF', padding:'12px 16px' },
  searchInput: { flex:1, border:'none', outline:'none', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'transparent' },
  filtroSelect: { padding:'6px 10px', borderRadius:8, fontSize:12, border:'1.5px solid #E8E8E8', background:'#fff', color:'#555', outline:'none', cursor:'pointer' },

  /* Tabela */
  tableCard: { background:'#fff', borderRadius:14, border:'1.5px solid #EFEFEF', overflow:'hidden' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1.5px solid #F0F0F0' },
  td:        { padding:'12px 16px', fontSize:13, verticalAlign:'middle' },

  /* Botões de ação na tabela */
  acoes:        { display:'flex', gap:6 },
  btnProntuario: { padding:'5px 10px', fontSize:11, fontWeight:600, border:'1.5px solid #B5CFF5', borderRadius:6, cursor:'pointer', background:'#EEF4FF', color:'#5B8DEF', fontFamily:"'DM Sans',sans-serif" },
  btnEditar:    { padding:'5px 10px', fontSize:11, fontWeight:500, border:'1.5px solid #E8E8E8', borderRadius:6, cursor:'pointer', background:'#FAFAFA', color:'#555', fontFamily:"'DM Sans',sans-serif" },
  btnExcluir:   { padding:'5px 10px', fontSize:11, fontWeight:500, border:'1.5px solid #FFCDD2', borderRadius:6, cursor:'pointer', background:'#FFEBEE', color:'#E74C3C', fontFamily:"'DM Sans',sans-serif" },

  /* Empty / Skeleton */
  emptyState: { display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 0 32px' },
  emptyBtn:   { marginTop:16, background:'#F0FAF6', color:'#6BBF9E', border:'1.5px solid #A8D5C2', borderRadius:8, padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  skeleton:   { height:52, borderRadius:10, background:'linear-gradient(90deg,#F5F5F5 25%,#EBEBEB 50%,#F5F5F5 75%)', backgroundSize:'200% 100%' },

  /* Modal */
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modalBox:    { background:'#fff', borderRadius:16, width:'100%', maxWidth:500, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'92vh', overflowY:'auto' },
  modalHeader: { background:'linear-gradient(135deg,#1C1C1E 0%,#2C2C2E 100%)', padding:'22px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalBody:   { padding:'24px' },
  closeBtn:    { background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', fontSize:16, cursor:'pointer', padding:4 },
  formGroup:   { marginBottom:16 },
  label:       { display:'block', fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 },
  input:       { width:'100%', padding:'10px 12px', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', outline:'none' },
  formRow:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
};
