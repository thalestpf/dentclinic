import React, { useState } from 'react';
import { Card, PageHeader, Button } from '../components/UI';

const days = [
  { name: 'Seg', num: '23', today: true },
  { name: 'Ter', num: '24' },
  { name: 'Qua', num: '25' },
  { name: 'Qui', num: '26' },
  { name: 'Sex', num: '27' },
  { name: 'Sáb', num: '28' },
];

const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

const appts = [
  { day: 0, top: 4,   h: 52, color: 'green',  name: 'Ana Costa',     proc: '08:00 · Limpeza' },
  { day: 0, top: 124, h: 52, color: 'blue',   name: 'Carlos Lima',   proc: '10:00 · Canal' },
  { day: 0, top: 364, h: 52, color: 'purple', name: 'Pedro Alves',   proc: '14:00 · Ortodontia' },
  { day: 1, top: 64,  h: 52, color: 'yellow', name: 'Mariana Souza', proc: '09:00 · Extração' },
  { day: 1, top: 244, h: 52, color: 'green',  name: 'Rafael Gomes',  proc: '12:00 · Limpeza' },
  { day: 2, top: 4,   h: 52, color: 'blue',   name: 'Julia Mendes',  proc: '08:00 · Implante' },
  { day: 2, top: 184, h: 52, color: 'purple', name: 'Lucia Prado',   proc: '11:00 · Aparelho' },
  { day: 2, top: 424, h: 52, color: 'green',  name: 'Tiago Rocha',   proc: '15:00 · Clareamento' },
  { day: 3, top: 124, h: 52, color: 'yellow', name: 'Beatriz Neves', proc: '10:00 · Revisão' },
  { day: 3, top: 304, h: 52, color: 'red',    name: 'Hugo Ferreira', proc: '13:00 · Emergência' },
  { day: 4, top: 4,   h: 52, color: 'green',  name: 'Camila Torres', proc: '08:00 · Limpeza' },
  { day: 4, top: 364, h: 52, color: 'blue',   name: 'Daniel Castro', proc: '14:00 · Canal' },
  { day: 5, top: 64,  h: 52, color: 'purple', name: 'Isabela Lopes', proc: '09:00 · Ortodontia' },
];

const blockColors = {
  green:  { background: '#D4EDDA', color: '#155724' },
  yellow: { background: '#FFF3CD', color: '#856404' },
  blue:   { background: '#D1ECF1', color: '#0C5460' },
  purple: { background: '#E2D9F3', color: '#432874' },
  red:    { background: '#F8D7DA', color: '#721C24' },
};

const upcoming = [
  { name: 'Pedro Alves',   meta: '14:00 · Ortodontia' },
  { name: 'Julia Mendes',  meta: '15:30 · Implante' },
  { name: 'Tiago Rocha',   meta: '16:00 · Clareamento' },
  { name: 'Beatriz Neves', meta: '17:00 · Revisão' },
];

const miniDays = [
  { d: '',  empty: true }, { d: '',  empty: true }, { d: '',  empty: true },
  { d: '',  empty: true }, { d: '',  empty: true }, { d: '',  empty: true }, { d: '1' },
  { d: '2' }, { d: '3', dot: true }, { d: '4' }, { d: '5', dot: true }, { d: '6' }, { d: '7', dot: true }, { d: '8' },
  { d: '9' }, { d: '10', dot: true }, { d: '11' }, { d: '12' }, { d: '13', dot: true }, { d: '14' }, { d: '15' },
  { d: '16' }, { d: '17', dot: true }, { d: '18' }, { d: '19', dot: true }, { d: '20' }, { d: '21' }, { d: '22' },
  { d: '23', today: true }, { d: '24', dot: true }, { d: '25', dot: true }, { d: '26', dot: true }, { d: '27', dot: true }, { d: '28' }, { d: '29' },
  { d: '30' }, { d: '31' },
];

const apptDetails = {
  'Ana Costa':     { age: '32 anos', phone: '(31) 98765-4321', proc: 'Limpeza profissional', dr: 'Dra. Silva', status: 'confirmado', notes: 'Trazer exames anteriores.' },
  'Carlos Lima':   { age: '45 anos', phone: '(31) 97654-3210', proc: 'Tratamento de canal', dr: 'Dra. Silva', status: 'confirmado', notes: '' },
  'Pedro Alves':   { age: '28 anos', phone: '(31) 96543-2109', proc: 'Ortodontia - ajuste', dr: 'Dr. Rocha', status: 'pendente', notes: 'Verificar aparelho inferior.' },
  'Mariana Souza': { age: '38 anos', phone: '(31) 95432-1098', proc: 'Extração do siso', dr: 'Dra. Silva', status: 'confirmado', notes: 'Paciente ansiosa, considerar sedação.' },
  'Rafael Gomes':  { age: '22 anos', phone: '(31) 94321-0987', proc: 'Limpeza', dr: 'Dra. Silva', status: 'pendente', notes: '' },
  'Julia Mendes':  { age: '50 anos', phone: '(31) 93210-9876', proc: 'Implante - consulta', dr: 'Dr. Rocha', status: 'confirmado', notes: 'Aguardando resultado de exame de osso.' },
  'Lucia Prado':   { age: '17 anos', phone: '(31) 92109-8765', proc: 'Aparelho - manutenção', dr: 'Dr. Rocha', status: 'confirmado', notes: '' },
  'Tiago Rocha':   { age: '34 anos', phone: '(31) 91098-7654', proc: 'Clareamento dental', dr: 'Dra. Silva', status: 'pendente', notes: '' },
  'Beatriz Neves': { age: '29 anos', phone: '(31) 90987-6543', proc: 'Revisão anual', dr: 'Dra. Silva', status: 'confirmado', notes: '' },
  'Hugo Ferreira': { age: '41 anos', phone: '(31) 99876-5432', proc: 'Emergência - dor', dr: 'Dra. Silva', status: 'confirmado', notes: 'Dor intensa dente 45.' },
  'Camila Torres': { age: '26 anos', phone: '(31) 98765-5432', proc: 'Limpeza', dr: 'Dra. Silva', status: 'confirmado', notes: '' },
  'Daniel Castro': { age: '55 anos', phone: '(31) 97654-4321', proc: 'Tratamento de canal', dr: 'Dr. Rocha', status: 'pendente', notes: '' },
  'Isabela Lopes': { age: '19 anos', phone: '(31) 96543-3210', proc: 'Ortodontia - início', dr: 'Dr. Rocha', status: 'confirmado', notes: 'Primeira consulta de aparelho.' },
};

