'use client';

import { useState } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../components/UI';

const procedimentosIniciais = [
  { id: 1, nome: 'Limpeza Profissional', categoria: 'Prevenção', duracao: '45 min', preco: 150, status: 'ativo' },
  { id: 2, nome: 'Restauração Direta', categoria: 'Restaurações', duracao: '60 min', preco: 280, status: 'ativo' },
  { id: 3, nome: 'Canal Radicular', categoria: 'Endodontia', duracao: '90 min', preco: 900, status: 'ativo' },
  { id: 4, nome: 'Clareamento Dental', categoria: 'Estética', duracao: '60 min', preco: 600, status: 'ativo' },
  { id: 5, nome: 'Extração Simples', categoria: 'Cirurgia', duracao: '30 min', preco: 200, status: 'ativo' },
  { id: 6, nome: 'Implante Osseointegrado', categoria: 'Implantodontia', duracao: '120 min', preco: 2500, status: 'ativo' },
  { id: 7, nome: 'Aparelho Ortodôntico', categoria: 'Ortodontia', duracao: '60 min', preco: 350, status: 'ativo' },
  { id: 8, nome: 'Consulta / Avaliação', categoria: 'Geral', duracao: '30 min', preco: 100, status: 'ativo' },
];

const categorias = ['Geral', 'Prevenção', 'Restaurações', 'Endodontia', 'Cirurgia', 'Estética', 'Implantodontia', 'Ortodontia'];

export default function PrecosPage() {
  const [itens, setItens] = useState(procedimentosIniciais);
  const [modal, setModal] = useState(null); // null | 'novo' | 'editar'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', categoria: '', duracao: '', preco: '', status: 'ativo' });
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busca, setBusca] = useState('');

  const itemsFiltrados = itens.filter(item =>
    (filtroCategoria === '' || item.categoria === filtroCategoria) &&
    item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const handleNovo = () => {
    setEditId(null);
    setForm({ nome: '', categoria: '', duracao: '', preco: '', status: 'ativo' });
    setModal('novo');
  };

  const handleEditar = (item) => {
    setEditId(item.id);
    setForm({ ...item });
    setModal('editar');
  };

  const handleExcluir = (id) => {
    if (window.confirm('Deseja realmente excluir este procedimento?')) {
      setItens(itens.filter(item => item.id !== id));
    }
  };

  const handleSalvar = () => {
    if (!form.nome || !form.categoria || !form.duracao || !form.preco) {
      alert('Preencha todos os campos');
      return;
    }

    if (modal === 'novo') {
      const newId = Math.max(...itens.map(i => i.id), 0) + 1;
      setItens([...itens, { id: newId, ...form, preco: parseFloat(form.preco) }]);
    } else {
      setItens(itens.map(item =>
        item.id === editId ? { ...item, ...form, preco: parseFloat(form.preco) } : item
      ));
    }
    setModal(null);
  };

  const handleFecharModal = () => {
    setModal(null);
    setForm({ nome: '', categoria: '', duracao: '', preco: '', status: 'ativo' });
  };

  const ticketMedio = itens.length > 0 ? (itens.reduce((sum, p) => sum + p.preco, 0) / itens.length).toFixed(0) : 0;
  const categoriasunicas = new Set(itens.map(i => i.categoria)).size;

  return (
    <div style={s.main}>
      <PageHeader
        title="Procedimentos"
        subtitle="Gerencie os preços dos procedimentos para lançamentos"
      >
        <Button variant="ghost">Exportar</Button>
        <Button onClick={handleNovo}>+ Novo Procedimento</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Total cadastrado" value={itens.length} delta="+2 este mês" />
        <KpiCard label="Ticket médio" value={`R$ ${ticketMedio}`} delta="por procedimento" />
        <KpiCard label="Categorias" value={categoriasunicas} delta={`${categorias.length} disponíveis`} />
      </div>

      <Card style={s.filtersCard}>
        <div style={s.filtersContainer}>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={s.filterInput}
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={s.filterSelect}
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardTitle>Procedimentos cadastrados</CardTitle>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>Categoria</th>
              <th style={s.th}>Duração</th>
              <th style={s.th}>Preço</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>
                  Nenhum procedimento encontrado
                </td>
              </tr>
            ) : (
              itemsFiltrados.map(item => (
                <tr key={item.id}>
                  <td style={s.td}>{item.nome}</td>
                  <td style={s.td}>{item.categoria}</td>
                  <td style={s.td}>{item.duracao}</td>
                  <td style={s.td}>R$ {item.preco.toFixed(2).replace('.', ',')}</td>
                  <td style={s.td}>
                    <Badge color={item.status === 'ativo' ? 'green' : 'gray'}>
                      {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td style={s.td}>
                    <div style={s.acoes}>
                      <button style={s.acaoBotao} onClick={() => handleEditar(item)}>Editar</button>
                      <button style={s.acaoBotao} onClick={() => handleExcluir(item.id)}>Excluir</button>
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
              {modal === 'novo' ? 'Novo Procedimento' : 'Editar Procedimento'}
            </h2>

            <div style={s.formGroup}>
              <label style={s.label}>Nome do Procedimento</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={s.input}
                placeholder="Ex: Limpeza Profissional"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Categoria</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                style={s.input}
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Duração</label>
                <input
                  type="text"
                  value={form.duracao}
                  onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                  style={s.input}
                  placeholder="Ex: 45 min"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Preço (R$)</label>
                <input
                  type="number"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  style={s.input}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
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
              <Button onClick={handleSalvar}>Salvar Procedimento</Button>
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
  filtersCard: { marginBottom: 24 },
  filtersContainer: { display: 'flex', gap: 12 },
  filterInput: { flex: 1, padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  filterSelect: { padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' },
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
