'use client';

import { useState, useEffect } from 'react';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import { TrendingUp, TrendingDown, DollarSign, Clock, Plus, Download, Search, ChevronLeft, ChevronRight, X, Pencil, Trash2 } from 'lucide-react';

const categorias = ['Consulta', 'Procedimento', 'Material', 'Equipamento', 'Salário', 'Aluguel', 'Outros'];
const statusCores = { pago: 'green', pendente: 'yellow', inadimplente: 'red' };
const statusLabels = { pago: 'Pago', pendente: 'Pendente', inadimplente: 'Inadiml.' };

const getMesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
};

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    descricao: '', categoria: 'Consulta', tipo: 'entrada',
    valor: '', status: 'pago', data: new Date().toISOString().split('T')[0],
  });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busca, setBusca] = useState('');
  const [mesFiltro, setMesFiltro] = useState(getMesAtual());
  const [viewCalendario, setViewCalendario] = useState(false);
  const [calMes, setCalMes] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { carregarLancamentos(); }, []);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  const carregarLancamentos = async () => {
    setCarregando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    let query = supabase.from('lancamentos').select('*').order('data', { ascending: false });
    if (clinicaId) query = query.eq('clinica_id', clinicaId);
    const { data, error } = await query;
    if (!error) setLancamentos(data || []);
    setCarregando(false);
  };

  const handleSalvar = async () => {
    if (!form.descricao || !form.valor) {
      showFeedback('Preencha descrição e valor', 'erro');
      return;
    }
    setSalvando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    const dados = {
      descricao: form.descricao,
      categoria: form.categoria,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      status: form.status,
      data: form.data,
    };
    if (clinicaId) dados.clinica_id = clinicaId;

    if (editingId) {
      const { error } = await supabase.from('lancamentos').update(dados).eq('id', editingId);
      if (error) { showFeedback('Erro ao atualizar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Lançamento atualizado com sucesso');
    } else {
      const { error } = await supabase.from('lancamentos').insert([dados]);
      if (error) { showFeedback('Erro ao criar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Lançamento criado com sucesso');
    }

    await carregarLancamentos();
    fecharModal();
    setSalvando(false);
  };

  const handleEditar = (l) => {
    setEditingId(l.id);
    setForm({ descricao: l.descricao, categoria: l.categoria || 'Consulta', tipo: l.tipo, valor: String(l.valor), status: l.status, data: l.data });
    setModal(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('lancamentos').delete().eq('id', id);
    if (error) { showFeedback('Erro ao excluir: ' + error.message, 'erro'); return; }
    setLancamentos(lancamentos.filter(l => l.id !== id));
    showFeedback('Lançamento excluído');
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm({ descricao: '', categoria: 'Consulta', tipo: 'entrada', valor: '', status: 'pago', data: new Date().toISOString().split('T')[0] });
  };

  const navegarMes = (delta) => {
    const [ano, mes] = mesFiltro.split('-').map(Number);
    const d = new Date(ano, mes - 1 + delta, 1);
    setMesFiltro(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nomeMesFiltro = () => {
    const [ano, mes] = mesFiltro.split('-').map(Number);
    return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const exportarCSV = () => {
    const linhas = [['Descrição', 'Categoria', 'Data', 'Tipo', 'Status', 'Valor']];
    filtrados.forEach(l => linhas.push([
      l.descricao, l.categoria, formatDate(l.data),
      l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      statusLabels[l.status] || l.status,
      String(l.valor || 0).replace('.', ','),
    ]));
    const csv = '\uFEFF' + linhas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_${mesFiltro}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('CSV exportado com sucesso');
  };

  // KPIs filtrados por mês selecionado
  const doMes = lancamentos.filter(l => l.data && l.data.startsWith(mesFiltro));
  const totalEntradas = doMes.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0);
  const totalSaidas = doMes.filter(l => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0);
  const aReceber = doMes.filter(l => l.tipo === 'entrada' && l.status === 'pendente').reduce((s, l) => s + (l.valor || 0), 0);
  const lucro = totalEntradas - totalSaidas;

  // Tabela filtrada
  const filtrados = lancamentos.filter(l => {
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
    if (filtroCategoria && l.categoria !== filtroCategoria) return false;
    if (busca && !(l.descricao || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={s.main}>

      {/* Toast feedback */}
      {feedback && (
        <div style={{ ...s.toast, background: feedback.tipo === 'erro' ? '#C0392B' : '#27AE60' }}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Financeiro</h1>
          <p style={s.subtitulo}>Controle de receitas e despesas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnSecundario} onClick={exportarCSV}>
            <Download size={14} />
            Exportar CSV
          </button>
          <button style={s.btnPrimario} onClick={() => setModal(true)}>
            <Plus size={14} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Navegador de mês */}
      <div style={s.mesNavWrapper}>
        <button style={s.mesNavBtn} onClick={() => navegarMes(-1)}><ChevronLeft size={16} /></button>
        <span style={s.mesLabel}>{nomeMesFiltro()}</span>
        <button style={s.mesNavBtn} onClick={() => navegarMes(1)}><ChevronRight size={16} /></button>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><TrendingUp size={18} /></div>
          <div style={s.kpiLabel}>Receita (pago)</div>
          <div style={s.kpiValor}>{fmt(totalEntradas)}</div>
          <div style={s.kpiDelta}>entradas confirmadas</div>
          <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#A8D5C2' }} /></div>
        </div>
        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, background: '#FEECEB', color: '#E74C3C' }}><TrendingDown size={18} /></div>
          <div style={s.kpiLabel}>Despesas (pago)</div>
          <div style={s.kpiValor}>{fmt(totalSaidas)}</div>
          <div style={s.kpiDelta}>saídas confirmadas</div>
          <div style={s.progressBar}><div style={{ ...s.progressFill, width: totalEntradas > 0 ? `${Math.min(100, (totalSaidas / totalEntradas) * 100)}%` : '0%', background: '#FFCDD2' }} /></div>
        </div>
        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, background: lucro >= 0 ? '#E8F8EF' : '#FEECEB', color: lucro >= 0 ? '#27AE60' : '#E74C3C' }}><DollarSign size={18} /></div>
          <div style={s.kpiLabel}>Lucro líquido</div>
          <div style={{ ...s.kpiValor, color: lucro >= 0 ? '#27AE60' : '#E74C3C' }}>{fmt(lucro)}</div>
          <div style={s.kpiDelta}>receita − despesas</div>
          <div style={s.progressBar}><div style={{ ...s.progressFill, width: '60%', background: lucro >= 0 ? '#A8D5C2' : '#FFCDD2' }} /></div>
        </div>
        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, background: '#FFF8E8', color: '#F39C12' }}><Clock size={18} /></div>
          <div style={s.kpiLabel}>A receber</div>
          <div style={s.kpiValor}>{fmt(aReceber)}</div>
          <div style={s.kpiDelta}>entradas pendentes</div>
          <div style={s.progressBar}><div style={{ ...s.progressFill, width: aReceber > 0 ? '40%' : '0%', background: '#FFE08A' }} /></div>
        </div>
      </div>

      {/* Tabela card */}
      <div style={s.card}>
        {/* Filtros */}
        <div style={s.filtrosBar}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['todos', 'entrada', 'saida'].map(t => (
              <button key={t}
                onClick={() => { setFiltroTipo(t); setViewCalendario(false); }}
                style={{ ...s.chipBtn, ...(filtroTipo === t && !viewCalendario ? s.chipAtivo : {}) }}>
                {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
            <button
              onClick={() => { setViewCalendario(true); setDiaSelecionado(null); setFiltroTipo('todos'); }}
              style={{ ...s.chipBtn, ...(viewCalendario ? { background: '#A8D5C2', color: '#1A1A1A', borderColor: '#A8D5C2' } : {}) }}>
              A Vencer
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <div style={s.searchBox}>
              <Search size={13} color="#AAA" />
              <input style={s.searchInput} placeholder="Buscar descrição..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select style={s.selectFiltro} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {carregando ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 48, borderRadius: 8, background: '#F0F0F0', marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : viewCalendario ? (() => {
          const ano = calMes.getFullYear();
          const mes = calMes.getMonth();
          const primeiroDia = new Date(ano, mes, 1).getDay();
          const diasNoMes = new Date(ano, mes + 1, 0).getDate();
          const hoje = new Date().toISOString().split('T')[0];
          const pendentes = lancamentos.filter(l => l.status === 'pendente');
          const getLancamentosDia = (dia) => {
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            return pendentes.filter(l => l.data === dataStr);
          };
          const diasDiaSelecionado = diaSelecionado ? getLancamentosDia(diaSelecionado) : [];
          const nomeMesCal = calMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          const totalPendenteEntrada = pendentes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
          const totalPendenteSaida = pendentes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
          return (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#F0FBF6', borderRadius: 8, padding: '10px 14px', border: '1px solid #A8D5C2' }}>
                  <div style={{ fontSize: 11, color: '#27AE60', fontWeight: 600, textTransform: 'uppercase' }}>A receber (pendente)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#27AE60', marginTop: 4 }}>{fmt(totalPendenteEntrada)}</div>
                </div>
                <div style={{ flex: 1, background: '#FFF5F5', borderRadius: 8, padding: '10px 14px', border: '1px solid #FFCDD2' }}>
                  <div style={{ fontSize: 11, color: '#E74C3C', fontWeight: 600, textTransform: 'uppercase' }}>A pagar (pendente)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#E74C3C', marginTop: 4 }}>{fmt(totalPendenteSaida)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <button onClick={() => setCalMes(new Date(ano, mes - 1, 1))} style={s.calNavBtn}><ChevronLeft size={16} /></button>
                <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{nomeMesCal}</span>
                <button onClick={() => setCalMes(new Date(ano, mes + 1, 1))} style={s.calNavBtn}><ChevronRight size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#AAA', fontWeight: 600, padding: '4px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array(primeiroDia).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(dia => {
                  const itens = getLancamentosDia(dia);
                  const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const isHoje = dataStr === hoje;
                  const isSelecionado = diaSelecionado === dia;
                  const temEntrada = itens.some(l => l.tipo === 'entrada');
                  const temSaida = itens.some(l => l.tipo === 'saida');
                  return (
                    <div key={dia} onClick={() => setDiaSelecionado(isSelecionado ? null : dia)}
                      style={{ padding: '8px 4px', borderRadius: 8, textAlign: 'center', cursor: itens.length ? 'pointer' : 'default', background: isSelecionado ? '#1A1A1A' : isHoje ? '#F0F0F0' : '#fff', border: isHoje ? '2px solid #A8D5C2' : '1px solid #F5F5F5', minHeight: 52 }}>
                      <div style={{ fontSize: 13, fontWeight: isHoje ? 700 : 400, color: isSelecionado ? '#fff' : '#1A1A1A' }}>{dia}</div>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 4 }}>
                        {temEntrada && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27AE60' }} />}
                        {temSaida && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E74C3C' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: '#AAA' }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#27AE60', marginRight: 4 }} />A receber</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#E74C3C', marginRight: 4 }} />A pagar</span>
              </div>
              {diaSelecionado && (
                <div style={{ marginTop: 16, borderTop: '1.5px solid #F0F0F0', paddingTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                    {diaSelecionado}/{String(mes + 1).padStart(2, '0')}/{ano} — {diasDiaSelecionado.length} lançamento(s)
                  </div>
                  {diasDiaSelecionado.length === 0
                    ? <p style={{ color: '#AAA', fontSize: 13 }}>Nenhum lançamento pendente neste dia.</p>
                    : diasDiaSelecionado.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: '#FAFAFA', marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{l.descricao}</div>
                          <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{l.categoria}</div>
                        </div>
                        <Badge color={l.tipo === 'entrada' ? 'green' : 'red'}>{l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</Badge>
                        <span style={{ fontWeight: 700, color: l.tipo === 'entrada' ? '#27AE60' : '#E74C3C', fontSize: 14 }}>
                          {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })() : (
          filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#AAA' }}>
              <DollarSign size={40} color="#DDD" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhum lançamento encontrado</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Adicione um novo lançamento para começar</p>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{['Descrição','Categoria','Data','Tipo','Status','Valor','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map(l => (
                  <tr key={l.id} style={{ borderLeft: `3px solid ${l.tipo === 'entrada' ? '#A8D5C2' : '#FFCDD2'}` }}>
                    <td style={s.td}>{l.descricao}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#F5F5F5', color: '#555' }}>{l.categoria}</span>
                    </td>
                    <td style={{ ...s.td, color: '#888', fontSize: 12 }}>{formatDate(l.data)}</td>
                    <td style={s.td}>
                      <Badge color={l.tipo === 'entrada' ? 'green' : 'red'}>{l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</Badge>
                    </td>
                    <td style={s.td}><Badge color={statusCores[l.status]}>{statusLabels[l.status]}</Badge></td>
                    <td style={{ ...s.td, fontWeight: 700, color: l.tipo === 'entrada' ? '#27AE60' : '#E74C3C', fontSize: 14 }}>
                      {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={s.btnEditar} onClick={() => handleEditar(l)} title="Editar"><Pencil size={13} /></button>
                        <button style={s.btnExcluir} onClick={() => handleExcluir(l.id)} title="Excluir"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {!viewCalendario && filtrados.length > 0 && (
          <div style={{ padding: '12px 0 0', fontSize: 12, color: '#AAA', textAlign: 'right' }}>
            {filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            {/* Header escuro */}
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Financeiro</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff' }}>
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </div>
              </div>
              <button style={s.modalClose} onClick={fecharModal}><X size={16} /></button>
            </div>
            {/* Body */}
            <div style={s.modalBody}>
              {/* Tipo (destaque) */}
              <div style={s.formGroup}>
                <label style={s.label}>Tipo *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{v:'entrada',label:'Entrada',cor:'#27AE60',bg:'#E8F8EF'},{v:'saida',label:'Saída',cor:'#E74C3C',bg:'#FEECEB'}].map(({v,label,cor,bg}) => (
                    <button key={v} onClick={() => setForm({...form, tipo: v})}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${form.tipo === v ? cor : '#E8E8E8'}`, background: form.tipo === v ? bg : '#fff', color: form.tipo === v ? cor : '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Descrição *</label>
                <input style={s.input} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Consulta Ana Souza" />
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Categoria</label>
                  <select style={s.input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Valor (R$) *</label>
                  <input style={s.input} type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
                </div>
              </div>

              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Data</label>
                  <input style={s.input} type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="inadimplente">Inadimplente</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                <button style={s.btnGhost} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnPrimario} onClick={handleSalvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar lançamento'}
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
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F5F6FA', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  titulo: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#1A1A1A', margin: 0 },
  subtitulo: { fontSize: 13, color: '#AAA', marginTop: 4 },
  mesNavWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  mesLabel: { fontSize: 14, fontWeight: 600, color: '#555', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' },
  mesNavBtn: { background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#555' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  kpiCard: { background: '#fff', borderRadius: 14, padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px' },
  kpiValor: { fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1A1A1A', margin: '4px 0 2px' },
  kpiDelta: { fontSize: 11, color: '#AAA' },
  progressBar: { height: 3, background: '#F0F0F0', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  filtrosBar: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  chipBtn: { padding: '6px 14px', borderRadius: 20, fontSize: 12, border: '1.5px solid #E8E8E8', cursor: 'pointer', background: '#fff', color: '#888', fontWeight: 400 },
  chipAtivo: { background: '#1A1A1A', color: '#fff', borderColor: '#1A1A1A', fontWeight: 600 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#F8F8F8', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '6px 12px', minWidth: 180 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 12, color: '#1A1A1A', width: '100%' },
  selectFiltro: { padding: '6px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 12, background: '#F8F8F8', color: '#555', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  btnEditar: { padding: '6px 10px', fontSize: 12, border: '1.5px solid #E8E8E8', borderRadius: 6, cursor: 'pointer', background: '#F8F8F8', color: '#555', display: 'flex', alignItems: 'center', gap: 4 },
  btnExcluir: { padding: '6px 10px', fontSize: 12, border: '1.5px solid #FFCDD2', borderRadius: 6, cursor: 'pointer', background: '#FFF5F5', color: '#E74C3C', display: 'flex', alignItems: 'center', gap: 4 },
  btnPrimario: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecundario: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#555', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnGhost: { padding: '9px 16px', background: 'none', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 14, maxWidth: 520, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { background: 'linear-gradient(135deg,#1C1C1E,#2C2C2E)', borderRadius: '14px 14px 0 0', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalClose: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody: { padding: 28 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  calNavBtn: { background: 'none', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center' },
  toast: { position: 'fixed', top: 24, right: 24, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
};
