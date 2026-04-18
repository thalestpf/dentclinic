'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import {
  Calendar, Users, Activity,
  Clock, CheckCircle2, ChevronRight,
  Package, BarChart2, ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  const [clinicaId, setClinicaId]             = useState(null);
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [totalHoje, setTotalHoje]             = useState(0);
  const [confirmadosHoje, setConfirmadosHoje] = useState(0);
  const [pendentesHoje, setPendentesHoje]     = useState(0);
  const [totalSemana, setTotalSemana]         = useState(0);
  const [dadosSemana, setDadosSemana]         = useState([0,0,0,0,0]);
  const [pacientesAtivos, setPacientesAtivos] = useState(0);
  const [roleUsuario, setRoleUsuario]         = useState('dentista');
  const [kpisAdmin, setKpisAdmin]             = useState({ totalClinicas: 0, clinicasAtivas: 0, dentistasAtivos: 0, totalUsuarios: 0, sessoesWhatsapp: 0 });
  const [clinicasRecentes, setClinicasRecentes] = useState([]);
  const [carregando, setCarregando]           = useState(true);
  const [nomeUsuario, setNomeUsuario]         = useState('');

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
    const id = localStorage.getItem('dentclinic_clinica_id');
    setClinicaId(id || null);
    const nome = localStorage.getItem('dentclinic_name') || 'Usuário';
    setNomeUsuario(nome.split(' ')[0]);
    const role = localStorage.getItem('dentclinic_role') || 'dentista';
    setRoleUsuario(role);
  }, []);

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        if (roleUsuario === 'super_admin') {
          const [resClinicas, resDentistas, resUsuarios, resSessoes] = await Promise.all([
            supabase.from('clinicas').select('id,nome,status,criado_em').order('criado_em', { ascending: false }),
            supabase.from('dentistas').select('id,status'),
            supabase.from('user_roles').select('id,role'),
            supabase.from('sessoes_whatsapp').select('id', { count: 'exact', head: true }),
          ]);

          const dadosClinicas = resClinicas.data || [];
          const dadosDentistas = resDentistas.data || [];
          const dadosUsuarios = resUsuarios.data || [];

          setKpisAdmin({
            totalClinicas: dadosClinicas.length,
            clinicasAtivas: dadosClinicas.filter(c => c.status === 'ativo').length,
            dentistasAtivos: dadosDentistas.filter(d => d.status === 'ativo').length,
            totalUsuarios: dadosUsuarios.filter(u => u.role !== 'super_admin').length,
            sessoesWhatsapp: resSessoes.count || 0,
          });
          setClinicasRecentes(dadosClinicas.slice(0, 6));
          return;
        }
        // ── Agendamentos de hoje ──
        let qHoje = supabase
          .from('agendamentos')
          .select('*')
          .eq('data', hoje)
          .order('hora', { ascending: true });
        if (clinicaId) qHoje = qHoje.eq('clinica_id', clinicaId);

        const { data: dadosHoje } = await qHoje;
        if (dadosHoje) {
          setAgendamentosHoje(dadosHoje);
          setTotalHoje(dadosHoje.length);
          setConfirmadosHoje(dadosHoje.filter(a => a.status === 'confirmado').length);
          setPendentesHoje(dadosHoje.filter(a => a.status === 'pendente').length);
        }

        // ── Semana atual (Seg–Sex) ──
        const hojeDt = new Date();
        const ds = hojeDt.getDay(); // 0=Dom, 1=Seg ... 6=Sáb
        const diffParaSeg = ds === 0 ? -6 : 1 - ds;
        const inicioSemana = new Date(hojeDt);
        inicioSemana.setDate(hojeDt.getDate() + diffParaSeg);
        inicioSemana.setHours(0, 0, 0, 0);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 4);

        const inicioStr = inicioSemana.toISOString().split('T')[0];
        const fimStr    = fimSemana.toISOString().split('T')[0];

        let qSem = supabase
          .from('agendamentos')
          .select('data')
          .gte('data', inicioStr)
          .lte('data', fimStr);
        if (clinicaId) qSem = qSem.eq('clinica_id', clinicaId);

        const { data: dadosSem } = await qSem;
        if (dadosSem) {
          const contagem = [0, 0, 0, 0, 0];
          dadosSem.forEach(a => {
            const d = new Date(a.data + 'T00:00:00');
            const idx = d.getDay() === 0 ? -1 : d.getDay() - 1;
            if (idx >= 0 && idx < 5) contagem[idx]++;
          });
          setDadosSemana(contagem);
          setTotalSemana(dadosSem.length);
        }

        // ── Pacientes ativos ──
        let qPac = supabase
          .from('pacientes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ativo');
        if (clinicaId) qPac = qPac.eq('clinica_id', clinicaId);

        const { count: countPac } = await qPac;
        setPacientesAtivos(countPac || 0);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [hoje, clinicaId, roleUsuario]);

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

  const taxaConfirmacao = totalHoje > 0 ? Math.round((confirmadosHoje / totalHoje) * 100) : 0;
  const maxSemana = Math.max(...dadosSemana, 1);
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  // Próxima consulta de hoje (>= agora)
  const agora = new Date();
  const horaAgora = agora.toTimeString().slice(0, 5);
  const proxima = agendamentosHoje.find(a => (a.hora || '').slice(0, 5) >= horaAgora);

  const acoesRapidas = [
    { label: 'Nova consulta', icon: Calendar,   rota: '/agenda' },
    { label: 'Novo paciente', icon: Users,      rota: '/pacientes' },
    { label: 'Novo orçamento',icon: Activity,   rota: '/orcamento' },
    { label: 'Ver estoque',   icon: Package,    rota: '/estoque' },
  ];

  if (roleUsuario === 'super_admin') {
    const acoesGestao = [
      { label: 'Gerenciar clínicas', icon: BarChart2, rota: '/super-admin/clinicas' },
      { label: 'Gerenciar dentistas', icon: Users, rota: '/super-admin/dentistas' },
      { label: 'Criar usuário', icon: CheckCircle2, rota: '/super-admin/criar-usuario' },
      { label: 'Integrações', icon: Activity, rota: '/super-admin/integracoes' },
    ];

    return (
      <div style={s.main}>
        <style>{`@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`}</style>

        <div style={s.banner}>
          <div style={{ flex: 1 }}>
            <div style={s.bannerSaudacao}>{saudacao}, {nomeUsuario}</div>
            <div style={s.bannerData}>
              Painel gerencial do sistema · {hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}
            </div>
            <div style={s.proximaConsulta}>
              <div style={s.proximaDot} />
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                Visão consolidada de clínicas, usuários, dentistas e WhatsApp
              </span>
            </div>
          </div>

          <button style={s.bannerBtn} onClick={() => router.push('/super-admin/clinicas')}>
            Abrir gestão <ArrowRight size={13} />
          </button>
        </div>

        <div style={s.kpiGrid}>
          <div style={s.kpiCard}>
            <div style={s.kpiLabel}>Clínicas ativas</div>
            <div style={s.kpiValue}>{carregando ? 'â€”' : kpisAdmin.clinicasAtivas}</div>
            <div style={{ fontSize: 12, color: '#888' }}>de {kpisAdmin.totalClinicas} cadastradas</div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiLabel}>Dentistas ativos</div>
            <div style={s.kpiValue}>{carregando ? 'â€”' : kpisAdmin.dentistasAtivos}</div>
            <div style={{ fontSize: 12, color: '#888' }}>rede total</div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiLabel}>Usuários (não admin)</div>
            <div style={s.kpiValue}>{carregando ? 'â€”' : kpisAdmin.totalUsuarios}</div>
            <div style={{ fontSize: 12, color: '#888' }}>dentistas + secretárias</div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiLabel}>Sessões WhatsApp</div>
            <div style={s.kpiValue}>{carregando ? 'â€”' : kpisAdmin.sessoesWhatsapp}</div>
            <div style={{ fontSize: 12, color: '#888' }}>atendimento centralizado</div>
          </div>
        </div>

        <div style={s.gridPrincipal}>
          <div style={s.cardGrande}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cardTitulo}>Últimas clínicas cadastradas</div>
                <div style={s.cardSub}>Acompanhamento do crescimento da base</div>
              </div>
              <button style={s.linkBtn} onClick={() => router.push('/super-admin/clinicas')}>
                Ver todas <ChevronRight size={12} />
              </button>
            </div>

            {carregando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} style={s.skeleton} />)}
              </div>
            ) : clinicasRecentes.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIconWrap}>
                  <BarChart2 size={26} color="#BBB" />
                </div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 14, fontWeight: 500 }}>
                  Nenhuma clínica cadastrada
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clinicasRecentes.map((clinica) => (
                  <div key={clinica.id} style={s.apptItem}>
                    <div style={{ ...s.apptAvatar, background: '#F0F0F0', color: '#555' }}>
                      {(clinica.nome || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {clinica.nome}
                      </div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>
                        {clinica.criado_em ? new Date(clinica.criado_em).toLocaleDateString('pt-BR') : 'Data não informada'}
                      </div>
                    </div>
                    <Badge color={clinica.status === 'ativo' ? 'green' : 'gray'}>
                      {clinica.status === 'ativo' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={s.card}>
              <div style={s.cardTitulo}>Ações de gestão</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                {acoesGestao.map((acao) => (
                  <button key={acao.label} style={s.acaoBtn} onClick={() => router.push(acao.rota)}>
                    <div style={s.acaoIconBox}>
                      <acao.icon size={15} color="#666" />
                    </div>
                    <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1.3 }}>
                      {acao.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitulo}>Resumo administrativo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'#888' }}>Clínicas ativas</span><strong>{kpisAdmin.clinicasAtivas}</strong></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'#888' }}>Dentistas ativos</span><strong>{kpisAdmin.dentistasAtivos}</strong></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'#888' }}>Usuários operacionais</span><strong>{kpisAdmin.totalUsuarios}</strong></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'#888' }}>Sessões WhatsApp</span><strong>{kpisAdmin.sessoesWhatsapp}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.main}>
      {/* Keyframes */}
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* ── BANNER BOAS-VINDAS ── */}
      <div style={s.banner}>
        <div style={{ flex: 1 }}>
          <div style={s.bannerSaudacao}>{saudacao}, {nomeUsuario}</div>
          <div style={s.bannerData}>
            {hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}
          </div>

          {/* Próxima consulta — narrativa */}
          {!carregando && proxima ? (
            <div style={s.proximaConsulta}>
              <div style={s.proximaDot} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Próxima consulta</span>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                {(proxima.hora || '').slice(0, 5)}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {proxima.paciente_nome || proxima.paciente || 'Paciente'}
              </span>
              {proxima.procedimento && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    {proxima.procedimento}
                  </span>
                </>
              )}
            </div>
          ) : !carregando && totalHoje === 0 ? (
            <div style={s.proximaConsulta}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                Sem consultas agendadas para hoje
              </span>
            </div>
          ) : null}
        </div>

        <button style={s.bannerBtn} onClick={() => router.push('/agenda')}>
          Abrir agenda <ArrowRight size={13} />
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
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {carregando ? '' : <>
                  <span style={{color:'#27AE60', fontWeight:500}}>{confirmadosHoje}</span> confirm.
                  <span style={{margin:'0 6px', color:'#DDD'}}>·</span>
                  <span style={{color:'#AAA'}}>{pendentesHoje}</span> pend.
                </>}
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#F0FAF6' }}>
              <Calendar size={18} color="#6BBF9E" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${taxaConfirmacao}%`, background: 'linear-gradient(90deg,#A8D5C2,#6BBF9E)' }} />
          </div>
        </div>

        {/* Taxa de confirmação */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Taxa de confirmação</div>
              <div style={s.kpiValue}>{carregando ? '—' : `${taxaConfirmacao}%`}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {totalHoje > 0 ? 'das consultas de hoje' : 'sem consultas hoje'}
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#EEF4FF' }}>
              <CheckCircle2 size={18} color="#5B8DEF" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${taxaConfirmacao}%`, background: 'linear-gradient(90deg,#B5CFF5,#5B8DEF)' }} />
          </div>
        </div>

        {/* Consultas na semana */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Consultas na semana</div>
              <div style={s.kpiValue}>{carregando ? '—' : totalSemana}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                segunda a sexta
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#F5F5F5' }}>
              <BarChart2 size={18} color="#666" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${Math.min((totalSemana / 40) * 100, 100)}%`, background: 'linear-gradient(90deg,#DDD,#999)' }} />
          </div>
        </div>

        {/* Pacientes ativos */}
        <div style={s.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.kpiLabel}>Pacientes ativos</div>
              <div style={s.kpiValue}>{carregando ? '—' : pacientesAtivos}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                na sua base
              </div>
            </div>
            <div style={{ ...s.kpiIconBox, background: '#F5F5F5' }}>
              <Users size={18} color="#666" />
            </div>
          </div>
          <div style={s.kpiBarBg}>
            <div style={{ ...s.kpiBar, width: `${Math.min((pacientesAtivos / 200) * 100, 100)}%`, background: 'linear-gradient(90deg,#DDD,#999)' }} />
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
                {carregando ? 'Carregando...' : totalHoje === 0
                  ? 'Dia livre'
                  : `${totalHoje} ${totalHoje === 1 ? 'consulta' : 'consultas'}`}
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
                <div style={s.emptyIconWrap}>
                  <Calendar size={26} color="#BBB" />
                </div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 14, fontWeight: 500 }}>
                  Nenhuma consulta hoje
                </div>
                <div style={{ fontSize: 12, color: '#AAA', marginTop: 4 }}>
                  Que tal agendar a primeira?
                </div>
                <button style={s.emptyBtn} onClick={() => router.push('/agenda')}>
                  <Calendar size={13} />
                  Agendar consulta
                </button>
              </div>
            ) : (
              agendamentosHoje.map((a) => {
                const nome = a.paciente_nome || a.paciente || 'Paciente';
                const status = a.status;
                const cor = corStatus(status);
                const ehProxima = proxima && proxima.id === a.id;
                return (
                  <div key={a.id} style={{
                    ...s.apptItem,
                    background: ehProxima ? '#F0FAF6' : '#FAFAFA',
                    borderColor: ehProxima ? '#A8D5C2' : '#F0F0F0',
                  }}>
                    <div style={{ ...s.apptStatusBar, background: cor }} />
                    <div style={{
                      ...s.apptAvatar,
                      background: status === 'confirmado' ? '#F0FAF6' : '#FFF9E6',
                      color: cor,
                    }}>
                      {iniciais(nome)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {nome}
                        {ehProxima && (
                          <span style={s.proxTag}>AGORA</span>
                        )}
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
                  <div style={s.acaoIconBox}>
                    <acao.icon size={15} color="#666" />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1.3 }}>
                    {acao.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* GRÁFICO SEMANAL (dados reais do Supabase) */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={s.cardTitulo}>Semana atual</div>
                <div style={s.cardSub}>Consultas por dia · real</div>
              </div>
              <BarChart2 size={16} color="#CCC" />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginTop: 16 }}>
              {diasSemana.map((dia, i) => {
                const ehHoje = i === diaIdx;
                const valor = dadosSemana[i];
                const alturaBar = Math.max((valor / maxSemana) * 64, valor === 0 ? 2 : 4);
                return (
                  <div
                    key={dia}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    title={`${dia}: ${valor} consulta(s)`}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: ehHoje ? '#1A1A1A' : valor === 0 ? '#DDD' : '#888' }}>
                      {valor}
                    </div>
                    <div style={{
                      width: '100%',
                      height: alturaBar,
                      background: ehHoje ? '#A8D5C2' : valor === 0 ? '#F5F5F5' : '#E8E8E8',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
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

      {/* ── GRID INFERIOR (2 cards placeholder — substancialmente útil) ── */}
      <div style={s.gridInferior}>

        {/* Retornos */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.kpiIconBox, background: '#F5F5F5', width: 30, height: 30 }}>
              <CheckCircle2 size={14} color="#666" />
            </div>
            <div>
              <div style={s.cardTitulo}>Alertas de retorno</div>
              <div style={{ ...s.cardSub, marginTop: 1 }}>Pacientes sem retornar há 6+ meses</div>
            </div>
          </div>
          <div style={s.emptyStateSm}>
            <div style={{ fontSize: 12, color: '#AAA' }}>Nenhum paciente para contatar</div>
          </div>
        </div>

        {/* Estoque */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.kpiIconBox, background: '#F5F5F5', width: 30, height: 30 }}>
              <Package size={14} color="#666" />
            </div>
            <div>
              <div style={s.cardTitulo}>Estoque crítico</div>
              <div style={{ ...s.cardSub, marginTop: 1 }}>Itens com quantidade baixa</div>
            </div>
          </div>
          <div style={s.emptyStateSm}>
            <div style={{ fontSize: 12, color: '#AAA' }}>Todos os itens OK</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 28, overflowY: 'auto', background: '#F8F8F8', display: 'flex', flexDirection: 'column', gap: 14 },

  /* Banner */
  banner: {
    background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)',
    borderRadius: 16,
    padding: '26px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  bannerSaudacao: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff', letterSpacing: '-0.5px' },
  bannerData: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 300, textTransform: 'capitalize' },
  proximaConsulta: {
    marginTop: 14,
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    padding: '8px 12px',
    background: 'rgba(168,213,194,0.1)',
    border: '1.5px solid rgba(168,213,194,0.25)',
    borderRadius: 10,
    width: 'fit-content',
  },
  proximaDot: { width: 6, height: 6, borderRadius: '50%', background: '#A8D5C2', boxShadow: '0 0 0 4px rgba(168,213,194,0.25)' },
  bannerBtn: {
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '10px 16px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'DM Sans', sans-serif",
    marginLeft: 'auto',
    transition: 'background 0.15s',
  },

  /* KPI Grid */
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  kpiCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '20px 20px 16px',
    border: '1.5px solid #EFEFEF',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  kpiLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500, marginBottom: 6 },
  kpiValue: { fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: '-1px', color: '#1A1A1A', lineHeight: 1 },
  kpiIconBox: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiBarBg: { height: 4, background: '#F5F5F5', borderRadius: 2, overflow: 'hidden' },
  kpiBar: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },

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
    padding: '11px 14px 11px 14px',
    borderRadius: 10,
    background: '#FAFAFA',
    border: '1.5px solid #F0F0F0',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background 0.15s',
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
    marginLeft: 4,
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
  proxTag: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
    padding: '2px 6px', borderRadius: 10,
    background: '#A8D5C2', color: '#1A1A1A',
  },

  /* Empty states */
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 24px' },
  emptyIconWrap: { width: 60, height: 60, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyStateSm: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px' },
  emptyBtn: {
    marginTop: 18,
    background: '#1A1A1A',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },

  /* Skeleton com animação */
  skeleton: {
    height: 60,
    borderRadius: 10,
    background: 'linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite linear',
  },

  /* Link button */
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: '#888',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 0,
    fontWeight: 500,
  },

  /* Ações rápidas (neutras, sem poluição de cor) */
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
    transition: 'background 0.15s, border-color 0.15s',
  },
  acaoIconBox: { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F0F0' },

  /* Grid inferior (agora 2 colunas) */
  gridInferior: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 },
};
