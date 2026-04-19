'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import { FileText, CheckCircle2, TrendingUp, Clock, Search, Filter } from 'lucide-react';

const STATUS_CORES  = { rascunho: 'blue', aguardando: 'yellow', aprovado: 'green', recusado: 'red' };
const STATUS_LABELS = { rascunho: 'Rascunho', aguardando: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado' };

// FIX: salva procedimentos como JSON; exibe de forma legível
function parseProcedimentos(campo) {
  if (!campo) return [];
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return []; // formato antigo (string) não é recuperável
}

function displayProcedimentos(campo) {
  if (!campo) return '—';
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed.map(p => `${p.nome} (${p.quantidade}x)`).join(', ');
  } catch {}
  return campo; // exibe string crua se não for JSON
}

export default function OrcamentoPage() {
  const router = useRouter();

  const [orcamentos, setOrcamentos]           = useState([]);
  const [pacientes, setPacientes]             = useState([]);
  const [procedimentosDisp, setProcedimentosDisp] = useState([]);
  const [carregando, setCarregando]           = useState(true);
  const [salvando, setSalvando]               = useState(false);
  const [modal, setModal]                     = useState(false);
  const [editingId, setEditingId]             = useState(null);
  const [form, setForm]                       = useState({ paciente: '', desconto: 0, parcelas: 1, observacoes: '' });
  const [selecionados, setSelecionados]       = useState([]);
  const [busca, setBusca]                     = useState('');
  const [filtroStatus, setFiltroStatus]       = useState('todos');
  const [feedback, setFeedback]               = useState(null);
  const [clinicaId, setClinicaId]             = useState(null);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  useEffect(() => {
    // FIX: clinicaId via localStorage (chave correta)
    const id = localStorage.getItem('dentclinic_clinica_id');
    setClinicaId(id || null);
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const cId = localStorage.getItem('dentclinic_clinica_id');
      let orcQuery = supabase.from('orcamentos').select('*').order('criado_em', { ascending: false });
      if (cId) orcQuery = orcQuery.eq('clinica_id', cId);
      let pacQuery = supabase.from('pacientes').select('id, nome').order('nome');
      if (cId) pacQuery = pacQuery.eq('clinica_id', cId);

      const [{ data: orcData }, { data: pacData }] = await Promise.all([orcQuery, pacQuery]);
      setOrcamentos(orcData || []);
      setPacientes(pacData || []);

      // FIX: Supabase primeiro, fallback para localStorage 'precos'
      const { data: procData } = await supabase
        .from('procedimentos').select('*').eq('status', 'ativo').order('nome');

      if (procData && procData.length > 0) {
        setProcedimentosDisp(procData);
      } else {
        try {
          const local = localStorage.getItem('precos');
          const procs = local ? JSON.parse(local) : [];
          setProcedimentosDisp(procs.filter(p => p.status !== 'inativo'));
        } catch {
          setProcedimentosDisp([]);
        }
      }
    } catch {
      showFeedback('Erro ao carregar dados', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const handleAdicionarProc = (proc) => {
    setSelecionados(prev => {
      const existe = prev.find(s => s.id === proc.id);
      if (existe) return prev.map(s => s.id === proc.id ? { ...s, quantidade: s.quantidade + 1 } : s);
      return [...prev, { id: proc.id, nome: proc.nome, preco: Number(proc.preco), quantidade: 1 }];
    });
  };

  const handleRemoverProc = (id) => setSelecionados(prev => prev.filter(s => s.id !== id));

  const subtotal     = selecionados.reduce((sum, p) => sum + p.preco * p.quantidade, 0);
  const descontoVal  = (subtotal * form.desconto) / 100;
  const total        = subtotal - descontoVal;
  const valorParcela = form.parcelas > 0 ? total / form.parcelas : 0;

  const handleNovoOrcamento = () => {
    setEditingId(null);
    setForm({ paciente: '', desconto: 0, parcelas: 1, observacoes: '' });
    setSelecionados([]);
    setModal(true);
  };

  const handleEditar = (o) => {
    setEditingId(o.id);
    setForm({
      paciente: o.paciente_nome || '',
      desconto: o.desconto_pct || 0,
      parcelas: o.parcelas || 1,
      observacoes: o.observacoes || '',
    });
    // FIX: restaura procedimentos do JSON salvo
    setSelecionados(parseProcedimentos(o.procedimentos));
    setModal(true);
  };

  const handleSalvar = async (status) => {
    if (!form.paciente || selecionados.length === 0) {
      showFeedback('Selecione um paciente e pelo menos um procedimento', 'erro');
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        paciente_nome: form.paciente,
        // FIX: salva como JSON para permitir recuperação ao editar
        procedimentos: JSON.stringify(selecionados),
        subtotal,
        desconto_pct: form.desconto,
        total,
        parcelas: form.parcelas,
        status,
        observacoes: form.observacoes || null,
        // FIX: inclui clinica_id
        ...(clinicaId ? { clinica_id: clinicaId } : {}),
      };

      if (editingId) {
        const { error } = await supabase.from('orcamentos').update(dados).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('orcamentos').insert([dados]);
        if (error) throw error;
      }

      showFeedback(editingId ? 'Orçamento atualizado!' : 'Orçamento criado!');
      await carregarDados();
      setModal(false);
    } catch (err) {
      showFeedback('Erro ao salvar: ' + (err.message || 'tente novamente'), 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id);
      if (error) throw error;
      setOrcamentos(prev => prev.filter(o => o.id !== id));
      showFeedback('Orçamento excluído');
    } catch {
      showFeedback('Erro ao excluir', 'erro');
    }
  };

  // FIX: altera status direto na tabela sem abrir modal
  const handleAlterarStatus = async (id, novoStatus) => {
    try {
      const { error } = await supabase.from('orcamentos').update({ status: novoStatus }).eq('id', id);
      if (error) throw error;
      setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, status: novoStatus } : o));
      showFeedback(`Status: ${STATUS_LABELS[novoStatus]}`);
    } catch {
      showFeedback('Erro ao alterar status', 'erro');
    }
  };

  // KPIs — FIX: ticketMedio apenas dos aprovados
  const aprovados     = orcamentos.filter(o => o.status === 'aprovado').length;
  const aguardando    = orcamentos.filter(o => o.status === 'aguardando').length;
  const totalAprovado = orcamentos.filter(o => o.status === 'aprovado').reduce((s, o) => s + (o.total || 0), 0);
  const ticketMedio   = aprovados > 0 ? totalAprovado / aprovados : 0;
  const taxaAprovacao = orcamentos.length > 0 ? Math.round((aprovados / orcamentos.length) * 100) : 0;

  const orcamentosFiltrados = orcamentos.filter(o => {
    const matchBusca  = !busca || o.paciente_nome?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || o.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const corStatusSelect = {
    rascunho:  { background:'#E6F1FB', color:'#185FA5' },
    aguardando:{ background:'#FFF9E6', color:'#856404' },
    aprovado:  { background:'#E8F5E9', color:'#27AE60' },
    recusado:  { background:'#FDECEA', color:'#E74C3C' },
  };

  return (
    <div style={s.main}>

      {/* Toast */}
      {feedback && (
        <div style={{ position:'fixed', top:24, right:24, zIndex:999, padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
          {feedback.tipo==='sucesso'?'✅':'❌'} {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, letterSpacing:'-0.5px', fontWeight:400 }}>Orçamentos</h1>
          <p style={{ fontSize:13, color:'#888', fontWeight:300, marginTop:2 }}>Gerencie orçamentos e planos de tratamento</p>
        </div>
        <button style={s.btnPrimary} onClick={handleNovoOrcamento}>+ Novo Orçamento</button>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Total de orçamentos</div>
              <div style={s.kpiValue}>{carregando ? '—' : orcamentos.length}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{aguardando} aguardando aprovação</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#F0FAF6' }}>
              <FileText size={18} color="#6BBF9E" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:`${Math.min(orcamentos.length * 5, 100)}%`, background:'#A8D5C2' }} /></div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Aprovados</div>
              <div style={s.kpiValue}>{carregando ? '—' : aprovados}</div>
              <div style={{ fontSize:12, color:'#27AE60', marginTop:2 }}>{taxaAprovacao}% de aprovação</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#E8F5E9' }}>
              <CheckCircle2 size={18} color="#27AE60" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:`${taxaAprovacao}%`, background:'#27AE60' }} /></div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Ticket médio</div>
              <div style={s.kpiValue}>R$ {carregando ? '—' : ticketMedio.toFixed(0)}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>dos orçamentos aprovados</div>
            </div>
            <div style={{ ...s.kpiIcon, background:'#FFF8EE' }}>
              <TrendingUp size={18} color="#F5A623" />
            </div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width:'65%', background:'#F5A623' }} /></div>
        </div>
      </div>

      {/* Busca + Filtro */}
      <div style={s.searchBar}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={14} color="#BBB" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...s.searchInput, paddingLeft:36 }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Filter size={14} color="#AAA" />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={s.filtroSelect}>
            <option value="todos">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="aguardando">Aguardando</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
        </div>
        <span style={{ fontSize:12, color:'#AAA', whiteSpace:'nowrap' }}>
          {orcamentosFiltrados.length} resultado{orcamentosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div style={s.tableCard}>
        <div style={{ padding:'16px 20px', borderBottom:'1.5px solid #F5F5F5' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>Orçamentos cadastrados</span>
        </div>

        {carregando ? (
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:10 }}>
            {[1,2,3].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : orcamentosFiltrados.length === 0 ? (
          <div style={s.emptyState}>
            <FileText size={40} color="#E0E0E0" />
            <div style={{ fontSize:14, color:'#CCC', marginTop:10, fontWeight:500 }}>
              {busca || filtroStatus !== 'todos' ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
            </div>
            {!busca && filtroStatus === 'todos' && (
              <button style={s.emptyBtn} onClick={handleNovoOrcamento}>+ Criar primeiro orçamento</button>
            )}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={{ background:'#FAFAFA' }}>
                {['Paciente', 'Procedimentos', 'Valor', 'Parcelas', 'Status', 'Data', 'Ações'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orcamentosFiltrados.map((o, idx) => (
                <tr key={o.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom:'1px solid #F5F5F5' }}>
                  <td style={{ ...s.td, fontWeight:600, color:'#1A1A1A', minWidth:130 }}>{o.paciente_nome}</td>
                  <td style={{ ...s.td, maxWidth:200 }}>
                    <div style={{ fontSize:11, color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>
                      {displayProcedimentos(o.procedimentos)}
                    </div>
                  </td>
                  <td style={{ ...s.td, whiteSpace:'nowrap' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1A1A1A' }}>
                      R$ {(o.total || 0).toFixed(2).replace('.', ',')}
                    </div>
                    {o.desconto_pct > 0 && (
                      <div style={{ fontSize:10, color:'#E74C3C', marginTop:1 }}>-{o.desconto_pct}% desc.</div>
                    )}
                  </td>
                  <td style={{ ...s.td, fontSize:12, color:'#888' }}>
                    {o.parcelas > 1 ? `${o.parcelas}x de R$ ${((o.total || 0) / o.parcelas).toFixed(2).replace('.', ',')}` : 'À vista'}
                  </td>
                  {/* FIX: select inline para alterar status — todos os 4 status acessíveis */}
                  <td style={s.td}>
                    <select
                      value={o.status}
                      onChange={e => handleAlterarStatus(o.id, e.target.value)}
                      style={{
                        ...s.statusSelect,
                        ...(corStatusSelect[o.status] || {}),
                      }}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...s.td, fontSize:11, color:'#AAA', whiteSpace:'nowrap' }}>
                    {o.criado_em ? new Date(o.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.btnEditar} onClick={() => handleEditar(o)}>Editar</button>
                      <button style={s.btnExcluir} onClick={() => handleExcluir(o.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal novo/editar */}
      {modal && (
        <div style={s.overlay} onClick={() => !salvando && setModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>

            {/* Header modal */}
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:'#fff' }}>
                  {editingId ? 'Editar Orçamento' : 'Novo Orçamento'}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                  {editingId ? 'Ajuste os dados do orçamento' : 'Selecione paciente e procedimentos'}
                </div>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>

            <div style={s.modalBody}>

              {/* Paciente */}
              <div style={s.formGroup}>
                <label style={s.label}>Paciente *</label>
                <select value={form.paciente} onChange={e => setForm({...form, paciente: e.target.value})} style={s.input}>
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>

              {/* Procedimentos disponíveis */}
              <div style={s.formGroup}>
                <label style={s.label}>Procedimentos *</label>
                {procedimentosDisp.length === 0 ? (
                  <div style={s.semProc}>
                    Nenhum procedimento disponível.{' '}
                    {/* FIX: router.push em vez de window.location.href */}
                    <button onClick={() => router.push('/configuracoes')} style={s.linkBtn}>
                      Cadastrar em Configurações →
                    </button>
                  </div>
                ) : (
                  <div style={s.procedimentosGrid}>
                    {procedimentosDisp.map(proc => {
                      const jaSelecionado = selecionados.find(s => s.id === proc.id);
                      return (
                        <div
                          key={proc.id}
                          style={{
                            ...s.procCard,
                            border: jaSelecionado ? '1.5px solid #A8D5C2' : '1.5px solid #EFEFEF',
                            background: jaSelecionado ? '#F0FAF6' : '#fff',
                          }}
                        >
                          <div style={s.procName}>{proc.nome}</div>
                          {proc.categoria && <div style={s.procCategoria}>{proc.categoria}</div>}
                          <div style={s.procPrice}>R$ {Number(proc.preco).toFixed(2).replace('.', ',')}</div>
                          <button
                            style={{
                              ...s.btnAddProc,
                              background: jaSelecionado ? '#A8D5C2' : '#F0F0F0',
                              color: jaSelecionado ? '#1A1A1A' : '#555',
                            }}
                            onClick={() => handleAdicionarProc(proc)}
                          >
                            {jaSelecionado ? `✓ ${jaSelecionado.quantidade}x` : '+ Adicionar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Itens selecionados */}
              {selecionados.length > 0 && (
                <div style={s.selecionadosBox}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:10 }}>
                    Itens selecionados ({selecionados.length})
                  </div>
                  {selecionados.map(proc => (
                    <div key={proc.id} style={s.procSelecionado}>
                      <div style={{ flex:1, fontSize:12, fontWeight:500, color:'#1A1A1A' }}>{proc.nome}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input
                          type="number" min="1" value={proc.quantidade}
                          onChange={e => setSelecionados(prev => prev.map(s =>
                            s.id === proc.id ? {...s, quantidade: parseInt(e.target.value) || 1} : s
                          ))}
                          style={{ width:48, padding:'4px 6px', border:'1.5px solid #E8E8E8', borderRadius:6, fontSize:12, textAlign:'center', outline:'none' }}
                        />
                        <span style={{ fontSize:11, color:'#27AE60', fontWeight:600, minWidth:90, textAlign:'right' }}>
                          R$ {(proc.preco * proc.quantidade).toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          onClick={() => handleRemoverProc(proc.id)}
                          style={{ color:'#E74C3C', background:'#FDECEA', border:'none', cursor:'pointer', fontSize:12, padding:'4px 8px', borderRadius:6 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo financeiro */}
              <div style={s.resumoBox}>
                <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:14 }}>Resumo financeiro</div>
                <div style={s.resumoGrid}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Desconto (%)</label>
                    <input
                      type="number" min="0" max="100" value={form.desconto}
                      onChange={e => setForm({...form, desconto: parseFloat(e.target.value) || 0})}
                      style={s.input}
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Parcelas</label>
                    <select value={form.parcelas} onChange={e => setForm({...form, parcelas: parseInt(e.target.value)})} style={s.input}>
                      {[1,2,3,4,6,8,10,12].map(n => (
                        <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ background:'#F8F8F8', borderRadius:10, padding:'14px 16px', border:'1.5px solid #F0F0F0' }}>
                  <div style={s.resumoLinha}>
                    <span style={{ color:'#888' }}>Subtotal</span>
                    <span style={{ fontWeight:500 }}>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {form.desconto > 0 && (
                    <div style={s.resumoLinha}>
                      <span style={{ color:'#E74C3C' }}>Desconto ({form.desconto}%)</span>
                      <span style={{ color:'#E74C3C', fontWeight:500 }}>- R$ {descontoVal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div style={{ ...s.resumoLinha, borderTop:'1.5px solid #EFEFEF', paddingTop:10, marginTop:8, fontSize:17, fontWeight:700 }}>
                    <span>Total</span>
                    <span style={{ color:'#1A1A1A' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {form.parcelas > 1 && (
                    <div style={{ ...s.resumoLinha, fontSize:12, color:'#888', marginTop:6 }}>
                      <span>Por parcela</span>
                      <span>{form.parcelas}x de R$ {valorParcela.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div style={s.formGroup}>
                <label style={s.label}>Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  style={{ ...s.input, minHeight:60, fontFamily:"'DM Sans',sans-serif", resize:'vertical' }}
                  placeholder="Informações adicionais..."
                />
              </div>

              {/* FIX: 4 botões de status — rascunho, aguardando, recusado e aprovado */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                <button
                  style={{ ...s.btnAcao, background:'#F0F0F0', color:'#555', border:'1px solid #E0E0E0' }}
                  onClick={() => setModal(false)} disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  style={{ ...s.btnAcao, background:'#E6F1FB', color:'#185FA5', border:'1px solid #BEE0F5' }}
                  onClick={() => handleSalvar('rascunho')} disabled={salvando}
                >
                  Rascunho
                </button>
                <button
                  style={{ ...s.btnAcao, background:'#FFF9E6', color:'#856404', border:'1px solid #FFE69C' }}
                  onClick={() => handleSalvar('aguardando')} disabled={salvando}
                >
                  Aguardando
                </button>
                <button
                  style={{ ...s.btnAcao, background:'#FDECEA', color:'#E74C3C', border:'1px solid #FFCDD2' }}
                  onClick={() => handleSalvar('recusado')} disabled={salvando}
                >
                  Recusado
                </button>
                <button
                  style={{ ...s.btnAcao, background:'#A8D5C2', color:'#1A1A1A', marginLeft:'auto', fontWeight:600 }}
                  onClick={() => handleSalvar('aprovado')} disabled={salvando}
                >
                  {salvando ? '⏳ Salvando...' : '✓ Aprovar'}
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

  btnPrimary: { padding:'10px 18px', background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },

  /* KPI */
  kpiGrid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 },
  kpiCard:  { background:'#fff', borderRadius:14, padding:'20px 20px 16px', border:'1.5px solid #EFEFEF', display:'flex', flexDirection:'column', gap:14 },
  kpiLabel: { fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500, marginBottom:6 },
  kpiValue: { fontFamily:"'DM Serif Display',serif", fontSize:34, letterSpacing:'-1px', color:'#1A1A1A', lineHeight:1 },
  kpiIcon:  { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  kpiBarBg: { height:4, background:'#F5F5F5', borderRadius:2 },
  kpiBar:   { height:'100%', borderRadius:2 },

  /* Busca */
  searchBar:   { display:'flex', alignItems:'center', gap:12, background:'#fff', borderRadius:12, border:'1.5px solid #EFEFEF', padding:'12px 16px' },
  searchInput: { flex:1, border:'none', outline:'none', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'transparent' },
  filtroSelect:{ padding:'6px 10px', borderRadius:8, fontSize:12, border:'1.5px solid #E8E8E8', background:'#fff', color:'#555', outline:'none', cursor:'pointer' },

  /* Tabela */
  tableCard: { background:'#fff', borderRadius:14, border:'1.5px solid #EFEFEF', overflow:'hidden' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1.5px solid #F0F0F0' },
  td:        { padding:'12px 16px', fontSize:13, verticalAlign:'middle' },
  acoes:     { display:'flex', gap:6 },
  btnEditar: { padding:'5px 10px', fontSize:11, fontWeight:500, border:'1.5px solid #E8E8E8', borderRadius:6, cursor:'pointer', background:'#FAFAFA', color:'#555', fontFamily:"'DM Sans',sans-serif" },
  btnExcluir:{ padding:'5px 10px', fontSize:11, fontWeight:500, border:'1.5px solid #FFCDD2', borderRadius:6, cursor:'pointer', background:'#FFEBEE', color:'#E74C3C', fontFamily:"'DM Sans',sans-serif" },

  /* Status select inline */
  statusSelect: { padding:'4px 8px', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', outline:'none', fontFamily:"'DM Sans',sans-serif" },

  /* Empty / skeleton */
  emptyState: { display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 0 32px' },
  emptyBtn:   { marginTop:16, background:'#F0FAF6', color:'#6BBF9E', border:'1.5px solid #A8D5C2', borderRadius:8, padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  skeleton:   { height:52, borderRadius:10, background:'linear-gradient(90deg,#F5F5F5 25%,#EBEBEB 50%,#F5F5F5 75%)', backgroundSize:'200% 100%' },

  /* Modal */
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modalBox:    { background:'#fff', borderRadius:16, width:'100%', maxWidth:680, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'92vh', overflowY:'auto' },
  modalHeader: { background:'linear-gradient(135deg,#1C1C1E 0%,#2C2C2E 100%)', padding:'22px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalBody:   { padding:'24px', display:'flex', flexDirection:'column', gap:16 },
  closeBtn:    { background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', fontSize:16, cursor:'pointer', padding:4 },
  formGroup:   { marginBottom:0 },
  label:       { display:'block', fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 },
  input:       { width:'100%', padding:'10px 12px', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', outline:'none' },

  /* Procedimentos grid */
  procedimentosGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 },
  procCard:    { padding:12, borderRadius:10, cursor:'default', transition:'border-color 0.2s' },
  procName:    { fontSize:12, fontWeight:600, color:'#1A1A1A', marginBottom:2, lineHeight:1.3 },
  procCategoria:{ fontSize:10, color:'#AAA', marginBottom:6 },
  procPrice:   { fontSize:14, color:'#27AE60', fontWeight:700, marginBottom:8 },
  btnAddProc:  { width:'100%', padding:'6px 8px', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
  semProc:     { padding:16, background:'#FAFAFA', borderRadius:8, fontSize:13, color:'#888', border:'1.5px dashed #E8E8E8' },
  linkBtn:     { background:'none', border:'none', color:'#A8D5C2', cursor:'pointer', fontSize:13, fontWeight:600, padding:0 },

  /* Selecionados */
  selecionadosBox: { background:'#F8FFFE', borderRadius:10, border:'1.5px solid #E0F5EE', padding:'14px 16px' },
  procSelecionado: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #EEF8F5', gap:8 },

  /* Resumo */
  resumoBox:  { background:'#FAFAFA', borderRadius:12, border:'1.5px solid #F0F0F0', padding:'16px' },
  resumoGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 },
  resumoLinha:{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:14, color:'#1A1A1A' },

  /* Botões do modal */
  btnAcao: { padding:'9px 14px', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
};
