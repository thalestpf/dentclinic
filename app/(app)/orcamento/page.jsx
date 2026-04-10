'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader, KpiCard } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const statusCores = { rascunho: 'blue', aguardando: 'yellow', aprovado: 'green', recusado: 'red' };
const statusLabels = { rascunho: 'Rascunho', aguardando: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado' };

export default function OrcamentoPage() {
  const [activeTab, setActiveTab] = useState('lista'); // 'lista' | 'novo'

  const [orcamentos, setOrcamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ paciente: '', desconto: 0, parcelas: 1, observacoes: '' });
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    const [{ data: orcData, error: orcError }, { data: pacData }, { data: procData }] = await Promise.all([
      supabase.from('orcamentos').select('*').order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id, nome').order('nome'),
      supabase.from('procedimentos').select('*').eq('status', 'ativo').order('nome'),
    ]);
    if (orcError) console.error('[Orçamentos]', orcError.message);
    setOrcamentos(orcData || []);
    setPacientes(pacData || []);
    setProcedimentos(procData || []);
    setCarregando(false);
  };

  const handleAdicionarProcedimento = (proc) => {
    const existe = selecionados.find(s => s.id === proc.id);
    if (existe) {
      setSelecionados(selecionados.map(s => s.id === proc.id ? { ...s, quantidade: s.quantidade + 1 } : s));
    } else {
      setSelecionados([...selecionados, { ...proc, quantidade: 1 }]);
    }
  };

  const handleRemoverProcedimento = (id) => setSelecionados(selecionados.filter(s => s.id !== id));

  const subtotal = selecionados.reduce((sum, p) => sum + p.preco * p.quantidade, 0);
  const desconto = (subtotal * form.desconto) / 100;
  const total = subtotal - desconto;
  const valorParcela = form.parcelas > 0 ? (total / form.parcelas).toFixed(2) : 0;

  const handleSalvar = async (status) => {
    if (!form.paciente || selecionados.length === 0) {
      alert('Selecione um paciente e pelo menos um procedimento');
      return;
    }
    setSalvando(true);
    const dados = {
      paciente_nome: form.paciente,
      procedimentos: selecionados.map(s => `${s.nome} (${s.quantidade}x)`).join(', '),
      subtotal,
      desconto_pct: form.desconto,
      total,
      parcelas: form.parcelas,
      status,
      observacoes: form.observacoes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('orcamentos').update(dados).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('orcamentos').insert([dados]));
    }
    if (error) { alert('Erro ao salvar: ' + error.message); setSalvando(false); return; }

    await carregarDados();
    limparForm();
    setActiveTab('lista');
    setSalvando(false);
  };

  const handleEditar = (o) => {
    setEditingId(o.id);
    setForm({ paciente: o.paciente_nome, desconto: o.desconto_pct || 0, parcelas: o.parcelas || 1, observacoes: o.observacoes || '' });
    setSelecionados([]);
    setActiveTab('novo');
  };

  const handleExcluir = async (id) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    const { error } = await supabase.from('orcamentos').delete().eq('id', id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    setOrcamentos(orcamentos.filter(o => o.id !== id));
  };

  const limparForm = () => {
    setForm({ paciente: '', desconto: 0, parcelas: 1, observacoes: '' });
    setSelecionados([]);
    setEditingId(null);
  };

  const aprovados = orcamentos.filter(o => o.status === 'aprovado').length;
  const ticketMedio = orcamentos.length > 0
    ? (orcamentos.reduce((s, o) => s + (o.total || 0), 0) / orcamentos.length).toFixed(0)
    : 0;

  if (carregando) return <div style={s.main}><p style={{ color: '#AAA' }}>Carregando...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="Orçamentos" subtitle="Gerencie orçamentos e planos de tratamento">
        {activeTab === 'lista' && (
          <Button onClick={() => { limparForm(); setActiveTab('novo'); }}>+ Novo Orçamento</Button>
        )}
      </PageHeader>

      {/* ── LISTA DE ORÇAMENTOS ── */}
      {activeTab === 'lista' && (
        <>
          <div style={s.kpiGrid}>
            <KpiCard label="Total de orçamentos" value={orcamentos.length} delta="cadastrados" />
            <KpiCard label="Aprovados" value={aprovados} delta={orcamentos.length ? `${((aprovados / orcamentos.length) * 100).toFixed(0)}% do total` : '—'} />
            <KpiCard label="Ticket médio" value={`R$ ${ticketMedio}`} delta="por orçamento" />
          </div>
          <Card>
            <CardTitle>Orçamentos cadastrados</CardTitle>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Paciente', 'Procedimentos', 'Total', 'Status', 'Data', 'Ações'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {orcamentos.length === 0 ? (
                  <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#AAA' }}>Nenhum orçamento cadastrado</td></tr>
                ) : orcamentos.map(o => (
                  <tr key={o.id}>
                    <td style={s.td}>{o.paciente_nome}</td>
                    <td style={{ ...s.td, maxWidth: 220, color: '#888', fontSize: 12 }}>{o.procedimentos}</td>
                    <td style={s.td}>R$ {(o.total || 0).toFixed(2).replace('.', ',')}</td>
                    <td style={s.td}><Badge color={statusCores[o.status]}>{statusLabels[o.status]}</Badge></td>
                    <td style={s.td}>{o.criado_em ? new Date(o.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={s.td}>
                      <div style={s.acoes}>
                        <button style={s.acaoBotao} onClick={() => handleEditar(o)}>Editar</button>
                        <button style={s.acaoBotao} onClick={() => handleExcluir(o.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── FORMULÁRIO NOVO/EDITAR ── */}
      {activeTab === 'novo' && (
        <div style={s.formularioSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => { limparForm(); setActiveTab('lista'); }} style={s.voltarBtn}>← Voltar</button>
            <h3 style={s.sectionTitle}>{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Paciente *</label>
            <select value={form.paciente} onChange={e => setForm({ ...form, paciente: e.target.value })} style={s.input}>
              <option value="">Selecione um paciente</option>
              {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Procedimentos *</label>
            {procedimentos.length === 0 ? (
              <div style={s.semProc}>
                Nenhum procedimento cadastrado.{' '}
                <button onClick={() => window.location.href = '/configuracoes'} style={s.linkBtn}>
                  Cadastrar em Configurações →
                </button>
              </div>
            ) : (
              <div style={s.procedimentosGrid}>
                {procedimentos.map(proc => (
                  <div key={proc.id} style={s.procItemCard}>
                    <div style={s.procName}>{proc.nome}</div>
                    {proc.categoria && <div style={s.procCategoria}>{proc.categoria}</div>}
                    <div style={s.procPrice}>R$ {Number(proc.preco).toFixed(2).replace('.', ',')}</div>
                    <Button onClick={() => handleAdicionarProcedimento(proc)} style={{ width: '100%', marginTop: 8, padding: '6px 8px', fontSize: 12 }}>+ Adicionar</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selecionados.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <CardTitle>Selecionados</CardTitle>
              <table style={s.tabelaCompacta}>
                <thead>
                  <tr>{['Procedimento', 'Qtd', 'Preço Unit.', 'Subtotal', ''].map((h, i) => <th key={i} style={s.thCompacta}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selecionados.map(proc => (
                    <tr key={proc.id}>
                      <td style={s.tdCompacta}>{proc.nome}</td>
                      <td style={s.tdCompacta}>
                        <input type="number" min="1" value={proc.quantidade}
                          onChange={e => setSelecionados(selecionados.map(s => s.id === proc.id ? { ...s, quantidade: parseInt(e.target.value) || 1 } : s))}
                          style={{ width: 50, padding: '4px 6px', border: '1px solid #E8E8E8', borderRadius: 4, fontSize: 12 }}
                        />
                      </td>
                      <td style={s.tdCompacta}>R$ {Number(proc.preco).toFixed(2).replace('.', ',')}</td>
                      <td style={s.tdCompacta}>R$ {(proc.preco * proc.quantidade).toFixed(2).replace('.', ',')}</td>
                      <td style={s.tdCompacta}>
                        <button onClick={() => handleRemoverProcedimento(proc.id)} style={{ color: '#E74C3C', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card style={{ marginBottom: 24 }}>
            <CardTitle>Resumo Financeiro</CardTitle>
            <div style={s.resumoGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Desconto (%)</label>
                <input type="number" min="0" max="100" value={form.desconto}
                  onChange={e => setForm({ ...form, desconto: parseFloat(e.target.value) || 0 })} style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Parcelas</label>
                <select value={form.parcelas} onChange={e => setForm({ ...form, parcelas: parseInt(e.target.value) })} style={s.input}>
                  {[1, 2, 3, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
            </div>
            <div style={s.resumoValores}>
              <div style={s.resumoLinha}><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              <div style={s.resumoLinha}><span>Desconto ({form.desconto}%)</span><span style={{ color: '#E74C3C' }}>- R$ {desconto.toFixed(2).replace('.', ',')}</span></div>
              <div style={{ ...s.resumoLinha, fontWeight: 700, fontSize: 16, borderTop: '1.5px solid #EFEFEF', paddingTop: 12, marginTop: 4 }}>
                <span>Total</span><span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              {form.parcelas > 1 && (
                <div style={{ ...s.resumoLinha, color: '#888', fontSize: 12 }}>
                  <span>Valor por parcela</span><span>{form.parcelas}x de R$ {String(valorParcela).replace('.', ',')}</span>
                </div>
              )}
            </div>
          </Card>

          <div style={s.formGroup}>
            <label style={s.label}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
              style={{ ...s.input, minHeight: 70 }} placeholder="Informações adicionais..." />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { limparForm(); setActiveTab('lista'); }}>Cancelar</Button>
            <Button onClick={() => handleSalvar('rascunho')} disabled={salvando} style={{ background: '#D1ECF1', color: '#0C5460' }}>Salvar Rascunho</Button>
            <Button onClick={() => handleSalvar('aprovado')} disabled={salvando}>✓ Aprovar Orçamento</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acoes: { display: 'flex', gap: 8 },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },
  formularioSection: { maxWidth: 720 },
  sectionTitle: { fontSize: 18, fontFamily: "'DM Serif Display', serif", margin: 0, color: '#1A1A1A' },
  voltarBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: 0 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff' },
  procedimentosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  procItemCard: { padding: 14, border: '1.5px solid #EFEFEF', borderRadius: 10, background: '#fff' },
  procName: { fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 2 },
  procCategoria: { fontSize: 11, color: '#AAA', marginBottom: 4 },
  procPrice: { fontSize: 14, color: '#27AE60', fontWeight: 600 },
  semProc: { padding: 16, background: '#FAFAFA', borderRadius: 8, fontSize: 13, color: '#888', border: '1.5px dashed #E8E8E8' },
  linkBtn: { background: 'none', border: 'none', color: '#A8D5C2', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 },
  tabelaCompacta: { width: '100%', borderCollapse: 'collapse' },
  thCompacta: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #EFEFEF', fontSize: 11, color: '#888' },
  tdCompacta: { padding: '8px 10px', borderBottom: '1px solid #F5F5F5', fontSize: 12 },
  resumoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  resumoValores: { borderTop: '1px solid #F0F0F0', paddingTop: 12 },
  resumoLinha: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#1A1A1A' },
};
