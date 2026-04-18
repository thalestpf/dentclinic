'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
  Calendar, Users, FileText, DollarSign, Package, AlertTriangle,
  TrendingUp, TrendingDown, CheckCircle2, Clock, RefreshCw,
  ChevronLeft, ChevronRight, BarChart2
} from 'lucide-react';

const getMesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const nomeMes = (mesStr) => {
  const [ano, mes] = mesStr.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Relatorios() {
  const [mesFiltro, setMesFiltro] = useState(getMesAtual());
  const [dados, setDados] = useState(null);
  const [agendamentosPorDia, setAgendamentosPorDia] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { carregarRelatorio(); }, [mesFiltro]);

  const showFeedback = (msg, tipo = 'erro') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3500);
  };

  const navegarMes = (delta) => {
    const [ano, mes] = mesFiltro.split('-').map(Number);
    const d = new Date(ano, mes - 1 + delta, 1);
    setMesFiltro(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const carregarRelatorio = async () => {
    setCarregando(true);
    const clinicaId = typeof window !== 'undefined' ? localStorage.getItem('dentclinic_clinica_id') : null;

    try {
      // Montar queries com clinica_id
      const addClinica = (q) => clinicaId ? q.eq('clinica_id', clinicaId) : q;

      const [
        { data: agendamentos, error: e1 },
        { data: pacientes, error: e2 },
        { data: lancamentos, error: e3 },
        { data: estoque, error: e4 },
      ] = await Promise.all([
        addClinica(supabase.from('agendamentos').select('id, data, status')),
        addClinica(supabase.from('pacientes').select('id, status, criado_em')),
        addClinica(supabase.from('lancamentos').select('id, tipo, valor, status, data')),
        addClinica(supabase.from('estoque').select('id, quantidade, quantidade_minima')),
      ]);

      if (e1 || e2 || e3 || e4) {
        showFeedback('Erro ao carregar alguns dados do relatório');
      }

      // Orçamentos: tenta Supabase, fallback localStorage
      let orcamentos = [];
      const { data: orcSupabase } = await addClinica(supabase.from('orcamentos').select('id, status, total'));
      if (orcSupabase && orcSupabase.length > 0) {
        orcamentos = orcSupabase;
      } else {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('orcamentos') : null;
          orcamentos = raw ? JSON.parse(raw) : [];
        } catch { orcamentos = []; }
      }

      const ag = agendamentos || [];
      const pac = pacientes || [];
      const lan = lancamentos || [];
      const est = estoque || [];

      // Hoje com timezone correto
      const hojeStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      // Filtrar por mês selecionado
      const agDoMes = ag.filter(a => a.data && a.data.startsWith(mesFiltro));
      const lanDoMes = lan.filter(l => l.data && l.data.startsWith(mesFiltro));
      const pacDoMes = pac.filter(p => p.criado_em && p.criado_em.startsWith(mesFiltro));

      // Gráfico últimos 7 dias (timezone correto)
      const ultimos7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isHoje = ds === hojeStr;
        return {
          data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          dataStr: ds,
          total: ag.filter(a => a.data === ds).length,
          isHoje,
        };
      });
      setAgendamentosPorDia(ultimos7);

      // Estoque: esgotado ou crítico
      const itensCriticos = est.filter(e => e.quantidade <= 0 || e.quantidade < e.quantidade_minima).length;

      setDados({
        // Agenda (mês)
        totalAgendamentosMes: agDoMes.length,
        agendamentosHoje: ag.filter(a => a.data === hojeStr).length,
        confirmadosMes: agDoMes.filter(a => a.status === 'confirmado').length,
        pendentesMes: agDoMes.filter(a => a.status === 'pendente').length,
        // Pacientes
        totalPacientes: pac.length,
        pacientesAtivos: pac.filter(p => p.status === 'ativo').length,
        novosDoMes: pacDoMes.length,
        // Orçamentos
        totalOrcamentos: orcamentos.length,
        orcamentosAprovados: orcamentos.filter(o => o.status === 'aprovado').length,
        // Financeiro (mês)
        receitaMes: lanDoMes.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0),
        despesaMes: lanDoMes.filter(l => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0),
        aReceberMes: lanDoMes.filter(l => l.tipo === 'entrada' && l.status === 'pendente').reduce((s, l) => s + (l.valor || 0), 0),
        // Estoque
        totalEstoque: est.length,
        itensCriticos,
        itensOk: est.filter(e => e.quantidade >= e.quantidade_minima).length,
      });
    } catch (err) {
      showFeedback('Erro inesperado ao carregar relatório');
    } finally {
      setCarregando(false);
    }
  };

  const maxBar = Math.max(...agendamentosPorDia.map(d => d.total), 1);

  return (
    <div style={s.main}>

      {/* Toast */}
      {feedback && (
        <div style={{ ...s.toast, background: feedback.tipo === 'erro' ? '#C0392B' : '#27AE60' }}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Relatórios</h1>
          <p style={s.subtitulo}>Visão geral consolidada da clínica</p>
        </div>
        <button style={{ ...s.btnSecundario, gap: 6 }} onClick={carregarRelatorio} disabled={carregando}>
          <RefreshCw size={14} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Navegador de mês */}
      <div style={s.mesNavWrapper}>
        <button style={s.mesNavBtn} onClick={() => navegarMes(-1)}><ChevronLeft size={16} /></button>
        <span style={s.mesLabel}>{nomeMes(mesFiltro)}</span>
        <button style={s.mesNavBtn} onClick={() => navegarMes(1)}><ChevronRight size={16} /></button>
      </div>

      {carregando ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ height: 16, width: 80, background: '#E8E8E8', borderRadius: 6, marginBottom: 12 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[1,2,3,4].map(j => <div key={j} style={{ height: 100, borderRadius: 14, background: '#F0F0F0' }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : dados && (
        <>
          {/* ── AGENDA ── */}
          <div style={s.sectionHeader}>
            <Calendar size={15} color="#5B8DEF" />
            <span>Agenda</span>
          </div>
          <div style={s.kpiGrid4}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><Calendar size={18} /></div>
              <div style={s.kpiLabel}>Agendamentos</div>
              <div style={s.kpiValor}>{dados.totalAgendamentosMes}</div>
              <div style={s.kpiDelta}>no mês selecionado</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#B5CFF5' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><Clock size={18} /></div>
              <div style={s.kpiLabel}>Hoje</div>
              <div style={s.kpiValor}>{dados.agendamentosHoje}</div>
              <div style={s.kpiDelta}>agendamentos hoje</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.agendamentosHoje > 0 ? '60%' : '0%', background: '#A8D5C2' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><CheckCircle2 size={18} /></div>
              <div style={s.kpiLabel}>Confirmados</div>
              <div style={s.kpiValor}>{dados.confirmadosMes}</div>
              <div style={s.kpiDelta}>{dados.totalAgendamentosMes > 0 ? `${((dados.confirmadosMes / dados.totalAgendamentosMes) * 100).toFixed(0)}% do mês` : '—'}</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.totalAgendamentosMes > 0 ? `${(dados.confirmadosMes / dados.totalAgendamentosMes) * 100}%` : '0%', background: '#A8D5C2' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#FFF8E8', color: '#F39C12' }}><Clock size={18} /></div>
              <div style={s.kpiLabel}>Pendentes</div>
              <div style={{ ...s.kpiValor, color: dados.pendentesMes > 0 ? '#F39C12' : '#1A1A1A' }}>{dados.pendentesMes}</div>
              <div style={s.kpiDelta}>aguardando confirmação</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.totalAgendamentosMes > 0 ? `${(dados.pendentesMes / dados.totalAgendamentosMes) * 100}%` : '0%', background: '#FFE08A' }} /></div>
            </div>
          </div>

          {/* Gráfico 7 dias */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <BarChart2 size={16} color="#888" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Agendamentos — últimos 7 dias</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
              {agendamentosPorDia.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ fontSize: 12, fontWeight: d.total > 0 ? 600 : 400, color: d.isHoje ? '#1A1A1A' : '#888' }}>{d.total}</div>
                  <div style={{ width: '100%', height: d.total === 0 ? 4 : Math.max(6, (d.total / maxBar) * 80), borderRadius: '5px 5px 0 0', background: d.isHoje ? '#1A1A1A' : '#A8D5C2', minHeight: 4, transition: 'height 0.3s ease' }} />
                  <span style={{ fontSize: 10, color: d.isHoje ? '#1A1A1A' : '#AAA', textAlign: 'center', fontWeight: d.isHoje ? 600 : 400 }}>{d.data}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── PACIENTES ── */}
          <div style={s.sectionHeader}>
            <Users size={15} color="#27AE60" />
            <span>Pacientes</span>
          </div>
          <div style={s.kpiGrid3}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><Users size={18} /></div>
              <div style={s.kpiLabel}>Total cadastrados</div>
              <div style={s.kpiValor}>{dados.totalPacientes}</div>
              <div style={s.kpiDelta}>no sistema</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#B5CFF5' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><CheckCircle2 size={18} /></div>
              <div style={s.kpiLabel}>Ativos</div>
              <div style={s.kpiValor}>{dados.pacientesAtivos}</div>
              <div style={s.kpiDelta}>{dados.totalPacientes > 0 ? `${((dados.pacientesAtivos / dados.totalPacientes) * 100).toFixed(0)}% do total` : '—'}</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.totalPacientes > 0 ? `${(dados.pacientesAtivos / dados.totalPacientes) * 100}%` : '0%', background: '#A8D5C2' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><TrendingUp size={18} /></div>
              <div style={s.kpiLabel}>Novos no mês</div>
              <div style={s.kpiValor}>{dados.novosDoMes}</div>
              <div style={s.kpiDelta}>cadastrados no período</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.novosDoMes > 0 ? '50%' : '0%', background: '#B5CFF5' }} /></div>
            </div>
          </div>

          {/* ── ORÇAMENTOS + FINANCEIRO ── */}
          <div style={s.grid2}>
            <div>
              <div style={s.sectionHeader}>
                <FileText size={15} color="#F39C12" />
                <span>Orçamentos</span>
              </div>
              <div style={s.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { val: dados.totalOrcamentos, label: 'Total', color: '#1A1A1A' },
                    { val: dados.orcamentosAprovados, label: 'Aprovados', color: '#27AE60' },
                    { val: dados.totalOrcamentos - dados.orcamentosAprovados, label: 'Pendentes/Outros', color: '#F39C12' },
                    { val: dados.totalOrcamentos > 0 ? `${((dados.orcamentosAprovados / dados.totalOrcamentos) * 100).toFixed(0)}%` : '—', label: 'Taxa aprovação', color: '#27AE60' },
                  ].map(({ val, label, color }) => (
                    <div key={label} style={s.miniKpi}>
                      <div style={{ ...s.miniKpiVal, color }}>{val}</div>
                      <div style={s.miniKpiLabel}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div style={s.sectionHeader}>
                <DollarSign size={15} color="#A8D5C2" />
                <span>Financeiro — {nomeMes(mesFiltro)}</span>
              </div>
              <div style={s.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ ...s.miniKpi, borderLeft: '3px solid #A8D5C2' }}>
                    <div style={{ ...s.miniKpiVal, color: '#27AE60', fontSize: 15 }}>{fmt(dados.receitaMes)}</div>
                    <div style={s.miniKpiLabel}>Receita (pago)</div>
                  </div>
                  <div style={{ ...s.miniKpi, borderLeft: '3px solid #FFCDD2' }}>
                    <div style={{ ...s.miniKpiVal, color: '#E74C3C', fontSize: 15 }}>{fmt(dados.despesaMes)}</div>
                    <div style={s.miniKpiLabel}>Despesas</div>
                  </div>
                  <div style={{ ...s.miniKpi, borderLeft: '3px solid #FFE08A' }}>
                    <div style={{ ...s.miniKpiVal, color: '#F39C12', fontSize: 15 }}>{fmt(dados.aReceberMes)}</div>
                    <div style={s.miniKpiLabel}>A receber</div>
                  </div>
                  <div style={{ ...s.miniKpi, borderLeft: `3px solid ${(dados.receitaMes - dados.despesaMes) >= 0 ? '#A8D5C2' : '#FFCDD2'}` }}>
                    <div style={{ ...s.miniKpiVal, color: (dados.receitaMes - dados.despesaMes) >= 0 ? '#27AE60' : '#E74C3C', fontSize: 15 }}>
                      {fmt(dados.receitaMes - dados.despesaMes)}
                    </div>
                    <div style={s.miniKpiLabel}>Lucro líquido</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ESTOQUE ── */}
          <div style={s.sectionHeader}>
            <Package size={15} color="#888" />
            <span>Estoque</span>
          </div>
          <div style={s.kpiGrid3}>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#EEF4FF', color: '#5B8DEF' }}><Package size={18} /></div>
              <div style={s.kpiLabel}>Itens cadastrados</div>
              <div style={s.kpiValor}>{dados.totalEstoque}</div>
              <div style={s.kpiDelta}>no estoque</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%', background: '#B5CFF5' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#FEECEB', color: '#E74C3C' }}><AlertTriangle size={18} /></div>
              <div style={s.kpiLabel}>Críticos / Esgotados</div>
              <div style={{ ...s.kpiValor, color: dados.itensCriticos > 0 ? '#E74C3C' : '#1A1A1A' }}>{dados.itensCriticos}</div>
              <div style={s.kpiDelta}>abaixo do mínimo</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.totalEstoque > 0 ? `${Math.min(100, (dados.itensCriticos / dados.totalEstoque) * 100)}%` : '0%', background: '#FFCDD2' }} /></div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, background: '#E8F8EF', color: '#27AE60' }}><CheckCircle2 size={18} /></div>
              <div style={s.kpiLabel}>Itens OK</div>
              <div style={s.kpiValor}>{dados.itensOk}</div>
              <div style={s.kpiDelta}>{dados.totalEstoque > 0 ? `${((dados.itensOk / dados.totalEstoque) * 100).toFixed(0)}% do estoque` : '—'}</div>
              <div style={s.progressBar}><div style={{ ...s.progressFill, width: dados.totalEstoque > 0 ? `${(dados.itensOk / dados.totalEstoque) * 100}%` : '0%', background: '#A8D5C2' }} /></div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F5F6FA', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  titulo: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#1A1A1A', margin: 0 },
  subtitulo: { fontSize: 13, color: '#AAA', marginTop: 4 },
  mesNavWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  mesLabel: { fontSize: 14, fontWeight: 600, color: '#555', textTransform: 'capitalize', minWidth: 180, textAlign: 'center' },
  mesNavBtn: { background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#555' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, marginTop: 4 },
  kpiGrid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  kpiGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 },
  kpiCard: { background: '#fff', borderRadius: 14, padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px' },
  kpiValor: { fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1A1A1A', margin: '4px 0 2px' },
  kpiDelta: { fontSize: 11, color: '#AAA' },
  progressBar: { height: 3, background: '#F0F0F0', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  card: { background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 4 },
  miniKpi: { padding: '14px 16px', background: '#F8F8F8', borderRadius: 10 },
  miniKpiVal: { fontSize: 20, fontWeight: 700, color: '#1A1A1A', fontFamily: "'DM Serif Display', serif" },
  miniKpiLabel: { fontSize: 11, color: '#AAA', marginTop: 3 },
  btnSecundario: { display: 'flex', alignItems: 'center', padding: '9px 16px', background: '#fff', color: '#555', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  toast: { position: 'fixed', top: 24, right: 24, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
};
