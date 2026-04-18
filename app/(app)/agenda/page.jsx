'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, PageHeader, Button } from '../../../components/UI';
import { useAgendamento } from '@/app/hooks/useAgendamento';
import { supabase } from '@/lib/supabase-client';
import {
  Calendar, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight,
  X, XCircle, Plus, CalendarOff, Ban
} from 'lucide-react';

// Paleta harmonizada com o sistema (mint / azul / âmbar / púrpura / coral / verde-escuro)
const DENTIST_PALETTE = [
  { bg: '#EAF5EF', text: '#3E7D63', border: '#C8E6D4', strong: '#5FA883' }, // mint
  { bg: '#E6F0FA', text: '#3A5FA5', border: '#C8DCF0', strong: '#5B8DEF' }, // azul
  { bg: '#FDF3E0', text: '#A57A3A', border: '#F2DCB5', strong: '#D9A856' }, // âmbar
  { bg: '#F1E8FA', text: '#6B3FA5', border: '#DCCAF0', strong: '#8F66CC' }, // púrpura
  { bg: '#FBEBE4', text: '#A55A3A', border: '#F2CFBE', strong: '#D9825B' }, // coral
  { bg: '#E6EFE8', text: '#3D6B4A', border: '#C8D8CC', strong: '#5F8A6C' }, // verde-escuro
  { bg: '#F2EAE0', text: '#8B6B3A', border: '#E0D0B8', strong: '#B8966B' }, // areia
  { bg: '#E4EEF5', text: '#3E6A85', border: '#C4D6E2', strong: '#6390AA' }, // aço
];

const DAY_NAMES      = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAY_NAMES_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MONTH_NAMES    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const HORA_INICIO    = 7;
const HORA_FIM       = 20;
const PX_POR_MIN     = 1.2;

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
function topPx(hora)    { return (horaParaMin(hora) - HORA_INICIO*60) * PX_POR_MIN; }

// Extrai duração em minutos a partir de string como "30 min", "1h", "1h30" etc; fallback 60
function duracaoEmMin(duracao) {
  if (!duracao) return 60;
  if (typeof duracao === 'number') return duracao;
  const str = String(duracao).toLowerCase();
  const h = str.match(/(\d+)\s*h/);
  const m = str.match(/(\d+)\s*m/);
  const soNum = str.match(/^\s*(\d+)\s*$/);
  let total = 0;
  if (h) total += parseInt(h[1],10) * 60;
  if (m) total += parseInt(m[1],10);
  if (!h && !m && soNum) total = parseInt(soNum[1],10);
  return total || 60;
}

// Iniciais consistentes: primeira letra do primeiro nome + primeira letra do último sobrenome
function iniciaisNome(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

const TOTAL_HEIGHT  = (HORA_FIM - HORA_INICIO) * 60 * PX_POR_MIN;
const HOURS_LABELS  = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => minParaHora((HORA_INICIO + i)*60));

function calcularOverlap(appts) {
  if (!appts.length) return appts;
  const sorted = [...appts].sort((a,b) => horaParaMin(a.hora) - horaParaMin(b.hora));
  const resultado = sorted.map(a => ({ ...a, col: 0, totalCols: 1 }));
  for (let i = 0; i < resultado.length; i++) {
    const dur = duracaoEmMin(resultado[i].duracao);
    const fimI = horaParaMin(resultado[i].hora) + dur;
    const grupo = [resultado[i]];
    for (let j = i+1; j < resultado.length; j++) {
      if (horaParaMin(resultado[j].hora) < fimI) grupo.push(resultado[j]);
    }
    if (grupo.length > 1) grupo.forEach((a, idx) => { a.col = idx; a.totalCols = grupo.length; });
  }
  return resultado;
}

