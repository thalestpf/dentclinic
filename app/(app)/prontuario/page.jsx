'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardTitle, PageHeader, Button, Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';
import {
  Search, X, Plus, Check, Image as ImageIcon, FileText, DollarSign, CheckCircle2, XCircle,
  MoreVertical, Edit3, Trash2, Printer, Download, Upload, UserPlus, ClipboardList,
  Activity, FolderOpen, FileSearch, Stethoscope, AlertTriangle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Paleta harmonizada do sistema
// ─────────────────────────────────────────────────────────────
const CORES_AVATAR = [
  { bg: '#EAF5EF', text: '#3E7D63' },
  { bg: '#E6EEF9', text: '#3A5FA5' },
  { bg: '#FBEFDC', text: '#A57A3A' },
  { bg: '#EEE3F9', text: '#6B3FA5' },
  { bg: '#F9E3DC', text: '#A55A3A' },
  { bg: '#E3F5EC', text: '#2E7D5B' },
];

function iniciaisNome(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function corAvatar(nome) {
  if (!nome) return CORES_AVATAR[0];
  const hash = [...nome].reduce((a, c) => a + c.charCodeAt(0), 0);
  return CORES_AVATAR[hash % CORES_AVATAR.length];
}

// ─────────────────────────────────────────────────────────────
// Odontograma — cores harmonizadas ao sistema
// ─────────────────────────────────────────────────────────────
const initialTeeth = [
  {n:'18',s:'ok'},{n:'17',s:'ok'},{n:'16',s:'restored'},{n:'15',s:'ok'},{n:'14',s:'cavity'},{n:'13',s:'ok'},{n:'12',s:'ok'},{n:'11',s:'cavity'},
  {n:'21',s:'ok'},{n:'22',s:'ok'},{n:'23',s:'ok'},{n:'24',s:'ok'},{n:'25',s:'ok'},{n:'26',s:'restored'},{n:'27',s:'ok'},{n:'28',s:'missing'},
  {n:'38',s:'missing'},{n:'37',s:'ok'},{n:'36',s:'restored'},{n:'35',s:'ok'},{n:'34',s:'ok'},{n:'33',s:'ok'},{n:'32',s:'ok'},{n:'31',s:'ok'},
  {n:'41',s:'ok'},{n:'42',s:'ok'},{n:'43',s:'ok'},{n:'44',s:'ok'},{n:'45',s:'cavity'},{n:'46',s:'ok'},{n:'47',s:'ok'},{n:'48',s:'missing'},
];

// Paleta refinada para status de dente — tons pastel + stroke mais forte
const toothFill = {
  ok:'#EAF5EF', cavity:'#FBEFDC', restored:'#E6EEF9', missing:'#F5DCDC',
  fracture:'#F9E3DC', prosthesis:'#EEE3F9', crown:'#DDE9F7', partial:'#E3E6F5',
  implant:'#DCEEF0', tartar:'#F0EADC',
};
const toothStroke = {
  ok:'#5FA883', cavity:'#C08A3A', restored:'#3A5FA5', missing:'#C5585A',
  fracture:'#A55A3A', prosthesis:'#6B3FA5', crown:'#2F5A99', partial:'#4C5A8F',
  implant:'#2E7276', tartar:'#8A7A4E',
};

const statusOptions = [
  { key: 'ok', label: 'Saudável', color: '#5FA883' },
  { key: 'cavity', label: 'Cárie', color: '#C08A3A' },
  { key: 'restored', label: 'Restaurado', color: '#3A5FA5' },
  { key: 'missing', label: 'Ausente', color: '#C5585A' },
  { key: 'fracture', label: 'Fratura', color: '#A55A3A' },
  { key: 'prosthesis', label: 'Prótese', color: '#6B3FA5' },
  { key: 'crown', label: 'Coroa total', color: '#2F5A99' },
  { key: 'partial', label: 'Coroa parcial', color: '#4C5A8F' },
  { key: 'implant', label: 'Implante', color: '#2E7276' },
  { key: 'tartar', label: 'Tártaro', color: '#8A7A4E' },
];

const toothType = (n) => {
  const num = parseInt(n) % 10;
  if (num === 8) return 'wisdom';
  if (num === 7 || num === 6) return 'molar';
  if (num === 5 || num === 4) return 'premolar';
  if (num === 3) return 'canine';
  return 'incisor';
};

const TEETH_SVG = {
  incisor: (fill, stroke, sw) => (
    <>
      <path d="M -4.5,0 C -5,-4 -5,-11 -3.5,-17 C -2.5,-20 -1,-21.5 0,-21.5 C 1,-21.5 2.5,-20 3.5,-17 C 5,-11 5,-4 4.5,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M -5.5,0 C -6.5,1 -7.5,5 -7,10 C -6.5,13 -3,15 0,15 C 3,15 6.5,13 7,10 C 7.5,5 6.5,1 5.5,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M -7,10 Q 0,16 7,10" fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.5" />
    </>
  ),
  canine: (fill, stroke, sw) => (
    <>
      <path d="M -3.5,0 C -4,-5 -4,-13 -2.5,-20 C -1.5,-24 -0.5,-25 0,-25 C 0.5,-25 1.5,-24 2.5,-20 C 4,-13 4,-5 3.5,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M -5,0 C -6,1.5 -6.5,5 -5,10 C -3.5,14 -1.5,17 0,18 C 1.5,17 3.5,14 5,10 C 6.5,5 6,1.5 5,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M -1.5,15 Q 0,19 1.5,15" fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.5" />
    </>
  ),
  premolar: (fill, stroke, sw) => (
    <>
      <path d="M -4,0 C -4.5,-4 -4.5,-11 -3,-16 C -2,-18.5 -1,-19.5 0,-19.5 C 1,-19.5 2,-18.5 3,-16 C 4.5,-11 4.5,-4 4,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M -7,0 C -8,1.5 -8.5,5 -8,9 C -7,11.5 -5,13 -3,12.5 C -1.5,12 -0.5,11 0,11 C 0.5,11 1.5,12 3,12.5 C 5,13 7,11.5 8,9 C 8.5,5 8,1.5 7,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M 0,1 L 0,11" fill="none" stroke={stroke} strokeWidth="0.9" opacity="0.45" />
    </>
  ),
  molar: (fill, stroke, sw) => (
    <>
      <path d="M -9,0 C -10,-3 -10.5,-9 -9.5,-14 C -8.5,-17 -7,-17.5 -6,-15 C -5,-12 -5.5,-6 -6,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M 9,0 C 10,-3 10.5,-9 9.5,-14 C 8.5,-17 7,-17.5 6,-15 C 5,-12 5.5,-6 6,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M -2,0 C -2.5,-3 -2.5,-9 -1.5,-13 C -0.8,-16 0.8,-16 1.5,-13 C 2.5,-9 2.5,-3 2,0 Z" fill="#E4DFD6" stroke="#C9C1B4" strokeWidth="0.8" />
      <path d="M -10,0 C -11,2 -11.5,6 -11,10 C -9.5,13 -6,14 -3.5,13 C -1.5,12.5 -0.5,11.5 0,11.5 C 0.5,11.5 1.5,12.5 3.5,13 C 6,14 9.5,13 11,10 C 11.5,6 11,2 10,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M 0,1 L 0,11.5" fill="none" stroke={stroke} strokeWidth="1" opacity="0.4" />
    </>
  ),
  wisdom: (fill, stroke, sw) => (
    <>
      <path d="M -8,0 C -9,-3 -9,-8 -8,-12 C -7,-15 -5.5,-15 -5,-12 C -4,-9 -4.5,-5 -5,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M 8,0 C 9,-3 9,-8 8,-12 C 7,-15 5.5,-15 5,-12 C 4,-9 4.5,-5 5,0 Z" fill="#EDE8DF" stroke="#C9C1B4" strokeWidth="1" />
      <path d="M -9,0 C -10,2 -10,6 -9.5,10 C -8,12.5 -5,13.5 -3,12.5 C -1.5,12 -0.5,11 0,11 C 0.5,11 1.5,12 3,12.5 C 5,13.5 8,12.5 9.5,10 C 10,6 10,2 9,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M 0,1 L 0,11 M -5,5.5 Q 0,7 5,5.5" fill="none" stroke={stroke} strokeWidth="0.85" opacity="0.4" />
    </>
  ),
};

function ToothSVG({ tooth, selected, onClick }) {
  const type = toothType(tooth.n);
  const fill = toothFill[tooth.s] || '#EAF5EF';
  const stroke = toothStroke[tooth.s] || '#5FA883';
  const sw = selected ? 2.5 : 1.5;
  const opacity = tooth.s === 'missing' ? 0.4 : 1;
  const renderFn = TEETH_SVG[type];
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} opacity={opacity}>
      {renderFn(fill, stroke, sw)}
      {selected && <ellipse cx={0} cy={5} rx={13} ry={20} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeDasharray="4,2.5" />}
    </g>
  );
}

