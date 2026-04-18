'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import {
  Users, UserCheck, UserPlus, Search,
  MoreVertical, FileText, Edit3, Trash2,
  RotateCw, CheckCircle2, XCircle, X,
} from 'lucide-react';

/* ─── Paleta de avatares (tons harmônicos com a marca) ─── */
const CORES_AVATAR = [
  { bg: '#A8D5C2', text: '#3E7D63' }, // mint
  { bg: '#B5CFF5', text: '#3A5FA5' }, // blue
  { bg: '#F5D5A8', text: '#A57A3A' }, // amber
  { bg: '#D5B5F5', text: '#6B3FA5' }, // purple
  { bg: '#F5C4B5', text: '#A55A3A' }, // coral
];
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
  const [hoverRowId, setHoverRowId]         = useState(null);
  const [menuAbertoId, setMenuAbertoId]     = useState(null);

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

  const pacientesFiltrados = pacientes.filter(p => {
    const termoBusca = busca.toLowerCase();
    const matchBusca = p.nome?.toLowerCase().includes(termoBusca) || (p.cpf || '').includes(busca);
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const ativos = pacientes.filter(p => p.status === 'ativo').length;
  const inativos = pacientes.length - ativos;
  const percentualAtivos = pacientes.length > 0 ? Math.round((ativos / pacientes.length) * 100) : 0;
  const mesAtual = new Date();
  const novosEsteMes = pacientes.filter(p => {
    if (!p.criado_em) return false;
    const d = new Date(p.criado_em);
    return d.getMonth() === mesAtual.getMonth() && d.getFullYear() === mesAtual.getFullYear();
  }).length;
  // Meta simples: 20 novos/mês como referência de crescimento saudável
  const metaNovosMes = 20;
  const progressoNovos = Math.min((novosEsteMes / metaNovosMes) * 100, 100);

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

  const filtros = [
    { v: 'todos',   l: 'Todos',    count: pacientes.length },
    { v: 'ativo',   l: 'Ativos',   count: ativos },
    { v: 'inativo', l: 'Inativos', count: inativos },
  ];

  return (
    <div style={s.main}>
      {/* Keyframes para shimmer do skeleton */}
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position:'fixed', top:24, right:24, zIndex:1100,
          padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:500,
          display:'flex', alignItems:'center', gap:10,
          background: feedback.tipo==='sucesso' ? '#E8F5E9' : '#FFEBEE',
          color:      feedback.tipo==='sucesso' ? '#27AE60' : '#C62828',
          border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`,
          boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {feedback.tipo==='sucesso'
            ? <CheckCircle2 size={16} />
            : <XCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div>
          <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, letterSpacing:'-0.5px', fontWeight:400 }}>Pacientes</h1>
          <p style={{ fontSize:13, color:'#888', fontWeight:300, marginTop:2 }}>Gerencie os dados de seus pacientes</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button style={s.btnIcon} onClick={carregarPacientes} title="Atualizar lista">
            <RotateCw size={14} color="#555" />
          </button>
          <button style={s.btnPrimary} onClick={handleNovo}>
            <UserPlus size={14} />
            Novo Paciente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Total cadastrado</div>
              <div style={s.kpiValue}>{loading ? '—' : pacientes.length}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>
                <span style={{color:'#27AE60', fontWeight:500}}>{ativos}</span> ativos
                <span style={{margin:'0 6px', color:'#DDD'}}>·</span>
                <span style={{color:'#AAA'}}>{inativos}</span> inativos
              </div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#F0FAF6' }}>
              <Users size={18} color="#6BBF9E" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width:`${percentualAtivos}%`, background:'linear-gradient(90deg,#A8D5C2,#6BBF9E)' }} />
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Ativos</div>
              <div style={s.kpiValue}>{loading ? '—' : ativos}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{percentualAtivos}% do total</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#EEF4FF' }}>
              <UserCheck size={18} color="#5B8DEF" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width:`${percentualAtivos}%`, background:'linear-gradient(90deg,#B5CFF5,#5B8DEF)' }} />
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Novos este mês</div>
              <div style={s.kpiValue}>{loading ? '—' : novosEsteMes}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4, textTransform:'capitalize' }}>
                {mesAtual.toLocaleDateString('pt-BR',{month:'long'})} · meta {metaNovosMes}
              </div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#FFF8EE' }}>
              <UserPlus size={18} color="#F5A623" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width:`${progressoNovos}%`, background:'linear-gradient(90deg,#F5D5A8,#F5A623)' }} />
          </div>
        </div>
      </div>

      {/* Barra de busca + filtros chip */}
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
        <div style={s.chipGroup}>
          {filtros.map(o => {
            const ativo = filtroStatus === o.v;
            return (
              <button
                key={o.v}
                onClick={() => setFiltroStatus(o.v)}
                style={{
                  padding:'6px 12px', border:'none', borderRadius:6,
                  fontSize:12, fontWeight:500, cursor:'pointer',
                  fontFamily:"'DM Sans',sans-serif",
                  background: ativo ? '#fff' : 'transparent',
                  color:      ativo ? '#1A1A1A' : '#888',
                  boxShadow:  ativo ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition:'background 0.15s, color 0.15s',
                  display:'flex', alignItems:'center', gap:6,
                }}
              >
                {o.l}
                <span style={{
                  fontSize:10, fontWeight:600,
                  padding:'1px 6px', borderRadius:10,
                  background: ativo ? '#F0F0F0' : 'rgba(0,0,0,0.05)',
                  color: ativo ? '#555' : '#AAA',
                }}>{o.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      <div style={s.tableCard}>
        <div style={{ padding:'14px 20px', borderBottom:'1.5px solid #F5F5F5', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>Pacientes cadastrados</span>
          <span style={{ fontSize:12, color:'#AAA' }}>
            {pacientesFiltrados.length} de {pacientes.length}
          </span>
        </div>

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIconWrap}>
              <Users size={28} color="#BBB" />
            </div>
            <div style={{ fontSize:14, color:'#888', marginTop:14, fontWeight:500 }}>
              {busca ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </div>
            <div style={{ fontSize:12, color:'#AAA', marginTop:4 }}>
              {busca ? 'Tente ajustar os termos da busca' : 'Comece cadastrando seu primeiro paciente'}
            </div>
            {!busca && (
              <button style={s.emptyBtn} onClick={handleNovo}>
                <UserPlus size={13} />
                Cadastrar primeiro paciente
              </button>
            )}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Paciente</th>
                <th style={s.th}>Contato</th>
                <th style={s.th}>Convênio</th>
                <th style={s.th}>Última visita</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign:'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientesFiltrados.map((p) => {
                const cor      = corAvatar(p.nome);
                const idade    = calcularIdade(p.nascimento);
                const isHover  = hoverRowId === p.id;
                const menuOpen = menuAbertoId === p.id;
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoverRowId(p.id)}
                    onMouseLeave={() => setHoverRowId(null)}
                    style={{
                      background: isHover ? '#FAFAFA' : '#fff',
                      borderBottom:'1px solid #F5F5F5',
                      transition:'background 0.12s',
                    }}
                  >
                    {/* Nome + avatar */}
                    <td style={{ ...s.td, minWidth:220 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{
                          width:38, height:38, borderRadius:'50%',
                          background: cor.bg + '33',
                          border:`2px solid ${cor.bg}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0, fontSize:12, fontWeight:700,
                          color: cor.text,
                        }}>
                          {iniciais(p.nome)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', display:'flex', alignItems:'center', gap:6 }}>
                            {p.nome}
                            {p.origem==='whatsapp' && (
                              <span title="Cadastrado via WhatsApp" style={{
                                fontSize:9, padding:'2px 6px',
                                background:'#E6F7EC', color:'#1B8049',
                                borderRadius:10, fontWeight:600, letterSpacing:'0.3px',
                              }}>WHATSAPP</span>
                            )}
                          </div>
                          <div style={{ fontSize:11, color:'#AAA', marginTop:2, display:'flex', gap:8 }}>
                            {idade !== null && <span>{idade} anos</span>}
                            {p.cpf && <span style={{ fontFamily:'monospace' }}>{p.cpf}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td style={s.td}>
                      <div style={{ fontSize:12, color:'#555' }}>{p.telefone || '—'}</div>
                      {p.email && <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>{p.email}</div>}
                    </td>

                    {/* Convênio (chip neutro) */}
                    <td style={s.td}>
                      {p.convenio
                        ? <span style={{
                            fontSize:11, padding:'3px 9px',
                            background:'#F5F5F5', color:'#555',
                            borderRadius:6, fontWeight:500,
                          }}>{p.convenio}</span>
                        : <span style={{ fontSize:12, color:'#CCC' }}>Particular</span>}
                    </td>

                    <td style={{ ...s.td, fontSize:12, color:'#888' }}>
                      {p.ultima_visita ? new Date(p.ultima_visita).toLocaleDateString('pt-BR') : '—'}
                    </td>

                    <td style={s.td}>
                      <Badge color={p.status === 'ativo' ? 'green' : 'gray'}>
                        {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>

                    {/* Ações: Prontuário primário + kebab */}
                    <td style={{ ...s.td, textAlign:'right', position:'relative' }}>
                      <div style={{ display:'inline-flex', gap:6, alignItems:'center' }}>
                        <button style={s.btnProntuario} onClick={() => handleAbrir(p)}>
                          <FileText size={11} />
                          Prontuário
                        </button>
                        <button
                          style={{ ...s.btnKebab, background: menuOpen ? '#F0F0F0' : 'transparent' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAbertoId(menuOpen ? null : p.id);
                          }}
                          title="Mais ações"
                        >
                          <MoreVertical size={14} color="#666" />
                        </button>
                        {menuOpen && (
                          <div style={s.menuDropdown}>
                            <button
                              style={s.menuItem}
                              onClick={() => { handleEditar(p); setMenuAbertoId(null); }}
                            >
                              <Edit3 size={12} /> Editar
                            </button>
                            <div style={{ height:1, background:'#F0F0F0', margin:'2px 0' }} />
                            <button
                              style={{ ...s.menuItem, color:'#E74C3C' }}
                              onClick={() => { handleExcluir(p.id); setMenuAbertoId(null); }}
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Overlay invisível para fechar kebab ao clicar fora */}
      {menuAbertoId && (
        <div
          style={{ position:'fixed', inset:0, zIndex:10 }}
          onClick={() => setMenuAbertoId(null)}
        />
      )}

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
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2 }}>
                    {modal === 'novo' ? 'Preencha os dados do novo paciente' : `Editando: ${form.nome}`}
                  </div>
                </div>
              </div>
              <button style={s.closeBtn} onClick={handleFecharModal} title="Fechar">
                <X size={16} />
              </button>
            </div>

            {/* Feedback no modal */}
            {feedback && (
              <div style={{
                margin:'16px 24px 0', padding:'10px 14px', borderRadius:8,
                fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:8,
                background: feedback.tipo==='sucesso' ? '#E8F5E9' : '#FFEBEE',
                color:      feedback.tipo==='sucesso' ? '#27AE60' : '#C62828',
                border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`,
              }}>
                {feedback.tipo==='sucesso' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {feedback.msg}
              </div>
            )}

            {/* Formulário (layout em 2 colunas) */}
            <div style={s.modalBody}>
              {/* Bloco: Dados pessoais */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Dados pessoais</div>

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
              </div>

              {/* Bloco: Contato */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Contato</div>
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
                  <label style={s.label}>Endereço</label>
                  <input type="text" style={s.input} placeholder="Rua, número, bairro, cidade" value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})} />
                </div>
              </div>

              {/* Bloco: Atendimento */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Atendimento</div>
                <div style={s.formRow}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Convênio</label>
                    <select style={s.input} value={form.convenio} onChange={e=>setForm({...form,convenio:e.target.value})}>
                      <option value="">Particular</option>
                      {conveniosLista.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Status</label>
                    <select style={s.input} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Observações</label>
                  <textarea
                    style={{ ...s.input, minHeight:70, fontFamily:"'DM Sans',sans-serif", resize:'vertical' }}
                    placeholder="Informações adicionais do paciente"
                    value={form.observacoes}
                    onChange={e=>setForm({...form,observacoes:e.target.value})}
                  />
                </div>
              </div>

              {/* Rodapé do modal */}
              <div style={s.modalFooter}>
                <button style={s.btnGhost} onClick={handleFecharModal} disabled={salvando}>Cancelar</button>
                <button
                  style={{ ...s.btnPrimary, opacity: salvando ? 0.7 : 1, cursor: salvando ? 'not-allowed' : 'pointer' }}
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : (modal === 'novo' ? 'Cadastrar Paciente' : 'Salvar Alterações')}
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
  main: { flex:1, padding:28, overflowY:'auto', background:'#F8F8F8', display:'flex', flexDirection:'column', gap:16 },

  /* Botões */
  btnPrimary: { padding:'10px 16px', background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'inline-flex', alignItems:'center', gap:8 },
  btnGhost:   { padding:'10px 18px', background:'#fff', color:'#1A1A1A', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  btnIcon:    { width:38, height:38, background:'#fff', border:'1.5px solid #E8E8E8', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },

  /* KPI Cards */
  kpiGrid:   { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 },
  kpiCard:   { background:'#fff', borderRadius:14, padding:'20px 20px 16px', border:'1.5px solid #EFEFEF', display:'flex', flexDirection:'column', gap:14 },
  kpiLabel:  { fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'1px', fontWeight:500, marginBottom:6 },
  kpiValue:  { fontFamily:"'DM Serif Display',serif", fontSize:34, letterSpacing:'-1px', color:'#1A1A1A', lineHeight:1 },
  kpiIcon:   { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  kpiBarBg:  { height:4, background:'#F5F5F5', borderRadius:2, overflow:'hidden' },
  kpiBar:    { height:'100%', borderRadius:2, transition:'width 0.4s ease' },

  /* Busca + Chips */
  searchBar:   { display:'flex', alignItems:'center', gap:16, background:'#fff', borderRadius:12, border:'1.5px solid #EFEFEF', padding:'10px 14px' },
  searchInput: { flex:1, border:'none', outline:'none', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'transparent' },
  chipGroup:   { display:'flex', gap:2, background:'#F5F5F5', padding:3, borderRadius:8 },

  /* Tabela */
  tableCard: { background:'#fff', borderRadius:14, border:'1.5px solid #EFEFEF', overflow:'visible' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { textAlign:'left', padding:'12px 16px', fontSize:10, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1.5px solid #F0F0F0', background:'#fff' },
  td:        { padding:'14px 16px', fontSize:13, verticalAlign:'middle' },

  /* Botões de ação */
  btnProntuario: { padding:'6px 11px', fontSize:11, fontWeight:600, border:'1.5px solid #E1EAFE', borderRadius:6, cursor:'pointer', background:'#F4F8FF', color:'#3A6FD1', fontFamily:"'DM Sans',sans-serif", display:'inline-flex', alignItems:'center', gap:5 },
  btnKebab:      { width:28, height:28, border:'none', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.12s' },
  menuDropdown:  { position:'absolute', top:'calc(100% - 4px)', right:16, zIndex:20, background:'#fff', border:'1.5px solid #EFEFEF', borderRadius:8, padding:4, minWidth:140, boxShadow:'0 8px 24px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column', animation:'fadeIn 0.15s ease-out' },
  menuItem:      { padding:'8px 12px', border:'none', background:'transparent', fontSize:12, fontWeight:500, color:'#555', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:"'DM Sans',sans-serif", width:'100%', textAlign:'left', borderRadius:5 },

  /* Empty / Skeleton */
  emptyState:   { display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 0 44px' },
  emptyIconWrap:{ width:64, height:64, borderRadius:'50%', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center' },
  emptyBtn:     { marginTop:20, background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'inline-flex', alignItems:'center', gap:6 },
  skeleton:     { height:54, borderRadius:10, background:'linear-gradient(90deg,#F5F5F5 25%,#EBEBEB 50%,#F5F5F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite linear' },

  /* Modal */
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modalBox:    { background:'#fff', borderRadius:16, width:'100%', maxWidth:580, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'92vh', overflowY:'auto' },
  modalHeader: { background:'linear-gradient(135deg,#1C1C1E 0%,#2C2C2E 100%)', padding:'22px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalBody:   { padding:'20px 24px 24px' },
  modalFooter: { display:'flex', gap:10, marginTop:8, justifyContent:'flex-end', paddingTop:16, borderTop:'1.5px solid #F5F5F5' },
  closeBtn:    { background:'rgba(255,255,255,0.08)', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', padding:0, width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' },

  /* Seções do formulário */
  section:      { marginBottom:18, paddingBottom:14, borderBottom:'1px dashed #F0F0F0' },
  sectionTitle: { fontSize:11, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 },

  formGroup:   { marginBottom:14 },
  label:       { display:'block', fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 },
  input:       { width:'100%', padding:'10px 12px', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', outline:'none', color:'#1A1A1A', background:'#fff' },
  formRow:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
};
