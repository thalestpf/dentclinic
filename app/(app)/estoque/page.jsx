'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, KpiCard, PageHeader, Button, Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const unidades = ['un', 'cx', 'ampola', 'frasco', 'rolo', 'par', 'kg', 'ml'];

function statusEstoque(qty, min) {
  if (qty <= 0) return { label: 'Esgotado', color: 'red' };
  if (qty < min * 0.3) return { label: 'Crítico', color: 'red' };
  if (qty < min) return { label: 'Atenção', color: 'yellow' };
  return { label: 'OK', color: 'green' };
}

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
  const [form, setForm] = useState({ nome: '', categoria: '', quantidade: 0, quantidade_minima: 0, unidade: 'un', validade: '' });
  const [qtdMovimento, setQtdMovimento] = useState(1);
  const [tipoMovimento, setTipoMovimento] = useState('entrada');

  // Estado categorias
  const [modalCategoria, setModalCategoria] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [formCategoria, setFormCategoria] = useState({ nome: '', descricao: '' });

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setCarregando(true);
    const [{ data: itensData }, { data: catData }] = await Promise.all([
      supabase.from('estoque').select('*').order('nome'),
      supabase.from('estoque_categorias').select('*').order('nome'),
    ]);
    setItens(itensData || []);
    setCategorias(catData || []);
    setCarregando(false);
  };

  const garantirCategoria = async (nomeCategoria) => {
    const nomeLimpo = nomeCategoria?.trim();
    if (!nomeLimpo) return;
    const jaExiste = categorias.some(cat => cat.nome?.toLowerCase() === nomeLimpo.toLowerCase());
    if (jaExiste) return;
    const { data, error } = await supabase.from('estoque_categorias').insert([{ nome: nomeLimpo }]).select('*');
    if (error) throw error;
    if (data?.length) {
      setCategorias(prev => {
        const combinado = [...prev, ...data];
        return combinado.sort((a, b) => a.nome.localeCompare(b.nome));
      });
    }
  };

  const carregarItens = async () => {
    const { data } = await supabase.from('estoque').select('*').order('nome');
    setItens(data || []);
  };

  const handleSalvar = async () => {
    if (!form.nome) { alert('Nome é obrigatório'); return; }
    setSalvando(true);
    const dados = {
      nome: form.nome,
      categoria: form.categoria?.trim() || '',
      quantidade: parseFloat(form.quantidade) || 0,
      quantidade_minima: parseFloat(form.quantidade_minima) || 0,
      unidade: form.unidade,
      validade: form.validade || null,
    };

    try {
      await garantirCategoria(form.categoria);
    } catch (error) {
      alert('Erro ao garantir categoria: ' + error.message);
      setSalvando(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('estoque').update(dados).eq('id', editingId);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    } else {
      const { error } = await supabase.from('estoque').insert([dados]);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    }

    await carregarItens();
    fecharModal();
    setSalvando(false);
  };

  const handleMovimento = async () => {
    if (!modalMovimento || qtdMovimento <= 0) return;
    const novaQtd = tipoMovimento === 'entrada'
      ? modalMovimento.quantidade + qtdMovimento
      : Math.max(0, modalMovimento.quantidade - qtdMovimento);

    const { error } = await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', modalMovimento.id);
    if (error) { alert('Erro: ' + error.message); return; }
    await carregarItens();
    setModalMovimento(null);
    setQtdMovimento(1);
  };

  const handleEditar = (item) => {
    setEditingId(item.id);
    setForm({ nome: item.nome, categoria: item.categoria || 'EPI', quantidade: item.quantidade, quantidade_minima: item.quantidade_minima, unidade: item.unidade || 'un', validade: item.validade || '' });
    setModal(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm('Excluir este item?')) return;
    const { error } = await supabase.from('estoque').delete().eq('id', id);
    if (!error) setItens(itens.filter(i => i.id !== id));
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm({ nome: '', categoria: categorias[0]?.nome || '', quantidade: 0, quantidade_minima: 0, unidade: 'un', validade: '' });
  };

  // CRUD Categorias
  const handleSalvarCategoria = async () => {
    if (!formCategoria.nome.trim()) { alert('Nome é obrigatório'); return; }
    setSalvando(true);
    const dados = { nome: formCategoria.nome.trim(), descricao: formCategoria.descricao || null };
    if (editingCatId) {
      const { error } = await supabase.from('estoque_categorias').update(dados).eq('id', editingCatId);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    } else {
      const { error } = await supabase.from('estoque_categorias').insert([dados]);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    }
    const { data } = await supabase.from('estoque_categorias').select('*').order('nome');
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
    const usada = itens.some(i => i.categoria === categorias.find(c => c.id === id)?.nome);
    if (usada) { alert('Esta categoria está em uso e não pode ser excluída.'); return; }
    if (!confirm('Excluir esta categoria?')) return;
    const { error } = await supabase.from('estoque_categorias').delete().eq('id', id);
    if (!error) setCategorias(categorias.filter(c => c.id !== id));
  };

  const fecharModalCategoria = () => {
    setModalCategoria(false);
    setEditingCatId(null);
    setFormCategoria({ nome: '', descricao: '' });
  };

  const filtrados = itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()) || (i.categoria || '').toLowerCase().includes(busca.toLowerCase()));
  const criticos = itens.filter(i => statusEstoque(i.quantidade, i.quantidade_minima).color === 'red').length;
  const atencao = itens.filter(i => statusEstoque(i.quantidade, i.quantidade_minima).color === 'yellow').length;

  if (carregando) return <div style={s.main}><p style={{ color: '#AAA' }}>Carregando...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="Estoque" subtitle="Controle de insumos e materiais">
        <Button variant="ghost">Exportar</Button>
        {aba === 'itens' && <Button onClick={() => setModal(true)}>+ Novo item</Button>}
        {aba === 'categorias' && <Button onClick={() => setModalCategoria(true)}>+ Nova categoria</Button>}
      </PageHeader>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#EFEFEF', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {['itens', 'categorias'].map(a => (
          <button key={a} onClick={() => setAba(a)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === a ? 500 : 400, background: aba === a ? '#fff' : 'transparent', color: aba === a ? '#1A1A1A' : '#888', fontFamily: "'DM Sans', sans-serif" }}>
            {a === 'itens' ? 'Itens' : 'Categorias'}
          </button>
        ))}
      </div>

      {aba === 'itens' && (
        <>
          <div style={s.kpiGrid}>
            <KpiCard label="Total de itens" value={itens.length} delta="cadastrados" deltaType="up" />
            <KpiCard label="Críticos" value={criticos} delta="abaixo do mínimo" deltaType={criticos > 0 ? 'down' : 'up'} />
            <KpiCard label="Atenção" value={atencao} delta="próximo do mínimo" deltaType={atencao > 0 ? 'down' : 'up'} />
          </div>
          <Card style={{ marginBottom: 20 }}>
            <input type="text" placeholder="Buscar por nome ou categoria..." value={busca} onChange={e => setBusca(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </Card>
          <Card>
            <CardTitle>Itens em estoque</CardTitle>
            <table style={s.table}>
              <thead>
                <tr>{['Item','Categoria','Qtd atual','Mínimo','Status','Validade','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>Nenhum item encontrado</td></tr>
                ) : filtrados.map(item => {
                  const st = statusEstoque(item.quantidade, item.quantidade_minima);
                  return (
                    <tr key={item.id}>
                      <td style={s.td}><strong>{item.nome}</strong></td>
                      <td style={s.td}>{item.categoria}</td>
                      <td style={s.td}>{item.quantidade} {item.unidade}</td>
                      <td style={s.td}>{item.quantidade_minima} {item.unidade}</td>
                      <td style={s.td}><Badge color={st.color}>{st.label}</Badge></td>
                      <td style={s.td}>{item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '—'}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...s.acaoBotao, background: '#E8F5E9', color: '#27AE60' }} onClick={() => { setModalMovimento(item); setTipoMovimento('entrada'); setQtdMovimento(1); }}>+ Entrada</button>
                          <button style={{ ...s.acaoBotao, background: '#FFEBEE', color: '#E74C3C' }} onClick={() => { setModalMovimento(item); setTipoMovimento('saida'); setQtdMovimento(1); }}>- Saída</button>
                          <button style={s.acaoBotao} onClick={() => handleEditar(item)}>Editar</button>
                          <button style={s.acaoBotao} onClick={() => handleExcluir(item.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {aba === 'categorias' && (
        <>
          <div style={s.kpiGrid}>
            <KpiCard label="Total de categorias" value={categorias.length} delta="cadastradas" deltaType="up" />
            <KpiCard label="Em uso" value={new Set(itens.map(i => i.categoria)).size} delta="com itens vinculados" deltaType="up" />
          </div>
          <Card>
            <CardTitle>Categorias de estoque</CardTitle>
            <table style={s.table}>
              <thead>
                <tr>{['Nome','Descrição','Itens vinculados','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {categorias.length === 0 ? (
                  <tr><td colSpan="4" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>Nenhuma categoria cadastrada</td></tr>
                ) : categorias.map(cat => {
                  const qtdItens = itens.filter(i => i.categoria === cat.nome).length;
                  return (
                    <tr key={cat.id}>
                      <td style={s.td}><strong>{cat.nome}</strong></td>
                      <td style={s.td}>{cat.descricao || <span style={{ color: '#CCC' }}>—</span>}</td>
                      <td style={s.td}>
                        <Badge color={qtdItens > 0 ? 'green' : 'gray'}>{qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</Badge>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={s.acaoBotao} onClick={() => handleEditarCategoria(cat)}>Editar</button>
                          <button style={{ ...s.acaoBotao, color: '#E74C3C' }} onClick={() => handleExcluirCategoria(cat.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Modal novo/editar item */}
      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingId ? 'Editar Item' : 'Novo Item'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Nome *</label>
              <input style={s.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Anestésico Lidocaína 2%" />
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Categoria</label>
                <select style={s.input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">Selecione uma categoria</option>
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
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoria */}
      {modalCategoria && (
        <div style={s.overlay} onClick={fecharModalCategoria}>
          <div style={{ ...s.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingCatId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Nome *</label>
              <input style={s.input} value={formCategoria.nome} onChange={e => setFormCategoria({ ...formCategoria, nome: e.target.value })} placeholder="Ex: Anestesia" />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Descrição</label>
              <input style={s.input} value={formCategoria.descricao} onChange={e => setFormCategoria({ ...formCategoria, descricao: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={fecharModalCategoria}>Cancelar</Button>
              <Button onClick={handleSalvarCategoria} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimentação */}
      {modalMovimento && (
        <div style={s.overlay} onClick={() => setModalMovimento(null)}>
          <div style={{ ...s.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{tipoMovimento === 'entrada' ? '+ Entrada' : '- Saída'} de Estoque</h2>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}><strong>{modalMovimento.nome}</strong><br />Estoque atual: {modalMovimento.quantidade} {modalMovimento.unidade}</p>
            <div style={s.formGroup}>
              <label style={s.label}>Quantidade</label>
              <input style={s.input} type="number" min="1" value={qtdMovimento} onChange={e => setQtdMovimento(parseFloat(e.target.value) || 1)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalMovimento(null)}>Cancelar</Button>
              <Button onClick={handleMovimento} style={{ background: tipoMovimento === 'entrada' ? '#A8D5C2' : '#FFCDD2', color: '#1A1A1A' }}>
                Confirmar {tipoMovimento === 'entrada' ? 'Entrada' : 'Saída'}
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
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acaoBotao: { padding: '6px 10px', fontSize: 11, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 24, color: '#1A1A1A' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};
