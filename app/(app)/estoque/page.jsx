'use client';

import { useState, useEffect } from 'react';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import { Package, AlertTriangle, Eye, Plus, Download, Search, X, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Tag } from 'lucide-react';

const unidades = ['un', 'cx', 'ampola', 'frasco', 'rolo', 'par', 'kg', 'ml'];

function statusEstoque(qty, min) {
  if (qty <= 0) return { label: 'Esgotado', color: 'red' };
  if (qty < min) return { label: 'Crítico', color: 'red' };
  if (qty < min * 1.5) return { label: 'Atenção', color: 'yellow' };
  return { label: 'OK', color: 'green' };
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
};

const fmt = (v) => (v || 0).toLocaleString('pt-BR');

export default function Estoque() {
  const [aba, setAba] = useState('itens');
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [form, setForm] = useState({ nome: '', categoria: '', quantidade: 0, quantidade_minima: 0, unidade: 'un', validade: '' });
  const [qtdMovimento, setQtdMovimento] = useState(1);
  const [tipoMovimento, setTipoMovimento] = useState('entrada');
  const [feedback, setFeedback] = useState(null);

  const [modalCategoria, setModalCategoria] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [formCategoria, setFormCategoria] = useState({ nome: '', descricao: '' });

  useEffect(() => { carregarDados(); }, []);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  const carregarDados = async () => {
    setCarregando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;

    let queryItens = supabase.from('estoque').select('*').order('nome');
    let queryCats = supabase.from('estoque_categorias').select('*').order('nome');
    if (clinicaId) {
      queryItens = queryItens.eq('clinica_id', clinicaId);
      queryCats = queryCats.eq('clinica_id', clinicaId);
    }

    const [{ data: itensData }, { data: catData }] = await Promise.all([queryItens, queryCats]);
    setItens(itensData || []);
    setCategorias(catData || []);
    setCarregando(false);
  };

  const garantirCategoria = async (nomeCategoria) => {
    const nomeLimpo = nomeCategoria?.trim();
    if (!nomeLimpo) return;
    const jaExiste = categorias.some(cat => cat.nome?.toLowerCase() === nomeLimpo.toLowerCase());
    if (jaExiste) return;
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    const dados = { nome: nomeLimpo };
    if (clinicaId) dados.clinica_id = clinicaId;
    const { data, error } = await supabase.from('estoque_categorias').insert([dados]).select('*');
    if (error) throw error;
    if (data?.length) {
      setCategorias(prev => [...prev, ...data].sort((a, b) => a.nome.localeCompare(b.nome)));
    }
  };

  const recarregarItens = async () => {
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    let query = supabase.from('estoque').select('*').order('nome');
    if (clinicaId) query = query.eq('clinica_id', clinicaId);
    const { data } = await query;
    setItens(data || []);
  };

  const handleSalvar = async () => {
    if (!form.nome) { showFeedback('Nome é obrigatório', 'erro'); return; }
    setSalvando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    const dados = {
      nome: form.nome,
      categoria: form.categoria?.trim() || '',
      quantidade: parseFloat(form.quantidade) || 0,
      quantidade_minima: parseFloat(form.quantidade_minima) || 0,
      unidade: form.unidade,
      validade: form.validade || null,
    };
    if (clinicaId) dados.clinica_id = clinicaId;

    try {
      await garantirCategoria(form.categoria);
    } catch (error) {
      showFeedback('Erro ao garantir categoria: ' + error.message, 'erro');
      setSalvando(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('estoque').update(dados).eq('id', editingId);
      if (error) { showFeedback('Erro ao atualizar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Item atualizado com sucesso');
    } else {
      const { error } = await supabase.from('estoque').insert([dados]);
      if (error) { showFeedback('Erro ao criar: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Item adicionado ao estoque');
    }

    await recarregarItens();
    fecharModal();
    setSalvando(false);
  };

  const handleMovimento = async () => {
    if (!modalMovimento || qtdMovimento <= 0) return;
    const novaQtd = tipoMovimento === 'entrada'
      ? modalMovimento.quantidade + Number(qtdMovimento)
      : Math.max(0, modalMovimento.quantidade - Number(qtdMovimento));

    const { error } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', modalMovimento.id);
    if (error) { showFeedback('Erro ao registrar movimentação: ' + error.message, 'erro'); return; }
    await recarregarItens();
    setModalMovimento(null);
    setQtdMovimento(1);
    showFeedback(tipoMovimento === 'entrada' ? 'Entrada registrada com sucesso' : 'Saída registrada com sucesso');
  };

  const handleEditar = (item) => {
    setEditingId(item.id);
    setForm({ nome: item.nome, categoria: item.categoria || '', quantidade: item.quantidade, quantidade_minima: item.quantidade_minima, unidade: item.unidade || 'un', validade: item.validade || '' });
    setModal(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm('Excluir este item?')) return;
    const { error } = await supabase.from('estoque').delete().eq('id', id);
    if (error) { showFeedback('Erro ao excluir: ' + error.message, 'erro'); return; }
    setItens(itens.filter(i => i.id !== id));
    showFeedback('Item removido do estoque');
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm({ nome: '', categoria: categorias[0]?.nome || '', quantidade: 0, quantidade_minima: 0, unidade: 'un', validade: '' });
  };

  // CRUD Categorias
  const handleSalvarCategoria = async () => {
    if (!formCategoria.nome.trim()) { showFeedback('Nome é obrigatório', 'erro'); return; }
    setSalvando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    const dados = { nome: formCategoria.nome.trim(), descricao: formCategoria.descricao || null };
    if (clinicaId) dados.clinica_id = clinicaId;

    if (editingCatId) {
      const { error } = await supabase.from('estoque_categorias').update(dados).eq('id', editingCatId);
      if (error) { showFeedback('Erro: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Categoria atualizada');
    } else {
      const { error } = await supabase.from('estoque_categorias').insert([dados]);
      if (error) { showFeedback('Erro: ' + error.message, 'erro'); setSalvando(false); return; }
      showFeedback('Categoria criada');
    }
    const clinicaId2 = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;
    let q = supabase.from('estoque_categorias').select('*').order('nome');
    if (clinicaId2) q = q.eq('clinica_id', clinicaId2);
    const { data } = await q;
    setCategorias(data || []);
    fecharModalCategoria();
    setSalvando(false);
  };

  const handleEditarCategoria = (cat) => {
    setEditingCatId(cat.id);
    setFormCategoria({ nome: cat.nome, descricao: cat.descricao || '' });
    setModalCategoria(true);
  };

  const handleExcluirCategoria = async (id) => {
    const cat = categorias.find(c => c.id === id);
    const usada = itens.some(i => i.categoria === cat?.nome);
    if (usada) { showFeedback('Esta categoria está em uso e não pode ser excluída.', 'erro'); return; }
    if (!confirm('Excluir esta categoria?')) return;
    const { error } = await supabase.from('estoque_categorias').delete().eq('id', id);
    if (error) { showFeedback('Erro ao excluir: ' + error.message, 'erro'); return; }
    setCategorias(categorias.filter(c => c.id !== id));
    showFeedback('Categoria removida');
  };

  const fecharModalCategoria = () => {
    setModalCategoria(false);
    setEditingCatId(null);
    setFormCategoria({ nome: '', descricao: '' });
  };

  const exportarCSV = () => {
    const linhas = [['Item', 'Categoria', 'Qtd Atual', 'Mínimo', 'Unidade', 'Status', 'Validade']];
    filtrados.forEach(item => {
      const st = statusEstoque(item.quantidade, item.quantidade_minima);
      linhas.push([item.nome, item.categoria || '', item.quantidade, item.quantidade_minima, item.unidade, st.label, formatDate(item.validade)]);
    });
    const csv = '\uFEFF' + linhas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('CSV exportado com sucesso');
  };

  const filtrados = itens.filter(i => {
    const buscaOk = !busca || i.nome.toLowerCase().includes(busca.toLowerCase()) || (i.categoria || '').toLowerCase().includes(busca.toLowerCase());
    const catOk = !filtroCategoria || i.categoria === filtroCategoria;
    const st = statusEstoque(i.quantidade, i.quantidade_minima);
    const statusOk = filtroStatus === 'todos' || st.label.toLowerCase() === filtroStatus;
    return buscaOk && catOk && statusOk;
  });

  const criticos = itens.filter(i => statusEstoque(i.quantidade, i.quantidade_minima).color === 'red').length;
  const atencao = itens.filter(i => statusEstoque(i.quantidade, i.quantidade_minima).label === 'Atenção').length;

  const statusBorderColor = { OK: '#A8D5C2', 'Atenção': '#F39C12', 'Crítico': '#E74C3C', 'Esgotado': '#C0392B' };

  return (
    <div style={s.main}>

      {/* Toast */}
      {feedback && (
        <div style={{ ...s.toast, background: feedback.tipo === 'erro' ? '#C0392B' : '#27AE60' }}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Estoque</h1>
          <p style={s.subtitulo}>Controle de insumos e materiais</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnSecundario} onClick={exportarCSV}>
            <Download size={14} /> Exportar CSV
          </button>
          {aba === 'itens' && (
            <button style={s.btnPrimario} onClick={() => setModal(true)}>
              <Plus size={14} /> Novo item
            </button>
          )}
          {aba === 'categorias' && (
            <button style={s.btnPrimario} onClick={() => setModalCategoria(true)}>
              <Plus size={14} /> Nova categoria
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div style={s.abaWrapper}>
        {[{ v: 'itens', label: 'Itens' }, { v: 'categorias', label: 'Categorias' }].map(({ v, label }) => (
          <button key={v} onClick={() => setAba(v)}
            style={{ ...s.abaBtn, ...(aba === v ? s.abaAtivo : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'itens' && (
        <>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><Package size={18} /></div>
              <div style={s.kpiLabel}>Total de itens</div>
              <div style={s.kpiValor}>{itens.length}</div>
              <div style={s.kpiDelta}>cadastrados</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#B5CFF5' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#FEECEB', color: '#E74C3C' }}><AlertTriangle size={18} /></div>
              <div style={s.kpiLabel}>Críticos / Esgotados</div>
              <div style={{ ...s.kpiValor, color: criticos > 0 ? '#E74C3C' : '#1A1A1A' }}>{criticos}</div>
              <div style={s.kpiDelta}>abaixo do mínimo</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: criticos > 0 ? `${Math.min(100, (criticos / itens.length) * 100)}%` : '0%', background: '#FFCDD2' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#FFF8E8', color: '#F39C12' }}><Eye size={18} /></div>
              <div style={s.kpiLabel}>Em atenção</div>
              <div style={{ ...s.kpiValor, color: atencao > 0 ? '#F39C12' : '#1A1A1A' }}>{atencao}</div>
              <div style={s.kpiDelta}>próximo do mínimo</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: atencao > 0 ? `${Math.min(100, (atencao / itens.length) * 100)}%` : '0%', background: '#FFE08A' }} /></div>
            </div>
          </div>

          {/* Filtros */}
          <div style={s.card}>
            <div style={s.filtrosBar}>
              <div style={s.searchBox}>
                <Search size={13} color="#AAA" />
                <input style={s.searchInput} placeholder="Buscar por nome ou categoria..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <select style={s.selectFiltro} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                <option value="">Todas as categorias</option>
                {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
              <select style={s.selectFiltro} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os status</option>
                <option value="ok">OK</option>
                <option value="atenção">Atenção</option>
                <option value="crítico">Crítico</option>
                <option value="esgotado">Esgotado</option>
              </select>
            </div>

            {carregando ? (
              <div>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ height: 52, borderRadius: 8, background: '#F0F0F0', marginBottom: 8 }} />
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#AAA' }}>
                <Package size={40} color="#DDD" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhum item encontrado</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Cadastre um novo item para começar</p>
              </div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>{['Item','Categoria','Qtd atual','Mínimo','Status','Validade','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtrados.map(item => {
                    const st = statusEstoque(item.quantidade, item.quantidade_minima);
                    const borderClr = statusBorderColor[st.label] || '#E8E8E8';
                    return (
                      <tr key={item.id} style={{ borderLeft: `3px solid ${borderClr}` }}>
                        <td style={s.td}><strong style={{ fontSize: 13 }}>{item.nome}</strong></td>
                        <td style={s.td}>
                          {item.categoria
                            ? <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#F5F5F5', color: '#555' }}>{item.categoria}</span>
                            : <span style={{ color: '#CCC' }}>—</span>
                          }
                        </td>
                        <td style={{ ...s.td, fontWeight: 600, color: st.color === 'red' ? '#E74C3C' : '#1A1A1A' }}>
                          {fmt(item.quantidade)} <span style={{ fontWeight: 400, color: '#AAA', fontSize: 11 }}>{item.unidade}</span>
                        </td>
                        <td style={{ ...s.td, color: '#888', fontSize: 12 }}>
                          {fmt(item.quantidade_minima)} {item.unidade}
                        </td>
                        <td style={s.td}><Badge color={st.color}>{st.label}</Badge></td>
                        <td style={{ ...s.td, color: '#888', fontSize: 12 }}>{formatDate(item.validade)}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button style={s.btnEntrada} onClick={() => { setModalMovimento(item); setTipoMovimento('entrada'); setQtdMovimento(1); }} title="Entrada">
                              <ArrowDownCircle size={13} /> Entrada
                            </button>
                            <button style={s.btnSaida} onClick={() => { setModalMovimento(item); setTipoMovimento('saida'); setQtdMovimento(1); }} title="Saída">
                              <ArrowUpCircle size={13} /> Saída
                            </button>
                            <button style={s.btnEditar} onClick={() => handleEditar(item)} title="Editar"><Pencil size={13} /></button>
                            <button style={s.btnExcluir} onClick={() => handleExcluir(item.id)} title="Excluir"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!carregando && filtrados.length > 0 && (
              <div style={{ padding: '12px 0 0', fontSize: 12, color: '#AAA', textAlign: 'right' }}>
                {filtrados.length} item{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}

      {aba === 'categorias' && (
        <>
          <div style={{ ...s.kpiGrid, gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 440 }}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><Tag size={18} /></div>
              <div style={s.kpiLabel}>Total de categorias</div>
              <div style={s.kpiValor}>{categorias.length}</div>
              <div style={s.kpiDelta}>cadastradas</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#B5CFF5' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><Package size={18} /></div>
              <div style={s.kpiLabel}>Em uso</div>
              <div style={s.kpiValor}>{new Set(itens.map(i => i.categoria).filter(Boolean)).size}</div>
              <div style={s.kpiDelta}>com itens vinculados</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '70%', background: '#A8D5C2' }} /></div>
            </div>
          </div>

          <div style={s.card}>
            {categorias.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#AAA' }}>
                <Tag size={40} color="#DDD" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhuma categoria cadastrada</p>
              </div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>{['Nome','Descrição','Itens vinculados','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {categorias.map(cat => {
                    const qtdItens = itens.filter(i => i.categoria === cat.nome).length;
                    return (
                      <tr key={cat.id}>
                        <td style={s.td}><strong>{cat.nome}</strong></td>
                        <td style={{ ...s.td, color: '#888', fontSize: 12 }}>{cat.descricao || <span style={{ color: '#CCC' }}>—</span>}</td>
                        <td style={s.td}>
                          <Badge color={qtdItens > 0 ? 'green' : 'gray'}>{qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</Badge>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={s.btnEditar} onClick={() => handleEditarCategoria(cat)}><Pencil size={13} /></button>
                            <button style={s.btnExcluir} onClick={() => handleExcluirCategoria(cat.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal novo/editar item */}
      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Estoque</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff' }}>
                  {editingId ? 'Editar Item' : 'Novo Item'}
                </div>
              </div>
              <button style={s.modalClose} onClick={fecharModal}><X size={16} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Nome *</label>
                <input style={s.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Anestésico Lidocaína 2%" />
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Categoria</label>
                  <select style={s.input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Unidade</label>
                  <select style={s.input} value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}>
                    {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Quantidade atual</label>
                  <input style={s.input} type="number" min="0" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Quantidade mínima</label>
                  <input style={s.input} type="number" min="0" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Validade</label>
                <input style={s.input} type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                <button style={s.btnGhost} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnPrimario} onClick={handleSalvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoria */}
      {modalCategoria && (
        <div style={s.overlay} onClick={fecharModalCategoria}>
          <div style={{ ...s.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Estoque</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff' }}>
                  {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                </div>
              </div>
              <button style={s.modalClose} onClick={fecharModalCategoria}><X size={16} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Nome *</label>
                <input style={s.input} value={formCategoria.nome} onChange={e => setFormCategoria({ ...formCategoria, nome: e.target.value })} placeholder="Ex: Anestesia" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Descrição</label>
                <input style={s.input} value={formCategoria.descricao} onChange={e => setFormCategoria({ ...formCategoria, descricao: e.target.value })} placeholder="Descrição opcional" />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                <button style={s.btnGhost} onClick={fecharModalCategoria}>Cancelar</button>
                <button style={s.btnPrimario} onClick={handleSalvarCategoria} disabled={salvando}>
                  {salvando ? 'Salvando...' : editingCatId ? 'Atualizar' : 'Criar categoria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimentação */}
      {modalMovimento && (
        <div style={s.overlay} onClick={() => setModalMovimento(null)}>
          <div style={{ ...s.modalBox, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Movimentação</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff' }}>{modalMovimento.nome}</div>
              </div>
              <button style={s.modalClose} onClick={() => setModalMovimento(null)}><X size={16} /></button>
            </div>
            <div style={s.modalBody}>
              {/* Toggle tipo */}
              <div style={s.formGroup}>
                <label style={s.label}>Tipo de movimentação</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { v: 'entrada', label: 'Entrada', cor: '#27AE60', bg: '#E8F8EF' },
                    { v: 'saida', label: 'Saída', cor: '#E74C3C', bg: '#FEECEB' },
                  ].map(({ v, label, cor, bg }) => (
                    <button key={v} onClick={() => setTipoMovimento(v)}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${tipoMovimento === v ? cor : '#E8E8E8'}`, background: tipoMovimento === v ? bg : '#fff', color: tipoMovimento === v ? cor : '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#F8F8F8', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Estoque atual: </span>
                <strong style={{ fontSize: 14 }}>{modalMovimento.quantidade} {modalMovimento.unidade}</strong>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Quantidade a {tipoMovimento === 'entrada' ? 'adicionar' : 'remover'}</label>
                <input style={s.input} type="number" min="1" value={qtdMovimento} onChange={e => setQtdMovimento(parseFloat(e.target.value) || 1)} />
              </div>
              <div style={{ background: tipoMovimento === 'entrada' ? '#E8F8EF' : '#FEECEB', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: tipoMovimento === 'entrada' ? '#27AE60' : '#E74C3C', fontWeight: 500 }}>
                Novo estoque: {tipoMovimento === 'entrada'
                  ? modalMovimento.quantidade + Number(qtdMovimento)
                  : Math.max(0, modalMovimento.quantidade - Number(qtdMovimento))
                } {modalMovimento.unidade}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button style={s.btnGhost} onClick={() => setModalMovimento(null)}>Cancelar</button>
                <button
                  onClick={handleMovimento}
                  style={{ ...s.btnPrimario, background: tipoMovimento === 'entrada' ? '#27AE60' : '#E74C3C' }}>
                  Confirmar {tipoMovimento === 'entrada' ? 'Entrada' : 'Saída'}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  titulo: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#1A1A1A', margin: 0 },
  subtitulo: { fontSize: 13, color: '#AAA', marginTop: 4 },
  abaWrapper: { display: 'flex', gap: 4, background: '#EFEFEF', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' },
  abaBtn: { padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 400, background: 'transparent', color: '#888', fontFamily: "'DM Sans', sans-serif" },
  abaAtivo: { background: '#fff', color: '#1A1A1A', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  kpiCard: { background: '#fff', borderRadius: 14, padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px' },
  kpiValor: { fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1A1A1A', margin: '4px 0 2px' },
  kpiDelta: { fontSize: 11, color: '#AAA' },
  progressBar: { height: 3, background: '#F0F0F0', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  filtrosBar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#F8F8F8', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 180 },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 12, color: '#1A1A1A', width: '100%' },
  selectFiltro: { padding: '7px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 12, background: '#F8F8F8', color: '#555', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '13px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  btnEntrada: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', fontSize: 11, border: '1.5px solid #A8D5C2', borderRadius: 6, cursor: 'pointer', background: '#E8F8EF', color: '#27AE60', fontWeight: 500 },
  btnSaida: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', fontSize: 11, border: '1.5px solid #FFCDD2', borderRadius: 6, cursor: 'pointer', background: '#FFF5F5', color: '#E74C3C', fontWeight: 500 },
  btnEditar: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, border: '1.5px solid #E8E8E8', borderRadius: 6, cursor: 'pointer', background: '#F8F8F8', color: '#555' },
  btnExcluir: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, border: '1.5px solid #FFCDD2', borderRadius: 6, cursor: 'pointer', background: '#FFF5F5', color: '#E74C3C' },
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
  toast: { position: 'fixed', top: 24, right: 24, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
};
