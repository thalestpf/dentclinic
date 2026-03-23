import React, { useState } from 'react';
import { Card, CardTitle, PageHeader, Button, Badge } from '../components/UI';

/* ── Tooth data ── */
const initialTeeth = [
  {n:'18',s:'ok'},{n:'17',s:'ok'},{n:'16',s:'restored'},{n:'15',s:'ok'},{n:'14',s:'cavity'},{n:'13',s:'ok'},{n:'12',s:'ok'},{n:'11',s:'cavity'},
  {n:'21',s:'ok'},{n:'22',s:'ok'},{n:'23',s:'ok'},{n:'24',s:'ok'},{n:'25',s:'ok'},{n:'26',s:'restored'},{n:'27',s:'ok'},{n:'28',s:'missing'},
  {n:'38',s:'missing'},{n:'37',s:'ok'},{n:'36',s:'restored'},{n:'35',s:'ok'},{n:'34',s:'ok'},{n:'33',s:'ok'},{n:'32',s:'ok'},{n:'31',s:'ok'},
  {n:'41',s:'ok'},{n:'42',s:'ok'},{n:'43',s:'ok'},{n:'44',s:'ok'},{n:'45',s:'cavity'},{n:'46',s:'ok'},{n:'47',s:'ok'},{n:'48',s:'missing'},
];

const toothFill = {
  ok:         '#E8F5E9', cavity:    '#FFF3CD', restored:  '#D1ECF1',
  missing:    '#F8D7DA', fracture:  '#FFE8D6', prosthesis:'#EDE7F6',
  crown:      '#E3F2FD', partial:   '#E8EAF6', implant:   '#E0F7FA',
  tartar:     '#F5F5DC',
};
const toothStroke = {
  ok:         '#A8D5C2', cavity:    '#F39C12', restored:  '#17A2B8',
  missing:    '#E74C3C', fracture:  '#E67E22', prosthesis:'#7B1FA2',
  crown:      '#1565C0', partial:   '#3949AB', implant:   '#00838F',
  tartar:     '#8D6E63',
};

const statusOptions = [
  { key: 'ok',         label: 'Saudável',     color: '#A8D5C2' },
  { key: 'cavity',     label: 'Cárie',         color: '#F39C12' },
  { key: 'restored',   label: 'Restaurado',    color: '#17A2B8' },
  { key: 'missing',    label: 'Ausente',       color: '#E74C3C' },
  { key: 'fracture',   label: 'Fratura',       color: '#E67E22' },
  { key: 'prosthesis', label: 'Prótese',       color: '#7B1FA2' },
  { key: 'crown',      label: 'Coroa total',   color: '#1565C0' },
  { key: 'partial',    label: 'Coroa parcial', color: '#3949AB' },
  { key: 'implant',    label: 'Implante',      color: '#00838F' },
  { key: 'tartar',     label: 'Tártaro',       color: '#8D6E63' },
];

/* ── Tooth type ── */
const toothType = (n) => {
  const num = parseInt(n) % 10;
  if (num === 8) return 'wisdom';
  if (num === 7 || num === 6) return 'molar';
  if (num === 5 || num === 4) return 'premolar';
  if (num === 3) return 'canine';
  return 'incisor';
};

