'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KpiCard, Card, CardTitle, PageHeader, Button, Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

export default function Dashboard() {
  const router = useRouter();

  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [totalHoje, setTotalHoje] = useState(0);
  const [confirmadosHoje, setConfirmadosHoje] = useState(0);
  const [pendentesHoje, setPendentesHoje] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        // Buscar agendamentos de hoje
        const { data, error } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('data', hoje)
          .order('hora', { ascending: true });

        if (!error && data) {
          setAgendamentosHoje(data);
          setTotalHoje(data.length);
          setConfirmadosHoje(data.filter(a => a.status === 'confirmado').length);
          setPendentesHoje(data.filter(a => a.status === 'pendente').length);
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [hoje]);

  const kpis = [
    { label: 'Consultas hoje', value: carregando ? '...' : String(totalHoje), delta: `${confirmadosHoje} confirmadas`, deltaType: 'up', bar: Math.min(totalHoje * 7, 100) },
    { label: 'Faturamento mês', value: '—', delta: 'Sem dados financeiros', deltaType: 'neutral', bar: 0 },
    { label: 'Taxa de ocupação', value: '—', delta: 'Sem dados de agenda completa', deltaType: 'neutral', bar: 0 },
    { label: 'Inadimplência', value: '—', delta: 'Sem dados financeiros', deltaType: 'neutral', bar: 0 },
  ];

  const statusLabel = (status) => {
    if (status === 'confirmado') return { label: 'Confirmado', color: 'green' };
    if (status === 'pendente') return { label: 'Pendente', color: 'yellow' };
    return { label: status, color: 'blue' };
  };

  const dotColor = (status) => {
    if (status === 'confirmado') return '#27AE60';
    if (status === 'pendente') return '#F39C12';
    return '#AAA';
  };

  return (
    <div style={s.main}>
      <PageHeader title="Dashboard" subtitle={hojeFormatado}>
        <Button variant="ghost" onClick={() => router.push('/agenda')}>Ver agenda</Button>
        <Button onClick={() => router.push('/pacientes')}>+ Novo paciente</Button>
      </PageHeader>

      <div style={s.kpiGrid}>
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaType={k.deltaType} barWidth={k.bar} />
        ))}
      </div>

      <div style={s.grid2}>
        <Card>
          <CardTitle>Consultas de hoje</CardTitle>
          <p style={s.cardSub}>
            {carregando ? 'Carregando...' : `${confirmadosHoje} confirmadas · ${pendentesHoje} pendentes`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {carregando ? (
              <div style={{ fontSize: 13, color: '#AAA', padding: 16, textAlign: 'center' }}>Carregando agendamentos...</div>
            ) : agendamentosHoje.length === 0 ? (
              <div style={{ fontSize: 13, color: '#AAA', padding: 16, textAlign: 'center' }}>Nenhuma consulta agendada para hoje</div>
            ) : (
              agendamentosHoje.map((a) => {
                const { label, color } = statusLabel(a.status);
                return (
                  <div key={a.id} style={s.apptItem}>
                    <span style={s.apptTime}>{a.hora?.slice(0, 5)}</span>
                    <div style={{ ...s.dot, background: dotColor(a.status) }} />
                    <span style={s.apptName}>{a.paciente_nome}</span>
                    <span style={s.apptProc}>{a.procedimento}</span>
                    <Badge color={color}>{label}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Faturamento semanal</CardTitle>
          <p style={s.cardSub}>Sem dados financeiros integrados</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ fontSize: 13, color: '#CCC' }}>— sem dados —</span>
          </div>
        </Card>
      </div>

      <div style={s.grid3}>
        <Card>
          <CardTitle>Alertas de retorno</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Pacientes a contatar</p>
          <div style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 16 }}>
            Sem dados de retorno configurados
          </div>
        </Card>

        <Card>
          <CardTitle>Estoque crítico</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Abaixo do mínimo</p>
          <div style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 16 }}>
            Sem dados de estoque
          </div>
        </Card>

        <Card>
          <CardTitle>Atividade recente</CardTitle>
          <p style={{ ...s.cardSub, marginBottom: 12 }}>Últimas consultas agendadas hoje</p>
          {agendamentosHoje.length === 0 ? (
            <div style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 16 }}>Sem atividade hoje</div>
          ) : (
            agendamentosHoje.slice(0, 4).map((a) => (
              <div key={a.id} style={s.actItem}>
                <div style={s.actDot} />
                <span style={{ flex: 1, fontSize: 12, color: '#555' }}>
                  Agendamento — {a.paciente_nome}
                </span>
                <span style={{ fontSize: 10, color: '#AAA' }}>{a.hora?.slice(0, 5)}</span>
              </div>
            ))
          )}
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
