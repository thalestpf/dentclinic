import React, { useState } from 'react';
import { Card, CardTitle, PageHeader, Button, Badge } from '../components/UI';

const initialTeeth = [
  {n:'18',s:'ok'},{n:'17',s:'ok'},{n:'16',s:'restored'},{n:'15',s:'ok'},{n:'14',s:'cavity'},{n:'13',s:'ok'},{n:'12',s:'ok'},{n:'11',s:'cavity'},
  {n:'21',s:'ok'},{n:'22',s:'ok'},{n:'23',s:'ok'},{n:'24',s:'ok'},{n:'25',s:'ok'},{n:'26',s:'restored'},{n:'27',s:'ok'},{n:'28',s:'missing'},
  {n:'38',s:'missing'},{n:'37',s:'ok'},{n:'36',s:'restored'},{n:'35',s:'ok'},{n:'34',s:'ok'},{n:'33',s:'ok'},{n:'32',s:'ok'},{n:'31',s:'ok'},
  {n:'41',s:'ok'},{n:'42',s:'ok'},{n:'43',s:'ok'},{n:'44',s:'ok'},{n:'45',s:'cavity'},{n:'46',s:'ok'},{n:'47',s:'ok'},{n:'48',s:'missing'},
];

const toothStyles = {
  ok:        { background: '#E8F5E9', border: '1.5px solid #A8D5C2' },
  cavity:    { background: '#FFF3CD', border: '1.5px solid #F39C12' },
  restored:  { background: '#D1ECF1', border: '1.5px solid #17A2B8' },
  missing:   { background: '#F8D7DA', border: '1.5px solid #E74C3C', opacity: 0.6 },
  fracture:  { background: '#FFE8D6', border: '1.5px solid #E67E22' },
  prosthesis:{ background: '#EDE7F6', border: '1.5px solid #7B1FA2' },
  crown:     { background: '#E3F2FD', border: '1.5px solid #1565C0' },
  partial:   { background: '#E8EAF6', border: '1.5px solid #3949AB' },
  implant:   { background: '#E0F7FA', border: '1.5px solid #00838F' },
  tartar:    { background: '#F5F5DC', border: '1.5px solid #8D6E63' },
};

const toothIcons = {
  ok: '🦷', cavity: '⚠', restored: '🔵', missing: '✕',
  fracture: '⚡', prosthesis: '👑', crown: '♛', partial: '◑', implant: '🔩', tartar: '●',
};

const statusOptions = [
  { key: 'ok',         label: 'Saudável',      color: '#A8D5C2' },
  { key: 'cavity',     label: 'Cárie',          color: '#F39C12' },
  { key: 'restored',   label: 'Restaurado',     color: '#17A2B8' },
  { key: 'missing',    label: 'Ausente',        color: '#E74C3C' },
  { key: 'fracture',   label: 'Fratura',        color: '#E67E22' },
  { key: 'prosthesis', label: 'Prótese',        color: '#7B1FA2' },
  { key: 'crown',      label: 'Coroa total',    color: '#1565C0' },
  { key: 'partial',    label: 'Coroa parcial',  color: '#3949AB' },
  { key: 'implant',    label: 'Implante',       color: '#00838F' },
  { key: 'tartar',     label: 'Tártaro',        color: '#8D6E63' },
];

const plan = [
  { name: 'Limpeza profissional', price: 'R$150', done: true },
  { name: 'Restauração dente 36', price: 'R$280', done: true },
  { name: 'Canal dente 11', price: 'R$900', done: false },
  { name: 'Clareamento', price: 'R$600', done: false },
];

const evolution = [
  { date: '23 Mar 2026', proc: 'Limpeza profissional', note: 'Remoção de tártaro. Paciente sem queixas. Boa higienização.', dr: 'Dra. Silva' },
  { date: '10 Jan 2026', proc: 'Restauração composta', note: 'Restauração dente 36 com resina A2. Sem intercorrências.', dr: 'Dra. Silva' },
  { date: '05 Out 2025', proc: 'Avaliação inicial', note: 'Paciente com cárie D36 e tártaro generalizado. Plano montado.', dr: 'Dra. Silva' },
];

const tabs = ['Odontograma', 'Anamnese', 'Plano de tratamento', 'Evolução clínica', 'Documentos'];

