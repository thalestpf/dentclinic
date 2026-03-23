import React, { useEffect, useRef } from 'react';
import { KpiCard, Card, CardTitle, PageHeader, Button, Badge } from '../components/UI';

const kpis = [
  { label: 'Consultas hoje', value: '14', delta: '+2 vs ontem', deltaType: 'up', bar: 70 },
  { label: 'Faturamento mês', value: 'R$38k', delta: '+12% vs mês anterior', deltaType: 'up', bar: 76 },
  { label: 'Taxa de ocupação', value: '87%', delta: '+5% vs semana passada', deltaType: 'up', bar: 87 },
  { label: 'Inadimplência', value: '4,2%', delta: '+1.1% vs mês anterior', deltaType: 'down', bar: 4 },
];

const appointments = [
  { time: '08:00', name: 'Ana Costa', proc: 'Limpeza', status: 'green', label: 'Confirmado' },
  { time: '09:00', name: 'Carlos Lima', proc: 'Canal', status: 'green', label: 'Confirmado' },
  { time: '10:30', name: 'Mariana Souza', proc: 'Extração', status: 'yellow', label: 'Pendente' },
  { time: '14:00', name: 'Pedro Alves', proc: 'Ortodontia', status: 'green', label: 'Confirmado' },
  { time: '15:30', name: 'Julia Mendes', proc: 'Implante', status: 'red', label: 'Faltou' },
];

const alerts = [
  { name: 'Roberto Nunes', time: '6 meses', proc: 'Limpeza' },
  { name: 'Carla Dias', time: '4 meses', proc: 'Canal' },
  { name: 'Marcos Reis', time: '9 meses', proc: 'Revisão', urgent: true },
  { name: 'Fernanda Melo', time: '5 meses', proc: 'Aparelho' },
];

const stockAlerts = [
  { name: 'Anestésico Lidocaína', qty: '2 un.', urgent: true },
  { name: 'Resina composta A2', qty: '1 cx.', urgent: true },
  { name: 'Luvas nitrilo M', qty: '8 cx.', urgent: false },
  { name: 'Fio dental profissional', qty: '3 un.', urgent: false },
];

const activity = [
  { text: 'Prontuário de Ana Costa atualizado', time: '09:42' },
  { text: 'Pagamento R$320 confirmado', time: '09:15' },
  { text: 'Novo agendamento — Pedro Alves', time: '08:50' },
  { text: 'Anamnese enviada — Carlos Lima', time: '08:22' },
];

const barData = [28, 34, 22, 41, 38, 45, 38];
const barLabels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

export default function Dashboard({ onNavigate }) {
  const canvasRef = useRef(null);
  const maxBar = Math.max(...barData);

  return (
    <div style={s.main}>
      <PageHeader title="Dashboard" subtitle="Segunda-feira, 23 de março de 2026">
        <Button variant="ghost" onClick={() => onNavigate('agenda')}>Ver agenda</Button>
        <Button onClick={() => onNavigate('prontuario')}>+ Novo paciente</Button>
      </PageHeader>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaType={k.deltaType} barWidth={k.bar} />
        ))}
      </div>

      {/* Middle row */}
      <div style={s.grid2}>
        {/* Chart */}
        <Card>
          <CardTitle>Faturamento semanal</CardTitle>
          <p style={s.cardSub}>Últimas 7 semanas</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {barData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: (v / maxBar) * 110, borderRadius: '4px 4px 0 0', background: i === 6 ? '#1A1A1A' : '#E8E8E8', minHeight: 6 }} title={`R$${v}k`} />
                <span style={{ fontSize: 10, color: '#AAA' }}>{barLabels[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Today's appointments */}
        <Card>
          <CardTitle>Consultas de hoje</CardTitle>
          <p style={s.cardSub}>8 confirmadas · 3 pendentes · 3 livres</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map((a) => (
              <div key={a.time} style={s.apptItem}>
                <span style={s.apptTime}>{a.time}</span>
                <div style={{ ...s.dot, background: a.status === 'green' ? '#27AE60' : a.status === 'yellow' ? '#F39C12' : '#E74C3C' }} />
                <span style={s.apptName}>{a.name}</span>
                <span style={s.apptProc}>{a.proc}</span>
                <Badge color={a.status}>{a.label}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={s.grid3}>
        <Card>
          <CardTitle>Alertas de retorno</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Pacientes a contatar</p>
          {alerts.map((a) => (
            <div key={a.name} style={s.actItem}>
              <div style={{ ...s.actDot, background: a.urgent ? '#E74C3C' : '#F39C12' }} />
              <span style={{ flex: 1, fontSize: 12, color: '#555' }}>{a.name} — {a.time}</span>
              <span style={{ fontSize: 10, color: '#AAA' }}>{a.proc}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardTitle>Estoque crítico</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Abaixo do mínimo</p>
          {stockAlerts.map((item) => (
            <div key={item.name} style={s.actItem}>
              <div style={{ ...s.actDot, background: item.urgent ? '#E74C3C' : '#F39C12' }} />
              <span style={{ flex: 1, fontSize: 12, color: '#555' }}>{item.name}</span>
              <span style={{ fontSize: 10, color: '#AAA' }}>{item.qty}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardTitle>Atividade recente</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Últimas ações no sistema</p>
          {activity.map((a) => (
            <div key={a.text} style={s.actItem}>
              <div style={s.actDot} />
              <span style={{ flex: 1, fontSize: 12, color: '#555' }}>{a.text}</span>
              <span style={{ fontSize: 10, color: '#AAA' }}>{a.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  cardSub: { fontSize: 11, color: '#AAA', fontWeight: 300, marginBottom: 16 },
  apptItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 8, background: '#FAFAFA' },
  apptTime: { fontSize: 12, color: '#888', fontWeight: 500, minWidth: 40 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  apptName: { fontSize: 13, fontWeight: 500, flex: 1 },
  apptProc: { fontSize: 11, color: '#AAA' },
  actItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
  actDot: { width: 6, height: 6, borderRadius: '50%', background: '#A8D5C2', flexShrink: 0 },
};
