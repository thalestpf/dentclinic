'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import {
  Calendar, Users, TrendingUp, DollarSign, Activity,
  Clock, CheckCircle2, AlertCircle, ChevronRight,
  Package, BarChart2,
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [totalHoje, setTotalHoje] = useState(0);
  const [confirmadosHoje, setConfirmadosHoje] = useState(0);
  const [pendentesHoje, setPendentesHoje] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState('');

  const hoje = new Date().toISOString().split('T')[0];
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  // Índice do dia na semana (Seg=0 ... Sex=4), -1 = fim de semana
  const diaDaSemana = new Date().getDay();
  const diaIdx = diaDaSemana >= 1 && diaDaSemana <= 5 ? diaDaSemana - 1 : -1;

  useEffect(() => {
    const nome = localStorage.getItem('dentclinic_name') || 'Usuário';
    setNomeUsuario(nome.split(' ')[0]);

    const carregar = async () => {
      setCarregando(true);
      try {
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
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [hoje]);

  const iniciais = (nome) => {
    if (!nome) return '?';
    const p = nome.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
  };

  const corStatus = (status) => {
    if (status === 'confirmado') return '#27AE60';
    if (status === 'pendente') return '#F39C12';
    return '#AAA';
  };

  const ocupacao = totalHoje > 0 ? Math.min(Math.round((confirmadosHoje / totalHoje) * 100), 100) : 0;

  // Gráfico semanal — placeholder + valor real de hoje
  const dadosSemana = [3, 5, 4, 2, 4].map((v, i) => (i === diaIdx ? totalHoje : v));
  const maxSemana = Math.max(...dadosSemana, 1);
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  const acoesRapidas = [
    { label: 'Nova consulta', icon: Calendar, iconColor: '#6BBF9E', bg: '#F0FAF6', rota: '/agenda' },
    { label: 'Novo paciente', icon: Users, iconColor: '#5B8DEF', bg: '#EEF4FF', rota: '/pacientes' },
    { label: 'Novo orçamento', icon: TrendingUp, iconColor: '#F5A623', bg: '#FFF8EE', rota: '/orcamento' },
    { label: 'Ver estoque', icon: Package, iconColor: '#9B59B6', bg: '#F5EEFF', rota: '/estoque' },
  ];

  return (
    <div style={s.main}>

      {/* ── BANNER BOAS-VINDAS ── */}
      <div style={s.banner}>
        <div style={{ flex: 1 }}>
          <div style={s.bannerSaudacao}>{saudacao}, {nomeUsuario}!</div>
          <div style={s.bannerData}>
            {hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}
          </div>
        </div>

        <div style={s.bannerStats}>
          <div style={s.bannerStat}>
            <span style={s.bannerStatNum}>{carregando ? '—' : totalHoje}</span>
            <span style={s.bannerStatLabel}>Consultas hoje</span>
          </div>
          <div style={s.bannerDivider} />
          <div style={s.bannerStat}>
            <span style={{ ...s.bannerStatNum, color: '#A8D5C2' }}>{carregando ? '—' : confirmadosHoje}</span>
            <span style={s.bannerStatLabel}>Confirmadas</span>
          </div>
          <div style={s.bannerDivider} />
          <div style={s.bannerStat}>
            <span style={{ ...s.bannerStatNum, color: '#F5C842' }}>{carregando ? '—' : pendentesHoje}</span>
            <span style={s.bannerStatLabel}>Pendentes</span>
          </div>
        </div>

        <button style={s.bannerBtn} onClick={() => router.push('/agenda')}>
          Ver agenda <ChevronRight size={14} />
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={s.kpiGrid}>
        {/* Consultas hoje */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Consultas hoje</div>
              <div style={s.kpiValue}>{carregando ? '—' : totalHoje}</div>
              <div style={{ fontSize: 12, color: '#27AE60', marginTop: 2 }}>
                {carregando ? '' : `${confirmadosHoje} confirmadas`}
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#F0FAF6' }}>
              <Calendar size={18} color="#6BBF9E" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${Math.min(totalHoje * 10, 100)}%`, background: '#A8D5C2' }} />
          </div>
        </div>

        {/* Taxa de ocupação */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Taxa de ocupação</div>
              <div style={s.kpiValue}>{carregando ? '—' : `${ocupacao}%`}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {totalHoje > 0 ? 'da capacidade diária' : 'Sem agendamentos'}
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#EEF4FF' }}>
              <Activity size={18} color="#5B8DEF" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${ocupacao}%`, background: '#5B8DEF' }} />
          </div>
        </div>

        {/* Faturamento */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Faturamento mês</div>
              <div style={s.kpiValue}>—</div>
              <div style={{ fontSize: 12, color: '#CCC', marginTop: 2 }}>Módulo financeiro</div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#FFF8EE' }}>
              <DollarSign size={18} color="#F5A623" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: '0%', background: '#F5A623' }} />
          </div>
        </div>

        {/* Inadimplência */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Inadimplência</div>
              <div style={s.kpiValue}>—</div>
              <div style={{ fontSize: 12, color: '#CCC', marginTop: 2 }}>Módulo financeiro</div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#FEF0F0' }}>
              <AlertCircle size={18} color="#E74C3C" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: '0%', background: '#E74C3C' }} />
          </div>
        </div>
      </div>

      {/* ── GRID PRINCIPAL ── */}
      <div style={s.gridPrincipal}>

        {/* CONSULTAS DE HOJE */}
        <div style={s.cardGrande}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.cardTitulo}>Consultas de hoje</div>
              <div style={s.cardSub}>
                {carregando ? 'Carregando...' : `${confirmadosHoje} confirmadas · ${pendentesHoje} pendentes`}
              </div>
            </div>
            <button style={s.linkBtn} onClick={() => router.push('/agenda')}>
              Ver agenda <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {carregando ? (
              [1, 2, 3].map(i => <div key={i} style={s.skeleton} />)
            ) : agendamentosHoje.length === 0 ? (
              <div style={s.emptyState}>
                <Calendar size={36} color="#E0E0E0" />
                <div style={{ fontSize: 14, color: '#CCC', marginTop: 10, fontWeight: 500 }}>
                  Nenhuma consulta hoje
                </div>
                <div style={{ fontSize: 12, color: '#DDD', marginTop: 4 }}>
                  Que tal agendar a primeira?
                </div>
                <button style={s.emptyBtn} onClick={() => router.push('/agenda')}>
                  + Agendar consulta
                </button>
              </div>
            ) : (
              agendamentosHoje.map((a) => {
                const nome = a.paciente_nome || a.paciente || 'Paciente';
                const status = a.status;
                const cor = corStatus(status);
                return (
                  <div key={a.id} style={s.apptItem}>
                    <div style={{ ...s.apptStatusBar, background: cor }} />
                    <div style={{
                      ...s.apptAvatar,
                      background: status === 'confirmado' ? '#F0FAF6' : '#FFF9E6',
                      color: cor,
                    }}>
                      {iniciais(nome)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nome}
                      </div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>
                        {a.procedimento || '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={s.timeBadge}>
                        <Clock size={10} style={{ flexShrink: 0 }} />
                        {a.hora?.slice(0, 5)}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <Badge color={status === 'confirmado' ? 'green' : 'yellow'}>
                          {status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* AÇÕES RÁPIDAS */}
          <div style={s.card}>
            <div style={s.cardTitulo}>Ações rápidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {acoesRapidas.map((acao) => (
                <button key={acao.label} style={s.acaoBtn} onClick={() => router.push(acao.rota)}>
                  <div style={{ ...s.acaoIconBox, background: acao.bg }}>
                    <acao.icon size={16} color={acao.iconColor} />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1.3 }}>
                    {acao.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* GRÁFICO SEMANAL */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={s.cardTitulo}>Semana atual</div>
                <div style={s.cardSub}>Consultas por dia</div>
              </div>
              <BarChart2 size={16} color="#CCC" />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginTop: 16, paddingBottom: 0 }}>
              {diasSemana.map((dia, i) => {
                const ehHoje = i === diaIdx;
                const alturaBar = Math.max((dadosSemana[i] / maxSemana) * 64, 4);
                return (
                  <div
                    key={dia}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: ehHoje ? '#1A1A1A' : '#CCC' }}>
                      {dadosSemana[i]}
                    </div>
                    <div style={{
                      width: '100%',
                      height: alturaBar,
                      background: ehHoje ? '#A8D5C2' : '#EFEFEF',
                      borderRadius: '4px 4px 0 0',
                    }} />
                    <div style={{ fontSize: 9, color: ehHoje ? '#555' : '#CCC', fontWeight: ehHoje ? 700 : 400 }}>
                      {dia}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID INFERIOR ── */}
      <div style={s.gridInferior}>

        {/* Retornos */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.kpiIconBox, background: '#F0FAF6', width: 30, height: 30 }}>
              <CheckCircle2 size={14} color="#6BBF9E" />
            </div>
            <div style={s.cardTitulo}>Alertas de retorno</div>
          </div>
          <div style={s.emptyStateSm}>
            <div style={{ fontSize: 12, color: '#CCC' }}>Nenhum paciente para contatar</div>
          </div>
        </div>

        {/* Estoque crítico */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.kpiIconBox, background: '#FEF0F0', width: 30, height: 30 }}>
              <Package size={14} color="#E74C3C" />
            </div>
            <div style={s.cardTitulo}>Estoque crítico</div>
          </div>
          <div style={s.emptyStateSm}>
            <div style={{ fontSize: 12, color: '#CCC' }}>Todos os itens OK</div>
          </div>
        </div>

        {/* Atividade recente */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.kpiIconBox, background: '#EEF4FF', width: 30, height: 30 }}>
              <Activity size={14} color="#5B8DEF" />
            </div>
            <div style={s.cardTitulo}>Atividade recente</div>
          </div>
          {agendamentosHoje.length === 0 ? (
            <div style={s.emptyStateSm}>
              <div style={{ fontSize: 12, color: '#CCC' }}>Sem atividade hoje</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {agendamentosHoje.slice(0, 5).map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    ...s.actItem,
                    borderBottom: i < Math.min(agendamentosHoje.length, 5) - 1 ? '1px solid #F5F5F5' : 'none',
                  }}
                >
                  <div style={s.actDot} />
                  <span style={{ flex: 1, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.paciente_nome || a.paciente || 'Paciente'}
                  </span>
                  <span style={{ fontSize: 10, color: '#AAA', flexShrink: 0 }}>
                    {a.hora?.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 28, overflowY: 'auto', background: '#F5F6FA', display: 'flex', flexDirection: 'column', gap: 14 },

  /* Banner */
  banner: {
    background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)',
    borderRadius: 16,
    padding: '28px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    flexWrap: 'wrap',
  },
  bannerSaudacao: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff', letterSpacing: '-0.5px' },
  bannerData: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 300 },
  bannerStats: { display: 'flex', alignItems: 'center', gap: 28 },
  bannerStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  bannerStatNum: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff', lineHeight: 1 },
  bannerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px' },
  bannerDivider: { width: 1, height: 36, background: 'rgba(255,255,255,0.1)' },
  bannerBtn: {
    background: '#A8D5C2',
    color: '#1A1A1A',
    border: 'none',
    borderRadius: 10,
    padding: '11px 18px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: "'DM Sans', sans-serif",
    marginLeft: 'auto',
  },

  /* KPI Grid */
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  kpiCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '20px 20px 16px',
    border: '1.5px solid #EFEFEF',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  kpiLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500, marginBottom: 6 },
  kpiValue: { fontFamily: "'DM Serif Display', serif", fontSize: 34, letterSpacing: '-1px', color: '#1A1A1A', lineHeight: 1 },
  kpiIconBox: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiBarBg: { height: 4, background: '#F5F5F5', borderRadius: 2 },
  kpiBar: { height: '100%', borderRadius: 2 },

  /* Grid principal */
  gridPrincipal: { display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 14 },

  /* Cards */
  cardGrande: { background: '#fff', borderRadius: 14, padding: '22px 24px', border: '1.5px solid #EFEFEF' },
  card: { background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1.5px solid #EFEFEF' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  cardTitulo: { fontSize: 13, fontWeight: 600, color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#AAA', fontWeight: 300, marginTop: 3 },

  /* Appointment item */
  apptItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 14px 11px 10px',
    borderRadius: 10,
    background: '#FAFAFA',
    border: '1.5px solid #F0F0F0',
    position: 'relative',
    overflow: 'hidden',
  },
  apptStatusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  apptAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
  },
  timeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#555',
    background: '#F0F0F0',
    borderRadius: 6,
    padding: '4px 8px',
  },

  /* Empty states */
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0 20px' },
  emptyStateSm: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px' },
  emptyBtn: {
    marginTop: 16,
    background: '#EEF4FF',
    color: '#5B8DEF',
    border: '1.5px solid #B5CFF5',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },

  /* Skeleton */
  skeleton: {
    height: 60,
    borderRadius: 10,
    background: 'linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%)',
  },

  /* Link button */
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: '#AAA',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 0,
  },

  /* Ações rápidas */
  acaoBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '14px 8px',
    borderRadius: 12,
    border: '1.5px solid #F0F0F0',
    background: '#FAFAFA',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
  },
  acaoIconBox: { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  /* Grid inferior */
  gridInferior: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },

  /* Atividade */
  actItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0' },
  actDot: { width: 6, height: 6, borderRadius: '50%', background: '#A8D5C2', flexShrink: 0 },
};