/* ── Tooth shapes as SVG paths  (crown at +y, root at -y) ── */
const SHAPES = {
  incisor: {
    root: 'M -4,0 C -4.5,-5 -4.5,-13 -3,-18 C -1.5,-21 1.5,-21 3,-18 C 4.5,-13 4.5,-5 4,0 Z',
    crown: 'M -5.5,0 C -6,2 -7,6 -6.5,11 C -4,14 4,14 6.5,11 C 7,6 6,2 5.5,0 Z',
    fissure: null,
  },
  canine: {
    root: 'M -3.5,0 C -4,-6 -4,-14 -2.5,-20 C -1.5,-23 1.5,-23 2.5,-20 C 4,-14 4,-6 3.5,0 Z',
    crown: 'M -5,0 C -5.5,2 -6,5 -4,10 C -2,14 0,16 2,14 C 4,10 6,5 5,0 Z',
    fissure: null,
  },
  premolar: {
    root: 'M -4.5,0 C -5,-5 -5,-12 -3.5,-17 C -2,-19 2,-19 3.5,-17 C 5,-12 5,-5 4.5,0 Z',
    crown: 'M -7,0 C -8,2 -8.5,6 -8,11 C -5,13 5,13 8,11 C 8.5,6 8,2 7,0 Z',
    fissure: 'M 0,1 L 0,11',
  },
  molar: {
    root: 'M -9,0 C -10,-3 -10,-9 -9,-13 C -7,-16 -5,-15 -5,-11 C -5,-7 -5,-4 -4,0 L 4,0 C 5,-4 5,-7 5,-11 C 5,-15 7,-16 9,-13 C 10,-9 10,-3 9,0 Z',
    crown: 'M -9.5,0 C -10.5,2 -10.5,7 -10,12 C -6,15 6,15 10,12 C 10.5,7 10.5,2 9.5,0 Z',
    fissure: 'M 0,1 L 0,12 M -5,6 L 5,6',
  },
  wisdom: {
    root: 'M -8,0 C -9,-3 -9,-8 -8,-12 C -6,-15 -4,-14 -4,-10 C -4,-6 -3,-3 -2,0 L 2,0 C 3,-3 4,-6 4,-10 C 4,-14 6,-15 8,-12 C 9,-8 9,-3 8,0 Z',
    crown: 'M -8.5,0 C -9.5,2 -9.5,6 -9,11 C -5,14 5,14 9,11 C 9.5,6 9.5,2 8.5,0 Z',
    fissure: 'M 0,1 L 0,11 M -4,5 L 4,5',
  },
};

/* Single tooth SVG element */
function ToothSVG({ tooth, selected, onClick }) {
  const type = toothType(tooth.n);
  const sh = SHAPES[type];
  const fill   = toothFill[tooth.s]   || '#E8F5E9';
  const stroke = toothStroke[tooth.s] || '#A8D5C2';
  const opacity = tooth.s === 'missing' ? 0.45 : 1;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} opacity={opacity}>
      {/* Root */}
      <path d={sh.root} fill="#EDE8E0" stroke="#C8C0B4" strokeWidth="1" strokeLinejoin="round" />
      {/* Crown */}
      <path d={sh.crown} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} strokeLinejoin="round" />
      {/* Fissure lines */}
      {sh.fissure && (
        <path d={sh.fissure} fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.5" />
      )}
      {/* CEJ line (cervical) */}
      <line x1={-10} y1={0} x2={10} y2={0} stroke={stroke} strokeWidth="0.6" opacity="0.3" />
      {/* Selected highlight */}
      {selected && (
        <path d={sh.crown} fill="none" stroke="#1A1A1A" strokeWidth="2.5"
          strokeDasharray="3,2" strokeLinejoin="round" />
      )}
    </g>
  );
}

/* ── Arch SVG odontogram ── */
const CX = 280, CY = 240;
const U_RX = 225, U_RY = 148; // upper arch radii
const L_RX = 188, L_RY = 118; // lower arch radii

const upperOrder = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const lowerOrder = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

function archPos(i, total, rx, ry, startDeg, endDeg) {
  const deg = startDeg + (endDeg - startDeg) * i / (total - 1);
  const rad = deg * Math.PI / 180;
  return { x: CX + rx * Math.cos(rad), y: CY + ry * Math.sin(rad), deg };
}

function toothRotation(x, y) {
  // rotate crown (+y) toward arch center
  return Math.atan2(CY - y, CX - x) * (180 / Math.PI) - 90;
}

