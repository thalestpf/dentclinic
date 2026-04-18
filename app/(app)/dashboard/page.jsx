'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageCircle,
  Package,
  Users,
} from 'lucide-react';

const EMPTY_ADMIN_KPIS = {
  totalClinicas: 0,
  clinicasAtivas: 0,
  dentistasAtivos: 0,
  totalUsuarios: 0,
  sessoesWhatsapp: 0,
};

export default function Dashboard() {
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [roleUsuario, setRoleUsuario] = useState(null);
  const [nomeUsuario, setNomeUsuario] = useState('Usuario');
  const [clinicaId, setClinicaId] = useState(null);

  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [totalHoje, setTotalHoje] = useState(0);
  const [confirmadosHoje, setConfirmadosHoje] = useState(0);
  const [pendentesHoje, setPendentesHoje] = useState(0);
  const [totalSemana, setTotalSemana] = useState(0);
  const [dadosSemana, setDadosSemana] = useState([0, 0, 0, 0, 0]);
  const [pacientesAtivos, setPacientesAtivos] = useState(0);

  const [kpisAdmin, setKpisAdmin] = useState(EMPTY_ADMIN_KPIS);
  const [clinicasRecentes, setClinicasRecentes] = useState([]);

  const hoje = new Date().toISOString().split('T')[0];
  const horaAgora = new Date().toTimeString().slice(0, 5);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const diaDaSemana = new Date().getDay();
  const diaIdx = diaDaSemana >= 1 && diaDaSemana <= 5 ? diaDaSemana - 1 : -1;

  const taxaConfirmacao = totalHoje > 0 ? Math.round((confirmadosHoje / totalHoje) * 100) : 0;
  const maxSemana = Math.max(...dadosSemana, 1);
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  const proxima = useMemo(
    () => agendamentosHoje.find((a) => (a.hora || '').slice(0, 5) >= horaAgora),
    [agendamentosHoje, horaAgora],
  );

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const roleLocal = localStorage.getItem('dentclinic_role');
        const nomeLocal = localStorage.getItem('dentclinic_name');
        const clinicaLocal = localStorage.getItem('dentclinic_clinica_id');

        if (roleLocal) setRoleUsuario(roleLocal);
        if (nomeLocal) setNomeUsuario(nomeLocal.split(' ')[0] || 'Usuario');
        if (clinicaLocal) setClinicaId(clinicaLocal);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;

        const { data: perfil } = await supabase
          .from('user_roles')
          .select('role, nome, clinica_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfil?.role) setRoleUsuario(perfil.role);
        if (perfil?.nome) setNomeUsuario(perfil.nome.split(' ')[0] || 'Usuario');
        if (perfil?.clinica_id) setClinicaId(perfil.clinica_id);
      } finally {
        setProfileLoading(false);
      }
    };

    carregarPerfil();
  }, []);

  useEffect(() => {
    if (profileLoading || !roleUsuario) return;

    const carregarDados = async () => {
      setDataLoading(true);

      try {
        if (roleUsuario === 'super_admin') {
          setKpisAdmin(EMPTY_ADMIN_KPIS);
          setClinicasRecentes([]);

          const [resClinicas, resDentistas, resUsuarios, resSessoes] = await Promise.all([
            supabase.from('clinicas').select('id,nome,status,criado_em').order('criado_em', { ascending: false }),
            supabase.from('dentistas').select('id,status'),
            supabase.from('user_roles').select('id,role'),
            supabase.from('sessoes_whatsapp').select('id', { count: 'exact', head: true }),
          ]);

          const listaClinicas = resClinicas.data || [];
          const listaDentistas = resDentistas.data || [];
          const listaUsuarios = resUsuarios.data || [];

          setKpisAdmin({
            totalClinicas: listaClinicas.length,
            clinicasAtivas: listaClinicas.filter((c) => c.status === 'ativo').length,
            dentistasAtivos: listaDentistas.filter((d) => d.status === 'ativo').length,
            totalUsuarios: listaUsuarios.filter((u) => u.role !== 'super_admin').length,
            sessoesWhatsapp: resSessoes.count || 0,
          });

          setClinicasRecentes(listaClinicas.slice(0, 6));
          return;
        }

        setAgendamentosHoje([]);
        setTotalHoje(0);
        setConfirmadosHoje(0);
        setPendentesHoje(0);
        setTotalSemana(0);
        setDadosSemana([0, 0, 0, 0, 0]);
        setPacientesAtivos(0);

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
          setConfirmadosHoje(dadosHoje.filter((a) => a.status === 'confirmado').length);
          setPendentesHoje(dadosHoje.filter((a) => a.status === 'pendente').length);
        }

        const hojeDt = new Date();
        const ds = hojeDt.getDay();
        const diffParaSeg = ds === 0 ? -6 : 1 - ds;

        const inicioSemana = new Date(hojeDt);
        inicioSemana.setDate(hojeDt.getDate() + diffParaSeg);
        inicioSemana.setHours(0, 0, 0, 0);

        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 4);

        const inicioStr = inicioSemana.toISOString().split('T')[0];
        const fimStr = fimSemana.toISOString().split('T')[0];

        let qSem = supabase
          .from('agendamentos')
          .select('data')
          .gte('data', inicioStr)
          .lte('data', fimStr);

        if (clinicaId) qSem = qSem.eq('clinica_id', clinicaId);

        const { data: dadosSem } = await qSem;

        if (dadosSem) {
          const contagem = [0, 0, 0, 0, 0];

          dadosSem.forEach((a) => {
            const d = new Date(`${a.data}T00:00:00`);
            const idx = d.getDay() === 0 ? -1 : d.getDay() - 1;
            if (idx >= 0 && idx < 5) contagem[idx] += 1;
          });

          setDadosSemana(contagem);
          setTotalSemana(dadosSem.length);
        }

        let qPac = supabase
          .from('pacientes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ativo');

        if (clinicaId) qPac = qPac.eq('clinica_id', clinicaId);

        const { count: countPac } = await qPac;
        setPacientesAtivos(countPac || 0);
      } finally {
        setDataLoading(false);
      }
    };

    carregarDados();
  }, [profileLoading, roleUsuario, clinicaId, hoje]);

  const iniciais = (nome) => {
    if (!nome) return '?';
    const partes = nome.trim().split(' ');
    return partes.length >= 2 ? `${partes[0][0]}${partes[1][0]}`.toUpperCase() : partes[0][0].toUpperCase();
  };

  const corStatus = (status) => {
    if (status === 'confirmado') return '#27AE60';
    if (status === 'pendente') return '#F39C12';
    return '#AAA';
  };

  const acoesRapidas = [
    { label: 'Nova consulta', icon: Calendar, rota: '/agenda' },
    { label: 'Novo paciente', icon: Users, rota: '/pacientes' },
    { label: 'Novo orcamento', icon: Activity, rota: '/orcamento' },
    { label: 'Ver estoque', icon: Package, rota: '/estoque' },
  ];

  const acoesGestao = [
    { label: 'Gerenciar clinicas', icon: Building2, rota: '/super-admin/clinicas' },
    { label: 'Gerenciar dentistas', icon: Users, rota: '/super-admin/dentistas' },
    { label: 'Criar usuario', icon: CheckCircle2, rota: '/super-admin/criar-usuario' },
    { label: 'Integracoes', icon: Activity, rota: '/super-admin/integracoes' },
  ];

  if (profileLoading || !roleUsuario) {
    return (
      <div style={s.main}>
        <div style={s.kpiGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={s.kpiCard}>
              <div style={s.kpiLabel}>Carregando</div>
              <div style={s.kpiValue}>-</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (roleUsuario === 'super_admin') {
    return (
      <div style={s.main}>
        <div style={s.banner}>
          <div style={{ flex: 1 }}>
            <div style={s.bannerSaudacao}>{saudacao}, {nomeUsuario}</div>
            <div style={s.bannerData}>Painel gerencial do sistema · {hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}</div>
            <div style={s.proximaConsulta}>
              <div style={s.proximaDot} />
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                Visao consolidada de clinicas, usuarios, dentistas e WhatsApp
              </span>
            </div>
          </div>

          <button style={s.bannerBtn} onClick={() => router.push('/super-admin/clinicas')}>
            Abrir gestao <ArrowRight size={13} />
          </button>
        </div>

        <div style={s.kpiGrid}>
          <KpiCard
            label="Clinicas ativas"
            value={dataLoading ? '-' : kpisAdmin.clinicasAtivas}
            hint={`de ${kpisAdmin.totalClinicas} cadastradas`}
            icon={Building2}
            iconBg="#F0FAF6"
            iconColor="#6BBF9E"
          />
          <KpiCard
            label="Dentistas ativos"
            value={dataLoading ? '-' : kpisAdmin.dentistasAtivos}
            hint="rede total"
            icon={Users}
            iconBg="#EEF4FF"
            iconColor="#5B8DEF"
          />
          <KpiCard
            label="Usuarios (nao admin)"
            value={dataLoading ? '-' : kpisAdmin.totalUsuarios}
            hint="dentistas + secretarias"
            icon={CheckCircle2}
            iconBg="#F5F5F5"
            iconColor="#666"
          />
          <KpiCard
            label="Sessoes WhatsApp"
            value={dataLoading ? '-' : kpisAdmin.sessoesWhatsapp}
            hint="atendimento centralizado"
            icon={MessageCircle}
            iconBg="#F5F5F5"
            iconColor="#666"
          />
        </div>

        <div style={s.gridPrincipal}>
          <div style={s.cardGrande}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cardTitulo}>Ultimas clinicas cadastradas</div>
                <div style={s.cardSub}>Acompanhamento do crescimento da base</div>
              </div>
              <button style={s.linkBtn} onClick={() => router.push('/super-admin/clinicas')}>
                Ver todas <ChevronRight size={12} />
              </button>
            </div>

            {dataLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={s.skeleton} />
                ))}
              </div>
            ) : clinicasRecentes.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIconWrap}>
                  <Building2 size={24} color="#BBB" />
                </div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 14, fontWeight: 500 }}>
                  Nenhuma clinica cadastrada
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
                        {clinica.criado_em ? new Date(clinica.criado_em).toLocaleDateString('pt-BR') : 'Data nao informada'}
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
              <div style={s.cardTitulo}>Acoes de gestao</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                {acoesGestao.map((acao) => (
                  <button key={acao.label} style={s.acaoBtn} onClick={() => router.push(acao.rota)}>
                    <div style={s.acaoIconBox}>
                      <acao.icon size={15} color="#666" />
                    </div>
                    <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1.3 }}>{acao.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitulo}>Resumo administrativo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <ResumoLinha label="Clinicas ativas" value={dataLoading ? '-' : kpisAdmin.clinicasAtivas} />
                <ResumoLinha label="Dentistas ativos" value={dataLoading ? '-' : kpisAdmin.dentistasAtivos} />
                <ResumoLinha label="Usuarios operacionais" value={dataLoading ? '-' : kpisAdmin.totalUsuarios} />
                <ResumoLinha label="Sessoes WhatsApp" value={dataLoading ? '-' : kpisAdmin.sessoesWhatsapp} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.main}>
      <div style={s.banner}>
        <div style={{ flex: 1 }}>
          <div style={s.bannerSaudacao}>{saudacao}, {nomeUsuario}</div>
          <div style={s.bannerData}>{hojeFormatado.charAt(0).toUpperCase() + hojeFormatado.slice(1)}</div>

          {!dataLoading && proxima ? (
            <div style={s.proximaConsulta}>
              <div style={s.proximaDot} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Proxima consulta</span>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{(proxima.hora || '').slice(0, 5)}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{proxima.paciente_nome || proxima.paciente || 'Paciente'}</span>
            </div>
          ) : !dataLoading && totalHoje === 0 ? (
            <div style={s.proximaConsulta}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Sem consultas agendadas para hoje</span>
            </div>
          ) : null}
        </div>

        <button style={s.bannerBtn} onClick={() => router.push('/agenda')}>
          Abrir agenda <ArrowRight size={13} />
        </button>
      </div>

      <div style={s.kpiGrid}>
        <KpiCard
          label="Consultas hoje"
          value={dataLoading ? '-' : totalHoje}
          hint={`${confirmadosHoje} confirm. · ${pendentesHoje} pend.`}
          icon={Calendar}
          iconBg="#F0FAF6"
          iconColor="#6BBF9E"
        />
        <KpiCard
          label="Taxa de confirmacao"
          value={dataLoading ? '-' : `${taxaConfirmacao}%`}
          hint={totalHoje > 0 ? 'das consultas de hoje' : 'sem consultas hoje'}
          icon={CheckCircle2}
          iconBg="#EEF4FF"
          iconColor="#5B8DEF"
        />
        <KpiCard
          label="Consultas na semana"
          value={dataLoading ? '-' : totalSemana}
          hint="segunda a sexta"
          icon={BarChart2}
          iconBg="#F5F5F5"
          iconColor="#666"
        />
        <KpiCard
          label="Pacientes ativos"
          value={dataLoading ? '-' : pacientesAtivos}
          hint="na sua base"
          icon={Users}
          iconBg="#F5F5F5"
          iconColor="#666"
        />
      </div>

      <div style={s.gridPrincipal}>
        <div style={s.cardGrande}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.cardTitulo}>Consultas de hoje</div>
              <div style={s.cardSub}>
                {dataLoading ? 'Carregando...' : totalHoje === 0 ? 'Dia livre' : `${totalHoje} consultas`}
              </div>
            </div>
            <button style={s.linkBtn} onClick={() => router.push('/agenda')}>
              Ver agenda <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dataLoading ? (
              [1, 2, 3].map((i) => <div key={i} style={s.skeleton} />)
            ) : agendamentosHoje.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIconWrap}>
                  <Calendar size={24} color="#BBB" />
                </div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 14, fontWeight: 500 }}>Nenhuma consulta hoje</div>
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
                  <div
                    key={a.id}
                    style={{
                      ...s.apptItem,
                      background: ehProxima ? '#F0FAF6' : '#FAFAFA',
                      borderColor: ehProxima ? '#A8D5C2' : '#F0F0F0',
                    }}
                  >
                    <div style={{ ...s.apptStatusBar, background: cor }} />
                    <div style={{ ...s.apptAvatar, background: status === 'confirmado' ? '#F0FAF6' : '#FFF9E6', color: cor }}>
                      {iniciais(nome)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nome}
                      </div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{a.procedimento || '-'}</div>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={s.card}>
            <div style={s.cardTitulo}>Acoes rapidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {acoesRapidas.map((acao) => (
                <button key={acao.label} style={s.acaoBtn} onClick={() => router.push(acao.rota)}>
                  <div style={s.acaoIconBox}>
                    <acao.icon size={15} color="#666" />
                  </div>
                  <span style={{ fontSize: 11, color: '#333', fontWeight: 500, lineHeight: 1.3 }}>{acao.label}</span>
                </button>
              ))}
            </div>
          </div>

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
                  <div key={dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: ehHoje ? '#1A1A1A' : valor === 0 ? '#DDD' : '#888' }}>{valor}</div>
                    <div
                      style={{
                        width: '100%',
                        height: alturaBar,
                        background: ehHoje ? '#A8D5C2' : valor === 0 ? '#F5F5F5' : '#E8E8E8',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.35s ease',
                      }}
                    />
                    <div style={{ fontSize: 9, color: ehHoje ? '#555' : '#CCC', fontWeight: ehHoje ? 700 : 400 }}>{dia}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, iconBg, iconColor }) {
  return (
    <div style={s.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.kpiLabel}>{label}</div>
          <div style={s.kpiValue}>{value}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{hint}</div>
        </div>
        <div style={{ ...s.kpiIconBox, background: iconBg }}>
          <Icon size={18} color={iconColor} />
        </div>
      </div>
      <div style={s.kpiBarBg}>
        <div style={{ ...s.kpiBar, width: '60%', background: 'linear-gradient(90deg,#DDD,#999)' }} />
      </div>
    </div>
  );
}

function ResumoLinha({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const s = {
  main: {
    flex: 1,
    padding: 28,
    overflowY: 'auto',
    background: '#F8F8F8',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
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
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  },
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
  kpiBar: { height: '100%', borderRadius: 2 },
  gridPrincipal: { display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 14 },
  cardGrande: { background: '#fff', borderRadius: 14, padding: '22px 24px', border: '1.5px solid #EFEFEF' },
  card: { background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1.5px solid #EFEFEF' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  cardTitulo: { fontSize: 13, fontWeight: 600, color: '#1A1A1A' },
  cardSub: { fontSize: 11, color: '#AAA', fontWeight: 300, marginTop: 3 },
  apptItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 14px',
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
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 24px' },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#F5F5F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  skeleton: {
    height: 60,
    borderRadius: 10,
    background: 'linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%)',
    backgroundSize: '200% 100%',
  },
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
  acaoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F0F0F0',
  },
};