const statusColors = {
  confirmado: { background: '#E8F5E9', color: '#27AE60' },
  pendente:   { background: '#FFF9E6', color: '#F39C12' },
};

export default function Agenda() {
  const [view, setView] = useState('Semana');
  const [selected, setSelected] = useState(null);

  return (
    <div style={s.main}>
      <PageHeader title="Agenda" subtitle="Semana de 23 a 28 de março">
        <Button variant="ghost">Filtrar dentista</Button>
        <Button>+ Novo agendamento</Button>
      </PageHeader>

      {/* Week nav */}
      <div style={s.weekNav}>
        <button style={s.navBtn}>&#8249;</button>
        <span style={s.weekLabel}>23 – 28 de Março, 2026</span>
        <button style={s.navBtn}>&#8250;</button>
        <div style={s.viewTabs}>
          {['Semana','Dia','Mês'].map(v => (
            <div key={v} style={{ ...s.viewTab, ...(view === v ? s.viewTabActive : {}) }} onClick={() => setView(v)}>{v}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Calendar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.calWrap}>
            {/* Header */}
            <div style={s.calHead}>
              <div style={s.headEmpty} />
              {days.map(d => (
                <div key={d.num} style={s.dayCol}>
                  <div style={s.dayName}>{d.name}</div>
                  <div style={{ ...s.dayNum, ...(d.today ? s.dayNumToday : {}) }}>{d.num}</div>
                </div>
              ))}
            </div>
            {/* Body */}
            <div style={{ ...s.calBody, maxHeight: 420, overflowY: 'auto' }}>
              {/* Time column */}
              <div>
                {hours.map(h => <div key={h} style={s.timeSlot}>{h}</div>)}
              </div>
              {/* Day columns */}
              {days.map((d, di) => (
                <div key={di} style={s.dayColBody}>
                  {hours.map(h => <div key={h} style={s.hourLine} />)}
                  {appts.filter(a => a.day === di).map((a, ai) => (
                    <div key={ai} style={{ ...s.apptBlock, ...blockColors[a.color], top: a.top, height: a.h }} onClick={() => setSelected(a)}>
                      <div style={s.apptName}>{a.name}</div>
                      <div style={s.apptProc}>{a.proc}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mini calendar */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Março 2026</div>
            <div style={s.miniGrid}>
              {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} style={s.miniDayName}>{d}</div>)}
              {miniDays.map((d, i) => (
                <div key={i} style={{ ...s.miniDay, ...(d.today ? s.miniToday : {}), ...(d.empty ? { color: 'transparent' } : {}) }}>
                  {d.d}
                  {d.dot && !d.today && <div style={s.miniDot} />}
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Próximos hoje</div>
            {upcoming.map(u => (
              <div key={u.name} style={{ padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{u.meta}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
      {/* Modal */}
      {selected && (() => {
        const d = apptDetails[selected.name] || {};
        return (
          <div style={s.overlay} onClick={() => setSelected(null)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ ...s.modalHeader, ...blockColors[selected.color] }}>
                <div>
                  <div style={s.modalName}>{selected.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{selected.proc}</div>
                </div>
                <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>

              {/* Info */}
              <div style={s.modalBody}>
                <div style={s.infoGrid}>
                  {[
                    ['Procedimento', d.proc],
                    ['Dentista', d.dr],
                    ['Idade', d.age],
                    ['Telefone', d.phone],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={s.infoLabel}>{label}</div>
                      <div style={s.infoVal}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <span style={s.infoLabel}>Status</span>
                  <span style={{ ...s.statusBadge, ...statusColors[d.status] }}>{d.status}</span>
                </div>

                {/* Notes */}
                {d.notes ? (
                  <div style={s.notes}>
                    <div style={s.infoLabel}>Observações</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 4, lineHeight: 1.5 }}>{d.notes}</div>
                  </div>
                ) : null}

                {/* Actions */}
                <div style={s.actions}>
                  <button style={s.actionBtn}>Abrir prontuário</button>
                  <button style={s.actionBtn}>Confirmar</button>
                  <button style={{ ...s.actionBtn, ...s.actionBtnDanger }}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  weekNav: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  weekLabel: { fontSize: 15, fontWeight: 500, minWidth: 200, textAlign: 'center' },
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
  miniDay: { fontSize: 11, padding: '4px 2px', borderRadius: 4, cursor: 'pointer', color: '#555', position: 'relative' },
  miniToday: { background: '#1A1A1A', color: '#fff', borderRadius: '50%' },
  miniDot: { position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: '#A8D5C2' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
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
};