export default function Prontuario() {
  const [activeTab, setActiveTab] = useState('Odontograma');
  const [teeth, setTeeth] = useState(initialTeeth);
  const [selectedTooth, setSelectedTooth] = useState(null);

  const handleToothClick = (tooth) => {
    setSelectedTooth(tooth.n === selectedTooth?.n ? null : tooth);
  };

  const setToothStatus = (n, status) => {
    setTeeth(prev => prev.map(t => t.n === n ? { ...t, s: status } : t));
    setSelectedTooth(null);
  };

  return (
    <div style={s.main}>
      <PageHeader title="Prontuário" subtitle="Ficha clínica do paciente">
        <Button variant="ghost">Imprimir</Button>
        <Button>+ Nova evolução</Button>
      </PageHeader>

      {/* Patient header */}
      <div style={s.patientCard}>
        <div style={s.avatar}>AC</div>
        <div style={{ flex: 1 }}>
          <div style={s.patientName}>Ana Costa</div>
          <div style={s.patientMeta}>
            {[['32 anos'], ['CPF: 123.456.789-00'], ['Tel: (31) 98765-4321'], ['Convênio: Unimed'], ['Desde: Jan 2023']].map(([t]) => (
              <span key={t} style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge color="green">Ativo</Badge>
          <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Editar</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {tabs.map(t => (
          <div key={t} style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }} onClick={() => setActiveTab(t)}>{t}</div>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Odontograma' && (
        <div style={s.grid2}>
          <Card style={{ gridColumn: '1 / -1' }} onClick={() => setSelectedTooth(null)}>
            <CardTitle>Odontograma <span style={{ fontSize: 11, color: '#AAA', fontWeight: 300 }}>— clique no dente para alterar</span></CardTitle>
            <div style={s.odonto}>
              {teeth.map((t) => (
                <div key={t.n} style={{ position: 'relative' }}>
                  <div
                    style={{ ...s.tooth, ...toothStyles[t.s], ...(selectedTooth?.n === t.n ? { outline: '2px solid #1A1A1A' } : {}) }}
                    title={`Dente ${t.n}`}
                    onClick={e => { e.stopPropagation(); handleToothClick(t); }}
                  >
                    <span style={{ fontSize: 9, color: '#AAA', display: 'block' }}>{t.n}</span>
                    <span style={{ fontSize: 13 }}>{toothIcons[t.s]}</span>
                  </div>
                  {selectedTooth?.n === t.n && (
                    <div style={s.popover} onClick={e => e.stopPropagation()}>
                      <div style={s.popoverTitle}>Dente {t.n}</div>
                      {statusOptions.map(opt => (
                        <div
                          key={opt.key}
                          style={{ ...s.popoverItem, ...(t.s === opt.key ? s.popoverItemActive : {}) }}
                          onClick={() => setToothStatus(t.n, opt.key)}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: opt.color, flexShrink: 0 }} />
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={s.legend}>
              {statusOptions.map(opt => (
                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: opt.color }} />
                  {opt.label}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Anamnese' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardTitle action="Editar">Informações gerais</CardTitle>
            <div style={s.anamneseGrid}>
              {[
                ['Queixa principal', 'Dor ao mastigar no lado direito'],
                ['Histórico médico', 'Hipertensão controlada, uso de Losartana 50mg'],
                ['Alergias', 'Penicilina'],
                ['Medicamentos em uso', 'Losartana 50mg, Aspirina 100mg'],
                ['Histórico odontológico', 'Tratamento de canal há 5 anos (dente 36). Extrações de terceiros molares em 2018.'],
                ['Hábitos', 'Bruxismo noturno (usa placa de mordida)'],
              ].map(([label, value]) => (
                <div key={label} style={s.anamneseItem}>
                  <div style={s.anamneseLabel}>{label}</div>
                  <div style={s.anamneseValue}>{value}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle action="Editar">Histórico sistêmico</CardTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {[
                ['Diabetes', false], ['Hipertensão', true], ['Cardiopatia', false],
                ['Coagulopatia', false], ['Osteoporose', false], ['HIV/AIDS', false],
                ['Hepatite', false], ['Gestante', false], ['Fumante', false],
              ].map(([cond, has]) => (
                <div key={cond} style={{ ...s.condTag, ...(has ? s.condTagActive : {}) }}>
                  <span style={{ fontSize: 11 }}>{has ? '✓' : '○'}</span> {cond}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Plano de tratamento' && (
        <Card>
          <CardTitle action="+ Adicionar">Plano de tratamento</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {plan.map(p => (
              <div key={p.name} style={s.planItem}>
                <div style={{ ...s.planCheck, ...(p.done ? s.planCheckDone : {}) }}>
                  {p.done && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                </div>
                <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{p.price}</span>
                <Badge color={p.done ? 'green' : 'yellow'}>{p.done ? 'Feito' : 'Pendente'}</Badge>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Total do tratamento</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>R$ 1.930</span>
          </div>
          <div style={{ marginTop: 8, padding: '14px 16px', background: '#F0FBF6', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#27AE60' }}>Já realizado</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#27AE60' }}>R$ 430</span>
          </div>
        </Card>
      )}

      {activeTab === 'Evolução clínica' && (
        <Card>
          <CardTitle action="+ Nova evolução">Evolução clínica</CardTitle>
          <div style={{ marginTop: 12 }}>
            {evolution.map(e => (
              <div key={e.date} style={s.evoItem}>
                <div style={s.evoDate}>{e.date}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.proc}</div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 300, lineHeight: 1.5 }}>{e.note}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>{e.dr}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'Documentos' && (
        <Card>
          <CardTitle action="+ Enviar documento">Documentos</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {[
              { name: 'Radiografia panorâmica', date: '23 Mar 2026', type: 'Imagem', size: '2.4 MB' },
              { name: 'Contrato de tratamento', date: '05 Out 2025', type: 'PDF', size: '185 KB' },
              { name: 'Anamnese assinada', date: '05 Out 2025', type: 'PDF', size: '98 KB' },
            ].map(doc => (
              <div key={doc.name} style={s.docItem}>
                <div style={s.docIcon}>{doc.type === 'Imagem' ? '🖼' : '📄'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{doc.date} · {doc.size}</div>
                </div>
                <Badge color="gray">{doc.type}</Badge>
                <button style={s.docBtn}>Baixar</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  patientCard: { background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', padding: 24, display: 'flex', alignItems: 'center', gap: 20 },
  avatar: { width: 56, height: 56, background: '#A8D5C2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1A1A1A', flexShrink: 0 },
  patientName: { fontFamily: "'DM Serif Display', serif", fontSize: 22, letterSpacing: '-0.3px' },
  patientMeta: { display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  tabs: { display: 'flex', background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', overflow: 'hidden' },
  tab: { padding: '13px 20px', fontSize: 13, cursor: 'pointer', color: '#888', borderBottom: '2px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  tabActive: { color: '#1A1A1A', fontWeight: 500, borderBottomColor: '#1A1A1A' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  odonto: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginBottom: 8, marginTop: 12 },
  tooth: { borderRadius: 6, padding: '6px 4px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  legend: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 },
  planItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#FAFAFA' },
  planCheck: { width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCheckDone: { background: '#27AE60', borderColor: '#27AE60' },
  evoItem: { display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #F5F5F5' },
  evoDate: { fontSize: 11, color: '#AAA', minWidth: 80, paddingTop: 2 },
  anamneseGrid: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 },
  anamneseItem: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, paddingBottom: 14, borderBottom: '1px solid #F5F5F5' },
  anamneseLabel: { fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: 1 },
  anamneseValue: { fontSize: 13, color: '#333', lineHeight: 1.5 },
  condTag: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid #EFEFEF', fontSize: 12, color: '#AAA', display: 'flex', alignItems: 'center', gap: 5 },
  condTagActive: { background: '#F0FBF6', border: '1.5px solid #A8D5C2', color: '#27AE60' },
  docItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#FAFAFA' },
  docIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  docBtn: { padding: '6px 14px', border: '1.5px solid #EFEFEF', borderRadius: 8, background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  popover: { position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#fff', border: '1.5px solid #EFEFEF', borderRadius: 10, padding: '8px 0', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 },
  popoverTitle: { fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '0 12px 6px', borderBottom: '1px solid #F5F5F5', marginBottom: 4 },
  popoverItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 12, color: '#333', cursor: 'pointer' },
  popoverItemActive: { background: '#F5F5F5', fontWeight: 500 },
};
