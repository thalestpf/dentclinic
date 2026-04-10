'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, KpiCard, PageHeader, Button, Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const categorias = ['Consulta', 'Procedimento', 'Material', 'Equipamento', 'Salário', 'Aluguel', 'Outros'];
const statusCores = { pago: 'green', pendente: 'yellow', inadimplente: 'red' };
const statusLabels = { pago: 'Pago', pendente: 'Pendente', inadimplente: 'Inadimpl.' };

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ descricao: '', categoria: 'Consulta', tipo: 'entrada', valor: '', status: 'pago', data: new Date().toISOString().split('T')[0] });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [viewCalendario, setViewCalendario] = useState(false);
  const [calMes, setCalMes] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  useEffect(() => { carregarLancamentos(); }, []);

  const carregarLancamentos = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .order('data', { ascending: false });
    if (!error) setLancamentos(data || []);
    setCarregando(false);
  };

  const handleSalvar = async () => {
    if (!form.descricao || !form.valor) { alert('Preencha descrição e valor'); return; }
    setSalvando(true);
    const dados = {
      descricao: form.descricao,
      categoria: form.categoria,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      status: form.status,
      data: form.data,
    };

    if (editingId) {
      const { error } = await supabase.from('lancamentos').update(dados).eq('id', editingId);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    } else {
      const { error } = await supabase.from('lancamentos').insert([dados]);
      if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
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
    if (!error) setLancamentos(lancamentos.filter(l => l.id !== id));
  };

  const fecharModal = () => {
    setModal(false);
    setEditingId(null);
    setForm({ descricao: '', categoria: 'Consulta', tipo: 'entrada', valor: '', status: 'pago', data: new Date().toISOString().split('T')[0] });
  };

  const filtrados = filtroTipo === 'todos' ? lancamentos : lancamentos.filter(l => l.tipo === filtroTipo);
  const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0);
  const totalSaidas = lancamentos.filter(l => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0);
  const aReceber = lancamentos.filter(l => l.tipo === 'entrada' && l.status === 'pendente').reduce((s, l) => s + (l.valor || 0), 0);
  const lucro = totalEntradas - totalSaidas;

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (carregando) return <div style={s.main}><p style={{ color: '#AAA' }}>Carregando...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="Financeiro" subtitle={`${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}>
        <Button variant="ghost">Exportar</Button>
        <Button onClick={() => setModal(true)}>+ Lançamento</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        <KpiCard label="Receita (pago)" value={fmt(totalEntradas)} delta="entradas confirmadas" deltaType="up" />
        <KpiCard label="Despesas (pago)" value={fmt(totalSaidas)} delta="saídas confirmadas" deltaType="down" />
        <KpiCard label="Lucro líquido" value={fmt(lucro)} delta="receita - despesas" deltaType={lucro >= 0 ? 'up' : 'down'} />
        <KpiCard label="A receber" value={fmt(aReceber)} delta="entradas pendentes" deltaType="down" />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <CardTitle>Lançamentos</CardTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            {['todos','entrada','saida'].map(t => (
              <button key={t} onClick={() => { setFiltroTipo(t); setViewCalendario(false); }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: '1.5px solid #E8E8E8', cursor: 'pointer', background: !viewCalendario && filtroTipo === t ? '#1A1A1A' : '#fff', color: !viewCalendario && filtroTipo === t ? '#fff' : '#888', fontWeight: !viewCalendario && filtroTipo === t ? 600 : 400 }}>
                {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
            <button onClick={() => { setViewCalendario(true); setDiaSelecionado(null); }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: '1.5px solid #E8E8E8', cursor: 'pointer', background: viewCalendario ? '#A8D5C2' : '#fff', color: viewCalendario ? '#1A1A1A' : '#888', fontWeight: viewCalendario ? 600 : 400 }}>
              📅 A Vencer
            </button>
          </div>
        </div>
        {viewCalendario ? (() => {
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
          const nomeMes = calMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
                <button onClick={() => setCalMes(new Date(ano, mes - 1, 1))} style={s.calNavBtn}>‹</button>
                <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{nomeMes}</span>
                <button onClick={() => setCalMes(new Date(ano, mes + 1, 1))} style={s.calNavBtn}>›</button>
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
        <table style={s.table}>
          <thead>
            <tr>{['Descrição','Categoria','Data','Tipo','Status','Valor','Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>Nenhum lançamento encontrado</td></tr>
            ) : filtrados.map(l => (
              <tr key={l.id}>
                <td style={s.td}>{l.descricao}</td>
                <td style={s.td}>{l.categoria}</td>
                <td style={s.td}>{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                <td style={s.td}>
                  <Badge color={l.tipo === 'entrada' ? 'green' : 'red'}>{l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</Badge>
                </td>
                <td style={s.td}><Badge color={statusCores[l.status]}>{statusLabels[l.status]}</Badge></td>
                <td style={{ ...s.td, fontWeight: 600, color: l.tipo === 'entrada' ? '#27AE60' : '#E74C3C' }}>
                  {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={s.acaoBotao} onClick={() => handleEditar(l)}>Editar</button>
                    <button style={s.acaoBotao} onClick={() => handleExcluir(l.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>

      {modal && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Descrição *</label>
              <input style={s.input} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Consulta Ana Souza" />
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Tipo *</label>
                <select style={s.input} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Categoria</label>
                <select style={s.input} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Valor (R$) *</label>
                <input style={s.input} type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Data</label>
                <input style={s.input} type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Status</label>
              <select style={s.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 24, color: '#1A1A1A' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  calNavBtn: { background: 'none', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '4px 12px', fontSize: 16, cursor: 'pointer', color: '#555' },
};
