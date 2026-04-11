'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, PageHeader, Button } from '../../../components/UI';
import { useAgendamento } from '@/app/hooks/useAgendamento';
import { supabase } from '@/lib/supabase-client';

// Paleta de cores por dentista (índice)
const DENTIST_PALETTE = [
  { bg: '#D4EDDA', text: '#155724', border: '#C3E6CB' },
  { bg: '#D1ECF1', text: '#0C5460', border: '#BEE5EB' },
  { bg: '#E2D9F3', text: '#432874', border: '#D4BFEE' },
  { bg: '#FFF3CD', text: '#856404', border: '#FFE69C' },
  { bg: '#F8D7DA', text: '#721C24', border: '#F5C6CB' },
  { bg: '#D4E6FF', text: '#0A4FA8', border: '#B8D4FF' },
  { bg: '#FFE5CC', text: '#8B4000', border: '#FFD0A0' },
  { bg: '#E8F4E8', text: '#1B6B1B', border: '#C8E6C8' },
];

const DAY_NAMES     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAY_NAMES_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MONTH_NAMES   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const HORA_INICIO   = 7;   // 07:00
const HORA_FIM      = 20;  // 20:00
const PX_POR_MIN    = 1.2; // 60 min * 1.2 = 72px por hora

const procedures = ['Limpeza Profissional','Tratamento de Canal','Restauração','Implante','Clareamento','Ortodontia','Extração','Revisão','Emergência','Consulta'];
const statuses   = ['confirmado','pendente'];

function toISO(date) { return date.toISOString().split('T')[0]; }