const CX = 380, CY = 330;
const U_RX = 345, U_RY = 235;
const L_RX = 305, L_RY = 200;
const upperOrder = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const lowerOrder = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

function archPos(i, total, rx, ry, startDeg, endDeg) {
  const deg = startDeg + (endDeg - startDeg) * i / (total - 1);
  const rad = deg * Math.PI / 180;
  return { x: CX + rx * Math.cos(rad), y: CY + ry * Math.sin(rad), deg };
}
function toothRotation(x, y) {
  return Math.atan2(CY - y, CX - x) * (180 / Math.PI) - 90;
}

function OdontogramaSVG({ teeth, selectedTooth, onToothClick }) {
  const toothMap = Object.fromEntries(teeth.map(t => [t.n, t]));
  const rootDepth = { wisdom: 26, molar: 27, premolar: 32, canine: 40, incisor: 35 };

  const renderArch = (order, rx, ry, startDeg, endDeg) =>
    order.map((n, i) => {
      const { x, y } = archPos(i, order.length, rx, ry, startDeg, endDeg);
      const rot = toothRotation(x, y);
      const tooth = toothMap[n];
      if (!tooth) return null;
      const rd = rootDepth[toothType(n)] || 18;
      const labelRad = (rot - 90) * Math.PI / 180;
      const lx = x + Math.cos(labelRad) * (rd + 8);
      const ly = y + Math.sin(labelRad) * (rd + 8);
      return (
        <g key={n} transform={`translate(${x},${y}) rotate(${rot}) scale(1.25)`}>
          <ToothSVG tooth={tooth} selected={selectedTooth?.n === n} onClick={(e) => { e.stopPropagation(); onToothClick(tooth); }} />
          <text transform={`rotate(${-rot}) translate(${lx - x},${ly - y})`} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#AAA" fontFamily="DM Sans, sans-serif">{n}</text>
        </g>
      );
    });

  return (
    <svg viewBox="0 0 760 660" style={{ width: '100%', maxHeight: 560, display: 'block' }}>
      <ellipse cx={CX} cy={CY} rx={U_RX} ry={U_RY} fill="none" stroke="#F0F0F0" strokeWidth="1.5" />
      <ellipse cx={CX} cy={CY} rx={L_RX} ry={L_RY} fill="none" stroke="#F0F0F0" strokeWidth="1.5" />
      <line x1={CX} y1={70} x2={CX} y2={590} stroke="#EBEBEB" strokeWidth="1" strokeDasharray="5,4" />
      <text x={CX - 16} y={88} textAnchor="end" fontSize="11" fill="#CCC" fontFamily="DM Sans">Q1</text>
      <text x={CX + 16} y={88} textAnchor="start" fontSize="11" fill="#CCC" fontFamily="DM Sans">Q2</text>
      <text x={CX - 16} y={590} textAnchor="end" fontSize="11" fill="#CCC" fontFamily="DM Sans">Q4</text>
      <text x={CX + 16} y={590} textAnchor="start" fontSize="11" fill="#CCC" fontFamily="DM Sans">Q3</text>
      {renderArch(upperOrder, U_RX, U_RY, 205, 335)}
      {renderArch(lowerOrder, L_RX, L_RY, 22, 158)}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal unificado — header escuro + close lucide
// ─────────────────────────────────────────────────────────────
function ModalShell({ titulo, onClose, children, maxWidth = 460 }) {
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.modal, maxWidth }} onClick={e => e.stopPropagation()}>
        <div style={m.headerDark}>
          <span style={m.titleLight}>{titulo}</span>
          <button style={m.closeBtnDark} onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Popover inline para status do dente (substitui modal)
// ─────────────────────────────────────────────────────────────
function ToothStatusPopover({ tooth, onSelect, onClose }) {
  if (!tooth) return null;
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div style={m.headerDark}>
          <span style={m.titleLight}>Dente {tooth.n}</span>
          <button style={m.closeBtnDark} onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {statusOptions.map(opt => (
            <div
              key={opt.key}
              style={{ ...m.option, ...(tooth.s === opt.key ? m.optionActive : {}) }}
              onClick={() => onSelect(tooth.n, opt.key)}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: opt.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12 }}>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos do modal
// ─────────────────────────────────────────────────────────────
const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' },
  headerDark: { background: 'linear-gradient(135deg, #1C1C1E, #2C2C2E)', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleLight: { fontFamily: "'DM Serif Display', serif", fontSize: 17, color: '#fff', letterSpacing: '-0.3px' },
  closeBtnDark: { width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' },
  option: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #F0F0F0', cursor: 'pointer', background: '#FAFAFA' },
  optionActive: { border: '1.5px solid #1A1A1A', background: '#F5F5F5', fontWeight: 500 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" },
  sectionTitle: { fontSize: 11, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #F0F0F0' },
};

const tabs = [
  { key: 'Odontograma', icon: Stethoscope },
  { key: 'Anamnese', icon: ClipboardList },
  { key: 'Plano de tratamento', icon: FileSearch },
  { key: 'Evolução clínica', icon: Activity },
  { key: 'Documentos', icon: FolderOpen },
];

export default function Prontuario() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('Odontograma');
  const [teeth, setTeeth] = useState(initialTeeth);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [carregandoPaciente, setCarregandoPaciente] = useState(false);

  const [clinicaId, setClinicaId] = useState(null);

  // Toast + confirm
  const [toast, setToast] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { msg, onConfirm }

  // Anamnese
  const anamneseVazia = { queixa_principal: '', historico_medico: '', alergias: '', medicamentos: '', historico_odontologico: '', habitos: '', diabetes: false, hipertensao: false, cardiopatia: false, coagulopatia: false, osteoporose: false, hiv_aids: false, hepatite: false, gestante: false, fumante: false, campos_extras: [] };
  const [anamnese, setAnamnese] = useState(null);
  const [editandoAnamnese, setEditandoAnamnese] = useState(false);
  const [formAnamnese, setFormAnamnese] = useState(anamneseVazia);
  const [salvandoAnamnese, setSalvandoAnamnese] = useState(false);
  const [novaCondicao, setNovaCondicao] = useState(null);

  // Plano de tratamento
  const [planoItens, setPlanoItens] = useState([]);
  const [modalPlano, setModalPlano] = useState(false);
  const [editPlanoId, setEditPlanoId] = useState(null);
  const [formPlano, setFormPlano] = useState({ procedimento: '', valor: '', status: 'pendente' });
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [procedimentosCadastrados, setProcedimentosCadastrados] = useState([]);
  const [modalRecebimento, setModalRecebimento] = useState(null);
  const [formRecebimento, setFormRecebimento] = useState({ forma_pagamento: 'PIX', data_recebimento: '', observacoes: '' });
  const [salvandoRecebimento, setSalvandoRecebimento] = useState(false);
  const [menuPlanoId, setMenuPlanoId] = useState(null);

  // Evolução clínica
  const [evolucoes, setEvolucoes] = useState([]);
  const [modalEvolucao, setModalEvolucao] = useState(false);
  const [editEvolucaoId, setEditEvolucaoId] = useState(null);
  const [formEvolucao, setFormEvolucao] = useState({ procedimento: '', descricao: '', dentista: '' });
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);
  const [nomeDentistaLogado, setNomeDentistaLogado] = useState('');
  const [menuEvolucaoId, setMenuEvolucaoId] = useState(null);

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [modalDoc, setModalDoc] = useState(null);
  const [formDoc, setFormDoc] = useState({ nome: '', descricao: '' });
  const [thumbnails, setThumbnails] = useState({}); // { docId: signedUrl }

  // ─────────────────────────────────────────────────────────
  // Helpers de feedback
  // ─────────────────────────────────────────────────────────
  const mostrarToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmar = (msg) => new Promise((resolve) => {
    setConfirmacao({
      msg,
      onConfirm: () => { setConfirmacao(null); resolve(true); },
      onCancel: () => { setConfirmacao(null); resolve(false); },
    });
  });

  // ─────────────────────────────────────────────────────────
  // Carregamento inicial
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNomeDentistaLogado(localStorage.getItem('dentclinic_name') || '');
    setClinicaId(localStorage.getItem('dentclinic_clinica_id') || null);
  }, []);

  useEffect(() => {
    if (clinicaId === null) return; // aguarda leitura do localStorage
    let q = supabase.from('procedimentos').select('id, nome, preco').eq('status', 'ativo').order('nome');
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    q.then(({ data }) => setProcedimentosCadastrados(data || []));
  }, [clinicaId]);

  useEffect(() => {
    if (clinicaId === null) return;
    let q = supabase.from('pacientes').select('*').order('nome');
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    q.then(({ data }) => {
      if (!data) return;
      setPacientes(data);

      const pacienteId = searchParams.get('paciente') || localStorage.getItem('prontuario_paciente_id');
      if (!pacienteId) return;
      const paciente = data.find(p => String(p.id) === String(pacienteId));
      if (paciente) selecionarPaciente(paciente, { replaceUrl: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, searchParams]);

  const selecionarPaciente = async (p, { replaceUrl = true } = {}) => {
    setPacienteSelecionado(p);
    setBuscaPaciente('');
    setAnamnese(null);
    setFormAnamnese(anamneseVazia);
    setEditandoAnamnese(false);
    setPlanoItens([]);
    setEvolucoes([]);
    setDocumentos([]);
    setThumbnails({});
    if (typeof window !== 'undefined') {
      localStorage.setItem('prontuario_paciente_id', p.id);
      localStorage.setItem('prontuario_paciente_nome', p.nome || '');
    }
    if (replaceUrl) router.replace(`/prontuario?paciente=${p.id}`);

    setCarregandoPaciente(true);
    await Promise.all([
      carregarAnamnese(p.id),
      carregarPlano(p.id),
      carregarEvolucoes(p.id),
      carregarDocumentos(p.id),
    ]);
    setCarregandoPaciente(false);
  };

  const limparPaciente = () => {
    setPacienteSelecionado(null);
    setActiveTab('Odontograma');
    setAnamnese(null);
    setFormAnamnese(anamneseVazia);
    setEditandoAnamnese(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prontuario_paciente_id');
      localStorage.removeItem('prontuario_paciente_nome');
    }
    router.replace('/prontuario');
  };

  // ─────────────────────────────────────────────────────────
  // Anamnese
  // ─────────────────────────────────────────────────────────
  const carregarAnamnese = async (pacienteId) => {
    let q = supabase.from('anamnese').select('*').eq('paciente_id', pacienteId);
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    const { data } = await q.maybeSingle();
    if (data) { setAnamnese(data); setFormAnamnese(data); }
    else { setAnamnese(null); setFormAnamnese(anamneseVazia); }
  };

  const handleSalvarAnamnese = async () => {
    if (!pacienteSelecionado) return;
    setSalvandoAnamnese(true);
    const dados = { ...formAnamnese, paciente_id: pacienteSelecionado.id, atualizado_em: new Date().toISOString() };
    if (clinicaId) dados.clinica_id = clinicaId;
    let error;
    if (anamnese?.id) {
      ({ error } = await supabase.from('anamnese').update(dados).eq('id', anamnese.id));
    } else {
      ({ error } = await supabase.from('anamnese').insert([dados]));
    }
    if (error) {
      mostrarToast('Erro ao salvar: ' + error.message, 'error');
    } else {
      await carregarAnamnese(pacienteSelecionado.id);
      setEditandoAnamnese(false);
      mostrarToast('Anamnese salva com sucesso');
    }
    setSalvandoAnamnese(false);
  };

  // ─────────────────────────────────────────────────────────
  // Plano de tratamento
  // ─────────────────────────────────────────────────────────
  const carregarPlano = async (pacienteId) => {
    let q = supabase.from('plano_tratamento').select('*').eq('paciente_id', pacienteId).order('criado_em');
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    const { data } = await q;
    setPlanoItens(data || []);
  };

  const handleSalvarPlano = async () => {
    if (!formPlano.procedimento) { mostrarToast('Informe o procedimento', 'error'); return; }
    setSalvandoPlano(true);
    const dados = {
      procedimento: formPlano.procedimento,
      valor: parseFloat(formPlano.valor) || 0,
      status: formPlano.status,
      paciente_id: pacienteSelecionado.id,
    };
    if (clinicaId) dados.clinica_id = clinicaId;
    let error;
    if (editPlanoId) {
      ({ error } = await supabase.from('plano_tratamento').update(dados).eq('id', editPlanoId));
    } else {
      ({ error } = await supabase.from('plano_tratamento').insert([dados]));
    }
    if (error) {
      mostrarToast('Erro: ' + error.message, 'error');
    } else {
      await carregarPlano(pacienteSelecionado.id);
      setModalPlano(false);
      mostrarToast(editPlanoId ? 'Item atualizado' : 'Item adicionado ao plano');
    }
    setSalvandoPlano(false);
  };

  const handleToggleStatus = async (item) => {
    const novoStatus = item.status === 'feito' ? 'pendente' : 'feito';
    await supabase.from('plano_tratamento').update({ status: novoStatus }).eq('id', item.id);
    setPlanoItens(planoItens.map(p => p.id === item.id ? { ...p, status: novoStatus } : p));
  };

  const handleExcluirPlano = async (id) => {
    const ok = await confirmar('Excluir este item do plano?');
    if (!ok) return;
    await supabase.from('plano_tratamento').delete().eq('id', id);
    setPlanoItens(planoItens.filter(p => p.id !== id));
    mostrarToast('Item excluído');
  };

  const abrirModalRecebimento = (item) => {
    const hoje = new Date().toISOString().split('T')[0];
    setFormRecebimento({ forma_pagamento: 'PIX', data_recebimento: hoje, observacoes: '' });
    setModalRecebimento(item);
  };

  const handleRegistrarRecebimento = async () => {
    if (!modalRecebimento || !pacienteSelecionado) return;
    setSalvandoRecebimento(true);
    const valor = Number(modalRecebimento.valor);

    const recebimento = {
      paciente_id: pacienteSelecionado.id,
      plano_item_id: modalRecebimento.id,
      procedimento: modalRecebimento.procedimento,
      valor,
      forma_pagamento: formRecebimento.forma_pagamento,
      data_recebimento: formRecebimento.data_recebimento,
      observacoes: formRecebimento.observacoes || null,
    };
    if (clinicaId) recebimento.clinica_id = clinicaId;

    const { error } = await supabase.from('recebimentos').insert(recebimento);
    if (error) { setSalvandoRecebimento(false); mostrarToast('Erro ao registrar: ' + error.message, 'error'); return; }

    await supabase.from('plano_tratamento').update({ pago: true }).eq('id', modalRecebimento.id);
    setPlanoItens(prev => prev.map(p => p.id === modalRecebimento.id ? { ...p, pago: true } : p));

    const lancamento = {
      tipo: 'entrada',
      descricao: `${modalRecebimento.procedimento} — ${pacienteSelecionado.nome}`,
      categoria: 'Consulta',
      valor,
      status: 'pago',
      data: formRecebimento.data_recebimento,
    };
    if (clinicaId) lancamento.clinica_id = clinicaId;
    await supabase.from('lancamentos').insert(lancamento);

    setSalvandoRecebimento(false);
    setModalRecebimento(null);
    mostrarToast('Recebimento registrado');
  };

  // ─────────────────────────────────────────────────────────
  // Evolução clínica
  // ─────────────────────────────────────────────────────────
  const carregarEvolucoes = async (pacienteId) => {
    let q = supabase.from('evolucoes').select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    const { data } = await q;
    setEvolucoes(data || []);
  };

  const abrirModalEvolucao = (ev = null) => {
    if (ev) {
      setEditEvolucaoId(ev.id);
      setFormEvolucao({ procedimento: ev.procedimento || '', descricao: ev.descricao || '', dentista: ev.dentista || '' });
    } else {
      setEditEvolucaoId(null);
      setFormEvolucao({ procedimento: '', descricao: '', dentista: nomeDentistaLogado });
    }
    setModalEvolucao(true);
  };

  const handleSalvarEvolucao = async () => {
    if (!formEvolucao.procedimento || !formEvolucao.descricao) { mostrarToast('Preencha procedimento e descrição', 'error'); return; }
    setSalvandoEvolucao(true);
    const dados = {
      procedimento: formEvolucao.procedimento,
      descricao: formEvolucao.descricao,
      dentista: formEvolucao.dentista || nomeDentistaLogado,
      paciente_id: pacienteSelecionado.id,
    };
    if (clinicaId) dados.clinica_id = clinicaId;
    let error;
    if (editEvolucaoId) {
      ({ error } = await supabase.from('evolucoes').update(dados).eq('id', editEvolucaoId));
    } else {
      ({ error } = await supabase.from('evolucoes').insert([dados]));
    }
    if (error) {
      mostrarToast('Erro: ' + error.message, 'error');
    } else {
      await carregarEvolucoes(pacienteSelecionado.id);
      setModalEvolucao(false);
      mostrarToast(editEvolucaoId ? 'Evolução atualizada' : 'Evolução registrada');
    }
    setSalvandoEvolucao(false);
  };

  const handleExcluirEvolucao = async (id) => {
    const ok = await confirmar('Excluir esta evolução?');
    if (!ok) return;
    await supabase.from('evolucoes').delete().eq('id', id);
    setEvolucoes(evolucoes.filter(e => e.id !== id));
    mostrarToast('Evolução excluída');
  };

  // ─────────────────────────────────────────────────────────
  // Documentos
  // ─────────────────────────────────────────────────────────
  const carregarDocumentos = async (pacienteId) => {
    let q = supabase.from('documentos').select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
    if (clinicaId) q = q.eq('clinica_id', clinicaId);
    const { data } = await q;
    const docs = data || [];
    setDocumentos(docs);

    // Carregar thumbnails das imagens
    const imagens = docs.filter(d => d.tipo === 'Imagem');
    const thumbs = {};
    for (const doc of imagens) {
      const { data: url } = await supabase.storage
        .from('prontuario-docs')
        .createSignedUrl(doc.storage_path, 3600);
      if (url?.signedUrl) thumbs[doc.id] = url.signedUrl;
    }
    setThumbnails(thumbs);
  };

  const comprimirImagem = (arquivo, qualidade = 0.75, maxWidth = 1600) =>
    new Promise((resolve) => {
      if (!arquivo.type.startsWith('image/')) { resolve(arquivo); return; }
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], arquivo.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', qualidade
        );
      };
      img.src = url;
    });

  const formatarTamanho = (bytes) =>
    bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const handleSelecionarArquivo = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo || !pacienteSelecionado) return;
    const ext = arquivo.name.split('.').pop();
    const tipo = arquivo.type.startsWith('image/') ? 'Imagem' : ext.toUpperCase();
    setFormDoc({ nome: arquivo.name, descricao: '' });
    setModalDoc({ arquivo, tipo, tamanhoOriginal: formatarTamanho(arquivo.size) });
    e.target.value = '';
  };

  const handleUploadDocumento = async () => {
    if (!modalDoc || !pacienteSelecionado) return;
    setUploadando(true);
    try {
      const { arquivo, tipo } = modalDoc;
      const arquivoFinal = await comprimirImagem(arquivo);
      const isImagem = tipo === 'Imagem';
      const ext = isImagem ? 'jpg' : arquivo.name.split('.').pop();
      const path = `${pacienteSelecionado.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('prontuario-docs').upload(path, arquivoFinal);
      if (uploadError) { mostrarToast('Erro ao enviar: ' + uploadError.message, 'error'); return; }
      const tamanho = formatarTamanho(arquivoFinal.size);
      const dados = {
        paciente_id: pacienteSelecionado.id,
        nome: formDoc.nome || arquivo.name,
        descricao: formDoc.descricao || null,
        tipo,
        tamanho,
        storage_path: path,
      };
      if (clinicaId) dados.clinica_id = clinicaId;
      await supabase.from('documentos').insert(dados);
      await carregarDocumentos(pacienteSelecionado.id);
      setModalDoc(null);
      mostrarToast('Documento enviado');
    } finally {
      setUploadando(false);
    }
  };

  const handleBaixarDocumento = async (doc) => {
    const { data } = await supabase.storage.from('prontuario-docs').createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else mostrarToast('Erro ao gerar link de download', 'error');
  };

  const handleExcluirDocumento = async (doc) => {
    const ok = await confirmar(`Excluir "${doc.nome}"?`);
    if (!ok) return;
    await supabase.storage.from('prontuario-docs').remove([doc.storage_path]);
    await supabase.from('documentos').delete().eq('id', doc.id);
    setDocumentos(prev => prev.filter(d => d.id !== doc.id));
    mostrarToast('Documento excluído');
  };

  // ─────────────────────────────────────────────────────────
  // Odontograma
  // ─────────────────────────────────────────────────────────
  const setToothStatus = (n, status) => {
    setTeeth(prev => prev.map(t => t.n === n ? { ...t, s: status } : t));
    setSelectedTooth(null);
  };

  // ─────────────────────────────────────────────────────────
  // Busca paciente
  // ─────────────────────────────────────────────────────────
  const pacientesFiltrados = buscaFocada
    ? (buscaPaciente.length >= 2
        ? pacientes.filter(p => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()))
        : pacientes
      ).slice(0, 8)
    : [];

  const calcIdade = (nascimento) => {
    if (!nascimento) return null;
    const anos = Math.floor((new Date() - new Date(nascimento)) / (1000 * 60 * 60 * 24 * 365.25));
    return anos + ' anos';
  };

  const avatarCor = pacienteSelecionado ? corAvatar(pacienteSelecionado.nome) : CORES_AVATAR[0];

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div style={s.main}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @media print {
          body { background: #fff; }
          button, .no-print { display: none !important; }
        }
      `}</style>

      <PageHeader
        title="Prontuário"
        subtitle={pacienteSelecionado ? pacienteSelecionado.nome : 'Ficha clínica do paciente'}
      >
        {pacienteSelecionado && (
          <>
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Imprimir
            </Button>
            {activeTab === 'Anamnese' && (
              <Button onClick={() => { setFormAnamnese(anamnese || anamneseVazia); setEditandoAnamnese(true); }}>
                {anamnese ? (
                  <><Edit3 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Editar anamnese</>
                ) : (
                  <><Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Nova anamnese</>
                )}
              </Button>
            )}
            {activeTab === 'Evolução clínica' && (
              <Button onClick={() => abrirModalEvolucao()}>
                <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Nova evolução
              </Button>
            )}
          </>
        )}
      </PageHeader>

      {/* Busca de paciente */}
      {!pacienteSelecionado && (
        <div style={{ marginBottom: 4, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#AAA', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar paciente pelo nome..."
              value={buscaPaciente}
              onChange={e => setBuscaPaciente(e.target.value)}
              onFocus={() => setBuscaFocada(true)}
              onBlur={() => setTimeout(() => setBuscaFocada(false), 150)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff', outline: 'none' }}
            />
          </div>
          {pacientesFiltrados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4 }}>
              {pacientesFiltrados.map(p => {
                const c = corAvatar(p.nome);
                return (
                  <div
                    key={p.id}
                    onClick={() => selecionarPaciente(p)}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {iniciaisNome(p.nome)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{p.nome}</strong>
                      <span style={{ color: '#AAA', marginLeft: 12, fontSize: 12 }}>{p.cpf || ''} {p.telefone ? '· ' + p.telefone : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {buscaFocada && buscaPaciente.length >= 2 && pacientesFiltrados.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#AAA' }}>
              Nenhum paciente encontrado. <a href="/pacientes" style={{ color: '#3E7D63', fontWeight: 500 }}>Cadastrar novo</a>
            </div>
          )}
          {buscaFocada && buscaPaciente.length < 2 && pacientes.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#AAA' }}>
              Nenhum paciente cadastrado. <a href="/pacientes" style={{ color: '#3E7D63', fontWeight: 500 }}>Cadastrar novo</a>
            </div>
          )}
        </div>
      )}

      {pacienteSelecionado && (
        <div style={s.patientCard}>
          <div style={{ ...s.avatar, background: avatarCor.bg, color: avatarCor.text }}>
            {iniciaisNome(pacienteSelecionado.nome)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.patientName}>{pacienteSelecionado.nome}</div>
            <div style={s.patientMeta}>
              {[
                calcIdade(pacienteSelecionado.nascimento),
                pacienteSelecionado.cpf ? 'CPF: ' + pacienteSelecionado.cpf : null,
                pacienteSelecionado.telefone ? 'Tel: ' + pacienteSelecionado.telefone : null,
                pacienteSelecionado.convenio ? 'Convênio: ' + pacienteSelecionado.convenio : null,
              ].filter(Boolean).map((t) => (
                <span key={t} style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge color={pacienteSelecionado.status === 'ativo' ? 'green' : 'gray'}>{pacienteSelecionado.status}</Badge>
            <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 12 }} onClick={limparPaciente}>Trocar</Button>
          </div>
        </div>
      )}

      {pacienteSelecionado ? (
        <>
          {/* Tabs sticky */}
          <div style={s.tabsWrap} className="no-print">
            <div style={s.tabs}>
              {tabs.map(t => {
                const Icon = t.icon;
                const ativo = activeTab === t.key;
                return (
                  <div key={t.key} style={{ ...s.tab, ...(ativo ? s.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                    <Icon size={14} strokeWidth={ativo ? 2.4 : 2} />
                    <span>{t.key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──────── Odontograma ──────── */}
          {activeTab === 'Odontograma' && (
            <Card>
              <CardTitle>
                Odontograma
                <span style={{ fontSize: 11, color: '#AAA', fontWeight: 300, marginLeft: 8 }}>clique no dente para alterar</span>
              </CardTitle>
              {carregandoPaciente ? (
                <div style={s.shimmerBlock} />
              ) : (
                <OdontogramaSVG
                  teeth={teeth}
                  selectedTooth={selectedTooth}
                  onToothClick={t => setSelectedTooth(prev => prev?.n === t.n ? null : t)}
                />
              )}
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

          {/* ──────── Anamnese ──────── */}
          {activeTab === 'Anamnese' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {carregandoPaciente ? (
                <Card><div style={s.shimmerBlock} /></Card>
              ) : !editandoAnamnese ? (
                <>
                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Informações gerais</span>
                      {anamnese && (
                        <button onClick={() => { setFormAnamnese(anamnese); setEditandoAnamnese(true); }} style={s.editBtn}>
                          <Edit3 size={12} /> Editar
                        </button>
                      )}
                    </div>
                    {!anamnese ? (
                      <EmptyState
                        Icon={ClipboardList}
                        title="Anamnese não preenchida"
                        subtitle="Registre queixas, histórico médico e condições sistêmicas do paciente."
                        ctaIcon={Plus}
                        cta="Preencher anamnese"
                        onCta={() => { setFormAnamnese(anamneseVazia); setEditandoAnamnese(true); }}
                      />
                    ) : (
                      <div style={s.anamneseGrid}>
                        {[
                          ['Queixa principal', anamnese.queixa_principal],
                          ['Histórico médico', anamnese.historico_medico],
                          ['Alergias', anamnese.alergias],
                          ['Medicamentos em uso', anamnese.medicamentos],
                          ['Histórico odontológico', anamnese.historico_odontologico],
                          ['Hábitos', anamnese.habitos],
                        ].map(([label, value]) => value ? (
                          <div key={label} style={s.anamneseItem}>
                            <div style={s.anamneseLabel}>{label}</div>
                            <div style={s.anamneseValue}>{value}</div>
                          </div>
                        ) : null)}
                        {(anamnese.campos_extras || []).filter(c => c.label && c.valor).map((c, i) => (
                          <div key={i} style={s.anamneseItem}>
                            <div style={s.anamneseLabel}>{c.label}</div>
                            <div style={s.anamneseValue}>{c.valor}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                  {anamnese && (
                    <Card>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Histórico sistêmico</span>
                        <button onClick={() => { setFormAnamnese(anamnese); setEditandoAnamnese(true); }} style={s.editBtn}>
                          <Edit3 size={12} /> Editar
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {[
                          ['Diabetes', 'diabetes'], ['Hipertensão', 'hipertensao'], ['Cardiopatia', 'cardiopatia'],
                          ['Coagulopatia', 'coagulopatia'], ['Osteoporose', 'osteoporose'], ['HIV/AIDS', 'hiv_aids'],
                          ['Hepatite', 'hepatite'], ['Gestante', 'gestante'], ['Fumante', 'fumante'],
                        ].map(([label, key]) => {
                          const has = anamnese?.[key] || false;
                          return (
                            <div key={key} style={{ ...s.condTag, ...(has ? s.condTagActive : {}) }}>
                              {has
                                ? <Check size={12} strokeWidth={2.5} />
                                : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #CCC', display: 'inline-block' }} />}
                              {label}
                            </div>
                          );
                        })}
                        {(anamnese?.campos_extras || []).filter(c => c.tipo === 'condicao').map((c, i) => (
                          <div key={i} style={{ ...s.condTag, ...s.condTagActive }}>
                            <Check size={12} strokeWidth={2.5} /> {c.label}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>
                      {anamnese ? 'Editar anamnese' : 'Nova anamnese'}
                    </span>
                    <button onClick={() => setEditandoAnamnese(false)} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', display: 'flex', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={s.anamneseGrid}>
                    {[
                      ['Queixa principal', 'queixa_principal', 'Ex: Dor ao mastigar no lado direito'],
                      ['Histórico médico', 'historico_medico', 'Ex: Hipertensão, diabetes...'],
                      ['Alergias', 'alergias', 'Ex: Penicilina, látex...'],
                      ['Medicamentos em uso', 'medicamentos', 'Ex: Losartana 50mg...'],
                      ['Histórico odontológico', 'historico_odontologico', 'Ex: Canal, extrações...'],
                      ['Hábitos', 'habitos', 'Ex: Bruxismo, tabagismo...'],
                    ].map(([label, key, placeholder]) => (
                      <div key={key} style={s.anamneseItem}>
                        <div style={s.anamneseLabel}>{label}</div>
                        <textarea
                          value={formAnamnese[key] || ''}
                          onChange={e => setFormAnamnese({ ...formAnamnese, [key]: e.target.value })}
                          placeholder={placeholder}
                          rows={2}
                          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Campos extras */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={s.anamneseLabel}>Informações adicionais</div>
                      <button
                        onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: [...(formAnamnese.campos_extras || []), { label: '', valor: '' }] })}
                        style={{ background: 'none', border: '1.5px dashed #A8D5C2', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#3E7D63', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Plus size={12} /> Adicionar campo
                      </button>
                    </div>
                    {(formAnamnese.campos_extras || []).filter(c => c.tipo !== 'condicao').map((campo, i) => {
                      const idxGlobal = formAnamnese.campos_extras.indexOf(campo);
                      return (
                        <div key={idxGlobal} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 32px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                          <input
                            placeholder="Nome do campo"
                            value={campo.label}
                            onChange={e => {
                              const extras = [...formAnamnese.campos_extras];
                              extras[idxGlobal] = { ...extras[idxGlobal], label: e.target.value };
                              setFormAnamnese({ ...formAnamnese, campos_extras: extras });
                            }}
                            style={{ padding: '8px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 12, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
                          />
                          <textarea
                            placeholder="Valor"
                            value={campo.valor}
                            rows={2}
                            onChange={e => {
                              const extras = [...formAnamnese.campos_extras];
                              extras[idxGlobal] = { ...extras[idxGlobal], valor: e.target.value };
                              setFormAnamnese({ ...formAnamnese, campos_extras: extras });
                            }}
                            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          <button
                            onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: formAnamnese.campos_extras.filter((_, j) => j !== idxGlobal) })}
                            style={{ background: 'none', border: 'none', color: '#C5585A', cursor: 'pointer', paddingTop: 8, display: 'flex', justifyContent: 'center' }}
                          ><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div style={s.anamneseLabel}>Histórico sistêmico</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                      {[
                        ['Diabetes', 'diabetes'], ['Hipertensão', 'hipertensao'], ['Cardiopatia', 'cardiopatia'],
                        ['Coagulopatia', 'coagulopatia'], ['Osteoporose', 'osteoporose'], ['HIV/AIDS', 'hiv_aids'],
                        ['Hepatite', 'hepatite'], ['Gestante', 'gestante'], ['Fumante', 'fumante'],
                      ].map(([label, key]) => {
                        const ativo = formAnamnese[key] || false;
                        return (
                          <button key={key} onClick={() => setFormAnamnese({ ...formAnamnese, [key]: !ativo })}
                            style={{ ...s.condTag, ...(ativo ? s.condTagActive : {}), cursor: 'pointer', border: ativo ? '1.5px solid #A8D5C2' : '1.5px solid #EFEFEF' }}>
                            {ativo
                              ? <Check size={12} strokeWidth={2.5} />
                              : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #CCC', display: 'inline-block' }} />}
                            {label}
                          </button>
                        );
                      })}
                      {(formAnamnese.campos_extras || []).filter(c => c.tipo === 'condicao').map((c) => {
                        const idxGlobal = formAnamnese.campos_extras.indexOf(c);
                        return (
                          <div key={idxGlobal} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, border: '1.5px solid #A8D5C2', background: '#F0FBF6' }}>
                            <Check size={12} strokeWidth={2.5} color="#3E7D63" />
                            <span style={{ fontSize: 12, color: '#3E7D63' }}>{c.label}</span>
                            <button onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: formAnamnese.campos_extras.filter((_, j) => j !== idxGlobal) })}
                              style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', padding: '0 0 0 4px', display: 'flex' }}><X size={12} /></button>
                          </div>
                        );
                      })}
                      {novaCondicao !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            autoFocus
                            placeholder="Ex: Asma, Epilepsia..."
                            value={novaCondicao}
                            onChange={e => setNovaCondicao(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && novaCondicao.trim()) {
                                setFormAnamnese({ ...formAnamnese, campos_extras: [...(formAnamnese.campos_extras || []), { tipo: 'condicao', label: novaCondicao.trim(), valor: '' }] });
                                setNovaCondicao('');
                              }
                              if (e.key === 'Escape') setNovaCondicao(null);
                            }}
                            style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px solid #A8D5C2', fontSize: 12, fontFamily: "'DM Sans', sans-serif", width: 180, outline: 'none' }}
                          />
                          <button
                            onClick={() => {
                              if (novaCondicao.trim()) {
                                setFormAnamnese({ ...formAnamnese, campos_extras: [...(formAnamnese.campos_extras || []), { tipo: 'condicao', label: novaCondicao.trim(), valor: '' }] });
                                setNovaCondicao('');
                              }
                            }}
                            style={{ padding: '4px 10px', borderRadius: 20, background: '#A8D5C2', border: 'none', fontSize: 12, cursor: 'pointer', color: '#1A1A1A' }}
                          >OK</button>
                          <button onClick={() => setNovaCondicao(null)} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
                        </div>
                      )}
                      {novaCondicao === null && (
                        <button
                          onClick={() => setNovaCondicao('')}
                          style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px dashed #A8D5C2', background: 'none', fontSize: 12, color: '#3E7D63', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Plus size={12} /> Nova condição
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <Button variant="ghost" onClick={() => setEditandoAnamnese(false)}>Cancelar</Button>
                    <Button onClick={handleSalvarAnamnese} disabled={salvandoAnamnese}>
                      {salvandoAnamnese ? 'Salvando...' : 'Salvar anamnese'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ──────── Plano de tratamento ──────── */}
          {activeTab === 'Plano de tratamento' && (
            <>
              <Card style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Plano de tratamento</span>
                  <button onClick={() => { setEditPlanoId(null); setFormPlano({ procedimento: '', valor: '', status: 'pendente' }); setModalPlano(true); }} style={s.editBtn}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                {carregandoPaciente ? (
                  <div style={s.shimmerBlock} />
                ) : planoItens.length === 0 ? (
                  <EmptyState
                    Icon={FileSearch}
                    title="Nenhum item no plano"
                    subtitle="Adicione procedimentos planejados para acompanhar execução e pagamento."
                    ctaIcon={Plus}
                    cta="Adicionar procedimento"
                    onCta={() => { setEditPlanoId(null); setFormPlano({ procedimento: '', valor: '', status: 'pendente' }); setModalPlano(true); }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {planoItens.map(p => (
                      <div key={p.id} style={s.planItem}>
                        <div onClick={() => handleToggleStatus(p)} style={{ ...s.planCheck, ...(p.status === 'feito' ? s.planCheckDone : {}), cursor: 'pointer' }}>
                          {p.status === 'feito' && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 13 }}>{p.procedimento}</span>
                        <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>
                        <Badge color={p.status === 'feito' ? 'green' : 'yellow'}>{p.status === 'feito' ? 'Feito' : 'Pendente'}</Badge>
                        <div style={{ display: 'flex', gap: 6, marginLeft: 10, alignItems: 'center', position: 'relative' }}>
                          {p.status === 'feito' && (
                            p.pago ? (
                              <span style={{ padding: '4px 10px', fontSize: 11, background: '#EAF5EF', color: '#3E7D63', border: '1px solid #A8D5C2', borderRadius: 6, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={11} strokeWidth={2.5} /> Recebido
                              </span>
                            ) : (
                              <button onClick={() => abrirModalRecebimento(p)} style={{ padding: '4px 10px', fontSize: 11, background: '#EAF5EF', color: '#3E7D63', border: '1px solid #A8D5C2', borderRadius: 6, cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <DollarSign size={11} strokeWidth={2.2} /> Receber
                              </button>
                            )
                          )}
                          <button
                            onClick={() => setMenuPlanoId(menuPlanoId === p.id ? null : p.id)}
                            style={{ ...s.iconBtn, color: '#888' }}
                            aria-label="Mais ações"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuPlanoId === p.id && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuPlanoId(null)} />
                              <div style={s.dropdown}>
                                <button
                                  style={s.dropdownItem}
                                  onClick={() => {
                                    setEditPlanoId(p.id);
                                    setFormPlano({ procedimento: p.procedimento, valor: String(p.valor), status: p.status });
                                    setModalPlano(true);
                                    setMenuPlanoId(null);
                                  }}
                                ><Edit3 size={12} /> Editar</button>
                                <button
                                  style={{ ...s.dropdownItem, color: '#C5585A' }}
                                  onClick={() => { setMenuPlanoId(null); handleExcluirPlano(p.id); }}
                                ><Trash2 size={12} /> Excluir</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {planoItens.length > 0 && (() => {
                  const total = planoItens.reduce((sum, p) => sum + Number(p.valor), 0);
                  const realizado = planoItens.filter(p => p.status === 'feito').reduce((sum, p) => sum + Number(p.valor), 0);
                  return (
                    <>
                      <div style={{ marginTop: 20, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#888' }}>Total do tratamento</span>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div style={{ marginTop: 8, padding: '14px 16px', background: '#EAF5EF', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#3E7D63' }}>Já realizado</span>
                        <span style={{ fontSize: 16, fontWeight: 500, color: '#3E7D63' }}>R$ {realizado.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </>
                  );
                })()}
              </Card>

              {/* Modal plano */}
              {modalPlano && (
                <ModalShell titulo={editPlanoId ? 'Editar item' : 'Novo item do plano'} onClose={() => setModalPlano(false)} maxWidth={500}>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={m.label}>Procedimento *</label>
                      <select
                        value={formPlano.procedimento}
                        onChange={e => {
                          const nome = e.target.value;
                          const proc = procedimentosCadastrados.find(p => p.nome === nome);
                          setFormPlano({ ...formPlano, procedimento: nome, valor: proc ? String(proc.preco) : formPlano.valor });
                        }}
                        style={m.input}
                        autoFocus
                      >
                        <option value="">Selecione um procedimento</option>
                        {procedimentosCadastrados.map(p => (
                          <option key={p.id} value={p.nome}>{p.nome} — R$ {Number(p.preco).toFixed(2).replace('.', ',')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={m.label}>Valor (R$)</label>
                      <input type="number" min="0" step="0.01" value={formPlano.valor} onChange={e => setFormPlano({ ...formPlano, valor: e.target.value })} placeholder="0,00" style={m.input} />
                    </div>
                    <div>
                      <label style={m.label}>Status</label>
                      <select value={formPlano.status} onChange={e => setFormPlano({ ...formPlano, status: e.target.value })} style={m.input}>
                        <option value="pendente">Pendente</option>
                        <option value="feito">Feito</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.modalFooter}>
                    <Button variant="ghost" onClick={() => setModalPlano(false)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleSalvarPlano} disabled={salvandoPlano} style={{ flex: 1 }}>
                      {salvandoPlano ? 'Salvando...' : editPlanoId ? 'Salvar' : 'Adicionar'}
                    </Button>
                  </div>
                </ModalShell>
              )}

              {/* Modal recebimento */}
              {modalRecebimento && (
                <ModalShell titulo="Registrar recebimento" onClose={() => setModalRecebimento(null)} maxWidth={480}>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: '#EAF5EF', border: '1px solid #A8D5C2', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{modalRecebimento.procedimento}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#3E7D63', marginTop: 4 }}>
                        R$ {Number(modalRecebimento.valor).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <div>
                      <label style={m.label}>Forma de pagamento *</label>
                      <select value={formRecebimento.forma_pagamento} onChange={e => setFormRecebimento({ ...formRecebimento, forma_pagamento: e.target.value })} style={m.input}>
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Convênio">Convênio</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Boleto">Boleto</option>
                      </select>
                    </div>
                    <div>
                      <label style={m.label}>Data do recebimento *</label>
                      <input type="date" value={formRecebimento.data_recebimento} onChange={e => setFormRecebimento({ ...formRecebimento, data_recebimento: e.target.value })} style={m.input} />
                    </div>
                    <div>
                      <label style={m.label}>Observações</label>
                      <textarea value={formRecebimento.observacoes} onChange={e => setFormRecebimento({ ...formRecebimento, observacoes: e.target.value })} placeholder="Ex: Pago em 2x no cartão..." style={{ ...m.input, minHeight: 70, resize: 'vertical' }} />
                    </div>
                  </div>
                  <div style={s.modalFooter}>
                    <Button variant="ghost" onClick={() => setModalRecebimento(null)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleRegistrarRecebimento} disabled={salvandoRecebimento} style={{ flex: 1 }}>
                      {salvandoRecebimento ? 'Registrando...' : 'Confirmar recebimento'}
                    </Button>
                  </div>
                </ModalShell>
              )}
            </>
          )}

          {/* ──────── Evolução clínica ──────── */}
          {activeTab === 'Evolução clínica' && (
            <>
              <Card style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Evolução clínica</span>
                  <button onClick={() => abrirModalEvolucao()} style={s.editBtn}>
                    <Plus size={12} /> Nova evolução
                  </button>
                </div>
                {carregandoPaciente ? (
                  <div style={s.shimmerBlock} />
                ) : evolucoes.length === 0 ? (
                  <EmptyState
                    Icon={Activity}
                    title="Nenhuma evolução registrada"
                    subtitle="Registre procedimentos realizados com data, descrição clínica e responsável."
                    ctaIcon={Plus}
                    cta="Registrar evolução"
                    onCta={() => abrirModalEvolucao()}
                  />
                ) : (
                  <div style={{ marginTop: 4 }}>
                    {evolucoes.map(e => (
                      <div key={e.id} style={s.evoItem}>
                        <div style={s.evoDate}>{new Date(e.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.procedimento}</div>
                          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{e.descricao}</div>
                          {e.dentista && <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>{e.dentista}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, position: 'relative' }}>
                          <button onClick={() => setMenuEvolucaoId(menuEvolucaoId === e.id ? null : e.id)} style={{ ...s.iconBtn, color: '#888' }} aria-label="Mais ações">
                            <MoreVertical size={14} />
                          </button>
                          {menuEvolucaoId === e.id && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuEvolucaoId(null)} />
                              <div style={s.dropdown}>
                                <button style={s.dropdownItem} onClick={() => { setMenuEvolucaoId(null); abrirModalEvolucao(e); }}>
                                  <Edit3 size={12} /> Editar
                                </button>
                                <button style={{ ...s.dropdownItem, color: '#C5585A' }} onClick={() => { setMenuEvolucaoId(null); handleExcluirEvolucao(e.id); }}>
                                  <Trash2 size={12} /> Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Modal evolução */}
              {modalEvolucao && (
                <ModalShell titulo={editEvolucaoId ? 'Editar evolução' : 'Nova evolução'} onClose={() => setModalEvolucao(false)} maxWidth={500}>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={m.label}>Procedimento *</label>
                      <select value={formEvolucao.procedimento} onChange={e => setFormEvolucao({ ...formEvolucao, procedimento: e.target.value })} style={m.input} autoFocus>
                        <option value="">Selecione um procedimento</option>
                        {procedimentosCadastrados.map(p => (
                          <option key={p.id} value={p.nome}>{p.nome}</option>
                        ))}
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label style={m.label}>Descrição / Observações *</label>
                      <textarea value={formEvolucao.descricao} onChange={e => setFormEvolucao({ ...formEvolucao, descricao: e.target.value })} placeholder="Descreva o procedimento realizado, observações clínicas..." style={{ ...m.input, minHeight: 90, resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={m.label}>Dentista responsável</label>
                      <input
                        value={formEvolucao.dentista || nomeDentistaLogado}
                        readOnly
                        style={{ ...m.input, background: '#F8F8F8', color: '#666', cursor: 'not-allowed' }}
                      />
                      <span style={{ fontSize: 11, color: '#AAA', marginTop: 4, display: 'block' }}>Preenchido automaticamente com o usuário logado</span>
                    </div>
                  </div>
                  <div style={s.modalFooter}>
                    <Button variant="ghost" onClick={() => setModalEvolucao(false)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleSalvarEvolucao} disabled={salvandoEvolucao} style={{ flex: 1 }}>
                      {salvandoEvolucao ? 'Salvando...' : editEvolucaoId ? 'Salvar' : 'Registrar'}
                    </Button>
                  </div>
                </ModalShell>
              )}
            </>
          )}

          {/* ──────── Documentos ──────── */}
          {activeTab === 'Documentos' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Documentos</span>
                <label style={{ cursor: 'pointer', background: '#1A1A1A', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={13} /> Enviar documento
                  <input type="file" style={{ display: 'none' }} onChange={handleSelecionarArquivo} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                </label>
              </div>
              {carregandoPaciente ? (
                <div style={s.shimmerBlock} />
              ) : documentos.length === 0 ? (
                <EmptyState
                  Icon={FolderOpen}
                  title="Nenhum documento enviado"
                  subtitle="Envie radiografias, laudos, receitas e atestados ligados ao paciente."
                  ctaIcon={Upload}
                  cta="Enviar documento"
                  onCta={() => document.querySelector('input[type=file]').click()}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {documentos.map(doc => (
                    <div key={doc.id} style={s.docItem}>
                      {doc.tipo === 'Imagem' && thumbnails[doc.id] ? (
                        <div
                          style={{ ...s.docThumb, backgroundImage: `url(${thumbnails[doc.id]})` }}
                          onClick={() => handleBaixarDocumento(doc)}
                          title="Abrir imagem"
                        />
                      ) : (
                        <div style={s.docIcon}>
                          {doc.tipo === 'Imagem' ? <ImageIcon size={20} /> : <FileText size={20} />}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.nome}</div>
                        {doc.descricao && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{doc.descricao}</div>}
                        <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>
                          {new Date(doc.criado_em).toLocaleDateString('pt-BR')} · {doc.tamanho}
                        </div>
                      </div>
                      <Badge color="gray">{doc.tipo}</Badge>
                      <button style={s.docBtn} onClick={() => handleBaixarDocumento(doc)}>
                        <Download size={12} /> Baixar
                      </button>
                      <button style={{ ...s.docBtn, color: '#C5585A' }} onClick={() => handleExcluirDocumento(doc)}>
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {modalDoc && (
            <ModalShell titulo="Enviar documento" onClose={() => setModalDoc(null)} maxWidth={500}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={m.label}>Nome do documento *</label>
                  <input value={formDoc.nome} onChange={e => setFormDoc({ ...formDoc, nome: e.target.value })} style={m.input} />
                </div>
                <div>
                  <label style={m.label}>Descrição</label>
                  <textarea value={formDoc.descricao} onChange={e => setFormDoc({ ...formDoc, descricao: e.target.value })} placeholder="Ex: Radiografia panorâmica inicial, laudo de exame..." style={{ ...m.input, minHeight: 80, resize: 'vertical' }} />
                </div>
                <div style={{ fontSize: 12, color: '#AAA', background: '#F8F8F8', borderRadius: 8, padding: '10px 12px' }}>
                  <div>{modalDoc.arquivo.name} · {modalDoc.tamanhoOriginal} · {modalDoc.tipo}</div>
                  {modalDoc.tipo === 'Imagem' && (
                    <div style={{ color: '#3E7D63', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} strokeWidth={2.5} /> será comprimida automaticamente
                    </div>
                  )}
                </div>
              </div>
              <div style={s.modalFooter}>
                <Button variant="ghost" onClick={() => setModalDoc(null)} style={{ flex: 1 }}>Cancelar</Button>
                <Button onClick={handleUploadDocumento} disabled={uploadando} style={{ flex: 1 }}>
                  {uploadando ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </ModalShell>
          )}

          <ToothStatusPopover tooth={selectedTooth} onSelect={setToothStatus} onClose={() => setSelectedTooth(null)} />
        </>
      ) : (
        <Card>
          <EmptyState
            Icon={UserPlus}
            title="Selecione um paciente"
            subtitle='Use a busca acima ou clique em "Prontuário" na lista de pacientes para abrir a ficha clínica.'
            ctaIcon={Search}
            cta="Ir para pacientes"
            onCta={() => router.push('/pacientes')}
          />
        </Card>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? '#2B1D1D' : '#1A2B23' }}>
          {toast.type === 'error'
            ? <XCircle size={16} color="#E57373" />
            : <CheckCircle2 size={16} color="#81C995" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Confirm modal */}
      {confirmacao && (
        <ModalShell titulo="Confirmar ação" onClose={confirmacao.onCancel} maxWidth={420}>
          <div style={{ padding: '22px 24px 8px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FDF0E6', color: '#A55A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ fontSize: 14, color: '#333', paddingTop: 8, lineHeight: 1.5 }}>{confirmacao.msg}</div>
          </div>
          <div style={s.modalFooter}>
            <Button variant="ghost" onClick={confirmacao.onCancel} style={{ flex: 1 }}>Cancelar</Button>
            <Button onClick={confirmacao.onConfirm} style={{ flex: 1, background: '#C5585A', color: '#fff' }}>Confirmar</Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Empty state reutilizável
// ─────────────────────────────────────────────────────────
function EmptyState({ Icon, title, subtitle, cta, ctaIcon: CtaIcon, onCta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', marginBottom: 14 }}>
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#1A1A1A', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: '#888', maxWidth: 360, lineHeight: 1.5, marginBottom: cta ? 16 : 0 }}>{subtitle}</div>}
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{ marginTop: 4, background: '#1A1A1A', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif" }}
        >
          {CtaIcon && <CtaIcon size={13} />} {cta}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────
const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, background: '#F8F8F8' },
  patientCard: { background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', padding: 24, display: 'flex', alignItems: 'center', gap: 20 },
  avatar: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 },
  patientName: { fontFamily: "'DM Serif Display', serif", fontSize: 22, letterSpacing: '-0.3px' },
  patientMeta: { display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' },
  tabsWrap: { position: 'sticky', top: 0, zIndex: 5, background: '#F8F8F8', paddingTop: 4, paddingBottom: 4 },
  tabs: { display: 'flex', background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', overflow: 'hidden' },
  tab: { padding: '13px 18px', fontSize: 13, cursor: 'pointer', color: '#888', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 },
  tabActive: { color: '#1A1A1A', fontWeight: 500, borderBottomColor: '#1A1A1A', background: '#FAFAFA' },
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F5F5' },
  planItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#FAFAFA' },
  planCheck: { width: 18, height: 18, borderRadius: '50%', borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCheckDone: { background: '#3E7D63', borderColor: '#3E7D63' },
  iconBtn: { width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropdown: { position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1.5px solid #EFEFEF', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 11, minWidth: 140, overflow: 'hidden', animation: 'slideUp 0.12s ease-out' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#333', cursor: 'pointer', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" },
  evoItem: { display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #F5F5F5' },
  evoDate: { fontSize: 11, color: '#AAA', minWidth: 80, paddingTop: 2 },
  editBtn: { background: 'none', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#555', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6 },
  anamneseGrid: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 },
  anamneseItem: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, paddingBottom: 14, borderBottom: '1px solid #F5F5F5' },
  anamneseLabel: { fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: 1 },
  anamneseValue: { fontSize: 13, color: '#333', lineHeight: 1.5 },
  condTag: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid #EFEFEF', fontSize: 12, color: '#AAA', display: 'inline-flex', alignItems: 'center', gap: 6 },
  condTagActive: { background: '#EAF5EF', border: '1.5px solid #A8D5C2', color: '#3E7D63' },
  docItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#FAFAFA' },
  docIcon: { width: 44, height: 44, background: '#F0F0F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', flexShrink: 0 },
  docThumb: { width: 44, height: 44, borderRadius: 8, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', flexShrink: 0, border: '1px solid #EFEFEF' },
  docBtn: { padding: '6px 12px', border: '1.5px solid #EFEFEF', borderRadius: 8, background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 5 },
  modalFooter: { display: 'flex', gap: 12, padding: '14px 24px 20px', borderTop: '1px solid #F5F5F5', background: '#FAFAFA' },
  shimmerBlock: { height: 200, borderRadius: 10, background: 'linear-gradient(90deg, #F5F5F5 0%, #FAFAFA 50%, #F5F5F5 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite linear' },
  toast: { position: 'fixed', bottom: 32, right: 32, background: '#1A2B23', color: '#fff', padding: '12px 18px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, zIndex: 1100, fontFamily: "'DM Sans', sans-serif", animation: 'slideUp 0.2s ease-out' },
};
