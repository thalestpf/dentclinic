import React from 'react';
import { Card, CardTitle, KpiCard, PageHeader, Button, Badge } from '../components/UI';

const stockItems = [
  { name: 'Anestésico Lidocaína 2%', cat: 'Anestesia', qty: '2 ampolas', min: '20 un.', status: 'red', label: 'Crítico', pct: 10, validade: 'Jun/2026' },
  { name: 'Resina composta A2', cat: 'Restauração', qty: '1 cx.', min: '5 cx.', status: 'red', label: 'Crítico', pct: 8, validade: 'Dez/2026' },
  { name: 'Luvas nitrilo M', cat: 'EPI', qty: '8 cx.', min: '15 cx.', status: 'yellow', label: 'Atenção', pct: 40, validade: '—' },
  { name: 'Máscara cirúrgica', cat: 'EPI', qty: '45 cx.', min: '10 cx.', status: 'green', label: 'OK', pct: 80, validade: '—' },
  { name: 'Fio de sutura 3-0', cat: 'Cirurgia', qty: '24 un.', min: '5 un.', status: 'green', label: 'OK', pct: 90, validade: 'Mar/2027' },
  { name: 'Sensor radiografia digital', cat: 'Imagem', qty: '3 sensores', min: '1 un.', status: 'green', label: 'OK', pct: 95, validade: '—' },
];

const barColors = { green: '#A8D5C2', yellow: '#F39C12', red: '#E74C3C' };

const reports = [
  { name: 'Faturamento mensal', desc: 'Receitas por procedimento', bg: '#E8F5E9', stroke: '#27AE60' },
  { name: 'Taxa de ocupação', desc: 'Agenda e produtividade', bg: '#E6F1FB', stroke: '#185FA5' },
  { name: 'Inadimplência', desc: 'Pagamentos em aberto', bg: '#FFF9E6', stroke: '#856404' },
  { name: 'Estoque crítico', desc: 'Itens abaixo do mínimo', bg: '#FDECEA', stroke: '#E74C3C' },
  { name: 'Retenção de pacientes', desc: 'Retornos e fidelização', bg: '#EDE9FE', stroke: '#6D28D9' },
  { name: 'Desempenho geral', desc: 'KPIs da clínica', bg: '#E8F4F0', stroke: '#0F6E56' },
];

export default function Estoque() {
  return (
    <div style={s.main}>
      <PageHeader title="Estoque e Relatórios" subtitle="Controle de insumos e indicadores">
        <Button variant="ghost">Exportar</Button>
        <Button>+ Entrada de insumo</Button>
      </PageHeader>

      {/* KPIs */}
      <div style={s.grid3}>
        <KpiCard label="Total de itens" value="142" delta="cadastrados" deltaType="up" />
        <KpiCard label="Críticos" value="6" delta="abaixo do mínimo" deltaType="down" />
        <KpiCard label="Valor em estoque" value="R$8.340" delta="+3% vs mês ant." deltaType="up" />
      </div>

      {/* Stock table */}
      <Card>
        <CardTitle>Controle de estoque</CardTitle>
        <p style={s.sub}>Itens com movimentação recente</p>
        <table style={s.table}>
          <thead>
            <tr>
              {['Item','Categoria','Qtd atual','Mínimo','Status','Validade'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stockItems.map(item => (
              <tr key={item.name}>
                <td style={s.td}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                  <div style={{ height: 4, background: '#F0F0F0', borderRadius: 2, marginTop: 6, width: 80 }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: barColors[item.status], borderRadius: 2 }} />
                  </div>
                </td>
                <td style={{ ...s.td, fontSize: 12, color: '#888' }}>{item.cat}</td>
                <td style={{ ...s.td, fontSize: 13, fontWeight: 500, color: item.status === 'red' ? '#E74C3C' : item.status === 'yellow' ? '#F39C12' : '#1A1A1A' }}>
                  {item.qty}
                </td>
                <td style={{ ...s.td, fontSize: 12, color: '#AAA' }}>{item.min}</td>
                <td style={s.td}><Badge color={item.status}>{item.label}</Badge></td>
                <td style={{ ...s.td, fontSize: 12, color: '#AAA' }}>{item.validade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Reports */}
      <div>
        <h2 style={s.sectionTitle}>Relatórios disponíveis</h2>
        <div style={s.reportsGrid}>
          {reports.map(r => (
            <div key={r.name} style={s.reportItem}>
              <div style={{ ...s.reportIcon, background: r.bg }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.stroke} strokeWidth="1.8" strokeLinecap="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: '#AAA', fontWeight: 300 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  sub: { fontSize: 11, color: '#AAA', fontWeight: 300, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500, textAlign: 'left', padding: '0 0 10px', borderBottom: '1px solid #F0F0F0' },
  td: { padding: '12px 0', borderBottom: '1px solid #F8F8F8', verticalAlign: 'middle', paddingRight: 12 },
  sectionTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 19, letterSpacing: '-0.3px', marginBottom: 14, fontWeight: 400 },
  reportsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  reportItem: { background: '#FAFAFA', borderRadius: 8, padding: 14, cursor: 'pointer', border: '1.5px solid transparent', transition: 'all 0.15s' },
  reportIcon: { width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
};
