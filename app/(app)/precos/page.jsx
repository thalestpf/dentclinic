'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Badge } from '../../../components/UI';
import { Tag, TrendingUp, Layers, Search, Plus, X, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-react';

const CATEGORIAS = ['Geral', 'Prevenção', 'Restaurações', 'Endodontia', 'Cirurgia', 'Estética', 'Implantodontia', 'Ortodontia', 'Periodontia', 'Prótese'];

export default function PrecosPage() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nome: '', categoria: 'Geral', duracao: '', preco: '', status: 'ativo' });
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [feedback, setFeedback] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [clinicaId, setClinicaId] = useState(null);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  useEffect(() => {
    const id = localStorage.getItem('dentclinic_clinica_id');
    setClinicaId(id || null);
    carregarProcedimentos(id);
  }, []);

  const carregarProcedimentos = async (cId) => {
    setCarregando(true);
    let query = supabase.from('procedimentos').select('*').order('nome');
    if (cId) query = query.eq('clinica_id', cId);
    const { data, error } = await query;
    if (!error) setItens(data || []);
    else showFeedback('Erro ao carregar procedimentos', 'erro');
    setCarregando(false);
  };

  const handleNovo = () => {
    setEditingId(null);
    setForm({ nome: '', categoria: 'Geral', duracao: '', preco: '', status: 'ativo' });
    setModal(true);
  };

  const handleEditar = (item) => {
    setEditingId(item.id);
    setForm({ nome: item.nome, categoria: item.categoria || 'Geral', duracao: item.duracao || '', preco: String(item.preco), status: item.status });
    setModal(true);
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.preco) {
      showFeedback('Nome e preço são obrigatórios', 'erro');
      return;
    }
    setSalvando(true);
    const dados = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      duracao: form.duracao.trim() || null,
      preco: parseFloat(form.preco),
      status: form.status,
      ...(clinicaId ? { clinica_id: clinicaId } : {}),
    };

    if (editingId) {
      const { error } = await supabase.from('procedimentos').update(dados).eq('id', editingId);
      if (error) { showFeedback('Erro ao atualizar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Procedimento atualizado!');
    } else {
      const { error } = await supabase.from('procedimentos').insert([dados]);
      if (error) { showFeedback('Erro ao criar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Procedimento criado!');
    }

    await carregarProcedimentos(clinicaId);
    fecharModal();
    setSalvando(false);
  };

  const handleExcluir = async (id) => {
    if (!confirm('Excluir este procedimento?')) return;
    const { error } = await supabase.from('procedimentos').delete().eq('id', id);
    if (error) { showFeedback('Erro ao excluir: ' + error.message, 'erro'); return; }
    setItens(prev => prev.filter(i => i.id !== id));
    showFeedback('Procedimento removido');
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm({ nome: '', categoria: 'Geral', duracao: '', preco: '', status: 'ativo' });
  };

  const filtrados = itens.filter(i => {
    const nomeOk = !busca || i.nome.toLowerCase().includes(busca.toLowerCase());
    const catOk = !filtroCategoria || i.categoria === filtroCategoria;
    const stOk = filtroStatus === 'todos' || i.status === filtroStatus;
    return nomeOk && catOk && stOk;
  });

  const ativos = itens.filter(i => i.status === 'ativo').length;
  const ticketMedio = ativos > 0 ? itens.filter(i => i.status === 'ativo').reduce((s, i) => s + (i.preco || 0), 0) / ativos : 0;
  const categoriasUnicas = new Set(itens.map(i => i.categoria).filter(Boolean)).size;

  return (
    <div style={s.main}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {feedback && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: feedback.tipo === 'sucesso' ? '#E8F5E9' : '#FFEBEE', color: feedback.tipo === 'sucesso' ? '#2E7D32' : '#C62828', border: `1.5px solid ${feedback.tipo === 'sucesso' ? '#C8E6C9' : '#FFCDD2'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          {feedback.tipo === 'sucesso' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#1A1A1A', margin: 0 }}>Procedimentos</h1>
          <p style={{ fontSize: 13, color: '#AAA', marginTop: 4 }}>Tabela de preços e procedimentos da clínica</p>
        </div>
        <button style={s.btnPrimario} onClick={handleNovo}>
          <Plus size={14} /> Novo Procedimento
        </button>
      </div>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Total cadastrado</div>
              <div style={s.kpiValor}>{carregando ? '—' : itens.length}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ativos} ativos</div>
            </div>
            <div style={{ ...s.kpiIcon, background: '#F0FAF6' }}><Tag size={18} color="#6BBF9E" /></div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width: `${Math.min(itens.length * 4, 100)}%`, background: '#A8D5C2' }} /></div>
        </div>
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Ticket médio</div>
              <div style={s.kpiValor}>R$ {carregando ? '—' : ticketMedio.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>dos procedimentos ativos</div>
            </div>
            <div style={{ ...s.kpiIcon, background: '#FFF8EE' }}><TrendingUp size={18} color="#F5A623" /></div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width: '60%', background: '#F5A623' }} /></div>
        </div>
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Categorias</div>
              <div style={s.kpiValor}>{carregando ? '—' : categoriasUnicas}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>especialidades cadastradas</div>
            </div>
            <div style={{ ...s.kpiIcon, background: '#EEF4FF' }}><Layers size={18} color="#5B8DEF" /></div>
          </div>
          <div style={s.kpiBarBg}><div style={{ ...s.kpiBar, width: `${Math.min(categoriasUnicas * 10, 100)}%`, background: '#B5CFF5' }} /></div>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.filtrosBar}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} color="#BBB" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar procedimento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...s.searchInput, paddingLeft: 36 }}
          />
        </div>
        <select style={s.selectFiltro} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={s.chipGroup}>
          {[['todos', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroStatus(v)}
              style={{ ...s.chip, ...(filtroStatus === v ? s.chipAtivo : {}) }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#AAA' }}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      <div style={s.tableCard}>
        <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #F5F5F5' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Procedimentos cadastrados</span>
        </div>

        {carregando ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 52, borderRadius: 8, background: 'linear-gradient(90deg,#F5F5F5 25%,#EBEBEB 50%,#F5F5F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite linear' }} />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0 40px' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Tag size={24} color="#CCC" />
            </div>
            <div style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>
              {busca || filtroCategoria || filtroStatus !== 'todos' ? 'Nenhum procedimento encontrado' : 'Nenhum procedimento cadastrado'}
            </div>
            {!busca && !filtroCategoria && filtroStatus === 'todos' && (
              <button style={{ marginTop: 16, padding: '9px 18px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleNovo}>
                <Plus size={14} /> Criar primeiro procedimento
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fff' }}>
                {['Nome', 'Categoria', 'Duração', 'Preço', 'Status', 'Ações'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => (
                <tr key={item.id}
                  onMouseEnter={() => setHoverRow(item.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: hoverRow === item.id ? '#FAFAFA' : '#fff' }}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#1A1A1A' }}>{item.nome}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#F5F5F5', color: '#555' }}>{item.categoria || '—'}</span>
                  </td>
                  <td style={{ ...s.td, color: '#888', fontSize: 12 }}>{item.duracao || '—'}</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#27AE60' }}>
                    R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                  </td>
                  <td style={s.td}>
                    <Badge color={item.status === 'ativo' ? 'green' : 'gray'}>
                      {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={s.btnEditar} onClick={() => handleEditar(item)} title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button style={s.btnExcluir} onClick={() => handleExcluir(item.id)} title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => !salvando && fecharModal()}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Procedimentos</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff' }}>
                  {editingId ? 'Editar Procedimento' : 'Novo Procedimento'}
                </div>
              </div>
              <button style={s.modalClose} onClick={fecharModal}><X size={16} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Nome *</label>
                <input style={s.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Limpeza Profissional" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Categoria</label>
                  <select style={s.input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Duração</label>
                  <input style={s.input} value={form.duracao} onChange={e => setForm({ ...form, duracao: e.target.value })} placeholder="Ex: 45 min" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Preço (R$) *</label>
                  <input style={s.input} type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} placeholder="0,00" />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                <button style={s.btnGhost} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnPrimario} onClick={handleSalvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar procedimento'}
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
  main: { flex: 1, padding: 28, overflowY: 'auto', background: '#F8F8F8', display: 'flex', flexDirection: 'column', gap: 16 },
  btnPrimario: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  kpiCard: { background: '#fff', borderRadius: 14, padding: '20px 20px 16px', border: '1.5px solid #EFEFEF', display: 'flex', flexDirection: 'column', gap: 14 },
  kpiLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500, marginBottom: 6 },
  kpiValor: { fontFamily: "'DM Serif Display', serif", fontSize: 34, letterSpacing: '-1px', color: '#1A1A1A', lineHeight: 1 },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiBarBg: { height: 4, background: '#F5F5F5', borderRadius: 2 },
  kpiBar: { height: '100%', borderRadius: 2 },
  filtrosBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', padding: '12px 16px', flexWrap: 'wrap' },
  searchInput: { width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none' },
  selectFiltro: { padding: '7px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 12, background: '#fff', color: '#555', cursor: 'pointer', outline: 'none' },
  chipGroup: { display: 'flex', gap: 4, background: '#F5F5F5', padding: 3, borderRadius: 8 },
  chip: { padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#888', fontFamily: "'DM Sans', sans-serif" },
  chipAtivo: { background: '#fff', color: '#1A1A1A', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  tableCard: { background: '#fff', borderRadius: 14, border: '1.5px solid #EFEFEF', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1.5px solid #F0F0F0' },
  td: { padding: '13px 16px', fontSize: 13, borderBottom: '1px solid #F8F8F8' },
  btnEditar: { display: 'flex', alignItems: 'center', padding: '6px 10px', fontSize: 12, border: '1.5px solid #E8E8E8', borderRadius: 6, cursor: 'pointer', background: '#F8F8F8', color: '#555' },
  btnExcluir: { display: 'flex', alignItems: 'center', padding: '6px 10px', fontSize: 12, border: '1.5px solid #FFCDD2', borderRadius: 6, cursor: 'pointer', background: '#FFF5F5', color: '#E74C3C' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 14, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader: { background: 'linear-gradient(135deg,#1C1C1E,#2C2C2E)', borderRadius: '14px 14px 0 0', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalClose: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody: { padding: 28 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' },
  btnGhost: { padding: '9px 16px', background: 'none', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
};
