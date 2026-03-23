import React from 'react';
import { Card, CardTitle, KpiCard, PageHeader, Button, Badge } from '../components/UI';

const kpis = [
  { label: 'Receita do mês', value: 'R$38.240', delta: '+12% vs fev', deltaType: 'up' },
  { label: 'Despesas', value: 'R$14.800', delta: '+4% vs fev', deltaType: 'down' },
  { label: 'Lucro líquido', value: 'R$23.440', delta: '+18% vs fev', deltaType: 'up' },
  { label: 'A receber', value: 'R$6.800', delta: '4,2% inadimp.', deltaType: 'down' },
];

const transactions = [
  { name: 'Ana Costa', cat: 'Limpeza profissional', date: '23/03', status: 'green', label: 'Pago', value: '+R$150', valueType: 'in' },
  { name: 'Carlos Lima', cat: 'Canal radicular', date: '23/03', status: 'green', label: 'Pago', value: '+R$900', valueType: 'in' },
  { name: 'Mariana Souza', cat: 'Extração', date: '22/03', status: 'yellow', label: 'Pendente', value: 'R$320', valueType: 'neutral' },
  { name: 'Fornecedor — EPI', cat: 'Luvas e máscaras', date: '21/03', status: 'green', label: 'Pago', value: '-R$480', valueType: 'out' },
  { name: 'Pedro Alves', cat: 'Ortodontia', date: '20/03', status: 'green', label: 'Pago', value: '+R$350', valueType: 'in' },
  { name: 'Hugo Ferreira', cat: 'Emergência', date: '19/03', status: 'red', label: 'Inadimpl.', value: 'R$200', valueType: 'out' },
];

const procedures = [
  { name: 'Implantes', value: 'R$12.400', pct: 82 },
  { name: 'Ortodontia', value: 'R$9.800', pct: 65 },
  { name: 'Restaurações', value: 'R$6.200', pct: 42, color: '#F39C12' },
  { name: 'Limpeza', value: 'R$4.100', pct: 28, color: '#F39C12' },
  { name: 'Outros', value: 'R$5.740', pct: 20, color: '#E74C3C' },
];

export default function Financeiro() {
  return (
    <div style={s.main}>
      <PageHeader title="Financeiro" subtitle="Março 2026">
        <Button variant="ghost">Exportar</Button>
        <Button>+ Lançamento</Button>
      </PageHeader>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      <div style={s.grid2}>
        {/* Transactions */}
        <Card>
          <CardTitle>Últimas transações</CardTitle>
          <p style={s.sub}>Entradas e saídas recentes</p>
          <table style={s.table}>
            <thead>
              <tr>
                {['Descrição','Data','Status','Valor'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.name + t.date}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{t.cat}</div>
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: '#AAA' }}>{t.date}</td>
                  <td style={s.td}><Badge color={t.status}>{t.label}</Badge></td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 500, fontSize: 13, color: t.valueType === 'in' ? '#27AE60' : t.valueType === 'out' ? '#E74C3C' : '#888' }}>
                    {t.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Line chart */}
          <Card>
            <CardTitle>Fluxo do mês</CardTitle>
            <p style={s.sub}>Entradas vs saídas</p>
            <svg viewBox="0 0 300 100" style={{ width: '100%', height: 130 }} preserveAspectRatio="none">
              <polyline fill="none" stroke="#A8D5C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,80 40,60 80,70 120,40 160,50 200,30 240,20 300,25" />
              <polyline fill="none" stroke="#F0997B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,88 40,82 80,85 120,75 160,80 200,70 240,68 300,72" />
            </svg>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['#A8D5C2','Receitas'],['#F0997B','Despesas']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
                  <div style={{ width: 10, height: 3, background: c, borderRadius: 2 }} />
                  {l}
                </div>
              ))}
            </div>
          </Card>

          {/* Procedures */}
          <Card>
            <CardTitle>Receita por procedimento</CardTitle>
            <p style={{ ...s.sub, marginBottom: 14 }}>Participação no faturamento</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {procedures.map(p => (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 6 }}>
                    <span>{p.name}</span>
                    <span style={{ color: '#AAA' }}>{p.value}</span>
                  </div>
                  <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.color || '#A8D5C2', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 },
  sub: { fontSize: 11, color: '#AAA', fontWeight: 300, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500, textAlign: 'left', padding: '0 0 10px', borderBottom: '1px solid #F0F0F0' },
  td: { padding: '11px 0', borderBottom: '1px solid #F8F8F8', verticalAlign: 'middle' },
};