function getMondayOfWeek(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function horaParaMin(h) { const [hh,mm] = h.split(':').map(Number); return hh*60+mm; }
function minParaHora(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function topPx(hora)   { return (horaParaMin(hora) - HORA_INICIO*60) * PX_POR_MIN; }
const TOTAL_HEIGHT = (HORA_FIM - HORA_INICIO) * 60 * PX_POR_MIN;
const HOURS_LABELS = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => minParaHora((HORA_INICIO + i)*60));

// Calcula posições lado a lado para agendamentos que se sobrepõem no mesmo "slot" (coluna)
function calcularOverlap(appts) {
  if (!appts.length) return appts;
  const sorted = [...appts].sort((a,b) => horaParaMin(a.hora) - horaParaMin(b.hora));
  const resultado = sorted.map(a => ({ ...a, col: 0, totalCols: 1 }));

  for (let i = 0; i < resultado.length; i++) {
    const fimI = horaParaMin(resultado[i].hora) + 60;
    const grupo = [resultado[i]];
    for (let j = i+1; j < resultado.length; j++) {
      if (horaParaMin(resultado[j].hora) < fimI) grupo.push(resultado[j]);
    }
    if (grupo.length > 1) {
      grupo.forEach((a, idx) => { a.col = idx; a.totalCols = grupo.length; });
    }
  }
  return resultado;
}

export default function Agenda() {
  const hoje = toISO(new Date());

  // ── State principal
  const [semanaAtual, setSemanaAtual]     = useState(() => getMondayOfWeek(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [view, setView]                   = useState('Semana');
  const [agendamentosRaw, setAgendamentosRaw] = useState([]);
  const [clinicaId, setClinicaId]         = useState(null);

  // Dentistas da clínica
  const [dentistasClinica, setDentistasClinica] = useState([]);
  const [dentistasFiltro, setDentistasFiltro]   = useState(new Set()); // vazio = todos

  // Mini calendário
  const [miniMes, setMiniMes] = useState(() => { const h=new Date(); return { year: h.getFullYear(), month: h.getMonth() }; });
  const [pacientesCadastrados, setPacientesCadastrados] = useState([]);
  const [sugestoesPaciente, setSugestoesPaciente]       = useState([]);

  // Modal agendamento
  const [novoModal, setNovoModal]         = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [selected, setSelected]           = useState(null);
  const [feedback, setFeedback]           = useState(null); // {msg, tipo}
  const [formData, setFormData]           = useState({
    paciente:'', cpf:'', email:'', telefone:'',
    data: hoje, hora:'08:00', procedimento:'Limpeza Profissional',
    dentista:'', observacoes:'', status:'confirmado',
  });

  // Modal bloqueio
  const [modalBloqueio, setModalBloqueio]         = useState(false);
  const [bloqueios, setBloqueios]                 = useState({ diasSemana:[], datas:[], horarios:[] });
  const [novaDataBloqueio, setNovaDataBloqueio]   = useState('');
  const [novoHorarioBloqueio, setNovoHorarioBloqueio] = useState({ data:'', inicio:'11:00', fim:'14:00', motivo:'' });

  const { criarAgendamento, atualizarAgendamento, deletarAgendamento, obterAgendamentos, carregando } = useAgendamento();

  const showFeedback = (msg, tipo='sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ── Carregar clínica, dentistas e agendamentos
  useEffect(() => {
    const init = async () => {
      // Clinica via API (não usa Supabase Auth)
      try {
        const res = await fetch('/api/clinica');
        const cls = await res.json();
        if (cls?.[0]?.id) setClinicaId(cls[0].id);
      } catch {}

      // Agendamentos
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);

      // Pacientes para autocomplete
      supabase.from('pacientes').select('id,nome,cpf,email,telefone').order('nome')
        .then(({ data }) => { if (data) setPacientesCadastrados(data); });

      // Bloqueios serão carregados depois que clinicaId estiver disponível
    };
    init();
  }, [obterAgendamentos]);

  useEffect(() => {
    if (!clinicaId) return;
    supabase.from('dentistas')
      .select('id,nome,especialidade')
      .eq('clinica_id', clinicaId)
      .eq('status','ativo')
      .order('nome')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDentistasClinica(data);
        } else {
          // Fallback: dentistas únicos nos agendamentos
          const nomes = [...new Set(agendamentosRaw.map(a => a.dentistaNome).filter(Boolean))];
          setDentistasClinica(nomes.map((nome, i) => ({ id: String(i), nome })));
        }
      });
  }, [clinicaId, agendamentosRaw]);

  // ── Carregar bloqueios do Supabase
  const carregarBloqueios = useCallback(async () => {
    if (!clinicaId) return;
    try {
      const res = await fetch(`/api/bloqueios?clinica_id=${clinicaId}`);
      const dados = await res.json();
      if (!dados.error) setBloqueios(dados);
    } catch (err) {
      console.error('Erro ao carregar bloqueios:', err);
    }
  }, [clinicaId]);

  useEffect(() => { carregarBloqueios(); }, [carregarBloqueios]);

  // ── Helpers de bloqueio (Supabase)
  const isDiaBloqueado  = (ds) => { if (!ds) return false; const d = new Date(ds+'T00:00:00').getDay(); return bloqueios.diasSemana.includes(d) || bloqueios.datas.includes(ds); };
  const isHorarioBloqueado = (data, hora) => {
    const min = horaParaMin(hora);
    return (bloqueios.horarios||[]).some(b => b.data===data && horaParaMin(b.inicio)<=min && min<horaParaMin(b.fim));
  };

  const toggleDiaSemana = async (d) => {
    if (!clinicaId) return;
    const jaBloqueado = bloqueios.diasSemana.includes(d);
    if (jaBloqueado) {
      await fetch('/api/bloqueios', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'dia_semana', dia_semana: d }) });
    } else {
      await fetch('/api/bloqueios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'dia_semana', dia_semana: d }) });
    }
    carregarBloqueios();
  };

  const adicionarDataBloqueio = async () => {
    if (!clinicaId || !novaDataBloqueio || bloqueios.datas.includes(novaDataBloqueio)) return;
    await fetch('/api/bloqueios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'data', data: novaDataBloqueio }) });
    setNovaDataBloqueio('');
    carregarBloqueios();
  };

  const removerDataBloqueio = async (data) => {
    if (!clinicaId) return;
    await fetch('/api/bloqueios', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'data', data }) });
    carregarBloqueios();
  };

  const adicionarHorarioBloqueio = async () => {
    if (!clinicaId) return;
    const {data,inicio,fim,motivo}=novoHorarioBloqueio;
    if(!data||!inicio||!fim||horaParaMin(inicio)>=horaParaMin(fim)) return;
    await fetch('/api/bloqueios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'horario', data, hora_inicio: inicio, hora_fim: fim, motivo }) });
    setNovoHorarioBloqueio(p=>({...p,data:'',motivo:''}));
    carregarBloqueios();
  };

  const removerHorarioBloqueio = async (idx) => {
    if (!clinicaId) return;
    const bloqueio = bloqueios.horarios[idx];
    if (!bloqueio?.id) return;
    await fetch('/api/bloqueios', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, id: bloqueio.id }) });
    carregarBloqueios();
  };

  // ── Cor do dentista
  const corDentista = useCallback((nome) => {
    const idx = dentistasClinica.findIndex(d => d.nome === nome);
    return DENTIST_PALETTE[idx >= 0 ? idx % DENTIST_PALETTE.length : 0];
  }, [dentistasClinica]);

  // ── Agendamentos do dia selecionado
  const agendamentosDoDia = (dataISO, dentistaNome = null) => {
    return agendamentosRaw.filter(a =>
      a.data === dataISO &&
      (!dentistaNome || a.dentistaNome === dentistaNome) &&
      (dentistasFiltro.size === 0 || dentistasFiltro.has(a.dentistaNome))
    );
  };

  // ── Mini calendário
  const miniYear = miniMes.year; const miniMonth = miniMes.month;
  const miniFirstDay = new Date(miniYear, miniMonth, 1).getDay();
  const miniDaysInMonth = new Date(miniYear, miniMonth+1, 0).getDate();
  const appointmentDates = new Set(agendamentosRaw.map(a => a.data));
  const miniCells = [];
  for (let i=0;i<miniFirstDay;i++) miniCells.push({empty:true});
  for (let d=1;d<=miniDaysInMonth;d++) {
    const ds=`${miniYear}-${String(miniMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    miniCells.push({d:String(d),today:ds===hoje,dot:appointmentDates.has(ds),ds});
  }
  const irMesAnterior = () => setMiniMes(p => p.month===0?{year:p.year-1,month:11}:{...p,month:p.month-1});
  const irProximoMes  = () => setMiniMes(p => p.month===11?{year:p.year+1,month:0}:{...p,month:p.month+1});
  const clicarDiaMini = (ds) => {
    setDiaSelecionado(ds);
    if (view === 'Semana') setSemanaAtual(getMondayOfWeek(new Date(ds+'T00:00:00')));
    else setView('Dia');
  };

  // ── Semana: dias Seg-Sab
  const days = Array.from({length:6},(_,i)=>{
    const d=new Date(semanaAtual); d.setDate(semanaAtual.getDate()+i);
    return { name:DAY_NAMES[d.getDay()], num:String(d.getDate()).padStart(2,'0'), date:toISO(d), today:toISO(d)===hoje };
  });
  const semanaFim = new Date(semanaAtual); semanaFim.setDate(semanaAtual.getDate()+5);
  const weekLabel = `${semanaAtual.getDate()} – ${semanaFim.getDate()} de ${MONTH_NAMES[semanaFim.getMonth()]}, ${semanaFim.getFullYear()}`;

  // ── Handlers do formulário
  const handleNovoClick = (dataPreench = null, horaPreench = null, dentista = '') => {
    setEditingId(null);
    setFormData({
      paciente:'', cpf:'', email:'', telefone:'',
      data: dataPreench || (view==='Dia' ? diaSelecionado : hoje),
      hora: horaPreench || '08:00',
      procedimento:'Limpeza Profissional',
      dentista: dentista || (dentistasClinica[0]?.nome || ''),
      observacoes:'', status:'confirmado',
    });
    setNovoModal(true);
  };

  const handlePacienteDigitado = (v) => {
    setFormData(p=>({...p,paciente:v}));
    if(v.length>=2) setSugestoesPaciente(pacientesCadastrados.filter(p=>p.nome.toLowerCase().includes(v.toLowerCase())).slice(0,5));
    else setSugestoesPaciente([]);
  };

  const handleSaveAgendamento = async () => {
    if (!formData.paciente.trim()||!formData.data||!formData.hora) {
      showFeedback('Preencha paciente, data e hora','erro'); return;
    }
    if (isDiaBloqueado(formData.data)) { showFeedback('Data bloqueada na agenda','erro'); return; }
    if (isHorarioBloqueado(formData.data,formData.hora)) { showFeedback('Horário bloqueado','erro'); return; }

    const dados = {
      id: editingId,
      pacienteNome: formData.paciente,
      pacienteEmail: formData.email||null,
      pacienteTelefone: formData.telefone||null,
      pacienteCpf: formData.cpf||null,
      data: formData.data, hora: formData.hora,
      procedimento: formData.procedimento,
      dentistaNome: formData.dentista,
      observacoes: formData.observacoes,
      status: formData.status,
      color: 'green',
    };

    const resultado = editingId ? await atualizarAgendamento(editingId, dados) : await criarAgendamento(dados);

    if (resultado.sucesso) {
      showFeedback(resultado.mensagem);
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);
      setTimeout(()=>{ setNovoModal(false); setSelected(null); setEditingId(null); },1200);
    } else {
      showFeedback(resultado.mensagem,'erro');
    }
  };

  const handleEditAgendamento = (a) => {
    setEditingId(a.id);
    setFormData({
      paciente: a.pacienteNome, cpf: a.pacienteCpf||'',
      email: a.pacienteEmail||'', telefone: a.pacienteTelefone||'',
      data: a.data, hora: a.hora, procedimento: a.procedimento,
      dentista: a.dentistaNome||'', observacoes: a.observacoes||'', status: a.status||'confirmado',
    });
    setSelected(null);
    setNovoModal(true);
  };

  const handleDeleteAgendamento = async (id) => {
    if (!confirm('Cancelar este agendamento?')) return;
    const resultado = await deletarAgendamento(id);
    if (resultado.sucesso) {
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);
      setSelected(null);
      showFeedback('Agendamento cancelado');
    } else {
      showFeedback('Erro ao cancelar','erro');
    }
  };

  // ── Vista semanal — corpo do calendário
  const renderWeekView = () => {
    const dentistasVisiveis = dentistasClinica.filter(d => dentistasFiltro.size===0 || dentistasFiltro.has(d.nome));

    return (
      <div style={s.calWrap}>
        {/* Header dias */}
        <div style={{ display:'grid', gridTemplateColumns:`64px repeat(6, 1fr)`, borderBottom:'1.5px solid #EFEFEF', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ padding:16, borderRight:'1px solid #F0F0F0' }} />
          {days.map(d => (
            <div key={d.date}
              style={{ padding:'14px 8px', textAlign:'center', borderRight:'1px solid #F0F0F0', background: isDiaBloqueado(d.date)?'#FFF8F8':'transparent', cursor:'pointer' }}
              onClick={() => { setDiaSelecionado(d.date); setView('Dia'); }}
            >
              <div style={{ fontSize:11, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.8px' }}>{d.name}</div>
              <div style={{ fontSize:20, fontFamily:"'DM Serif Display',serif", lineHeight:1.2, marginTop:2, ...(d.today ? { background:'#A8D5C2', width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto 0', fontSize:16 } : {}) }}>{d.num}</div>
              {isDiaBloqueado(d.date) && <div style={{ fontSize:9, color:'#E74C3C', fontWeight:600, marginTop:2 }}>FECHADO</div>}
            </div>
          ))}
        </div>

        {/* Corpo */}
        <div style={{ display:'flex', overflowY:'auto', maxHeight:520 }}>
          {/* Coluna horas */}
          <div style={{ width:64, flexShrink:0, borderRight:'1px solid #F0F0F0', position:'relative', height:TOTAL_HEIGHT }}>
            {HOURS_LABELS.map((h,i) => (
              <div key={h} style={{ position:'absolute', top: i*(60*PX_POR_MIN)-8, right:8, fontSize:10, color:'#CCC', lineHeight:1, whiteSpace:'nowrap' }}>{h}</div>
            ))}
          </div>

          {/* Colunas dias */}
          {days.map((d, di) => {
            const apptsDia = agendamentosRaw.filter(a =>
              a.data === d.date &&
              (dentistasFiltro.size===0 || dentistasFiltro.has(a.dentistaNome))
            );
            const apptsPosicionados = calcularOverlap(apptsDia);
            const bloqDia = (bloqueios.horarios||[]).filter(b => b.data===d.date);

            return (
              <div key={d.date} style={{ flex:1, position:'relative', borderRight:'1px solid #F0F0F0', height:TOTAL_HEIGHT, minWidth:0 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget || e.target.classList.contains('hour-line')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minClicado = Math.round(y / PX_POR_MIN / 30) * 30 + HORA_INICIO*60;
                    handleNovoClick(d.date, minParaHora(minClicado));
                  }
                }}
              >
                {/* Linhas de hora */}
                {HOURS_LABELS.map((h,i) => (
                  <div key={h} className="hour-line" style={{ position:'absolute', top: i*(60*PX_POR_MIN), left:0, right:0, borderBottom:'1px solid #F8F8F8', height:60*PX_POR_MIN, pointerEvents:'none' }} />
                ))}

                {/* Overlay fechado */}
                {isDiaBloqueado(d.date) && (
                  <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(231,76,60,0.05) 8px,rgba(231,76,60,0.05) 16px)', zIndex:1, pointerEvents:'none' }} />
                )}

                {/* Bloqueios de horário */}
                {bloqDia.map((b,bi) => {
                  const t = (horaParaMin(b.inicio)-HORA_INICIO*60)*PX_POR_MIN;
                  const h = (horaParaMin(b.fim)-horaParaMin(b.inicio))*PX_POR_MIN;
                  return (
                    <div key={bi} style={{ position:'absolute', left:2, right:2, top:t, height:h, background:'repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 4px,#FFEBEE 4px,#FFEBEE 8px)', border:'1px solid #FFCDD2', borderRadius:4, zIndex:2, overflow:'hidden', padding:'3px 5px', pointerEvents:'none' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#C0392B' }}>Bloqueado {b.inicio}–{b.fim}</div>
                      {b.motivo && <div style={{ fontSize:9, color:'#888' }}>{b.motivo}</div>}
                    </div>
                  );
                })}

                {/* Agendamentos */}
                {apptsPosicionados.map(a => {
                  const cor = corDentista(a.dentistaNome);
                  const t = topPx(a.hora);
                  const largura = `calc(${100/a.totalCols}% - 4px)`;
                  const esquerda = `calc(${(a.col/a.totalCols)*100}% + 2px)`;
                  return (
                    <div key={a.id}
                      style={{ position:'absolute', top:t, left:esquerda, width:largura, height: 60*PX_POR_MIN - 3, background:cor.bg, color:cor.text, border:`1.5px solid ${cor.border}`, borderRadius:6, padding:'5px 7px', cursor:'pointer', overflow:'hidden', zIndex:3, boxSizing:'border-box' }}
                      onClick={e => { e.stopPropagation(); setSelected(a); }}
                    >
                      <div style={{ fontSize:11, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.pacienteNome}</div>
                      <div style={{ fontSize:10, opacity:0.8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.hora} · {a.dentistaNome}</div>
                      <div style={{ fontSize:9, opacity:0.7, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.procedimento}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Vista dia — colunas por dentista
  const renderDayView = () => {
    const diaObj = new Date(diaSelecionado+'T00:00:00');
    const diaLabel = `${DAY_NAMES_FULL[diaObj.getDay()]}, ${diaObj.getDate()} de ${MONTH_NAMES[diaObj.getMonth()]}`;
    const bloqDia = (bloqueios.horarios||[]).filter(b => b.data===diaSelecionado);

    // Dentistas com agendamentos hoje + todos os dentistas da clínica visíveis
    const dentistasVisiveis = dentistasClinica.length > 0
      ? dentistasClinica.filter(d => dentistasFiltro.size===0 || dentistasFiltro.has(d.nome))
      : [];

    // Se não há dentistas cadastrados ainda, montar a partir dos agendamentos do dia
    const dentistasParaExibir = dentistasVisiveis.length > 0
      ? dentistasVisiveis
      : [...new Set(agendamentosRaw.filter(a=>a.data===diaSelecionado).map(a=>a.dentistaNome).filter(Boolean))].map((nome,i)=>({id:String(i),nome}));

    return (
      <div style={s.calWrap}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:`64px repeat(${dentistasParaExibir.length||1}, 1fr)`, borderBottom:'1.5px solid #EFEFEF', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ padding:14, borderRight:'1px solid #F0F0F0', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:10, color:'#AAA', textTransform:'uppercase' }}>Hora</span>
          </div>
          {dentistasParaExibir.length > 0 ? dentistasParaExibir.map((d,i) => {
            const cor = DENTIST_PALETTE[i % DENTIST_PALETTE.length];
            const agDentista = agendamentosRaw.filter(a=>a.data===diaSelecionado&&a.dentistaNome===d.nome);
            return (
              <div key={d.id} style={{ padding:'12px 8px', textAlign:'center', borderRight:'1px solid #F0F0F0', background:`${cor.bg}44` }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:cor.bg, border:`2px solid ${cor.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', fontSize:13, fontWeight:700, color:cor.text }}>
                  {d.nome.charAt(d.nome.lastIndexOf(' ')+1)||d.nome.charAt(0)}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.nome}</div>
                <div style={{ fontSize:10, color:'#AAA', marginTop:2 }}>{agDentista.length} {agDentista.length===1?'consulta':'consultas'}</div>
                <button
                  style={{ marginTop:6, padding:'3px 10px', fontSize:10, background:cor.bg, color:cor.text, border:`1px solid ${cor.border}`, borderRadius:12, cursor:'pointer', fontWeight:500 }}
                  onClick={() => handleNovoClick(diaSelecionado,'08:00',d.nome)}
                >
                  + Agendar
                </button>
              </div>
            );
          }) : (
            <div style={{ padding:20, textAlign:'center', color:'#AAA', fontSize:12 }}>Cadastre dentistas em Super Admin</div>
          )}
        </div>

        {/* Corpo */}
        <div style={{ display:'flex', overflowY:'auto', maxHeight:560 }}>
          {/* Horas */}
          <div style={{ width:64, flexShrink:0, borderRight:'1px solid #F0F0F0', position:'relative', height:TOTAL_HEIGHT }}>
            {HOURS_LABELS.map((h,i) => (
              <div key={h} style={{ position:'absolute', top: i*(60*PX_POR_MIN)-8, right:8, fontSize:10, color:'#CCC', lineHeight:1, whiteSpace:'nowrap' }}>{h}</div>
            ))}
          </div>

          {/* Colunas por dentista */}
          {dentistasParaExibir.map((dentista, di) => {
            const cor = DENTIST_PALETTE[di % DENTIST_PALETTE.length];
            const apptsD = agendamentosRaw.filter(a => a.data===diaSelecionado && a.dentistaNome===dentista.nome);

            return (
              <div key={dentista.id} style={{ flex:1, position:'relative', borderRight:'1px solid #F0F0F0', height:TOTAL_HEIGHT, minWidth:100, background: isDiaBloqueado(diaSelecionado)?'repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(231,76,60,0.03) 8px,rgba(231,76,60,0.03) 16px)':'transparent' }}
                onClick={(e) => {
                  if (e.target === e.currentTarget || e.target.classList.contains('hour-line-day')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minClicado = Math.round(y / PX_POR_MIN / 30) * 30 + HORA_INICIO*60;
                    handleNovoClick(diaSelecionado, minParaHora(minClicado), dentista.nome);
                  }
                }}
              >
                {HOURS_LABELS.map((h,i) => (
                  <div key={h} className="hour-line-day" style={{ position:'absolute', top: i*(60*PX_POR_MIN), left:0, right:0, borderBottom:'1px solid #F8F8F8', height:60*PX_POR_MIN, pointerEvents:'none' }} />
                ))}

                {/* Bloqueios de horário */}
                {bloqDia.map((b,bi) => {
                  const t=(horaParaMin(b.inicio)-HORA_INICIO*60)*PX_POR_MIN;
                  const h=(horaParaMin(b.fim)-horaParaMin(b.inicio))*PX_POR_MIN;
                  return (
                    <div key={bi} style={{ position:'absolute', left:2, right:2, top:t, height:h, background:'repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 4px,#FFEBEE 4px,#FFEBEE 8px)', border:'1px solid #FFCDD2', borderRadius:4, zIndex:2, padding:'3px 5px', pointerEvents:'none' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#C0392B' }}>Bloqueado</div>
                    </div>
                  );
                })}

                {/* Agendamentos */}
                {apptsD.map(a => {
                  const t = topPx(a.hora);
                  return (
                    <div key={a.id}
                      style={{ position:'absolute', left:3, right:3, top:t, height:60*PX_POR_MIN-4, background:cor.bg, color:cor.text, border:`1.5px solid ${cor.border}`, borderRadius:8, padding:'7px 9px', cursor:'pointer', overflow:'hidden', zIndex:3, boxSizing:'border-box' }}
                      onClick={e => { e.stopPropagation(); setSelected(a); }}
                    >
                      <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.pacienteNome}</div>
                      <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>{a.hora}</div>
                      <div style={{ fontSize:10, opacity:0.7, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>{a.procedimento}</div>
                      <div style={{ position:'absolute', bottom:5, right:7 }}>
                        <span style={{ fontSize:9, padding:'2px 6px', background:'rgba(255,255,255,0.6)', borderRadius:8, fontWeight:600 }}>{a.status}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Linha do horário atual (só hoje) */}
                {diaSelecionado === hoje && (() => {
                  const agora = new Date();
                  const minAtual = agora.getHours()*60 + agora.getMinutes();
                  const t = (minAtual - HORA_INICIO*60)*PX_POR_MIN;
                  if (t<0||t>TOTAL_HEIGHT) return null;
                  return <div style={{ position:'absolute', left:0, right:0, top:t, height:2, background:'#E74C3C', zIndex:4, pointerEvents:'none' }}>
                    <div style={{ position:'absolute', left:-4, top:-4, width:10, height:10, borderRadius:'50%', background:'#E74C3C' }} />
                  </div>;
                })()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Label da vista dia
  const diaObj       = new Date(diaSelecionado+'T00:00:00');
  const diaLabel     = `${DAY_NAMES_FULL[diaObj.getDay()]}, ${diaObj.getDate()} de ${MONTH_NAMES[diaObj.getMonth()]}`;
  const diaAnterior  = () => { const d=new Date(diaSelecionado+'T00:00:00'); d.setDate(d.getDate()-1); setDiaSelecionado(toISO(d)); };
  const diaProximo   = () => { const d=new Date(diaSelecionado+'T00:00:00'); d.setDate(d.getDate()+1); setDiaSelecionado(toISO(d)); };

  const dentistasParaFiltro = dentistasClinica;

  return (
    <div style={s.main}>
      {/* Feedback global */}
      {feedback && (
        <div style={{ position:'fixed', top:24, right:24, zIndex:999, padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, background: feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color: feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`, boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }}>
          {feedback.tipo==='sucesso'?'✅':'❌'} {feedback.msg}
        </div>
      )}

      <PageHeader title="Agenda" subtitle={view==='Semana' ? `Semana de ${semanaAtual.getDate()} a ${semanaFim.getDate()} de ${MONTH_NAMES[semanaFim.getMonth()]}` : diaLabel}>
        <Button variant="ghost" onClick={() => setModalBloqueio(true)}>Bloquear Agenda</Button>
        <Button onClick={() => handleNovoClick()} disabled={carregando}>
          {carregando ? '⏳ Processando...' : '+ Novo agendamento'}
        </Button>
      </PageHeader>

      {/* Barra de navegação + filtros */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {view === 'Semana' ? (
          <>
            <button style={s.navBtn} onClick={() => setSemanaAtual(p=>{const d=new Date(p);d.setDate(d.getDate()-7);return d;})}>&#8249;</button>
            <span style={s.weekLabel}>{weekLabel}</span>
            <button style={s.navBtn} onClick={() => setSemanaAtual(p=>{const d=new Date(p);d.setDate(d.getDate()+7);return d;})}>&#8250;</button>
          </>
        ) : (
          <>
            <button style={s.navBtn} onClick={diaAnterior}>&#8249;</button>
            <span style={s.weekLabel}>{diaLabel}</span>
            <button style={s.navBtn} onClick={diaProximo}>&#8250;</button>
          </>
        )}

        {/* Filtro de dentistas */}
        {dentistasParaFiltro.length > 0 && (
          <div style={{ marginLeft:8 }}>
            <select
              value={dentistasFiltro.size === 1 ? [...dentistasFiltro][0] : ''}
              onChange={e => {
                const val = e.target.value;
                setDentistasFiltro(val ? new Set([val]) : new Set());
              }}
              style={{ padding:'6px 12px', borderRadius:8, fontSize:13, border:'1.5px solid #E8E8E8', background:'#fff', color:'#1A1A1A', cursor:'pointer', outline:'none' }}
            >
              <option value="">Todos os dentistas</option>
              {dentistasParaFiltro.map(d => (
                <option key={d.id} value={d.nome}>{d.nome}{d.especialidade ? ` — ${d.especialidade}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs de vista */}
        <div style={{ ...s.viewTabs, marginLeft:'auto' }}>
          {['Semana','Dia'].map(v => (
            <div key={v} style={{ ...s.viewTab, ...(view===v?s.viewTabActive:{}) }} onClick={()=>setView(v)}>{v}</div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:16 }}>
        {/* Calendário principal */}
        <div style={{ flex:1, minWidth:0 }}>
          {view==='Semana' ? renderWeekView() : renderDayView()}
        </div>

        {/* Sidebar */}
        <div style={{ width:210, flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
          {/* Mini calendário */}
          <Card style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={s.miniNavBtn} onClick={irMesAnterior}>&#8249;</button>
              <div style={{ fontSize:12, fontWeight:500 }}>{MONTH_NAMES[miniMonth]} {miniYear}</div>
              <button style={s.miniNavBtn} onClick={irProximoMes}>&#8250;</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
              {['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} style={{ fontSize:9, color:'#CCC', padding:'2px 0' }}>{d}</div>)}
              {miniCells.map((d,i)=>(
                <div key={i}
                  style={{ fontSize:11, padding:'4px 2px', borderRadius:4, cursor:d.empty?'default':'pointer', color:d.empty?'transparent':'#555', position:'relative', background:d.today?'#1A1A1A':'transparent', ...(d.today?{color:'#fff',borderRadius:'50%'}:{}) }}
                  onClick={()=>d.ds&&!d.empty&&clicarDiaMini(d.ds)}
                >
                  {d.d||''}
                  {d.dot&&!d.today&&<div style={{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background:'#A8D5C2' }} />}
                </div>
              ))}
            </div>
          </Card>

          {/* Hoje */}
          <Card style={{ padding:16 }}>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:12 }}>Hoje</div>
            {agendamentosRaw.filter(a=>a.data===hoje).length > 0 ? (
              agendamentosRaw.filter(a=>a.data===hoje).slice(0,5).map(a => {
                const cor = corDentista(a.dentistaNome);
                return (
                  <div key={a.id} style={{ padding:'8px 0', borderBottom:'1px solid #F5F5F5', cursor:'pointer' }} onClick={()=>setSelected(a)}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{a.pacienteNome}</div>
                    <div style={{ fontSize:10, color:'#AAA', marginTop:1 }}>{a.hora} · <span style={{ color:cor.text }}>{a.dentistaNome}</span></div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize:12, color:'#AAA' }}>Nenhum agendamento hoje</div>
            )}
          </Card>

          {/* Legenda dentistas */}
          {dentistasClinica.length > 0 && (
            <Card style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:500, marginBottom:10 }}>Dentistas</div>
              {dentistasClinica.map((d,i) => {
                const cor = DENTIST_PALETTE[i%DENTIST_PALETTE.length];
                const count = agendamentosRaw.filter(a=>a.dentistaNome===d.nome&&a.data===hoje).length;
                return (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid #F8F8F8' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:cor.bg, border:`2px solid ${cor.border}`, flexShrink:0 }} />
                    <div style={{ fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nome}</div>
                    {count>0 && <div style={{ fontSize:10, color:cor.text, fontWeight:600 }}>{count}</div>}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>

      {/* Modal detalhe agendamento */}
      {selected && (
        <div style={s.overlay} onClick={()=>setSelected(null)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <div style={{ ...s.modalHeader, ...corDentista(selected.dentistaNome) }}>
              <div>
                <div style={s.modalName}>{selected.pacienteNome}</div>
                <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>{selected.hora} · {selected.procedimento}</div>
              </div>
              <button style={s.closeBtn} onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                {[['Dentista',selected.dentistaNome],['Data',selected.data?.split('-').reverse().join('/')],['Procedimento',selected.procedimento],['Status',selected.status]].map(([l,v])=>(
                  <div key={l}>
                    <div style={s.infoLabel}>{l}</div>
                    <div style={{ fontSize:13, color:'#1A1A1A', fontWeight:500 }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
              {selected.pacienteEmail && <div style={{ marginBottom:8 }}><div style={s.infoLabel}>Email</div><div style={{ fontSize:12, color:'#555' }}>{selected.pacienteEmail}</div></div>}
              {selected.pacienteTelefone && <div style={{ marginBottom:8 }}><div style={s.infoLabel}>Telefone</div><div style={{ fontSize:12, color:'#555' }}>{selected.pacienteTelefone}</div></div>}
              {selected.observacoes && <div style={{ marginTop:12, padding:10, background:'#FAFAFA', borderRadius:8 }}><div style={s.infoLabel}>Observações</div><div style={{ fontSize:12, color:'#555', marginTop:4 }}>{selected.observacoes}</div></div>}
              <div style={{ display:'flex', gap:8, marginTop:20 }}>
                <button style={s.actionBtn} onClick={()=>setSelected(null)}>Fechar</button>
                <button style={s.actionBtn} onClick={()=>handleEditAgendamento(selected)}>Editar</button>
                <button style={{...s.actionBtn,...s.actionBtnDanger}} onClick={()=>handleDeleteAgendamento(selected.id)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo/editar agendamento */}
      {novoModal && (
        <div style={s.overlay} onClick={()=>setNovoModal(false)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <div style={{ ...s.modalHeader, background:'#A8D5C2', color:'#1A1A1A' }}>
              <div style={s.modalName}>{editingId?'Editar Agendamento':'Novo Agendamento'}</div>
              <button style={s.closeBtn} onClick={()=>setNovoModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {feedback && <div style={{ padding:'10px 14px', marginBottom:12, borderRadius:8, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}` }}>{feedback.tipo==='sucesso'?'✅':'❌'} {feedback.msg}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ gridColumn:'1/-1', position:'relative' }}>
                  <label style={s.label}>Paciente</label>
                  <input type="text" style={s.input} placeholder="Nome do paciente" value={formData.paciente} onChange={e=>handlePacienteDigitado(e.target.value)} autoComplete="off" />
                  {sugestoesPaciente.length>0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #E8E8E8', borderRadius:8, zIndex:300, boxShadow:'0 8px 20px rgba(0,0,0,0.1)', marginTop:2 }}>
                      {sugestoesPaciente.map(p=>(
                        <div key={p.id} onClick={()=>{setFormData(prev=>({...prev,paciente:p.nome,cpf:p.cpf||'',email:p.email||'',telefone:p.telefone||''}));setSugestoesPaciente([]);}}
                          style={{ padding:'10px 12px', fontSize:12, cursor:'pointer', borderBottom:'1px solid #F5F5F5' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#F8F8F8'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                        >
                          <strong>{p.nome}</strong>
                          {p.cpf&&<span style={{ color:'#AAA', marginLeft:8 }}>{p.cpf}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={s.label}>CPF</label>
                  <input type="text" style={s.input} placeholder="000.000.000-00" value={formData.cpf} onChange={e=>setFormData(p=>({...p,cpf:e.target.value}))} />
                </div>
                <div>
                  <label style={s.label}>Telefone</label>
                  <input type="tel" style={s.input} placeholder="(11) 99999-0000" value={formData.telefone} onChange={e=>setFormData(p=>({...p,telefone:e.target.value}))} />
                </div>
                <div>
                  <label style={s.label}>Data</label>
                  <input type="date" style={s.input} value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} />
                </div>
                <div>
                  <label style={s.label}>Hora</label>
                  <input type="time" style={s.input} value={formData.hora} onChange={e=>setFormData(p=>({...p,hora:e.target.value}))} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={s.label}>Dentista</label>
                  <select style={s.input} value={formData.dentista} onChange={e=>setFormData(p=>({...p,dentista:e.target.value}))}>
                    {dentistasClinica.length > 0
                      ? dentistasClinica.map(d=><option key={d.id} value={d.nome}>{d.nome}{d.especialidade?` — ${d.especialidade}`:''}</option>)
                      : <option value="">Sem dentistas cadastrados</option>
                    }
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={s.label}>Procedimento</label>
                  <select style={s.input} value={formData.procedimento} onChange={e=>setFormData(p=>({...p,procedimento:e.target.value}))}>
                    {procedures.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={formData.status} onChange={e=>setFormData(p=>({...p,status:e.target.value}))}>
                    {statuses.map(st=><option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Email</label>
                  <input type="email" style={s.input} placeholder="email@exemplo.com" value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={s.label}>Observações</label>
                  <textarea style={{ ...s.input, minHeight:70 }} placeholder="Observações..." value={formData.observacoes} onChange={e=>setFormData(p=>({...p,observacoes:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...s.actionBtn, background:'#E8E8E8' }} onClick={()=>setNovoModal(false)} disabled={carregando}>Cancelar</button>
                <button style={{ ...s.actionBtn, background:carregando?'#CCC':'#A8D5C2', color:'#1A1A1A', cursor:carregando?'not-allowed':'pointer' }} onClick={handleSaveAgendamento} disabled={carregando}>
                  {carregando?'⏳ Salvando...':(editingId?'Atualizar':'Agendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal bloquear agenda */}
      {modalBloqueio && (
        <div style={s.overlay} onClick={()=>setModalBloqueio(false)}>
          <div style={{ ...s.modal, maxWidth:460 }} onClick={e=>e.stopPropagation()}>
            <div style={{ ...s.modalHeader, background:'#FFF3CD', color:'#856404' }}>
              <div><div style={s.modalName}>Bloquear Agenda</div><div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>Configure dias sem atendimento</div></div>
              <button style={s.closeBtn} onClick={()=>setModalBloqueio(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ marginBottom:20 }}>
                <div style={s.sectionTitle}>Dias da semana</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {DAY_NAMES_FULL.map((d,i)=>(
                    <label key={i} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'6px 12px', borderRadius:20, background:bloqueios.diasSemana.includes(i)?'#FFF3CD':'#FAFAFA', border:`1.5px solid ${bloqueios.diasSemana.includes(i)?'#F39C12':'#EFEFEF'}`, fontSize:12, fontWeight:500 }}>
                      <input type="checkbox" checked={bloqueios.diasSemana.includes(i)} onChange={()=>toggleDiaSemana(i)} style={{ accentColor:'#F39C12' }} />
                      {d.substring(0,3)}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={s.sectionTitle}>Bloquear data específica</div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <input type="date" style={{ ...s.input, flex:1 }} value={novaDataBloqueio} min={hoje} onChange={e=>setNovaDataBloqueio(e.target.value)} />
                  <button style={{ padding:'10px 16px', background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }} onClick={adicionarDataBloqueio}>+ Bloquear</button>
                </div>
                {bloqueios.datas.map(data=>{
                  const [a,m,d]=data.split('-');
                  return (
                    <div key={data} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'#FDECEA', border:'1.5px solid #FFCDD2', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:'#C62828' }}>{d}/{m}/{a}</span>
                      <button onClick={()=>removerDataBloqueio(data)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#E74C3C', fontSize:16, fontWeight:700 }}>✕</button>
                    </div>
                  );
                })}
              </div>

              <div>
                <div style={s.sectionTitle}>Bloquear horário específico</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4 }}>DATA</div><input type="date" style={s.input} value={novoHorarioBloqueio.data} min={hoje} onChange={e=>setNovoHorarioBloqueio(p=>({...p,data:e.target.value}))} /></div>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4 }}>DAS</div><input type="time" style={s.input} value={novoHorarioBloqueio.inicio} onChange={e=>setNovoHorarioBloqueio(p=>({...p,inicio:e.target.value}))} /></div>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4 }}>ATÉ</div><input type="time" style={s.input} value={novoHorarioBloqueio.fim} onChange={e=>setNovoHorarioBloqueio(p=>({...p,fim:e.target.value}))} /></div>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <input type="text" style={{ ...s.input, flex:1 }} placeholder="Motivo (opcional)" value={novoHorarioBloqueio.motivo} onChange={e=>setNovoHorarioBloqueio(p=>({...p,motivo:e.target.value}))} />
                  <button style={{ padding:'10px 16px', background:'#E74C3C', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }} onClick={adicionarHorarioBloqueio}>+ Bloquear</button>
                </div>
                {(bloqueios.horarios||[]).map((b,idx)=>{
                  const [a,m,d]=b.data.split('-');
                  return (
                    <div key={idx} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'#FFF5F5', border:'1.5px solid #FFCDD2', marginBottom:4 }}>
                      <div>
                        <span style={{ fontSize:12, fontWeight:600, color:'#C62828' }}>{d}/{m}/{a}</span>
                        <span style={{ fontSize:12, color:'#E74C3C', marginLeft:8 }}>{b.inicio}–{b.fim}</span>
                        {b.motivo&&<span style={{ fontSize:11, color:'#888', marginLeft:8 }}>{b.motivo}</span>}
                      </div>
                      <button onClick={()=>removerHorarioBloqueio(idx)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#E74C3C', fontSize:16, fontWeight:700 }}>✕</button>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop:20 }}>
                <button style={{ ...s.actionBtn, background:'#A8D5C2', width:'100%' }} onClick={()=>setModalBloqueio(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main:     { flex:1, padding:32, overflowY:'auto', background:'#F8F8F8' },
  weekLabel:{ fontSize:14, fontWeight:500, minWidth:220, textAlign:'center' },
  navBtn:   { width:32, height:32, border:'1.5px solid #E8E8E8', background:'#fff', borderRadius:8, cursor:'pointer', fontSize:16, color:'#555', flexShrink:0 },
  viewTabs: { display:'flex', gap:4, background:'#EFEFEF', borderRadius:8, padding:3 },
  viewTab:  { padding:'6px 16px', borderRadius:6, fontSize:12, cursor:'pointer', color:'#888' },
  viewTabActive: { background:'#fff', color:'#1A1A1A', fontWeight:500 },
  calWrap:  { background:'#fff', borderRadius:12, border:'1.5px solid #EFEFEF', overflow:'hidden' },
  miniNavBtn: { width:24, height:24, border:'1px solid #E8E8E8', background:'#fff', borderRadius:6, cursor:'pointer', fontSize:14, color:'#555', display:'flex', alignItems:'center', justifyContent:'center', padding:0 },
  overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:    { background:'#fff', borderRadius:16, width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  modalHeader: { padding:'20px 20px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  modalName: { fontSize:17, fontWeight:600, fontFamily:"'DM Serif Display',serif" },
  closeBtn: { background:'transparent', border:'none', fontSize:14, cursor:'pointer', opacity:0.6, padding:4 },
  modalBody: { padding:'16px 20px 20px' },
  infoLabel: { fontSize:10, fontWeight:500, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:2 },
  actions:  { display:'flex', gap:8, marginTop:20 },
  actionBtn: { flex:1, padding:'10px 8px', border:'1.5px solid #E8E8E8', borderRadius:10, background:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A' },
  actionBtnDanger: { color:'#E74C3C', borderColor:'#FDECEA', background:'#FDECEA' },
  label:    { display:'block', fontSize:10, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 },
  input:    { width:'100%', padding:'10px 12px', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' },
  sectionTitle: { fontSize:11, fontWeight:600, color:'#555', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.6px' },
};