function OdontogramaSVG({ teeth, selectedTooth, onToothClick }) {
  const toothMap = Object.fromEntries(teeth.map(t => [t.n, t]));

  const rootDepth = { wisdom: 14, molar: 14, premolar: 18, canine: 22, incisor: 20 };

  const renderArch = (order, rx, ry, startDeg, endDeg) =>
    order.map((n, i) => {
      const { x, y } = archPos(i, order.length, rx, ry, startDeg, endDeg);
      const rot = toothRotation(x, y);
      const tooth = toothMap[n];
      if (!tooth) return null;
      const rd = rootDepth[toothType(n)] || 18;
      // Number label: outside the arch (in root direction = -y local = opposite of crown)
      const labelRad = (rot - 90) * Math.PI / 180;
      const lx = x + Math.cos(labelRad) * (rd + 8);
      const ly = y + Math.sin(labelRad) * (rd + 8);
      return (
        <g key={n} transform={`translate(${x},${y}) rotate(${rot})`}>
          <ToothSVG tooth={tooth} selected={selectedTooth?.n === n}
            onClick={(e) => { e.stopPropagation(); onToothClick(tooth); }} />
          <text
            transform={`rotate(${-rot}) translate(${lx - x},${ly - y})`}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="#AAA" fontFamily="DM Sans, sans-serif"
          >{n}</text>
        </g>
      );
    });

  return (
    <svg viewBox="0 0 560 480" style={{ width: '100%', maxHeight: 400, display: 'block' }}>
      {/* Arch guide lines */}
      <ellipse cx={CX} cy={CY} rx={U_RX} ry={U_RY} fill="none" stroke="#F0F0F0" strokeWidth="1" />
      <ellipse cx={CX} cy={CY} rx={L_RX} ry={L_RY} fill="none" stroke="#F0F0F0" strokeWidth="1" />
      {/* Midline */}
      <line x1={CX} y1={60} x2={CX} y2={420} stroke="#EBEBEB" strokeWidth="1" strokeDasharray="5,4" />
      {/* Quadrant labels */}
      <text x={CX - 14} y={76} textAnchor="end" fontSize="9" fill="#CCC" fontFamily="DM Sans">Q1</text>
      <text x={CX + 14} y={76} textAnchor="start" fontSize="9" fill="#CCC" fontFamily="DM Sans">Q2</text>
      <text x={CX - 14} y={418} textAnchor="end" fontSize="9" fill="#CCC" fontFamily="DM Sans">Q4</text>
      <text x={CX + 14} y={418} textAnchor="start" fontSize="9" fill="#CCC" fontFamily="DM Sans">Q3</text>
      {/* Upper arch: θ from 208° to 332° */}
      {renderArch(upperOrder, U_RX, U_RY, 208, 332)}
      {/* Lower arch: θ from 28° to 152° */}
      {renderArch(lowerOrder, L_RX, L_RY, 28, 152)}
    </svg>
  );
}

/* ── Status picker modal ── */
function ToothModal({ tooth, onSelect, onClose }) {
  if (!tooth) return null;
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>
        <div style={m.header}>
          <span style={m.title}>Dente {tooth.n}</span>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.grid}>
          {statusOptions.map(opt => (
            <div key={opt.key}
              style={{ ...m.option, ...(tooth.s === opt.key ? m.optionActive : {}) }}
              onClick={() => onSelect(tooth.n, opt.key)}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: opt.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12 }}>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 320, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #F5F5F5' },
  title: { fontFamily: "'DM Serif Display', serif", fontSize: 17 },
  closeBtn: { background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#AAA' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 14 },
  option: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #F0F0F0', cursor: 'pointer', background: '#FAFAFA' },
  optionActive: { border: '1.5px solid #1A1A1A', background: '#F5F5F5', fontWeight: 500 },
};

/* ── Other page data ── */
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

/* ── Main component ── */
export default function Prontuario() {
  const [activeTab, setActiveTab] = useState('Odontograma');
  const [teeth, setTeeth] = useState(initialTeeth);
  const [selectedTooth, setSelectedTooth] = useState(null);

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

      {/* ── Odontograma ── */}
      {activeTab === 'Odontograma' && (
        <Card>
          <CardTitle>
            Odontograma
            <span style={{ fontSize: 11, color: '#AAA', fontWeight: 300, marginLeft: 8 }}>clique no dente para alterar</span>
          </CardTitle>
          <OdontogramaSVG teeth={teeth} selectedTooth={selectedTooth}
            onToothClick={t => setSelectedTooth(prev => prev?.n === t.n ? null : t)} />
          {/* Legend */}
          <div style={s.legend}>
            {statusOptions.map(opt => (
              <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#777' }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: opt.color }} />
                {opt.label}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Anamnese ── */}
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

      {/* ── Plano de tratamento ── */}
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
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Total do tratamento</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>R$ 1.930</span>
          </div>
          <div style={{ marginTop: 8, padding: '14px 16px', background: '#F0FBF6', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#27AE60' }}>Já realizado</span>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#27AE60' }}>R$ 430</span>
          </div>
        </Card>
      )}

      {/* ── Evolução clínica ── */}
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

      {/* ── Documentos ── */}
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

      {/* Tooth status modal */}
      <ToothModal tooth={selectedTooth} onSelect={setToothStatus} onClose={() => setSelectedTooth(null)} />
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
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F5F5' },
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
};
