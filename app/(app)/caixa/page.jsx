'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, PageHeader, Button, Badge, KpiCard } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const formasPgto = ['Dinheiro', 'Cartão débito', 'Cartão crédito', 'Pix', 'Transferência', 'Cheque'];

const tipoCores = { entrada: 'green', saida: 'red', sangria: 'yellow' };
const tipoLabels = { entrada: 'Entrada', saida: 'Saída', sangria: 'Sangria' };

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Caixa() {
  const [sessao, setSessao] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('caixa');

  // Modais
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalFechar, setModalFechar] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState('entrada');

  const [saldoInicial, setSaldoInicial] = useState('');
  const [obsAbertura, setObsAbertura] = useState('');
  const [formMov, setFormMov] = useState({ descricao: '', valor: '', forma_pgto: 'Dinheiro' });
  const [obsFechar, setObsFechar] = useState('');

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => { carregarCaixa(); }, []);

  const carregarCaixa = async () => {
    setCarregando(true);
    // Buscar sessão aberta hoje
    const { data: sessaoData } = await supabase
      .from('caixa_sessoes')
      .select('*')
      .eq('data', hoje)
      .eq('status', 'aberto')
      .maybeSingle();

    setSessao(sessaoData || null);

    if (sessaoData) {
      const { data: movData } = await supabase
        .from('caixa_movimentos')
        .select('*')
        .eq('sessao_id', sessaoData.id)
        .order('criado_em', { ascending: false });
      setMovimentos(movData || []);
    } else {
      setMovimentos([]);
    }

    // Histórico últimas 10 sessões fechadas
    const { data: histData } = await supabase
      .from('caixa_sessoes')
      .select('*')
      .eq('status', 'fechado')
      .order('data', { ascending: false })
      .limit(10);
    setHistorico(histData || []);

    setCarregando(false);
  };

  const handleAbrirCaixa = async () => {
    if (!saldoInicial && saldoInicial !== '0') { alert('Informe o saldo inicial'); return; }
    setSalvando(true);
    const { data, error } = await supabase
      .from('caixa_sessoes')
      .insert([{ data: hoje, saldo_inicial: parseFloat(saldoInicial) || 0, observacoes: obsAbertura || null }])
      .select()
      .single();

    if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    setSessao(data);
    setMovimentos([]);
    setModalAbrir(false);
    setSaldoInicial('');
    setObsAbertura('');
    setSalvando(false);
  };

  const handleAdicionarMovimento = async () => {
    if (!formMov.descricao || !formMov.valor) { alert('Preencha descrição e valor'); return; }
    setSalvando(true);
    const { data, error } = await supabase
      .from('caixa_movimentos')
      .insert([{
        sessao_id: sessao.id,
        tipo: tipoMovimento,
        descricao: formMov.descricao,
        valor: parseFloat(formMov.valor),
        forma_pgto: formMov.forma_pgto,
      }])
      .select()
      .single();

    if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    setMovimentos(prev => [data, ...prev]);
    setModalMovimento(false);
    setFormMov({ descricao: '', valor: '', forma_pgto: 'Dinheiro' });
    setSalvando(false);
  };

  const handleExcluirMovimento = async (id) => {
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('caixa_movimentos').delete().eq('id', id);
    if (!error) setMovimentos(movimentos.filter(m => m.id !== id));
  };

  const handleFecharCaixa = async () => {
    setSalvando(true);
    const saldoFinal = saldoAtual;
    const { error } = await supabase
      .from('caixa_sessoes')
      .update({ status: 'fechado', saldo_final: saldoFinal, fechado_em: new Date().toISOString(), observacoes: obsFechar || null })
      .eq('id', sessao.id);

    if (error) { alert('Erro: ' + error.message); setSalvando(false); return; }
    setModalFechar(false);
    setObsFechar('');
    await carregarCaixa();
    setSalvando(false);
  };

  const totalEntradas = movimentos.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentos.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const totalSangrias = movimentos.filter(m => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0);
  const saldoAtual = (sessao?.saldo_inicial || 0) + totalEntradas - totalSaidas - totalSangrias;

  const abrirModalMovimento = (tipo) => {
    setTipoMovimento(tipo);
    setFormMov({ descricao: '', valor: '', forma_pgto: 'Dinheiro' });
    setModalMovimento(true);
  };

  if (carregando) return <div style={s.main}><p style={{ color: '#AAA' }}>Carregando...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="Caixa" subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        {sessao && (
          <>
            <Button variant="ghost" onClick={() => abrirModalMovimento('sangria')} style={{ borderColor: '#F39C12', color: '#F39C12' }}>Sangria</Button>
            <Button onClick={() => setModalFechar(true)} style={{ background: '#E74C3C', color: '#fff' }}>Fechar Caixa</Button>
          </>
        )}
        {!sessao && <Button onClick={() => setModalAbrir(true)}>Abrir Caixa</Button>}
      </PageHeader>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#EFEFEF', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {['caixa', 'historico'].map(a => (
          <button key={a} onClick={() => setAba(a)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === a ? 500 : 400, background: aba === a ? '#fff' : 'transparent', color: aba === a ? '#1A1A1A' : '#888', fontFamily: "'DM Sans', sans-serif" }}>
            {a === 'caixa' ? 'Caixa do dia' : 'Histórico'}
          </button>
        ))}
      </div>

      {aba === 'caixa' && (
        <>
          {!sessao ? (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'DM Serif Display', serif", marginBottom: 8 }}>Caixa fechado</div>
              <div style={{ fontSize: 14, color: '#AAA', marginBottom: 24 }}>Abra o caixa para iniciar os lançamentos do dia</div>
              <Button onClick={() => setModalAbrir(true)}>Abrir Caixa Agora</Button>
            </Card>
          ) : (
            <>
              {/* KPIs */}
              <div style={s.kpiGrid}>
                <KpiCard label="Saldo inicial" value={fmt(sessao.saldo_inicial)} delta="abertura do caixa" deltaType="up" />
                <KpiCard label="Entradas" value={fmt(totalEntradas)} delta={`${movimentos.filter(m => m.tipo === 'entrada').length} lançamentos`} deltaType="up" />
                <KpiCard label="Saídas" value={fmt(totalSaidas)} delta={`${movimentos.filter(m => m.tipo === 'saida').length} lançamentos`} deltaType="down" />
                <KpiCard label="Saldo atual" value={fmt(saldoAtual)} delta={saldoAtual >= 0 ? 'positivo' : 'negativo'} deltaType={saldoAtual >= 0 ? 'up' : 'down'} />
              </div>

              {/* Botões de lançamento */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button onClick={() => abrirModalMovimento('entrada')} style={{ flex: 1, padding: '14px', border: '2px solid #A8D5C2', borderRadius: 10, background: '#F0FBF6', color: '#27AE60', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  + Entrada
                </button>
                <button onClick={() => abrirModalMovimento('saida')} style={{ flex: 1, padding: '14px', border: '2px solid #FFCDD2', borderRadius: 10, background: '#FFF5F5', color: '#E74C3C', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  − Saída
                </button>
              </div>

              {/* Movimentos */}
              <Card>
                <CardTitle>Movimentos do dia</CardTitle>
                {movimentos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#AAA', fontSize: 13 }}>Nenhum lançamento ainda</div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>{['Hora','Descrição','Forma pgto','Tipo','Valor',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {movimentos.map(m => (
                        <tr key={m.id}>
                          <td style={s.td}>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={s.td}>{m.descricao}</td>
                          <td style={s.td}>{m.forma_pgto}</td>
                          <td style={s.td}><Badge color={tipoCores[m.tipo]}>{tipoLabels[m.tipo]}</Badge></td>
                          <td style={{ ...s.td, fontWeight: 600, color: m.tipo === 'entrada' ? '#27AE60' : '#E74C3C' }}>
                            {m.tipo === 'entrada' ? '+' : '−'}{fmt(m.valor)}
                          </td>
                          <td style={s.td}>
                            <button onClick={() => handleExcluirMovimento(m.id)} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 16 }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* Resumo por forma de pagamento */}
              {movimentos.filter(m => m.tipo === 'entrada').length > 0 && (
                <Card style={{ marginTop: 16 }}>
                  <CardTitle>Entradas por forma de pagamento</CardTitle>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                    {formasPgto.map(fp => {
                      const total = movimentos.filter(m => m.tipo === 'entrada' && m.forma_pgto === fp).reduce((s, m) => s + m.valor, 0);
                      if (total === 0) return null;
                      return (
                        <div key={fp} style={{ padding: '10px 16px', background: '#F8F8F8', borderRadius: 8, minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: '#AAA', marginBottom: 4 }}>{fp}</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#27AE60' }}>{fmt(total)}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {aba === 'historico' && (
        <Card>
          <CardTitle>Histórico de caixas</CardTitle>
          {historico.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#AAA', fontSize: 13 }}>Nenhum caixa fechado ainda</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{['Data','Saldo inicial','Saldo final','Resultado','Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {historico.map(h => {
                  const resultado = (h.saldo_final || 0) - (h.saldo_inicial || 0);
                  return (
                    <tr key={h.id}>
                      <td style={s.td}>{new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td style={s.td}>{fmt(h.saldo_inicial)}</td>
                      <td style={s.td}>{fmt(h.saldo_final)}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: resultado >= 0 ? '#27AE60' : '#E74C3C' }}>
                        {resultado >= 0 ? '+' : ''}{fmt(resultado)}
                      </td>
                      <td style={s.td}><Badge color="gray">Fechado</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modal abrir caixa */}
      {modalAbrir && (
        <div style={s.overlay} onClick={() => setModalAbrir(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Abrir Caixa</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div style={s.formGroup}>
              <label style={s.label}>Saldo inicial (R$) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} placeholder="0,00" autoFocus />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Observações</label>
              <input style={s.input} value={obsAbertura} onChange={e => setObsAbertura(e.target.value)} placeholder="Opcional" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalAbrir(false)}>Cancelar</Button>
              <Button onClick={handleAbrirCaixa} disabled={salvando}>{salvando ? 'Abrindo...' : 'Abrir Caixa'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lançamento */}
      {modalMovimento && (
        <div style={s.overlay} onClick={() => setModalMovimento(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...s.modalTitle, color: tipoMovimento === 'entrada' ? '#27AE60' : tipoMovimento === 'sangria' ? '#F39C12' : '#E74C3C' }}>
              {tipoMovimento === 'entrada' ? '+ Entrada' : tipoMovimento === 'saida' ? '− Saída' : '⬇ Sangria'}
            </h2>
            <div style={s.formGroup}>
              <label style={s.label}>Descrição *</label>
              <input style={s.input} value={formMov.descricao} onChange={e => setFormMov({ ...formMov, descricao: e.target.value })}
                placeholder={tipoMovimento === 'entrada' ? 'Ex: Consulta João Silva' : tipoMovimento === 'saida' ? 'Ex: Compra de material' : 'Ex: Sangria para banco'} autoFocus />
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Valor (R$) *</label>
                <input style={s.input} type="number" min="0" step="0.01" value={formMov.valor} onChange={e => setFormMov({ ...formMov, valor: e.target.value })} placeholder="0,00" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Forma de pagamento</label>
                <select style={s.input} value={formMov.forma_pgto} onChange={e => setFormMov({ ...formMov, forma_pgto: e.target.value })}>
                  {formasPgto.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalMovimento(false)}>Cancelar</Button>
              <Button onClick={handleAdicionarMovimento} disabled={salvando}
                style={{ background: tipoMovimento === 'entrada' ? '#A8D5C2' : tipoMovimento === 'sangria' ? '#FFF3CD' : '#FFCDD2', color: '#1A1A1A' }}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fechar caixa */}
      {modalFechar && (
        <div style={s.overlay} onClick={() => setModalFechar(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Fechar Caixa</h2>
            <div style={{ background: '#F8F8F8', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={s.resumoLinha}><span style={{ color: '#888' }}>Saldo inicial</span><span>{fmt(sessao?.saldo_inicial)}</span></div>
              <div style={s.resumoLinha}><span style={{ color: '#27AE60' }}>+ Entradas</span><span style={{ color: '#27AE60' }}>{fmt(totalEntradas)}</span></div>
              <div style={s.resumoLinha}><span style={{ color: '#E74C3C' }}>− Saídas</span><span style={{ color: '#E74C3C' }}>{fmt(totalSaidas)}</span></div>
              {totalSangrias > 0 && <div style={s.resumoLinha}><span style={{ color: '#F39C12' }}>− Sangrias</span><span style={{ color: '#F39C12' }}>{fmt(totalSangrias)}</span></div>}
              <div style={{ ...s.resumoLinha, fontWeight: 700, fontSize: 18, borderTop: '1.5px solid #EFEFEF', paddingTop: 12, marginTop: 4 }}>
                <span>Saldo final</span><span style={{ color: saldoAtual >= 0 ? '#27AE60' : '#E74C3C' }}>{fmt(saldoAtual)}</span>
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Observações de fechamento</label>
              <textarea style={{ ...s.input, minHeight: 70 }} value={obsFechar} onChange={e => setObsFechar(e.target.value)} placeholder="Opcional" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalFechar(false)}>Cancelar</Button>
              <Button onClick={handleFecharCaixa} disabled={salvando} style={{ background: '#E74C3C', color: '#fff' }}>
                {salvando ? 'Fechando...' : 'Confirmar Fechamento'}
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
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 20, color: '#1A1A1A' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  resumoLinha: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 },
};