export default function Agenda() {
  const hoje = toISO(new Date());

  const [semanaAtual, setSemanaAtual]       = useState(() => getMondayOfWeek(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [view, setView]                     = useState('Semana');
  const [agendamentosRaw, setAgendamentosRaw] = useState([]);
  const [clinicaId, setClinicaId]           = useState(null);
  const [dentistasClinica, setDentistasClinica] = useState([]);
  const [loading, setLoading]               = useState(true);

  const [dentistaFiltro, setDentistaFiltro] = useState('');

  const [miniMes, setMiniMes] = useState(() => {
    const h = new Date(); return { year: h.getFullYear(), month: h.getMonth() };
  });
  const [pacientesCadastrados, setPacientesCadastrados] = useState([]);
  const [sugestoesPaciente, setSugestoesPaciente]       = useState([]);

  const [novoModal, setNovoModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const [formData, setFormData]     = useState({
    paciente:'', cpf:'', email:'', telefone:'',
    data: hoje, hora:'08:00', procedimento:'Limpeza Profissional',
    dentista:'', observacoes:'', status:'confirmado',
  });

  const [modalBloqueio, setModalBloqueio]       = useState(false);
  const [bloqueios, setBloqueios]               = useState({ diasSemana:[], datas:[], horarios:[] });
  const [novaDataBloqueio, setNovaDataBloqueio] = useState('');
  const [novoHorarioBloqueio, setNovoHorarioBloqueio] = useState({ data:'', inicio:'11:00', fim:'14:00', motivo:'' });
  const [verTodosHoje, setVerTodosHoje]         = useState(false);

  const { criarAgendamento, atualizarAgendamento, deletarAgendamento, obterAgendamentos, carregando } = useAgendamento();

  const showFeedback = (msg, tipo='sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3000);
  };

  // KPIs de hoje
  const agendamentosHoje  = agendamentosRaw.filter(a => a.data === hoje);
  const confirmadosHoje   = agendamentosHoje.filter(a => a.status === 'confirmado').length;
  const pendentesHoje     = agendamentosHoje.filter(a => a.status === 'pendente').length;
  const agoraMin          = new Date().getHours()*60 + new Date().getMinutes();
  const proximoHoje       = agendamentosHoje
    .slice()
    .sort((a,b) => horaParaMin(a.hora) - horaParaMin(b.hora))
    .find(a => horaParaMin(a.hora) >= agoraMin);

  // Init: clinicaId + agendamentos + pacientes
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const idLocal = localStorage.getItem('dentclinic_clinica_id');
      if (idLocal) {
        setClinicaId(idLocal);
      } else {
        try {
          const res = await fetch('/api/clinica');
          const cls = await res.json();
          if (cls?.[0]?.id) setClinicaId(cls[0].id);
        } catch {}
      }

      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);

      supabase.from('pacientes').select('id,nome,cpf,email,telefone').order('nome')
        .then(({ data }) => { if (data) setPacientesCadastrados(data); });

      setLoading(false);
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
          const nomes = [...new Set(agendamentosRaw.map(a => a.dentistaNome).filter(Boolean))];
          setDentistasClinica(nomes.map((nome, i) => ({ id: String(i), nome })));
        }
      });
  }, [clinicaId, agendamentosRaw]);

  const carregarBloqueios = useCallback(async () => {
    if (!clinicaId) return;
    try {
      const res = await fetch(`/api/bloqueios?clinica_id=${clinicaId}`);
      const dados = await res.json();
      if (!dados.error) setBloqueios(dados);
    } catch {}
  }, [clinicaId]);

  useEffect(() => { carregarBloqueios(); }, [carregarBloqueios]);

  const isDiaBloqueado = (ds) => {
    if (!ds) return false;
    const d = new Date(ds+'T00:00:00').getDay();
    return bloqueios.diasSemana.includes(d) || bloqueios.datas.includes(ds);
  };
  const isHorarioBloqueado = (data, hora) => {
    const min = horaParaMin(hora);
    return (bloqueios.horarios||[]).some(b => b.data===data && horaParaMin(b.inicio)<=min && min<horaParaMin(b.fim));
  };

  const toggleDiaSemana = async (d) => {
    if (!clinicaId) return;
    const jaBloqueado = bloqueios.diasSemana.includes(d);
    await fetch('/api/bloqueios', { method: jaBloqueado?'DELETE':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'dia_semana', dia_semana: d }) });
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
    const { data, inicio, fim, motivo } = novoHorarioBloqueio;
    if (!data||!inicio||!fim||horaParaMin(inicio)>=horaParaMin(fim)) return;
    await fetch('/api/bloqueios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, tipo:'horario', data, hora_inicio: inicio, hora_fim: fim, motivo }) });
    setNovoHorarioBloqueio(p => ({...p, data:'', motivo:''}));
    carregarBloqueios();
  };

  const removerHorarioBloqueio = async (idx) => {
    if (!clinicaId) return;
    const bloqueio = bloqueios.horarios[idx];
    if (!bloqueio?.id) return;
    await fetch('/api/bloqueios', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clinica_id: clinicaId, id: bloqueio.id }) });
    carregarBloqueios();
  };

  const corDentista = useCallback((nome) => {
    const idx = dentistasClinica.findIndex(d => d.nome === nome);
    return DENTIST_PALETTE[idx >= 0 ? idx % DENTIST_PALETTE.length : 0];
  }, [dentistasClinica]);

  const agendamentosFiltrados = agendamentosRaw.filter(a =>
    !dentistaFiltro || a.dentistaNome === dentistaFiltro
  );

  // Mini calendário
  const { year: miniYear, month: miniMonth } = miniMes;
  const miniFirstDay   = new Date(miniYear, miniMonth, 1).getDay();
  const miniDaysInMonth = new Date(miniYear, miniMonth+1, 0).getDate();
  const appointmentDates = new Set(agendamentosRaw.map(a => a.data));
  const miniCells = [];
  for (let i=0; i<miniFirstDay; i++) miniCells.push({ empty:true });
  for (let d=1; d<=miniDaysInMonth; d++) {
    const ds = `${miniYear}-${String(miniMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    miniCells.push({ d: String(d), today: ds===hoje, selected: ds===diaSelecionado, dot: appointmentDates.has(ds), ds });
  }
  const irMesAnterior = () => setMiniMes(p => p.month===0 ? {year:p.year-1,month:11} : {...p,month:p.month-1});
  const irProximoMes  = () => setMiniMes(p => p.month===11 ? {year:p.year+1,month:0} : {...p,month:p.month+1});
  const clicarDiaMini = (ds) => {
    setDiaSelecionado(ds);
    if (view === 'Semana') setSemanaAtual(getMondayOfWeek(new Date(ds+'T00:00:00')));
    else setView('Dia');
  };

  // Semana: Seg-Sáb
  const days = Array.from({length:6}, (_,i) => {
    const d = new Date(semanaAtual); d.setDate(semanaAtual.getDate()+i);
    return { name: DAY_NAMES[d.getDay()], num: String(d.getDate()).padStart(2,'0'), date: toISO(d), today: toISO(d)===hoje };
  });
  const semanaFim = new Date(semanaAtual); semanaFim.setDate(semanaAtual.getDate()+5);
  const weekLabel = `${semanaAtual.getDate()} – ${semanaFim.getDate()} de ${MONTH_NAMES[semanaFim.getMonth()]}, ${semanaFim.getFullYear()}`;

  const irHoje = () => {
    setSemanaAtual(getMondayOfWeek(new Date()));
    setDiaSelecionado(hoje);
    setMiniMes({ year: new Date().getFullYear(), month: new Date().getMonth() });
  };

  const handleNovoClick = (dataPreench = null, horaPreench = null, dentista = '') => {
    setEditingId(null);
    setFormData({
      paciente:'', cpf:'', email:'', telefone:'',
      data: dataPreench || (view==='Dia' ? diaSelecionado : hoje),
      hora: horaPreench || '08:00',
      procedimento: 'Limpeza Profissional',
      dentista: dentista || (dentistasClinica[0]?.nome || ''),
      observacoes:'', status:'confirmado',
    });
    setNovoModal(true);
  };

  const handlePacienteDigitado = (v) => {
    setFormData(p => ({...p, paciente:v}));
    if (v.length >= 2) setSugestoesPaciente(pacientesCadastrados.filter(p => p.nome.toLowerCase().includes(v.toLowerCase())).slice(0,5));
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

    const resultado = editingId
      ? await atualizarAgendamento(editingId, dados)
      : await criarAgendamento(dados);

    if (resultado.sucesso) {
      showFeedback(resultado.mensagem);
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);
      setTimeout(() => { setNovoModal(false); setSelected(null); setEditingId(null); }, 1200);
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

  const handleIncluirPaciente = async () => {
    if (!formData.paciente.trim()) { showFeedback('Informe o nome do paciente primeiro','erro'); return; }
    if (!clinicaId) { showFeedback('Clínica não identificada','erro'); return; }
    try {
      const cpfLimpo = (formData.cpf||'').replace(/\D/g,'');
      if (cpfLimpo) {
        const { data: exist } = await supabase.from('pacientes').select('id').eq('clinica_id',clinicaId).eq('cpf',cpfLimpo).maybeSingle();
        if (exist) { showFeedback('Paciente já cadastrado com esse CPF'); return; }
      }
      const { error } = await supabase.from('pacientes').insert([{
        nome: formData.paciente.trim(),
        cpf: cpfLimpo||null,
        telefone: (formData.telefone||'').replace(/\D/g,'')||null,
        email: formData.email||null,
        clinica_id: clinicaId,
        status: 'ativo',
        origem: 'agenda',
      }]);
      if (error) throw error;
      showFeedback('Paciente incluído no cadastro!');
    } catch (err) {
      showFeedback('Erro ao incluir paciente: '+err.message,'erro');
    }
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

  // Linha "agora" (compartilhada entre vistas)
  const agoraLineTop = () => {
    const agora = new Date();
    const t = (agora.getHours()*60 + agora.getMinutes() - HORA_INICIO*60) * PX_POR_MIN;
    if (t < 0 || t > TOTAL_HEIGHT) return null;
    return t;
  };

  // ── Vista semanal
  const renderWeekView = () => {
    const agoraTop = agoraLineTop();
    return (
      <div style={s.calWrap}>
        <div style={{ display:'grid', gridTemplateColumns:`64px repeat(6,1fr)`, borderBottom:'1.5px solid #EFEFEF', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ padding:16, borderRight:'1px solid #F0F0F0' }} />
          {days.map(d => (
            <div key={d.date}
              style={{ padding:'12px 8px', textAlign:'center', borderRight:'1px solid #F0F0F0', background: isDiaBloqueado(d.date)?'#FFF8F8':'transparent', cursor:'pointer', transition:'background 0.2s' }}
              onClick={() => { setDiaSelecionado(d.date); setView('Dia'); }}
              onMouseEnter={e => !isDiaBloqueado(d.date) && (e.currentTarget.style.background = '#FAFAFA')}
              onMouseLeave={e => !isDiaBloqueado(d.date) && (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500 }}>{d.name}</div>
              <div style={d.today ? s.diaHoje : s.diaNum}>{d.num}</div>
              {isDiaBloqueado(d.date) && <div style={{ fontSize:9, color:'#E74C3C', fontWeight:700, marginTop:2, letterSpacing:'0.5px' }}>FECHADO</div>}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', overflowY:'auto', maxHeight:540, position:'relative' }}>
          <div style={{ width:64, flexShrink:0, borderRight:'1px solid #F0F0F0', position:'relative', height:TOTAL_HEIGHT }}>
            {HOURS_LABELS.map((h,i) => (
              <div key={h} style={{ position:'absolute', top: i*(60*PX_POR_MIN)-8, right:8, fontSize:11, color:'#888', lineHeight:1, whiteSpace:'nowrap', fontWeight:500 }}>{h}</div>
            ))}
          </div>

          {days.map((d) => {
            const apptsDia = agendamentosFiltrados.filter(a => a.data === d.date);
            const apptsPosicionados = calcularOverlap(apptsDia);
            const bloqDia = (bloqueios.horarios||[]).filter(b => b.data===d.date);
            const diaEhHoje = d.today;
            return (
              <div key={d.date}
                style={{ flex:1, position:'relative', borderRight:'1px solid #F0F0F0', height:TOTAL_HEIGHT, minWidth:0, cursor:'copy' }}
                onClick={(e) => {
                  if (e.target === e.currentTarget || e.target.classList.contains('hour-line')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const minClicado = Math.round((e.clientY - rect.top) / PX_POR_MIN / 30) * 30 + HORA_INICIO*60;
                    handleNovoClick(d.date, minParaHora(minClicado));
                  }
                }}
              >
                {HOURS_LABELS.map((h,i) => (
                  <div key={h} className="hour-line" style={{ position:'absolute', top: i*(60*PX_POR_MIN), left:0, right:0, borderBottom:'1px solid #F5F5F5', height:60*PX_POR_MIN, pointerEvents:'none' }} />
                ))}

                {isDiaBloqueado(d.date) && (
                  <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(231,76,60,0.05) 8px,rgba(231,76,60,0.05) 16px)', zIndex:1, pointerEvents:'none' }} />
                )}

                {bloqDia.map((b,bi) => {
                  const t = (horaParaMin(b.inicio)-HORA_INICIO*60)*PX_POR_MIN;
                  const h = (horaParaMin(b.fim)-horaParaMin(b.inicio))*PX_POR_MIN;
                  return (
                    <div key={bi} style={{ position:'absolute', left:2, right:2, top:t, height:h, background:'repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 4px,#FFEBEE 4px,#FFEBEE 8px)', border:'1px solid #FFCDD2', borderRadius:4, zIndex:2, padding:'3px 5px', pointerEvents:'none' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#C0392B' }}>Bloqueado {b.inicio}–{b.fim}</div>
                    </div>
                  );
                })}

                {apptsPosicionados.length === 0 && !isDiaBloqueado(d.date) && diaEhHoje && (
                  <div style={{ position:'absolute', top:80, left:4, right:4, textAlign:'center', fontSize:10, color:'#CCC', userSelect:'none', pointerEvents:'none', fontStyle:'italic' }}>
                    Sem consultas
                  </div>
                )}

                {apptsPosicionados.map(a => {
                  const cor = corDentista(a.dentistaNome);
                  const t   = topPx(a.hora);
                  const dur = duracaoEmMin(a.duracao);
                  const altura = Math.max(dur * PX_POR_MIN - 3, 30);
                  const largura  = `calc(${100/a.totalCols}% - 4px)`;
                  const esquerda = `calc(${(a.col/a.totalCols)*100}% + 2px)`;
                  const isPendente = a.status === 'pendente';
                  return (
                    <div key={a.id}
                      title={`${a.pacienteNome} — ${a.hora?.slice(0,5)} · ${a.procedimento} · ${a.dentistaNome}`}
                      style={{ position:'absolute', top:t, left:esquerda, width:largura, height: altura, background:cor.bg, color:cor.text, border:`1.5px solid ${cor.border}`, borderRadius:6, padding:'5px 7px 5px 10px', cursor:'pointer', overflow:'hidden', zIndex:3, boxSizing:'border-box', borderLeft: isPendente ? `3px dashed ${cor.strong}` : `3px solid ${cor.strong}`, transition:'transform 0.12s, box-shadow 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      onClick={e => { e.stopPropagation(); setSelected(a); }}
                    >
                      <div style={{ fontSize:11, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {a.pacienteNome}
                      </div>
                      <div style={{ fontSize:10, opacity:0.8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {a.hora?.slice(0,5)} · {a.dentistaNome}
                      </div>
                      {altura > 44 && (
                        <div style={{ fontSize:9, opacity:0.65, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {a.procedimento}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Linha "agora" — só na coluna de hoje */}
                {diaEhHoje && agoraTop !== null && (
                  <div style={{ position:'absolute', left:0, right:0, top:agoraTop, height:2, background:'#E74C3C', zIndex:5, pointerEvents:'none' }}>
                    <div style={{ position:'absolute', left:-5, top:-4, width:10, height:10, borderRadius:'50%', background:'#E74C3C', boxShadow:'0 0 0 3px rgba(231,76,60,0.2)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Vista dia
  const renderDayView = () => {
    const bloqDia = (bloqueios.horarios||[]).filter(b => b.data===diaSelecionado);
    const dentistasVisiveis = dentistasClinica.filter(d => !dentistaFiltro || d.nome === dentistaFiltro);
    const dentistasParaExibir = dentistasVisiveis.length > 0
      ? dentistasVisiveis
      : [...new Set(agendamentosRaw.filter(a=>a.data===diaSelecionado).map(a=>a.dentistaNome).filter(Boolean))].map((nome,i)=>({id:String(i),nome}));

    const agoraTop = diaSelecionado === hoje ? agoraLineTop() : null;

    return (
      <div style={s.calWrap}>
        <div style={{ display:'grid', gridTemplateColumns:`64px repeat(${dentistasParaExibir.length||1},1fr)`, borderBottom:'1.5px solid #EFEFEF', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ padding:14, borderRight:'1px solid #F0F0F0', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:500 }}>Hora</span>
          </div>
          {dentistasParaExibir.length > 0 ? dentistasParaExibir.map((d,i) => {
            const cor = corDentista(d.nome);
            const agDentista = agendamentosRaw.filter(a=>a.data===diaSelecionado&&a.dentistaNome===d.nome);
            return (
              <div key={d.id} style={{ padding:'12px 8px', textAlign:'center', borderRight:'1px solid #F0F0F0', background:`${cor.bg}66` }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:cor.bg, border:`2px solid ${cor.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', fontSize:12, fontWeight:700, color:cor.text }}>
                  {iniciaisNome(d.nome)}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.nome}</div>
                <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{agDentista.length} {agDentista.length===1?'consulta':'consultas'}</div>
                <button
                  style={{ marginTop:6, padding:'3px 10px', fontSize:10, background:'#fff', color:cor.text, border:`1px solid ${cor.border}`, borderRadius:12, cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'inline-flex', alignItems:'center', gap:3 }}
                  onClick={() => handleNovoClick(diaSelecionado,'08:00',d.nome)}
                >
                  <Plus size={10} /> Agendar
                </button>
              </div>
            );
          }) : (
            <div style={{ padding:20, textAlign:'center', color:'#888', fontSize:12 }}>Cadastre dentistas em Super Admin</div>
          )}
        </div>

        <div style={{ display:'flex', overflowY:'auto', maxHeight:560, position:'relative' }}>
          <div style={{ width:64, flexShrink:0, borderRight:'1px solid #F0F0F0', position:'relative', height:TOTAL_HEIGHT }}>
            {HOURS_LABELS.map((h,i) => (
              <div key={h} style={{ position:'absolute', top: i*(60*PX_POR_MIN)-8, right:8, fontSize:11, color:'#888', lineHeight:1, whiteSpace:'nowrap', fontWeight:500 }}>{h}</div>
            ))}
          </div>

          {dentistasParaExibir.map((dentista, di) => {
            const cor   = corDentista(dentista.nome);
            const apptsD = agendamentosRaw.filter(a => a.data===diaSelecionado && a.dentistaNome===dentista.nome);
            return (
              <div key={dentista.id}
                style={{ flex:1, position:'relative', borderRight:'1px solid #F0F0F0', height:TOTAL_HEIGHT, minWidth:100, background: isDiaBloqueado(diaSelecionado)?'repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(231,76,60,0.03) 8px,rgba(231,76,60,0.03) 16px)':'transparent', cursor:'copy' }}
                onClick={(e) => {
                  if (e.target===e.currentTarget || e.target.classList.contains('hour-line-day')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const minClicado = Math.round((e.clientY-rect.top)/PX_POR_MIN/30)*30+HORA_INICIO*60;
                    handleNovoClick(diaSelecionado, minParaHora(minClicado), dentista.nome);
                  }
                }}
              >
                {HOURS_LABELS.map((h,i) => (
                  <div key={h} className="hour-line-day" style={{ position:'absolute', top: i*(60*PX_POR_MIN), left:0, right:0, borderBottom:'1px solid #F5F5F5', height:60*PX_POR_MIN, pointerEvents:'none' }} />
                ))}

                {bloqDia.map((b,bi) => {
                  const t = (horaParaMin(b.inicio)-HORA_INICIO*60)*PX_POR_MIN;
                  const h = (horaParaMin(b.fim)-horaParaMin(b.inicio))*PX_POR_MIN;
                  return (
                    <div key={bi} style={{ position:'absolute', left:2, right:2, top:t, height:h, background:'repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 4px,#FFEBEE 4px,#FFEBEE 8px)', border:'1px solid #FFCDD2', borderRadius:4, zIndex:2, padding:'3px 5px', pointerEvents:'none' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#C0392B' }}>Bloqueado</div>
                    </div>
                  );
                })}

                {apptsD.map(a => {
                  const t = topPx(a.hora);
                  const dur = duracaoEmMin(a.duracao);
                  const altura = Math.max(dur * PX_POR_MIN - 4, 34);
                  const isPendente = a.status === 'pendente';
                  return (
                    <div key={a.id}
                      title={`${a.pacienteNome} — ${a.hora?.slice(0,5)} · ${a.procedimento}`}
                      style={{ position:'absolute', left:3, right:3, top:t, height:altura, background:cor.bg, color:cor.text, border:`1.5px solid ${cor.border}`, borderLeft: isPendente ? `3px dashed ${cor.strong}` : `3px solid ${cor.strong}`, borderRadius:8, padding:'7px 9px', cursor:'pointer', overflow:'hidden', zIndex:3, boxSizing:'border-box', transition:'transform 0.12s, box-shadow 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      onClick={e => { e.stopPropagation(); setSelected(a); }}
                    >
                      <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {a.pacienteNome}
                      </div>
                      <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>{a.hora?.slice(0,5)}</div>
                      {altura > 50 && (
                        <div style={{ fontSize:10, opacity:0.7, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>{a.procedimento}</div>
                      )}
                      <div style={{ position:'absolute', bottom:5, right:7, display:'flex', gap:4, alignItems:'center' }}>
                        {a.origem==='whatsapp' && <span style={{ fontSize:9, padding:'2px 6px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:600 }}>WhatsApp</span>}
                        <span style={{ fontSize:9, padding:'2px 6px', background:'rgba(255,255,255,0.7)', borderRadius:8, fontWeight:600, textTransform:'capitalize' }}>{a.status}</span>
                      </div>
                    </div>
                  );
                })}

                {agoraTop !== null && (
                  <div style={{ position:'absolute', left:0, right:0, top:agoraTop, height:2, background:'#E74C3C', zIndex:5, pointerEvents:'none' }}>
                    <div style={{ position:'absolute', left:-5, top:-4, width:10, height:10, borderRadius:'50%', background:'#E74C3C', boxShadow:'0 0 0 3px rgba(231,76,60,0.2)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const diaObj    = new Date(diaSelecionado+'T00:00:00');
  const diaLabel  = `${DAY_NAMES_FULL[diaObj.getDay()]}, ${diaObj.getDate()} de ${MONTH_NAMES[diaObj.getMonth()]}`;
  const diaAnterior = () => { const d=new Date(diaSelecionado+'T00:00:00'); d.setDate(d.getDate()-1); setDiaSelecionado(toISO(d)); };
  const diaProximo  = () => { const d=new Date(diaSelecionado+'T00:00:00'); d.setDate(d.getDate()+1); setDiaSelecionado(toISO(d)); };

  const LIMITE_SIDEBAR = 5;
  const agendamentosHojeOrdenados = agendamentosHoje.slice().sort((a,b) => horaParaMin(a.hora) - horaParaMin(b.hora));
  const listaHoje = verTodosHoje ? agendamentosHojeOrdenados : agendamentosHojeOrdenados.slice(0, LIMITE_SIDEBAR);
  const restantesHoje = agendamentosHojeOrdenados.length - LIMITE_SIDEBAR;

  return (
    <div style={s.main}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes pulseRed { 0%, 100% { box-shadow: 0 0 0 3px rgba(231,76,60,0.2) } 50% { box-shadow: 0 0 0 6px rgba(231,76,60,0.1) } }
      `}</style>

      {feedback && (
        <div style={{ position:'fixed', top:24, right:24, zIndex:999, padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:8 }}>
          {feedback.tipo==='sucesso' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <PageHeader title="Agenda" subtitle={view==='Semana' ? weekLabel : diaLabel}>
        <Button variant="ghost" onClick={() => setModalBloqueio(true)}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <CalendarOff size={13} /> Dias sem atendimento
          </span>
        </Button>
        <Button onClick={() => handleNovoClick()} disabled={carregando}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <Plus size={13} /> {carregando ? 'Processando...' : 'Novo agendamento'}
          </span>
        </Button>
      </PageHeader>

      {/* ── KPI Cards (padrão Dashboard) ── */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500 }}>Consultas hoje</div>
            <div style={{ ...s.kpiIcon, background:'#EAF5EF' }}><Calendar size={14} color="#5FA883" /></div>
          </div>
          <div style={s.kpiValue}>{agendamentosHoje.length}</div>
          <div style={{ height:3, background:'#F0F0F0', borderRadius:2, marginTop:14 }}>
            <div style={{ height:'100%', width:`${Math.min(100, agendamentosHoje.length * 10)}%`, background:'linear-gradient(90deg, #A8D5C2, #5FA883)', borderRadius:2 }} />
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500 }}>Confirmadas</div>
            <div style={{ ...s.kpiIcon, background:'#E6F0FA' }}><CheckCircle2 size={14} color="#3A5FA5" /></div>
          </div>
          <div style={s.kpiValue}>{confirmadosHoje}</div>
          <div style={{ fontSize:12, color:'#888', marginTop:6 }}>
            {agendamentosHoje.length > 0 ? `${Math.round((confirmadosHoje/agendamentosHoje.length)*100)}% do dia` : 'sem consultas'}
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500 }}>Pendentes</div>
            <div style={{ ...s.kpiIcon, background:'#F5F5F5' }}><AlertCircle size={14} color="#888" /></div>
          </div>
          <div style={s.kpiValue}>{pendentesHoje}</div>
          <div style={{ fontSize:12, color:'#888', marginTop:6 }}>
            {pendentesHoje > 0 ? 'aguardando confirmação' : 'tudo confirmado'}
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:500 }}>Próxima consulta</div>
            <div style={{ ...s.kpiIcon, background:'#F5F5F5' }}><Clock size={14} color="#888" /></div>
          </div>
          <div style={{ ...s.kpiValue, fontSize: proximoHoje ? 26 : 20 }}>
            {proximoHoje ? proximoHoje.hora?.slice(0,5) : '—'}
          </div>
          <div style={{ fontSize:12, color:'#888', marginTop:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {proximoHoje ? proximoHoje.pacienteNome : 'nenhuma consulta pendente'}
          </div>
        </div>
      </div>

      {/* ── Barra de navegação ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        {view === 'Semana' ? (
          <>
            <button style={s.navBtn} onClick={() => setSemanaAtual(p=>{const d=new Date(p);d.setDate(d.getDate()-7);return d;})} aria-label="Semana anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={s.weekLabel}>{weekLabel}</span>
            <button style={s.navBtn} onClick={() => setSemanaAtual(p=>{const d=new Date(p);d.setDate(d.getDate()+7);return d;})} aria-label="Próxima semana">
              <ChevronRight size={16} />
            </button>
          </>
        ) : (
          <>
            <button style={s.navBtn} onClick={diaAnterior} aria-label="Dia anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={s.weekLabel}>{diaLabel}</span>
            <button style={s.navBtn} onClick={diaProximo} aria-label="Próximo dia">
              <ChevronRight size={16} />
            </button>
          </>
        )}

        <button style={s.hojeBtn} onClick={irHoje}>Hoje</button>

        {/* Filtro dentista como chips */}
        {dentistasClinica.length > 0 && dentistasClinica.length <= 6 ? (
          <div style={s.chipsWrap}>
            <div
              style={{ ...s.chip, ...(dentistaFiltro === '' ? s.chipActive : {}) }}
              onClick={() => setDentistaFiltro('')}
            >
              Todos
              <span style={{ ...s.chipCount, ...(dentistaFiltro === '' ? s.chipCountActive : {}) }}>
                {agendamentosRaw.length}
              </span>
            </div>
            {dentistasClinica.map(d => {
              const cor = corDentista(d.nome);
              const ativo = dentistaFiltro === d.nome;
              const count = agendamentosRaw.filter(a => a.dentistaNome === d.nome).length;
              return (
                <div key={d.id}
                  style={{ ...s.chip, ...(ativo ? { background:'#fff', color:'#1A1A1A', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' } : {}), display:'flex', alignItems:'center', gap:6 }}
                  onClick={() => setDentistaFiltro(ativo ? '' : d.nome)}
                  title={d.especialidade || d.nome}
                >
                  <span style={{ width:8, height:8, borderRadius:'50%', background:cor.strong, flexShrink:0 }} />
                  <span style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nome.split(' ')[0]}</span>
                  <span style={{ ...s.chipCount, ...(ativo ? s.chipCountActive : {}) }}>{count}</span>
                </div>
              );
            })}
          </div>
        ) : dentistasClinica.length > 6 ? (
          <select
            value={dentistaFiltro}
            onChange={e => setDentistaFiltro(e.target.value)}
            style={{ padding:'7px 12px', borderRadius:8, fontSize:12, border:'1.5px solid #E8E8E8', background:'#fff', color:'#1A1A1A', cursor:'pointer', outline:'none' }}
          >
            <option value="">Todos os dentistas</option>
            {dentistasClinica.map(d => (
              <option key={d.id} value={d.nome}>{d.nome}{d.especialidade?` — ${d.especialidade}`:''}</option>
            ))}
          </select>
        ) : null}

        <div style={{ ...s.viewTabs, marginLeft:'auto' }}>
          {['Semana','Dia'].map(v => (
            <div key={v} style={{ ...s.viewTab, ...(view===v?s.viewTabActive:{}) }} onClick={() => setView(v)}>{v}</div>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ display:'flex', gap:16 }}>
        <div style={{ flex:1, minWidth:0 }}>
          {loading ? (
            <div style={{ ...s.calWrap, padding:40 }}>
              <div style={{ height:24, width:200, borderRadius:6, background:'linear-gradient(90deg, #F5F5F5 0%, #ECECEC 50%, #F5F5F5 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite linear', marginBottom:20 }} />
              {Array.from({length:6}).map((_,i) => (
                <div key={i} style={{ height:60, borderRadius:8, background:'linear-gradient(90deg, #FAFAFA 0%, #F2F2F2 50%, #FAFAFA 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite linear', marginBottom:10 }} />
              ))}
            </div>
          ) : view==='Semana' ? renderWeekView() : renderDayView()}
        </div>

        {/* Sidebar */}
        <div style={{ width:210, flexShrink:0, display:'flex', flexDirection:'column', gap:14 }}>
          {/* Mini calendário */}
          <Card style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={s.miniNavBtn} onClick={irMesAnterior} aria-label="Mês anterior"><ChevronLeft size={13} /></button>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A' }}>{MONTH_NAMES[miniMonth].substring(0,3)} {miniYear}</div>
              <button style={s.miniNavBtn} onClick={irProximoMes} aria-label="Próximo mês"><ChevronRight size={13} /></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
              {['D','S','T','Q','Q','S','S'].map((d,i) => (
                <div key={i} style={{ fontSize:9, color:'#AAA', padding:'2px 0', fontWeight:500 }}>{d}</div>
              ))}
              {miniCells.map((d,i) => {
                const isActive = d.today || d.selected;
                return (
                  <div key={i}
                    style={{
                      fontSize:11, padding:'4px 2px', borderRadius:'50%',
                      cursor:d.empty?'default':'pointer',
                      color:d.empty?'transparent':(d.today?'#fff':d.selected?'#1A1A1A':'#555'),
                      position:'relative',
                      background:d.today?'#1A1A1A':d.selected?'#EAF5EF':'transparent',
                      fontWeight: isActive ? 700 : 400,
                      transition:'background 0.15s',
                    }}
                    onClick={() => d.ds && !d.empty && clicarDiaMini(d.ds)}
                    onMouseEnter={e => !d.empty && !isActive && (e.currentTarget.style.background = '#F5F5F5')}
                    onMouseLeave={e => !d.empty && !isActive && (e.currentTarget.style.background = 'transparent')}
                  >
                    {d.d||''}
                    {d.dot && !d.today && <div style={{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background:'#A8D5C2' }} />}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Consultas de hoje */}
          <Card style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A' }}>Hoje</div>
              {agendamentosHoje.length > 0 && <span style={{ fontSize:10, color:'#888', fontWeight:500 }}>{agendamentosHoje.length}</span>}
            </div>
            {agendamentosHoje.length > 0 ? (
              <>
                {listaHoje.map(a => {
                  const cor = corDentista(a.dentistaNome);
                  const ehProximo = proximoHoje && a.id === proximoHoje.id;
                  return (
                    <div key={a.id}
                      style={{ padding:'8px 0', borderBottom:'1px solid #F5F5F5', cursor:'pointer', position:'relative', paddingLeft: ehProximo ? 10 : 0, transition:'padding-left 0.15s' }}
                      onClick={() => setSelected(a)}
                    >
                      {ehProximo && <div style={{ position:'absolute', left:0, top:8, bottom:8, width:3, borderRadius:2, background:'#A8D5C2' }} />}
                      <div style={{ fontSize:12, fontWeight:500, color:'#1A1A1A', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.pacienteNome}</span>
                        {ehProximo && <span style={{ fontSize:8, padding:'1px 5px', background:'#A8D5C2', color:'#1A1A1A', borderRadius:8, fontWeight:700, letterSpacing:'0.5px' }}>AGORA</span>}
                      </div>
                      <div style={{ fontSize:10, color:'#888', marginTop:1 }}>
                        {a.hora?.slice(0,5)} · <span style={{ color:cor.text }}>{a.dentistaNome}</span>
                      </div>
                    </div>
                  );
                })}
                {restantesHoje > 0 && !verTodosHoje && (
                  <div style={{ paddingTop:10, textAlign:'center' }}>
                    <button
                      onClick={() => setVerTodosHoje(true)}
                      style={{ background:'transparent', border:'none', color:'#3A5FA5', fontSize:11, cursor:'pointer', fontWeight:600, padding:4 }}
                    >
                      + {restantesHoje} mais
                    </button>
                  </div>
                )}
                {verTodosHoje && agendamentosHoje.length > LIMITE_SIDEBAR && (
                  <div style={{ paddingTop:10, textAlign:'center' }}>
                    <button
                      onClick={() => setVerTodosHoje(false)}
                      style={{ background:'transparent', border:'none', color:'#888', fontSize:11, cursor:'pointer', fontWeight:500, padding:4 }}
                    >
                      Recolher
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}>
                  <Calendar size={18} color="#BBB" />
                </div>
                <div style={{ fontSize:11, color:'#888' }}>Nenhuma consulta hoje</div>
              </div>
            )}
          </Card>

          {/* Legenda dentistas */}
          {dentistasClinica.length > 0 && (
            <Card style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A', marginBottom:10 }}>Dentistas</div>
              {dentistasClinica.map((d,i) => {
                const cor   = corDentista(d.nome);
                const count = agendamentosRaw.filter(a=>a.dentistaNome===d.nome&&a.data===hoje).length;
                return (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #F8F8F8' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:cor.bg, border:`2px solid ${cor.strong}`, flexShrink:0 }} />
                    <div style={{ fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#333' }}>{d.nome}</div>
                    <div style={{ fontSize:10, color: count > 0 ? cor.text : '#CCC', fontWeight: count > 0 ? 700 : 500 }}>{count}</div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>

      {/* ── Modal detalhe ── */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeaderDark}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={s.modalName}>{selected.pacienteNome}</span>
                  {selected.origem==='whatsapp' && <span style={{ fontSize:10, padding:'2px 8px', background:'#25D366', color:'#fff', borderRadius:10, fontWeight:600 }}>WhatsApp</span>}
                </div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:4, color:'#CCC' }}>{selected.hora?.slice(0,5)} · {selected.procedimento}</div>
              </div>
              <button style={s.closeBtnDark} onClick={() => setSelected(null)} aria-label="Fechar">
                <X size={15} />
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                {[['Dentista',selected.dentistaNome],['Data',selected.data?.split('-').reverse().join('/')],['Procedimento',selected.procedimento],['Status',selected.status]].map(([l,v]) => (
                  <div key={l}>
                    <div style={s.infoLabel}>{l}</div>
                    <div style={{ fontSize:13, color:'#1A1A1A', fontWeight:500, textTransform: l==='Status' ? 'capitalize' : 'none' }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
              {selected.pacienteEmail    && <div style={{ marginBottom:8 }}><div style={s.infoLabel}>Email</div><div style={{ fontSize:12, color:'#555' }}>{selected.pacienteEmail}</div></div>}
              {selected.pacienteTelefone && <div style={{ marginBottom:8 }}><div style={s.infoLabel}>Telefone</div><div style={{ fontSize:12, color:'#555' }}>{selected.pacienteTelefone}</div></div>}
              {selected.observacoes      && <div style={{ marginTop:12, padding:10, background:'#FAFAFA', borderRadius:8 }}><div style={s.infoLabel}>Observações</div><div style={{ fontSize:12, color:'#555', marginTop:4 }}>{selected.observacoes}</div></div>}
              <div style={{ display:'flex', gap:8, marginTop:20, paddingTop:16, borderTop:'1px solid #F0F0F0' }}>
                <button style={s.actionBtn} onClick={() => setSelected(null)}>Fechar</button>
                <button style={s.actionBtn} onClick={() => handleEditAgendamento(selected)}>Editar</button>
                <button style={{...s.actionBtn,...s.actionBtnDanger}} onClick={() => handleDeleteAgendamento(selected.id)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal novo/editar ── */}
      {novoModal && (
        <div style={s.overlay} onClick={() => setNovoModal(false)}>
          <div style={{ ...s.modal, maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeaderDark}>
              <div>
                <div style={s.modalName}>{editingId?'Editar agendamento':'Novo agendamento'}</div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:4, color:'#CCC' }}>
                  {editingId ? 'Atualize os dados da consulta' : 'Preencha os dados da nova consulta'}
                </div>
              </div>
              <button style={s.closeBtnDark} onClick={() => setNovoModal(false)} aria-label="Fechar">
                <X size={15} />
              </button>
            </div>
            <div style={s.modalBody}>
              {feedback && (
                <div style={{ padding:'10px 14px', marginBottom:14, borderRadius:8, fontSize:13, fontWeight:500, background:feedback.tipo==='sucesso'?'#E8F5E9':'#FFEBEE', color:feedback.tipo==='sucesso'?'#27AE60':'#C62828', border:`1.5px solid ${feedback.tipo==='sucesso'?'#C8E6C9':'#FFCDD2'}`, display:'flex', alignItems:'center', gap:8 }}>
                  {feedback.tipo==='sucesso' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{feedback.msg}</span>
                </div>
              )}

              {/* Seção: Paciente */}
              <div style={s.section}>
                <div style={s.sectionLabel}>Paciente</div>
                <div style={{ position:'relative', marginBottom:12 }}>
                  <label style={s.label}>Nome</label>
                  <input type="text" style={s.input} placeholder="Nome do paciente" value={formData.paciente} onChange={e=>handlePacienteDigitado(e.target.value)} autoComplete="off" />
                  {sugestoesPaciente.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #E8E8E8', borderRadius:8, zIndex:300, boxShadow:'0 8px 20px rgba(0,0,0,0.1)', marginTop:2 }}>
                      {sugestoesPaciente.map(p => (
                        <div key={p.id}
                          style={{ padding:'10px 12px', fontSize:12, cursor:'pointer', borderBottom:'1px solid #F5F5F5' }}
                          onClick={() => { setFormData(prev=>({...prev,paciente:p.nome,cpf:p.cpf||'',email:p.email||'',telefone:p.telefone||''})); setSugestoesPaciente([]); }}
                          onMouseEnter={e=>e.currentTarget.style.background='#F8F8F8'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                        >
                          <strong>{p.nome}</strong>
                          {p.cpf && <span style={{ color:'#AAA', marginLeft:8 }}>{p.cpf}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={s.formRow}>
                  <div><label style={s.label}>CPF</label><input type="text" style={s.input} placeholder="000.000.000-00" value={formData.cpf} onChange={e=>setFormData(p=>({...p,cpf:e.target.value}))} /></div>
                  <div><label style={s.label}>Telefone</label><input type="tel" style={s.input} placeholder="(11) 99999-0000" value={formData.telefone} onChange={e=>setFormData(p=>({...p,telefone:e.target.value}))} /></div>
                </div>
                <div style={{ marginTop:10 }}>
                  <label style={s.label}>Email</label>
                  <input type="email" style={s.input} placeholder="email@exemplo.com" value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} />
                </div>
              </div>

              {/* Seção: Consulta */}
              <div style={s.section}>
                <div style={s.sectionLabel}>Consulta</div>
                <div style={s.formRow}>
                  <div><label style={s.label}>Data</label><input type="date" style={s.input} value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} /></div>
                  <div><label style={s.label}>Hora</label><input type="time" style={s.input} value={formData.hora} onChange={e=>setFormData(p=>({...p,hora:e.target.value}))} /></div>
                </div>
                <div style={{ marginTop:10 }}>
                  <label style={s.label}>Dentista</label>
                  <select style={s.input} value={formData.dentista} onChange={e=>setFormData(p=>({...p,dentista:e.target.value}))}>
                    {dentistasClinica.length > 0
                      ? dentistasClinica.map(d=><option key={d.id} value={d.nome}>{d.nome}{d.especialidade?` — ${d.especialidade}`:''}</option>)
                      : <option value="">Sem dentistas cadastrados</option>}
                  </select>
                </div>
                <div style={{ ...s.formRow, marginTop:10 }}>
                  <div>
                    <label style={s.label}>Procedimento</label>
                    <select style={s.input} value={formData.procedimento} onChange={e=>setFormData(p=>({...p,procedimento:e.target.value}))}>
                      {procedures.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Status</label>
                    <select style={s.input} value={formData.status} onChange={e=>setFormData(p=>({...p,status:e.target.value}))}>
                      {statuses.map(st=><option key={st} value={st} style={{ textTransform:'capitalize' }}>{st}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção: Observações */}
              <div style={{ ...s.section, borderBottom:'none', paddingBottom:0 }}>
                <div style={s.sectionLabel}>Observações</div>
                <textarea style={{ ...s.input, minHeight:70, fontFamily:"'DM Sans',sans-serif", resize:'vertical' }} placeholder="Informações adicionais..." value={formData.observacoes} onChange={e=>setFormData(p=>({...p,observacoes:e.target.value}))} />
              </div>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:20, paddingTop:16, borderTop:'1px solid #F0F0F0' }}>
                <button style={{ ...s.actionBtn, background:'#F5F5F5' }} onClick={() => setNovoModal(false)} disabled={carregando}>Cancelar</button>
                <button style={{ ...s.actionBtn, background:'#E6F0FA', color:'#3A5FA5', borderColor:'#C8DCF0' }} onClick={handleIncluirPaciente} disabled={carregando}>+ Incluir paciente</button>
                <button style={{ ...s.actionBtn, background:carregando?'#CCC':'#1A1A1A', color:'#fff', cursor:carregando?'not-allowed':'pointer', borderColor:'#1A1A1A' }} onClick={handleSaveAgendamento} disabled={carregando}>
                  {carregando ? 'Salvando...' : (editingId?'Atualizar':'Agendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal bloquear agenda ── */}
      {modalBloqueio && (
        <div style={s.overlay} onClick={() => setModalBloqueio(false)}>
          <div style={{ ...s.modal, maxWidth:500 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeaderDark}>
              <div>
                <div style={s.modalName}>Dias sem atendimento</div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:4, color:'#CCC' }}>Configure bloqueios recorrentes e avulsos</div>
              </div>
              <button style={s.closeBtnDark} onClick={() => setModalBloqueio(false)} aria-label="Fechar">
                <X size={15} />
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={s.section}>
                <div style={s.sectionLabel}>Dias da semana fechados</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {DAY_NAMES_FULL.map((d,i) => (
                    <label key={i} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'6px 12px', borderRadius:20, background:bloqueios.diasSemana.includes(i)?'#FFF3CD':'#FAFAFA', border:`1.5px solid ${bloqueios.diasSemana.includes(i)?'#F39C12':'#EFEFEF'}`, fontSize:12, fontWeight:500, transition:'all 0.15s' }}>
                      <input type="checkbox" checked={bloqueios.diasSemana.includes(i)} onChange={() => toggleDiaSemana(i)} style={{ accentColor:'#F39C12' }} />
                      {d.substring(0,3)}
                    </label>
                  ))}
                </div>
              </div>

              <div style={s.section}>
                <div style={s.sectionLabel}>Data específica</div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <input type="date" style={{ ...s.input, flex:1 }} value={novaDataBloqueio} min={hoje} onChange={e=>setNovaDataBloqueio(e.target.value)} />
                  <button style={{ padding:'10px 16px', background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }} onClick={adicionarDataBloqueio}>
                    <Ban size={12} /> Bloquear
                  </button>
                </div>
                {bloqueios.datas.map(data => {
                  const [a,m,d] = data.split('-');
                  return (
                    <div key={data} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'#FDECEA', border:'1.5px solid #FFCDD2', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:'#C62828' }}>{d}/{m}/{a}</span>
                      <button onClick={() => removerDataBloqueio(data)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#E74C3C', padding:2, display:'inline-flex' }} aria-label="Remover">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ ...s.section, borderBottom:'none', paddingBottom:0 }}>
                <div style={s.sectionLabel}>Horário específico</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4, fontWeight:600 }}>DATA</div><input type="date" style={s.input} value={novoHorarioBloqueio.data} min={hoje} onChange={e=>setNovoHorarioBloqueio(p=>({...p,data:e.target.value}))} /></div>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4, fontWeight:600 }}>DAS</div><input type="time" style={s.input} value={novoHorarioBloqueio.inicio} onChange={e=>setNovoHorarioBloqueio(p=>({...p,inicio:e.target.value}))} /></div>
                  <div><div style={{ fontSize:10, color:'#AAA', marginBottom:4, fontWeight:600 }}>ATÉ</div><input type="time" style={s.input} value={novoHorarioBloqueio.fim} onChange={e=>setNovoHorarioBloqueio(p=>({...p,fim:e.target.value}))} /></div>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  <input type="text" style={{ ...s.input, flex:1 }} placeholder="Motivo (opcional)" value={novoHorarioBloqueio.motivo} onChange={e=>setNovoHorarioBloqueio(p=>({...p,motivo:e.target.value}))} />
                  <button style={{ padding:'10px 16px', background:'#E74C3C', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }} onClick={adicionarHorarioBloqueio}>
                    <Ban size={12} /> Bloquear
                  </button>
                </div>
                {(bloqueios.horarios||[]).map((b,idx) => {
                  const [a,m,d] = b.data.split('-');
                  return (
                    <div key={idx} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'#FFF5F5', border:'1.5px solid #FFCDD2', marginBottom:4 }}>
                      <div>
                        <span style={{ fontSize:12, fontWeight:600, color:'#C62828' }}>{d}/{m}/{a}</span>
                        <span style={{ fontSize:12, color:'#E74C3C', marginLeft:8 }}>{b.inicio}–{b.fim}</span>
                        {b.motivo && <span style={{ fontSize:11, color:'#888', marginLeft:8 }}>{b.motivo}</span>}
                      </div>
                      <button onClick={() => removerHorarioBloqueio(idx)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#E74C3C', padding:2, display:'inline-flex' }} aria-label="Remover">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #F0F0F0' }}>
                <button style={{ ...s.actionBtn, background:'#1A1A1A', color:'#fff', width:'100%', borderColor:'#1A1A1A' }} onClick={() => setModalBloqueio(false)}>Concluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main:     { flex:1, padding:28, overflowY:'auto', background:'#F8F8F8', display:'flex', flexDirection:'column', gap:16 },

  /* KPI Cards (padrão Dashboard) */
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 },
  kpiCard: { background:'#fff', borderRadius:12, padding:18, border:'1.5px solid #EFEFEF' },
  kpiIcon: { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  kpiValue: { fontFamily:"'DM Serif Display', serif", fontSize:28, letterSpacing:'-0.5px', color:'#1A1A1A', lineHeight:1.1 },

  /* Navegação */
  weekLabel: { fontSize:13, fontWeight:500, minWidth:180, textAlign:'center', color:'#1A1A1A' },
  navBtn:    { width:32, height:32, border:'1.5px solid #E8E8E8', background:'#fff', borderRadius:8, cursor:'pointer', color:'#555', flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s, border-color 0.15s' },
  hojeBtn:   { padding:'7px 14px', border:'1.5px solid #E8E8E8', background:'#fff', borderRadius:8, fontSize:12, fontWeight:600, color:'#1A1A1A', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },

  /* Chips filtro dentistas */
  chipsWrap: { display:'flex', alignItems:'center', gap:4, background:'#F5F5F5', padding:3, borderRadius:8, flexWrap:'wrap' },
  chip:      { padding:'6px 10px', fontSize:12, borderRadius:6, cursor:'pointer', color:'#666', fontWeight:500, display:'inline-flex', alignItems:'center', gap:6, transition:'background 0.15s, color 0.15s' },
  chipActive:{ background:'#fff', color:'#1A1A1A', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' },
  chipCount: { fontSize:10, padding:'1px 6px', background:'rgba(0,0,0,0.06)', borderRadius:10, fontWeight:600, color:'#888' },
  chipCountActive: { background:'#1A1A1A', color:'#fff' },

  /* Tabs de visualização */
  viewTabs:  { display:'flex', gap:4, background:'#F5F5F5', borderRadius:8, padding:3 },
  viewTab:   { padding:'6px 16px', borderRadius:6, fontSize:12, cursor:'pointer', color:'#666', fontWeight:500, transition:'background 0.15s, color 0.15s' },
  viewTabActive: { background:'#fff', color:'#1A1A1A', fontWeight:600, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' },

  /* Calendário */
  calWrap:   { background:'#fff', borderRadius:12, border:'1.5px solid #EFEFEF', overflow:'hidden' },
  diaNum:    { fontSize:18, fontFamily:"'DM Serif Display',serif", lineHeight:1.3, marginTop:4, color:'#1A1A1A' },
  diaHoje:   { fontSize:16, fontFamily:"'DM Serif Display',serif", lineHeight:1, marginTop:4, background:'#A8D5C2', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto 0', color:'#1A1A1A', fontWeight:700 },

  /* Sidebar mini nav */
  miniNavBtn: { width:24, height:24, border:'1px solid #E8E8E8', background:'#fff', borderRadius:6, cursor:'pointer', color:'#555', display:'flex', alignItems:'center', justifyContent:'center', padding:0 },

  /* Modais */
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:     { background:'#fff', borderRadius:16, width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', maxHeight:'90vh', overflowY:'auto' },
  modalHeaderDark: { padding:'22px 22px 18px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)', color:'#fff' },
  modalName: { fontSize:17, fontWeight:600, fontFamily:"'DM Serif Display',serif", color:'#fff' },
  closeBtnDark: { width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' },
  modalBody: { padding:'18px 22px 22px' },
  section:   { paddingBottom:16, marginBottom:16, borderBottom:'1px dashed #F0F0F0' },
  sectionLabel: { fontSize:10, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 },
  formRow:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  infoLabel: { fontSize:10, fontWeight:500, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:2 },
  actionBtn: { flex:1, padding:'10px 14px', border:'1.5px solid #E8E8E8', borderRadius:10, background:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', transition:'background 0.15s' },
  actionBtnDanger: { color:'#E74C3C', borderColor:'#FDECEA', background:'#FDECEA' },
  label:     { display:'block', fontSize:10, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 },
  input:     { width:'100%', padding:'10px 12px', border:'1.5px solid #E8E8E8', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', background:'#fff', color:'#1A1A1A', outline:'none' },
  sectionTitle: { fontSize:11, fontWeight:600, color:'#555', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.6px' },
};
