'use client';

import { useState, useEffect } from 'react';
import { Card, PageHeader, Button } from '../../../components/UI';
import { useAgendamento } from '@/app/hooks/useAgendamento';
import { supabase } from '@/lib/supabase-client';

const blockColors = {
  green:  { background: '#D4EDDA', color: '#155724' },
  yellow: { background: '#FFF3CD', color: '#856404' },
  blue:   { background: '#D1ECF1', color: '#0C5460' },
  purple: { background: '#E2D9F3', color: '#432874' },
  red:    { background: '#F8D7DA', color: '#721C24' },
};

const statusColors = {
  confirmado: { background: '#E8F5E9', color: '#27AE60' },
  pendente:   { background: '#FFF9E6', color: '#F39C12' },
};

const colorOptions = ['green', 'blue', 'purple', 'yellow', 'red'];
const procedures = ['Limpeza Profissional', 'Tratamento de Canal', 'Restauração', 'Implante', 'Clareamento', 'Ortodontia', 'Extração', 'Revisão', 'Emergência'];
const dentists = ['Dra. Silva', 'Dr. Rocha', 'Dr. João'];
const statuses = ['confirmado', 'pendente'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const BLOQUEIOS_KEY = 'agenda_bloqueios';

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function calcDayTop(dateStr, hora, baseDate) {
  const selected = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((selected - baseDate) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 5) return null;
  const [h, m] = hora.split(':').map(Number);
  return { day: diff, top: (h - 8) * 60 + m };
}

function generateRandomPhone() {
  const area = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  const first = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  const last = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `(${area}) ${first}-${last}`;
}

function generateRandomAge() {
  return String(Math.floor(Math.random() * 60) + 18) + ' anos';
}

export default function Agenda() {
  const hoje = toISO(new Date());

  const [semanaAtual, setSemanaAtual] = useState(() => getMondayOfWeek(new Date()));
  const [agendamentosRaw, setAgendamentosRaw] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [view, setView] = useState('Semana');
  const [pacientesCadastrados, setPacientesCadastrados] = useState([]);
  const [sugestoesPaciente, setSugestoesPaciente] = useState([]);
  const [miniMes, setMiniMes] = useState(() => {
    const hoje = new Date();
    return { year: hoje.getFullYear(), month: hoje.getMonth() };
  });
  const [selected, setSelected] = useState(null);
  const [novoModal, setNovoModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mensagemFeedback, setMensagemFeedback] = useState(null);
  const [tipoFeedback, setTipoFeedback] = useState(null);
  const [bloqueios, setBloqueios] = useState({ diasSemana: [], datas: [], horarios: [] });
  const [modalBloqueio, setModalBloqueio] = useState(false);
  const [novaDataBloqueio, setNovaDataBloqueio] = useState('');
  const [novoHorarioBloqueio, setNovoHorarioBloqueio] = useState({ data: '', inicio: '11:00', fim: '14:00', motivo: '' });

  const { criarAgendamento, atualizarAgendamento, deletarAgendamento, obterAgendamentos, carregando } = useAgendamento();

  const [formData, setFormData] = useState({
    paciente: '', cpf: '', email: '', telefone: '',
    data: hoje, hora: '08:00',
    procedimento: 'Limpeza Profissional', dentista: 'Dra. Silva',
    observacoes: '', status: 'confirmado', color: 'green'
  });

  // Semana: segunda a sábado
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(semanaAtual);
    d.setDate(semanaAtual.getDate() + i);
    return {
      name: DAY_NAMES[d.getDay()],
      num: String(d.getDate()).padStart(2, '0'),
      date: toISO(d),
      today: toISO(d) === hoje,
    };
  });

  const semanaFim = new Date(semanaAtual);
  semanaFim.setDate(semanaAtual.getDate() + 5);
  const weekLabel = `${semanaAtual.getDate()} – ${semanaFim.getDate()} de ${MONTH_NAMES[semanaFim.getMonth()]}, ${semanaFim.getFullYear()}`;
  const weekSubtitle = `Semana de ${semanaAtual.getDate()} a ${semanaFim.getDate()} de ${MONTH_NAMES[semanaFim.getMonth()]}`;

  const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

  // Mini calendário dinâmico (navegável independente)
  const miniYear = miniMes.year;
  const miniMonth = miniMes.month;
  const miniFirstDay = new Date(miniYear, miniMonth, 1).getDay();
  const miniDaysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();

  const irMesAnterior = () => setMiniMes(prev => {
    if (prev.month === 0) return { year: prev.year - 1, month: 11 };
    return { year: prev.year, month: prev.month - 1 };
  });

  const irProximoMes = () => setMiniMes(prev => {
    if (prev.month === 11) return { year: prev.year + 1, month: 0 };
    return { year: prev.year, month: prev.month + 1 };
  });

  const irParaSemanaDoMiniDia = (dia) => {
    const data = new Date(miniYear, miniMonth, dia);
    setSemanaAtual(getMondayOfWeek(data));
  };
  const appointmentDates = new Set(agendamentosRaw.map(a => a.data));

  const miniCells = [];
  for (let i = 0; i < miniFirstDay; i++) miniCells.push({ empty: true });
  for (let d = 1; d <= miniDaysInMonth; d++) {
    const ds = `${miniYear}-${String(miniMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    miniCells.push({ d: String(d), today: ds === hoje, dot: appointmentDates.has(ds) });
  }

  const horaParaMin = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };

  const isDiaBloqueado = (dateStr) => {
    if (!dateStr) return false;
    const diaSemana = new Date(dateStr + 'T00:00:00').getDay();
    return bloqueios.diasSemana.includes(diaSemana) || bloqueios.datas.includes(dateStr);
  };

  const isHorarioBloqueado = (data, hora) => {
    if (!data || !hora) return false;
    const min = horaParaMin(hora);
    return (bloqueios.horarios || []).some(b =>
      b.data === data && horaParaMin(b.inicio) <= min && min < horaParaMin(b.fim)
    );
  };

  const getHorariosBloqueadosNoDia = (dateStr) => {
    return (bloqueios.horarios || []).filter(b => b.data === dateStr);
  };

  const salvarBloqueios = (novos) => {
    localStorage.setItem(BLOQUEIOS_KEY, JSON.stringify(novos));
    setBloqueios(novos);
  };

  const toggleDiaSemana = (dia) => {
    const atual = bloqueios.diasSemana;
    const novos = atual.includes(dia) ? atual.filter(d => d !== dia) : [...atual, dia];
    salvarBloqueios({ ...bloqueios, diasSemana: novos });
  };

  const adicionarDataBloqueio = () => {
    if (!novaDataBloqueio || bloqueios.datas.includes(novaDataBloqueio)) return;
    salvarBloqueios({ ...bloqueios, datas: [...bloqueios.datas, novaDataBloqueio].sort() });
    setNovaDataBloqueio('');
  };

  const removerDataBloqueio = (data) => {
    salvarBloqueios({ ...bloqueios, datas: bloqueios.datas.filter(d => d !== data) });
  };

  const adicionarHorarioBloqueio = () => {
    const { data, inicio, fim, motivo } = novoHorarioBloqueio;
    if (!data || !inicio || !fim) return;
    if (horaParaMin(inicio) >= horaParaMin(fim)) return;
    const novos = [...(bloqueios.horarios || []), { data, inicio, fim, motivo }]
      .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio));
    salvarBloqueios({ ...bloqueios, horarios: novos });
    setNovoHorarioBloqueio(prev => ({ ...prev, data: '', motivo: '' }));
  };

  const removerHorarioBloqueio = (idx) => {
    const novos = (bloqueios.horarios || []).filter((_, i) => i !== idx);
    salvarBloqueios({ ...bloqueios, horarios: novos });
  };

  // Carregar agendamentos e pacientes cadastrados
  useEffect(() => {
    const carregar = async () => {
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);
    };
    carregar();
    supabase.from('pacientes').select('id, nome, cpf, email, telefone').order('nome').then(({ data }) => {
      if (data) setPacientesCadastrados(data);
    });
    const savedBloqueios = localStorage.getItem(BLOQUEIOS_KEY);
    if (savedBloqueios) setBloqueios(JSON.parse(savedBloqueios));
  }, [obterAgendamentos]);

  const handlePacienteDigitado = (valor) => {
    setFormData(prev => ({ ...prev, paciente: valor }));
    if (valor.length >= 2) {
      const sugs = pacientesCadastrados.filter(p => p.nome.toLowerCase().includes(valor.toLowerCase())).slice(0, 5);
      setSugestoesPaciente(sugs);
    } else {
      setSugestoesPaciente([]);
    }
  };

  const selecionarPacienteCadastrado = (p) => {
    setFormData(prev => ({ ...prev, paciente: p.nome, cpf: p.cpf || '', email: p.email || '', telefone: p.telefone || '' }));
    setSugestoesPaciente([]);
  };

  // Re-mapear quando semana ou dados mudam
  useEffect(() => {
    const mapeados = agendamentosRaw
      .map(a => {
        const pos = calcDayTop(a.data, a.hora, semanaAtual);
        if (!pos) return null;
        return {
          id: a.id,
          day: pos.day, top: pos.top, h: 52,
          color: a.color || 'green',
          name: a.pacienteNome,
          proc: `${a.hora} · ${a.procedimento}`,
          hora: a.hora, date: a.data,
          procedimento: a.procedimento,
          dentista: a.dentistaNome || 'Não informado',
          age: generateRandomAge(),
          phone: generateRandomPhone(),
          status: a.status || 'confirmado',
          notes: a.observacoes || '',
          pacienteEmail: a.pacienteEmail,
          pacienteTelefone: a.pacienteTelefone,
        };
      })
      .filter(Boolean);
    setAgendamentos(mapeados);
  }, [agendamentosRaw, semanaAtual]);

  const irSemanaAnterior = () => {
    setSemanaAtual(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const irProximaSemana = () => {
    setSemanaAtual(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleNovoClick = () => {
    setEditingId(null);
    setFormData({ paciente: '', cpf: '', email: '', telefone: '', data: hoje, hora: '08:00', procedimento: 'Limpeza Profissional', dentista: 'Dra. Silva', observacoes: '', status: 'confirmado', color: 'green' });
    setNovoModal(true);
  };

  const handleSaveAgendamento = async () => {
    if (!formData.paciente.trim() || !formData.data || !formData.hora) {
      setMensagemFeedback('Por favor, preencha nome do paciente, data e hora');
      setTipoFeedback('erro');
      setTimeout(() => setMensagemFeedback(null), 3000);
      return;
    }
    if (isDiaBloqueado(formData.data)) {
      setMensagemFeedback('Esta data está bloqueada. O dentista não atende neste dia.');
      setTipoFeedback('erro');
      setTimeout(() => setMensagemFeedback(null), 4000);
      return;
    }
    if (isHorarioBloqueado(formData.data, formData.hora)) {
      const bloqueo = (bloqueios.horarios || []).find(b =>
        b.data === formData.data && horaParaMin(b.inicio) <= horaParaMin(formData.hora) && horaParaMin(formData.hora) < horaParaMin(b.fim)
      );
      setMensagemFeedback(`Horário bloqueado das ${bloqueo.inicio} às ${bloqueo.fim}${bloqueo.motivo ? ` — ${bloqueo.motivo}` : ''}.`);
      setTipoFeedback('erro');
      setTimeout(() => setMensagemFeedback(null), 4000);
      return;
    }

    const dadosAgendamento = {
      id: editingId,
      pacienteNome: formData.paciente,
      pacienteEmail: formData.email || null,
      pacienteTelefone: formData.telefone || null,
      pacienteCpf: formData.cpf || null,
      data: formData.data,
      hora: formData.hora,
      procedimento: formData.procedimento,
      dentistaNome: formData.dentista,
      observacoes: formData.observacoes,
      status: formData.status,
      color: formData.color,
    };

    let resultado;
    if (editingId) {
      resultado = await atualizarAgendamento(editingId, dadosAgendamento);
    } else {
      resultado = await criarAgendamento(dadosAgendamento);
    }

    if (resultado.sucesso) {
      setMensagemFeedback(resultado.mensagem);
      setTipoFeedback('sucesso');

      // Recarregar da base para garantir consistência
      const raw = await obterAgendamentos();
      setAgendamentosRaw(raw);

      setTimeout(() => {
        setMensagemFeedback(null);
        setNovoModal(false);
        setSelected(null);
        setEditingId(null);
      }, 1500);
    } else {
      setMensagemFeedback(resultado.mensagem);
      setTipoFeedback('erro');
      setTimeout(() => setMensagemFeedback(null), 4000);
    }
  };

  const handleEditAgendamento = (agendamento) => {
    setEditingId(agendamento.id);
    setFormData({
      paciente: agendamento.name,
      cpf: agendamento.pacienteCpf || '',
      email: agendamento.pacienteEmail || '',
      telefone: agendamento.pacienteTelefone || '',
      data: agendamento.date,
      hora: agendamento.hora,
      procedimento: agendamento.procedimento,
      dentista: agendamento.dentista,
      observacoes: agendamento.notes,
      status: agendamento.status,
      color: agendamento.color
    });
    setNovoModal(true);
  };

  const handleDeleteAgendamento = async (id) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      const resultado = await deletarAgendamento(id);
      if (resultado.sucesso) {
        const raw = await obterAgendamentos();
        setAgendamentosRaw(raw);
        setMensagemFeedback('Agendamento cancelado com sucesso');
        setTipoFeedback('sucesso');
        setTimeout(() => { setMensagemFeedback(null); setSelected(null); }, 2000);
      } else {
        setMensagemFeedback('Erro ao cancelar agendamento');
        setTipoFeedback('erro');
        setTimeout(() => setMensagemFeedback(null), 3000);
      }
    }
  };

  const upcoming = agendamentos.filter(a => a.date === hoje).slice(0, 4);

  return (
    <div style={s.main}>
      <PageHeader title="Agenda" subtitle={weekSubtitle}>
        <Button variant="ghost">Filtrar dentista</Button>
        <Button variant="ghost" onClick={() => setModalBloqueio(true)}>
          Bloquear Agenda
        </Button>
        <Button onClick={handleNovoClick} disabled={carregando}>
          {carregando ? '⏳ Processando...' : '+ Novo agendamento'}
        </Button>
      </PageHeader>

      <div style={s.weekNav}>
        <button style={s.navBtn} onClick={irSemanaAnterior}>&#8249;</button>
        <span style={s.weekLabel}>{weekLabel}</span>
        <button style={s.navBtn} onClick={irProximaSemana}>&#8250;</button>
        <div style={s.viewTabs}>
          {['Semana','Dia','Mês'].map(v => (
            <div key={v} style={{ ...s.viewTab, ...(view === v ? s.viewTabActive : {}) }} onClick={() => setView(v)}>{v}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.calWrap}>
            <div style={s.calHead}>
              <div style={s.headEmpty} />
              {days.map(d => (
                <div key={d.date} style={{ ...s.dayCol, ...(isDiaBloqueado(d.date) ? s.dayColBloqueado : {}) }}>
                  <div style={s.dayName}>{d.name}</div>
                  <div style={{ ...s.dayNum, ...(d.today ? s.dayNumToday : {}) }}>{d.num}</div>
                  {isDiaBloqueado(d.date) && <div style={{ fontSize: 9, color: '#E74C3C', fontWeight: 600, marginTop: 2, letterSpacing: '0.4px' }}>FECHADO</div>}
                </div>
              ))}
            </div>
            <div style={{ ...s.calBody, maxHeight: 420, overflowY: 'auto' }}>
              <div>
                {hours.map(h => <div key={h} style={s.timeSlot}>{h}</div>)}
              </div>
              {days.map((d, di) => (
                <div key={d.date} style={s.dayColBody}>
                  {hours.map(h => <div key={h} style={s.hourLine} />)}
                  {isDiaBloqueado(d.date) && (
                    <div style={s.diaBloquedoOverlay}>
                      <div style={s.diaBloquedoTexto}>Agenda Fechada</div>
                    </div>
                  )}
                  {!isDiaBloqueado(d.date) && getHorariosBloqueadosNoDia(d.date).map((b, bi) => {
                    const topPx = horaParaMin(b.inicio) - 8 * 60;
                    const heightPx = horaParaMin(b.fim) - horaParaMin(b.inicio);
                    return (
                      <div key={bi} style={{ ...s.horarioBloqueadoBlock, top: topPx, height: heightPx }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#C0392B' }}>Bloqueado</div>
                        <div style={{ fontSize: 9, color: '#E74C3C', marginTop: 1 }}>{b.inicio}–{b.fim}</div>
                        {b.motivo ? <div style={{ fontSize: 9, color: '#888', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.motivo}</div> : null}
                      </div>
                    );
                  })}
                  {!isDiaBloqueado(d.date) && agendamentos.filter(a => a.day === di).map((a) => (
                    <div key={a.id} style={{ ...s.apptBlock, ...blockColors[a.color], top: a.top, height: a.h }} onClick={() => setSelected(a)}>
                      <div style={s.apptName}>{a.name}</div>
                      <div style={s.apptProc}>{a.proc}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button style={s.miniNavBtn} onClick={irMesAnterior}>&#8249;</button>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{MONTH_NAMES[miniMonth]} {miniYear}</div>
              <button style={s.miniNavBtn} onClick={irProximoMes}>&#8250;</button>
            </div>
            <div style={s.miniGrid}>
              {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} style={s.miniDayName}>{d}</div>)}
              {miniCells.map((d, i) => (
                <div key={i}
                  style={{ ...s.miniDay, ...(d.today ? s.miniToday : {}), ...(d.empty ? { color: 'transparent', pointerEvents: 'none' } : {}) }}
                  onClick={() => d.d && !d.empty && irParaSemanaDoMiniDia(Number(d.d))}
                >
                  {d.d || ''}
                  {d.dot && !d.today && <div style={s.miniDot} />}
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Próximos hoje</div>
            {upcoming.length > 0 ? (
              upcoming.map(u => (
                <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{u.proc}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: '#AAA' }}>Nenhum agendamento hoje</div>
            )}
          </Card>
        </div>
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.modalHeader, ...blockColors[selected.color] }}>
              <div>
                <div style={s.modalName}>{selected.name}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{selected.proc}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.infoGrid}>
                {[['Procedimento', selected.procedimento],['Dentista', selected.dentista],['Idade', selected.age],['Telefone', selected.phone]].map(([label, val]) => (
                  <div key={label}>
                    <div style={s.infoLabel}>{label}</div>
                    <div style={s.infoVal}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <span style={s.infoLabel}>Status</span>
                <span style={{ ...s.statusBadge, ...statusColors[selected.status] }}>{selected.status}</span>
              </div>
              {selected.notes ? (
                <div style={s.notes}>
                  <div style={s.infoLabel}>Observações</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4, lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              ) : null}
              <div style={s.actions}>
                <button style={s.actionBtn} onClick={() => setSelected(null)}>Fechar</button>
                <button style={s.actionBtn} onClick={() => handleEditAgendamento(selected)}>Editar</button>
                <button style={{ ...s.actionBtn, ...s.actionBtnDanger }} onClick={() => handleDeleteAgendamento(selected.id)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalBloqueio && (
        <div style={s.overlay} onClick={() => setModalBloqueio(false)}>
          <div style={{ ...s.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.modalHeader, background: '#FFF3CD', color: '#856404' }}>
              <div>
                <div style={s.modalName}>Bloquear Agenda</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Configure dias sem atendimento</div>
              </div>
              <button style={s.closeBtn} onClick={() => setModalBloqueio(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Dias da semana sem atendimento
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0,1,2,3,4,5,6].map(dia => (
                    <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: bloqueios.diasSemana.includes(dia) ? '#FFF3CD' : '#FAFAFA', border: `1.5px solid ${bloqueios.diasSemana.includes(dia) ? '#F39C12' : '#EFEFEF'}` }}>
                      <input
                        type="checkbox"
                        checked={bloqueios.diasSemana.includes(dia)}
                        onChange={() => toggleDiaSemana(dia)}
                        style={{ width: 16, height: 16, accentColor: '#F39C12' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{DAY_NAMES_FULL[dia]}</span>
                      {bloqueios.diasSemana.includes(dia) && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#856404', fontWeight: 600 }}>Fechado</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Bloquear data específica
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="date"
                    style={{ ...s.input, flex: 1 }}
                    value={novaDataBloqueio}
                    min={hoje}
                    onChange={e => setNovaDataBloqueio(e.target.value)}
                  />
                  <button
                    style={{ padding: '10px 16px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={adicionarDataBloqueio}
                  >
                    + Bloquear
                  </button>
                </div>
                {bloqueios.datas.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#AAA', textAlign: 'center', padding: '12px 0' }}>Nenhuma data bloqueada</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bloqueios.datas.map(data => {
                      const [ano, mes, dia] = data.split('-');
                      const diaSemana = new Date(data + 'T00:00:00').getDay();
                      return (
                        <div key={data} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#FDECEA', border: '1.5px solid #FFCDD2' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#C62828' }}>{dia}/{mes}/{ano}</span>
                            <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{DAY_NAMES_FULL[diaSemana]}</span>
                          </div>
                          <button onClick={() => removerDataBloqueio(data)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E74C3C', fontSize: 14, fontWeight: 600, padding: '2px 6px' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 24, borderTop: '1.5px solid #EFEFEF', paddingTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Bloquear horário específico
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#AAA', fontWeight: 600, marginBottom: 4 }}>DATA</div>
                    <input
                      type="date"
                      style={s.input}
                      value={novoHorarioBloqueio.data}
                      min={hoje}
                      onChange={e => setNovoHorarioBloqueio(p => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#AAA', fontWeight: 600, marginBottom: 4 }}>DAS</div>
                    <input
                      type="time"
                      style={s.input}
                      value={novoHorarioBloqueio.inicio}
                      onChange={e => setNovoHorarioBloqueio(p => ({ ...p, inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#AAA', fontWeight: 600, marginBottom: 4 }}>ATÉ</div>
                    <input
                      type="time"
                      style={s.input}
                      value={novoHorarioBloqueio.fim}
                      onChange={e => setNovoHorarioBloqueio(p => ({ ...p, fim: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    style={{ ...s.input, flex: 1 }}
                    placeholder="Motivo (opcional)"
                    value={novoHorarioBloqueio.motivo}
                    onChange={e => setNovoHorarioBloqueio(p => ({ ...p, motivo: e.target.value }))}
                  />
                  <button
                    style={{ padding: '10px 16px', background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={adicionarHorarioBloqueio}
                  >
                    + Bloquear
                  </button>
                </div>
                {(bloqueios.horarios || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: '#AAA', textAlign: 'center', padding: '8px 0' }}>Nenhum horário bloqueado</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {(bloqueios.horarios || []).map((b, idx) => {
                      const [ano, mes, dia] = b.data.split('-');
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#FFF5F5', border: '1.5px solid #FFCDD2' }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#C62828' }}>{dia}/{mes}/{ano}</span>
                            <span style={{ fontSize: 12, color: '#E74C3C', marginLeft: 8 }}>{b.inicio}–{b.fim}</span>
                            {b.motivo && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{b.motivo}</span>}
                          </div>
                          <button onClick={() => removerHorarioBloqueio(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E74C3C', fontSize: 14, fontWeight: 600, padding: '2px 6px' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20 }}>
                <button style={{ ...s.actionBtn, background: '#A8D5C2', borderColor: '#A8D5C2', width: '100%' }} onClick={() => setModalBloqueio(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {novoModal && (
        <div style={s.overlay} onClick={() => setNovoModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.modalHeader, background: '#A8D5C2', color: '#1A1A1A' }}>
              <div>
                <div style={s.modalName}>{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setNovoModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              {mensagemFeedback && (
                <div style={{
                  padding: '10px 14px', marginBottom: 12, borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: tipoFeedback === 'sucesso' ? '#E8F5E9' : '#FFEBEE',
                  color: tipoFeedback === 'sucesso' ? '#27AE60' : '#C62828',
                  border: `1.5px solid ${tipoFeedback === 'sucesso' ? '#C8E6C9' : '#FFCDD2'}`,
                }}>
                  {tipoFeedback === 'sucesso' ? '✅' : '❌'} {mensagemFeedback}
                </div>
              )}
              <div style={s.formRow}>
                <div style={{ ...s.formGroup, position: 'relative' }}>
                  <label style={s.label}>Paciente</label>
                  <input type="text" style={s.input} placeholder="Nome do paciente" value={formData.paciente} onChange={e => handlePacienteDigitado(e.target.value)} autoComplete="off" />
                  {sugestoesPaciente.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 8, zIndex: 300, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', marginTop: 2 }}>
                      {sugestoesPaciente.map(p => (
                        <div key={p.id} onClick={() => selecionarPacienteCadastrado(p)}
                          style={{ padding: '10px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #F5F5F5' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8F8F8'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <strong>{p.nome}</strong>
                          {p.cpf && <span style={{ color: '#AAA', marginLeft: 8 }}>{p.cpf}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>CPF</label>
                  <input type="text" style={s.input} placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Email</label>
                  <input type="email" style={s.input} placeholder="email@exemplo.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Telefone</label>
                  <input type="tel" style={s.input} placeholder="11987654321" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
                </div>
              </div>
              <div style={s.formRow}>
                <div style={s.formGroup}>
                  <label style={s.label}>Data</label>
                  <input type="date" style={s.input} value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Hora</label>
                  <input type="time" style={s.input} value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Procedimento</label>
                <select style={s.input} value={formData.procedimento} onChange={e => setFormData({ ...formData, procedimento: e.target.value })}>
                  {procedures.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Dentista</label>
                <select style={s.input} value={formData.dentista} onChange={e => setFormData({ ...formData, dentista: e.target.value })}>
                  {dentists.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Status</label>
                <select style={s.input} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {colorOptions.map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })} style={{ ...blockColors[c], width: 40, height: 40, border: formData.color === c ? '2px solid #1A1A1A' : '1px solid #CCC', borderRadius: 6, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Observações</label>
                <textarea style={{ ...s.input, minHeight: 80 }} placeholder="Adicione observações..." value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
              </div>
              <div style={s.actions}>
                <button style={{ ...s.actionBtn, background: '#E8E8E8' }} onClick={() => setNovoModal(false)} disabled={carregando}>Cancelar</button>
                <button
                  style={{ ...s.actionBtn, background: carregando ? '#CCC' : '#A8D5C2', color: '#1A1A1A', cursor: carregando ? 'not-allowed' : 'pointer' }}
                  onClick={handleSaveAgendamento}
                  disabled={carregando}
                >
                  {carregando ? '⏳ Salvando...' : (editingId ? 'Atualizar' : 'Agendar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  weekNav: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  weekLabel: { fontSize: 15, fontWeight: 500, minWidth: 240, textAlign: 'center' },
  navBtn: { width: 32, height: 32, border: '1.5px solid #E8E8E8', background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#555' },
  viewTabs: { display: 'flex', gap: 4, background: '#EFEFEF', borderRadius: 8, padding: 3, marginLeft: 'auto' },
  viewTab: { padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#888' },
  viewTabActive: { background: '#fff', color: '#1A1A1A', fontWeight: 500 },
  calWrap: { background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', overflow: 'hidden' },
  calHead: { display: 'grid', gridTemplateColumns: '64px repeat(6, 1fr)', borderBottom: '1.5px solid #EFEFEF' },
  headEmpty: { padding: 16, borderRight: '1px solid #F0F0F0' },
  dayCol: { padding: '14px 8px', textAlign: 'center', borderRight: '1px solid #F0F0F0' },
  dayName: { fontSize: 11, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.8px' },
  dayNum: { fontSize: 22, fontFamily: "'DM Serif Display', serif", lineHeight: 1.2, marginTop: 2 },
  dayNumToday: { background: '#A8D5C2', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0', fontSize: 18 },
  calBody: { display: 'grid', gridTemplateColumns: '64px repeat(6, 1fr)' },
  timeSlot: { height: 60, padding: '6px 8px 0', fontSize: 10, color: '#CCC', textAlign: 'right', borderRight: '1px solid #F0F0F0' },
  dayColBody: { position: 'relative', borderRight: '1px solid #F0F0F0' },
  hourLine: { height: 60, borderBottom: '1px solid #F8F8F8' },
  apptBlock: { position: 'absolute', left: 4, right: 4, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', overflow: 'hidden' },
  apptName: { fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  apptProc: { fontSize: 10, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' },
  miniDayName: { fontSize: 9, color: '#CCC', padding: '2px 0', textTransform: 'uppercase' },
  miniNavBtn: { width: 24, height: 24, border: '1px solid #E8E8E8', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  miniDay: { fontSize: 11, padding: '4px 2px', borderRadius: 4, cursor: 'pointer', color: '#555', position: 'relative' },
  miniToday: { background: '#1A1A1A', color: '#fff', borderRadius: '50%' },
  miniDot: { position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: '#A8D5C2' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalName: { fontSize: 17, fontWeight: 600, fontFamily: "'DM Serif Display', serif" },
  closeBtn: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', opacity: 0.6, padding: 4 },
  modalBody: { padding: '16px 20px 20px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  infoLabel: { fontSize: 10, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 },
  infoVal: { fontSize: 13, color: '#1A1A1A' },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' },
  notes: { marginTop: 14, padding: 12, background: '#FAFAFA', borderRadius: 8 },
  actions: { display: 'flex', gap: 8, marginTop: 20 },
  actionBtn: { flex: 1, padding: '10px 8px', border: '1.5px solid #E8E8E8', borderRadius: 10, background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#1A1A1A' },
  actionBtnDanger: { color: '#E74C3C', borderColor: '#FDECEA', background: '#FDECEA' },
  formGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  dayColBloqueado: { background: '#FFF8F8' },
  diaBloquedoOverlay: { position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(231,76,60,0.06) 8px, rgba(231,76,60,0.06) 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  diaBloquedoTexto: { background: 'rgba(231,76,60,0.12)', color: '#E74C3C', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 4, textAlign: 'center' },
  horarioBloqueadoBlock: { position: 'absolute', left: 4, right: 4, background: 'repeating-linear-gradient(45deg, #FFF5F5, #FFF5F5 6px, #FFEBEE 6px, #FFEBEE 12px)', border: '1.5px solid #FFCDD2', borderRadius: 6, padding: '5px 7px', zIndex: 1, overflow: 'hidden' },
};
