'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, KpiCard, PageHeader, Button } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

export default function Relatorios() {
  const [dados, setDados] = useState({
    totalAgendamentos: 0,
    agendamentosHoje: 0,
    confirmados: 0,
    pendentes: 0,
    totalPacientes: 0,
    pacientesAtivos: 0,
    totalOrcamentos: 0,
    orcamentosAprovados: 0,
    receitaTotal: 0,
    despesaTotal: 0,
    totalEstoque: 0,
    itensCriticos: 0,
  });
  const [agendamentosPorDia, setAgendamentosPorDia] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const carregarRelatorio = async () => {
    setCarregando(true);
    try {
      const [
        { data: agendamentos },
        { data: pacientes },
        { data: orcamentos },
        { data: lancamentos },
        { data: estoque },
      ] = await Promise.all([
        supabase.from('agendamentos').select('id, data, status'),
        supabase.from('pacientes').select('id, status'),
        supabase.from('orcamentos').select('id, status, total'),
        supabase.from('lancamentos').select('id, tipo, valor, status'),
        supabase.from('estoque').select('id, quantidade, quantidade_minima'),
      ]);

      const ag = agendamentos || [];
      const pac = pacientes || [];
      const orc = orcamentos || [];
      const lan = lancamentos || [];
      const est = estoque || [];

      // Agendamentos dos últimos 7 dias
      const ultimos7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        return {
          data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          total: ag.filter(a => a.data === ds).length,
        };
      });
      setAgendamentosPorDia(ultimos7);

      setDados({
        totalAgendamentos: ag.length,
        agendamentosHoje: ag.filter(a => a.data === hoje).length,
        confirmados: ag.filter(a => a.status === 'confirmado').length,
        pendentes: ag.filter(a => a.status === 'pendente').length,
        totalPacientes: pac.length,
        pacientesAtivos: pac.filter(p => p.status === 'ativo').length,
        totalOrcamentos: orc.length,
        orcamentosAprovados: orc.filter(o => o.status === 'aprovado').length,
        receitaTotal: lan.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0),
        despesaTotal: lan.filter(l => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0),
        totalEstoque: est.length,
        itensCriticos: est.filter(e => e.quantidade < e.quantidade_minima).length,
      });
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setCarregando(false);
    }
  };

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const maxBar = Math.max(...agendamentosPorDia.map(d => d.total), 1);

  if (carregando) return <div style={s.main}><p style={{ color: '#AAA' }}>Carregando relatório...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="Relatórios" subtitle="Visão geral da clínica">
        <Button variant="ghost" onClick={carregarRelatorio}>↻ Atualizar</Button>
      </PageHeader>

      {/* KPIs Agenda */}
      <div style={s.sectionTitle}>Agenda</div>
      <div style={s.kpiGrid4}>
        <KpiCard label="Total agendamentos" value={dados.totalAgendamentos} delta="cadastrados" deltaType="up" />
        <KpiCard label="Hoje" value={dados.agendamentosHoje} delta="agendamentos hoje" deltaType="up" />
        <KpiCard label="Confirmados" value={dados.confirmados} delta="de todos os agendamentos" deltaType="up" />
        <KpiCard label="Pendentes" value={dados.pendentes} delta="aguardando confirmação" deltaType={dados.pendentes > 0 ? 'down' : 'up'} />
      </div>

      {/* Gráfico agendamentos 7 dias */}
      <Card style={{ marginBottom: 20 }}>
        <CardTitle>Agendamentos — últimos 7 dias</CardTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, marginTop: 16 }}>
          {agendamentosPorDia.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#888' }}>{d.total}</div>
              <div style={{ width: '100%', height: d.total === 0 ? 4 : (d.total / maxBar) * 80, borderRadius: '4px 4px 0 0', background: d.data.includes(new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })) ? '#1A1A1A' : '#A8D5C2', minHeight: 4 }} />
              <span style={{ fontSize: 10, color: '#AAA', textAlign: 'center' }}>{d.data}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* KPIs Pacientes */}
      <div style={s.sectionTitle}>Pacientes</div>
      <div style={s.kpiGrid3}>
        <KpiCard label="Total cadastrados" value={dados.totalPacientes} delta="no sistema" deltaType="up" />
        <KpiCard label="Ativos" value={dados.pacientesAtivos} delta={dados.totalPacientes ? `${((dados.pacientesAtivos / dados.totalPacientes) * 100).toFixed(0)}% do total` : '—'} deltaType="up" />
        <KpiCard label="Inativos" value={dados.totalPacientes - dados.pacientesAtivos} delta="sem consultas recentes" deltaType={dados.totalPacientes - dados.pacientesAtivos > 0 ? 'down' : 'up'} />
      </div>

      <div style={s.grid2}>
        {/* KPIs Orçamentos */}
        <Card>
          <CardTitle>Orçamentos</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div style={s.miniKpi}>
              <div style={s.miniKpiVal}>{dados.totalOrcamentos}</div>
              <div style={s.miniKpiLabel}>Total</div>
            </div>
            <div style={s.miniKpi}>
              <div style={{ ...s.miniKpiVal, color: '#27AE60' }}>{dados.orcamentosAprovados}</div>
              <div style={s.miniKpiLabel}>Aprovados</div>
            </div>
            <div style={s.miniKpi}>
              <div style={s.miniKpiVal}>{dados.totalOrcamentos - dados.orcamentosAprovados}</div>
              <div style={s.miniKpiLabel}>Pendentes/Outros</div>
            </div>
            <div style={s.miniKpi}>
              <div style={{ ...s.miniKpiVal, color: '#27AE60' }}>{dados.totalOrcamentos ? `${((dados.orcamentosAprovados / dados.totalOrcamentos) * 100).toFixed(0)}%` : '—'}</div>
              <div style={s.miniKpiLabel}>Taxa aprovação</div>
            </div>
          </div>
        </Card>

        {/* KPIs Financeiro */}
        <Card>
          <CardTitle>Financeiro</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div style={s.miniKpi}>
              <div style={{ ...s.miniKpiVal, color: '#27AE60', fontSize: 14 }}>{fmt(dados.receitaTotal)}</div>
              <div style={s.miniKpiLabel}>Receita (pago)</div>
            </div>
            <div style={s.miniKpi}>
              <div style={{ ...s.miniKpiVal, color: '#E74C3C', fontSize: 14 }}>{fmt(dados.despesaTotal)}</div>
              <div style={s.miniKpiLabel}>Despesas (pagas)</div>
            </div>
            <div style={{ ...s.miniKpi, gridColumn: '1 / -1' }}>
              <div style={{ ...s.miniKpiVal, fontSize: 16, color: (dados.receitaTotal - dados.despesaTotal) >= 0 ? '#27AE60' : '#E74C3C' }}>
                {fmt(dados.receitaTotal - dados.despesaTotal)}
              </div>
              <div style={s.miniKpiLabel}>Lucro líquido</div>
            </div>
          </div>
        </Card>
      </div>

      {/* KPIs Estoque */}
      <div style={s.sectionTitle}>Estoque</div>
      <div style={s.kpiGrid3}>
        <KpiCard label="Itens cadastrados" value={dados.totalEstoque} delta="no estoque" deltaType="up" />
        <KpiCard label="Itens críticos" value={dados.itensCriticos} delta="abaixo do mínimo" deltaType={dados.itensCriticos > 0 ? 'down' : 'up'} />
        <KpiCard label="Itens OK" value={dados.totalEstoque - dados.itensCriticos} delta="acima do mínimo" deltaType="up" />
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, marginTop: 8 },
  kpiGrid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  kpiGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  miniKpi: { padding: '12px 16px', background: '#F8F8F8', borderRadius: 8 },
  miniKpiVal: { fontSize: 22, fontWeight: 600, color: '#1A1A1A', fontFamily: "'DM Serif Display', serif" },
  miniKpiLabel: { fontSize: 11, color: '#AAA', marginTop: 2 },
};
