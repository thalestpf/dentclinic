'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardTitle, PageHeader, Button, Badge } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const initialTeeth = [
  {n:'18',s:'ok'},{n:'17',s:'ok'},{n:'16',s:'restored'},{n:'15',s:'ok'},{n:'14',s:'cavity'},{n:'13',s:'ok'},{n:'12',s:'ok'},{n:'11',s:'cavity'},
  {n:'21',s:'ok'},{n:'22',s:'ok'},{n:'23',s:'ok'},{n:'24',s:'ok'},{n:'25',s:'ok'},{n:'26',s:'restored'},{n:'27',s:'ok'},{n:'28',s:'missing'},
  {n:'38',s:'missing'},{n:'37',s:'ok'},{n:'36',s:'restored'},{n:'35',s:'ok'},{n:'34',s:'ok'},{n:'33',s:'ok'},{n:'32',s:'ok'},{n:'31',s:'ok'},
  {n:'41',s:'ok'},{n:'42',s:'ok'},{n:'43',s:'ok'},{n:'44',s:'ok'},{n:'45',s:'cavity'},{n:'46',s:'ok'},{n:'47',s:'ok'},{n:'48',s:'missing'},
];

const toothFill = {
  ok:'#E8F5E9', cavity:'#FFF3CD', restored:'#D1ECF1', missing:'#F8D7DA',
  fracture:'#FFE8D6', prosthesis:'#EDE7F6', crown:'#E3F2FD', partial:'#E8EAF6',
  implant:'#E0F7FA', tartar:'#F5F5DC',
};
const toothStroke = {
  ok:'#A8D5C2', cavity:'#F39C12', restored:'#17A2B8', missing:'#E74C3C',
  fracture:'#E67E22', prosthesis:'#7B1FA2', crown:'#1565C0', partial:'#3949AB',
  implant:'#00838F', tartar:'#8D6E63',
};

const statusOptions = [
  { key: 'ok', label: 'Saudável', color: '#A8D5C2' },
  { key: 'cavity', label: 'Cárie', color: '#F39C12' },
  { key: 'restored', label: 'Restaurado', color: '#17A2B8' },
  { key: 'missing', label: 'Ausente', color: '#E74C3C' },
  { key: 'fracture', label: 'Fratura', color: '#E67E22' },
  { key: 'prosthesis', label: 'Prótese', color: '#7B1FA2' },
  { key: 'crown', label: 'Coroa total', color: '#1565C0' },
  { key: 'partial', label: 'Coroa parcial', color: '#3949AB' },
  { key: 'implant', label: 'Implante', color: '#00838F' },
  { key: 'tartar', label: 'Tártaro', color: '#8D6E63' },
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
  const fill = toothFill[tooth.s] || '#E8F5E9';
  const stroke = toothStroke[tooth.s] || '#A8D5C2';
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
            <div key={opt.key} style={{ ...m.option, ...(tooth.s === opt.key ? m.optionActive : {}) }} onClick={() => onSelect(tooth.n, opt.key)}>
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
  close: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#AAA', lineHeight: 1 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 14 },
  option: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #F0F0F0', cursor: 'pointer', background: '#FAFAFA' },
  optionActive: { border: '1.5px solid #1A1A1A', background: '#F5F5F5', fontWeight: 500 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" },
};

const plan = [
  { name: 'Limpeza profissional', price: 'R$150', done: true },
  { name: 'Restauração dente 36', price: 'R$280', done: true },
  { name: 'Canal dente 11', price: 'R$900', done: false },
  { name: 'Clareamento', price: 'R$600', done: false },
];


const tabs = ['Odontograma', 'Anamnese', 'Plano de tratamento', 'Evolução clínica', 'Documentos'];

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

  // Evolução clínica
  const [evolucoes, setEvolucoes] = useState([]);
  const [modalEvolucao, setModalEvolucao] = useState(false);
  const [editEvolucaoId, setEditEvolucaoId] = useState(null);
  const [formEvolucao, setFormEvolucao] = useState({ procedimento: '', descricao: '', dentista: '' });
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);
  const [nomeDentistaLogado, setNomeDentistaLogado] = useState('');

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [modalDoc, setModalDoc] = useState(null); // { arquivo, tipo, tamanho }
  const [formDoc, setFormDoc] = useState({ nome: '', descricao: '' });

  const carregarDocumentos = async (pacienteId) => {
    const { data } = await supabase.from('documentos').select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
    setDocumentos(data || []);
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
      if (uploadError) { alert('Erro ao enviar arquivo: ' + uploadError.message); return; }
      const tamanho = formatarTamanho(arquivoFinal.size);
      await supabase.from('documentos').insert({
        paciente_id: pacienteSelecionado.id,
        nome: formDoc.nome || arquivo.name,
        descricao: formDoc.descricao || null,
        tipo,
        tamanho,
        storage_path: path,
      });
      await carregarDocumentos(pacienteSelecionado.id);
      setModalDoc(null);
    } finally {
      setUploadando(false);
    }
  };

  const handleBaixarDocumento = async (doc) => {
    const { data } = await supabase.storage.from('prontuario-docs').createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert('Erro ao gerar link de download');
  };

  const handleExcluirDocumento = async (doc) => {
    if (!confirm(`Excluir "${doc.nome}"?`)) return;
    await supabase.storage.from('prontuario-docs').remove([doc.storage_path]);
    await supabase.from('documentos').delete().eq('id', doc.id);
    setDocumentos(prev => prev.filter(d => d.id !== doc.id));
  };

  useEffect(() => {
    const carregarDentista = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('user_roles').select('nome').eq('id', session.user.id).maybeSingle();
          if (userData?.nome) {
            setNomeDentistaLogado(userData.nome);
          } else {
            setNomeDentistaLogado(session.user.email || localStorage.getItem('dentclinic_name') || '');
          }
        } else {
          setNomeDentistaLogado(localStorage.getItem('dentclinic_name') || '');
        }
      } catch {
        setNomeDentistaLogado(localStorage.getItem('dentclinic_name') || '');
      }
    };
    carregarDentista();
    supabase.from('procedimentos').select('id, nome, preco').eq('status', 'ativo').order('nome')
      .then(({ data }) => setProcedimentosCadastrados(data || []));
  }, []);

  useEffect(() => {
    supabase.from('pacientes').select('*').order('nome').then(({ data }) => {
      if (!data) return;
      setPacientes(data);

      const pacienteId = searchParams.get('paciente') || localStorage.getItem('prontuario_paciente_id');
      if (!pacienteId) return;
      const paciente = data.find(p => String(p.id) === String(pacienteId));
      if (paciente) {
        setPacienteSelecionado(paciente);
        localStorage.setItem('prontuario_paciente_id', paciente.id);
        localStorage.setItem('prontuario_paciente_nome', paciente.nome || '');
        carregarAnamnese(paciente.id);
        carregarPlano(paciente.id);
        carregarEvolucoes(paciente.id);
        carregarDocumentos(paciente.id);
      }
    });
  }, [searchParams]);

  const carregarAnamnese = async (pacienteId) => {
    const { data } = await supabase.from('anamnese').select('*').eq('paciente_id', pacienteId).single();
    if (data) { setAnamnese(data); setFormAnamnese(data); }
    else { setAnamnese(null); setFormAnamnese(anamneseVazia); }
  };

  const handleSalvarAnamnese = async () => {
    if (!pacienteSelecionado) return;
    setSalvandoAnamnese(true);
    const dados = { ...formAnamnese, paciente_id: pacienteSelecionado.id, atualizado_em: new Date().toISOString() };
    let error;
    if (anamnese?.id) {
      ({ error } = await supabase.from('anamnese').update(dados).eq('id', anamnese.id));
    } else {
      ({ error } = await supabase.from('anamnese').insert([dados]));
    }
    if (error) { alert('Erro ao salvar: ' + error.message); }
    else { await carregarAnamnese(pacienteSelecionado.id); setEditandoAnamnese(false); }
    setSalvandoAnamnese(false);
  };

  const carregarPlano = async (pacienteId) => {
    const { data } = await supabase.from('plano_tratamento').select('*').eq('paciente_id', pacienteId).order('criado_em');
    setPlanoItens(data || []);
  };

  const handleSalvarPlano = async () => {
    if (!formPlano.procedimento) { alert('Informe o procedimento'); return; }
    setSalvandoPlano(true);
    const dados = { procedimento: formPlano.procedimento, valor: parseFloat(formPlano.valor) || 0, status: formPlano.status, paciente_id: pacienteSelecionado.id };
    let error;
    if (editPlanoId) {
      ({ error } = await supabase.from('plano_tratamento').update(dados).eq('id', editPlanoId));
    } else {
      ({ error } = await supabase.from('plano_tratamento').insert([dados]));
    }
    if (error) { alert('Erro: ' + error.message); }
    else { await carregarPlano(pacienteSelecionado.id); setModalPlano(false); }
    setSalvandoPlano(false);
  };

  const handleToggleStatus = async (item) => {
    const novoStatus = item.status === 'feito' ? 'pendente' : 'feito';
    await supabase.from('plano_tratamento').update({ status: novoStatus }).eq('id', item.id);
    setPlanoItens(planoItens.map(p => p.id === item.id ? { ...p, status: novoStatus } : p));
  };

  const handleExcluirPlano = async (id) => {
    if (!confirm('Excluir este item do plano?')) return;
    await supabase.from('plano_tratamento').delete().eq('id', id);
    setPlanoItens(planoItens.filter(p => p.id !== id));
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

    // 1. Salvar no histórico de recebimentos
    const { error } = await supabase.from('recebimentos').insert({
      paciente_id: pacienteSelecionado.id,
      plano_item_id: modalRecebimento.id,
      procedimento: modalRecebimento.procedimento,
      valor,
      forma_pagamento: formRecebimento.forma_pagamento,
      data_recebimento: formRecebimento.data_recebimento,
      observacoes: formRecebimento.observacoes || null,
    });
    if (error) { setSalvandoRecebimento(false); alert('Erro ao registrar: ' + error.message); return; }

    // 2. Marcar item do plano como pago
    await supabase.from('plano_tratamento').update({ pago: true }).eq('id', modalRecebimento.id);
    setPlanoItens(prev => prev.map(p => p.id === modalRecebimento.id ? { ...p, pago: true } : p));

    // 3. Lançar no financeiro (tabela lancamentos)
    await supabase.from('lancamentos').insert({
      tipo: 'entrada',
      descricao: `${modalRecebimento.procedimento} — ${pacienteSelecionado.nome}`,
      categoria: 'Consulta',
      valor,
      status: 'pago',
      data: formRecebimento.data_recebimento,
    });

    setSalvandoRecebimento(false);
    setModalRecebimento(null);
  };

  // ─── EVOLUÇÃO CLÍNICA ─────────────────────────────────────────
  const carregarEvolucoes = async (pacienteId) => {
    const { data } = await supabase.from('evolucoes').select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: false });
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
    if (!formEvolucao.procedimento || !formEvolucao.descricao) { alert('Preencha procedimento e descrição'); return; }
    setSalvandoEvolucao(true);
    const dados = { procedimento: formEvolucao.procedimento, descricao: formEvolucao.descricao, dentista: formEvolucao.dentista, paciente_id: pacienteSelecionado.id };
    let error;
    if (editEvolucaoId) {
      ({ error } = await supabase.from('evolucoes').update(dados).eq('id', editEvolucaoId));
    } else {
      ({ error } = await supabase.from('evolucoes').insert([dados]));
    }
    if (error) { alert('Erro: ' + error.message); }
    else { await carregarEvolucoes(pacienteSelecionado.id); setModalEvolucao(false); }
    setSalvandoEvolucao(false);
  };

  const handleExcluirEvolucao = async (id) => {
    if (!confirm('Excluir esta evolução?')) return;
    await supabase.from('evolucoes').delete().eq('id', id);
    setEvolucoes(evolucoes.filter(e => e.id !== id));
  };

  const setToothStatus = (n, status) => {
    setTeeth(prev => prev.map(t => t.n === n ? { ...t, s: status } : t));
    setSelectedTooth(null);
  };

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

  return (
    <div style={s.main}>
      <PageHeader title="Prontuário" subtitle="Ficha clínica do paciente">
        {pacienteSelecionado && (
          <>
            <Button variant="ghost">Imprimir</Button>
            {activeTab === 'Anamnese' && (
              <Button onClick={() => { setFormAnamnese(anamnese || anamneseVazia); setEditandoAnamnese(true); }}>
                {anamnese ? 'Editar anamnese' : '+ Nova anamnese'}
              </Button>
            )}
            {activeTab === 'Evolução clínica' && <Button onClick={() => abrirModalEvolucao()}>+ Nova evolução</Button>}
          </>
        )}
      </PageHeader>

      {/* Busca de paciente */}
      {!pacienteSelecionado && (
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar paciente pelo nome..."
            value={buscaPaciente}
            onChange={e => setBuscaPaciente(e.target.value)}
            onFocus={() => setBuscaFocada(true)}
            onBlur={() => setTimeout(() => setBuscaFocada(false), 150)}
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff' }}
          />
          {pacientesFiltrados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #E8E8E8', borderRadius: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4 }}>
              {pacientesFiltrados.map(p => (
                <div key={p.id} onClick={() => {
                  setPacienteSelecionado(p);
                  setBuscaPaciente('');
                  setAnamnese(null);
                  setFormAnamnese(anamneseVazia);
                  setEditandoAnamnese(false);
                  setPlanoItens([]);
                  localStorage.setItem('prontuario_paciente_id', p.id);
                  localStorage.setItem('prontuario_paciente_nome', p.nome || '');
                  carregarAnamnese(p.id);
                  carregarPlano(p.id);
                  router.replace(`/prontuario?paciente=${p.id}`);
                }}
                  style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F8F8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <strong>{p.nome}</strong>
                  <span style={{ color: '#AAA', marginLeft: 12, fontSize: 12 }}>{p.cpf || ''} {p.telefone ? '· ' + p.telefone : ''}</span>
                </div>
              ))}
            </div>
          )}
          {buscaFocada && buscaPaciente.length >= 2 && pacientesFiltrados.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#AAA' }}>Nenhum paciente encontrado. <a href="/pacientes" style={{ color: '#A8D5C2' }}>Cadastrar novo</a></div>
          )}
          {buscaFocada && buscaPaciente.length < 2 && pacientes.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#AAA' }}>Nenhum paciente cadastrado. <a href="/pacientes" style={{ color: '#A8D5C2' }}>Cadastrar novo</a></div>
          )}
        </div>
      )}

      {pacienteSelecionado && (
        <div style={s.patientCard}>
          <div style={s.avatar}>{pacienteSelecionado.nome.slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
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
            <Button
              variant="ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              onClick={() => {
                setPacienteSelecionado(null);
                setActiveTab('Odontograma');
                setAnamnese(null);
                setFormAnamnese(anamneseVazia);
                setEditandoAnamnese(false);
                localStorage.removeItem('prontuario_paciente_id');
                localStorage.removeItem('prontuario_paciente_nome');
                router.replace('/prontuario');
              }}
            >
              Trocar
            </Button>
          </div>
        </div>
      )}

      {pacienteSelecionado ? (
        <>
      <div style={s.tabs}>
        {tabs.map(t => (
          <div key={t} style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }} onClick={() => setActiveTab(t)}>{t}</div>
        ))}
      </div>

      {activeTab === 'Odontograma' && (
        <Card>
          <CardTitle>
            Odontograma
            <span style={{ fontSize: 11, color: '#AAA', fontWeight: 300, marginLeft: 8 }}>clique no dente para alterar</span>
          </CardTitle>
          <OdontogramaSVG teeth={teeth} selectedTooth={selectedTooth} onToothClick={t => setSelectedTooth(prev => prev?.n === t.n ? null : t)} />
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

      {activeTab === 'Anamnese' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!editandoAnamnese ? (
            <>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Informações gerais</span>
                  <button onClick={() => { setFormAnamnese(anamnese || anamneseVazia); setEditandoAnamnese(true); }} style={s.editBtn}>
                    {anamnese ? 'Editar' : '+ Preencher anamnese'}
                  </button>
                </div>
                {!anamnese ? (
                  <p style={{ color: '#AAA', fontSize: 13 }}>Anamnese não preenchida. Clique em "+ Preencher anamnese" para adicionar.</p>
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
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Histórico sistêmico</span>
                  <button onClick={() => { setFormAnamnese(anamnese || anamneseVazia); setEditandoAnamnese(true); }} style={s.editBtn}>Editar</button>
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
                        <span style={{ fontSize: 11 }}>{has ? '✓' : '○'}</span> {label}
                      </div>
                    );
                  })}
                  {(anamnese?.campos_extras || []).filter(c => c.tipo === 'condicao').map((c, i) => (
                    <div key={i} style={{ ...s.condTag, ...s.condTagActive }}>
                      <span style={{ fontSize: 11 }}>✓</span> {c.label}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>
                  {anamnese ? 'Editar anamnese' : 'Nova anamnese'}
                </span>
                <button onClick={() => setEditandoAnamnese(false)} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: 14 }}>✕</button>
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
              {/* Campos extras dinâmicos */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={s.anamneseLabel}>Informações adicionais</div>
                  <button
                    onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: [...(formAnamnese.campos_extras || []), { label: '', valor: '' }] })}
                    style={{ background: 'none', border: '1.5px dashed #A8D5C2', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#27AE60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    + Adicionar campo
                  </button>
                </div>
                {(formAnamnese.campos_extras || []).map((campo, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 32px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                    <input
                      placeholder="Nome do campo"
                      value={campo.label}
                      onChange={e => {
                        const extras = [...formAnamnese.campos_extras];
                        extras[i] = { ...extras[i], label: e.target.value };
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
                        extras[i] = { ...extras[i], valor: e.target.value };
                        setFormAnamnese({ ...formAnamnese, campos_extras: extras });
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: formAnamnese.campos_extras.filter((_, j) => j !== i) })}
                      style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', fontSize: 16, paddingTop: 8 }}
                    >✕</button>
                  </div>
                ))}
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
                        <span style={{ fontSize: 11 }}>{ativo ? '✓' : '○'}</span> {label}
                      </button>
                    );
                  })}
                  {/* Condições extras */}
                  {(formAnamnese.campos_extras || []).filter(c => c.tipo === 'condicao').map((c, i) => {
                    const idxGlobal = formAnamnese.campos_extras.indexOf(c);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, border: '1.5px solid #A8D5C2', background: '#F0FBF6' }}>
                        <span style={{ fontSize: 11, color: '#27AE60' }}>✓</span>
                        <span style={{ fontSize: 12, color: '#27AE60' }}>{c.label}</span>
                        <button onClick={() => setFormAnamnese({ ...formAnamnese, campos_extras: formAnamnese.campos_extras.filter((_, j) => j !== idxGlobal) })}
                          style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px' }}>✕</button>
                      </div>
                    );
                  })}
                  {/* Input inline para nova condição */}
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
                          if (e.key === 'Escape') setNovaCondicao('');
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
                      <button onClick={() => setNovaCondicao('')} style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </div>
                  )}
                  <button
                    onClick={() => setNovaCondicao('')}
                    style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px dashed #A8D5C2', background: 'none', fontSize: 12, color: '#27AE60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    + Nova condição
                  </button>
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

      {activeTab === 'Plano de tratamento' && (
        <>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16 }}>Plano de tratamento</span>
              <button onClick={() => { setEditPlanoId(null); setFormPlano({ procedimento: '', valor: '', status: 'pendente' }); setModalPlano(true); }} style={s.editBtn}>+ Adicionar</button>
            </div>
            {planoItens.length === 0 ? (
              <p style={{ color: '#AAA', fontSize: 13 }}>Nenhum item no plano. Clique em "+ Adicionar" para incluir.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planoItens.map(p => (
                  <div key={p.id} style={s.planItem}>
                    <div onClick={() => handleToggleStatus(p)} style={{ ...s.planCheck, ...(p.status === 'feito' ? s.planCheckDone : {}), cursor: 'pointer' }}>
                      {p.status === 'feito' && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.procedimento}</span>
                    <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>
                    <Badge color={p.status === 'feito' ? 'green' : 'yellow'}>{p.status === 'feito' ? 'Feito' : 'Pendente'}</Badge>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                      {p.status === 'feito' && (
                        p.pago
                          ? <span style={{ padding: '4px 10px', fontSize: 11, background: '#E8F8F1', color: '#27AE60', border: '1px solid #A8D5C2', borderRadius: 6, fontWeight: 500 }}>✓ Recebido</span>
                          : <button onClick={() => abrirModalRecebimento(p)} style={{ ...s.acaoBotao, padding: '4px 10px', fontSize: 11, background: '#E8F8F1', color: '#27AE60', border: '1px solid #A8D5C2' }}>$ Receber</button>
                      )}
                      <button onClick={() => { setEditPlanoId(p.id); setFormPlano({ procedimento: p.procedimento, valor: String(p.valor), status: p.status }); setModalPlano(true); }} style={{ ...s.acaoBotao, padding: '4px 10px', fontSize: 11 }}>Editar</button>
                      <button onClick={() => handleExcluirPlano(p.id)} style={{ ...s.acaoBotao, padding: '4px 10px', fontSize: 11, color: '#E74C3C' }}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {planoItens.length > 0 && (() => {
              const total = planoItens.reduce((s, p) => s + Number(p.valor), 0);
              const realizado = planoItens.filter(p => p.status === 'feito').reduce((s, p) => s + Number(p.valor), 0);
              return (
                <>
                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>Total do tratamento</span>
                    <span style={{ fontSize: 16, fontWeight: 500 }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div style={{ marginTop: 8, padding: '14px 16px', background: '#F0FBF6', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#27AE60' }}>Já realizado</span>
                    <span style={{ fontSize: 16, fontWeight: 500, color: '#27AE60' }}>R$ {realizado.toFixed(2).replace('.', ',')}</span>
                  </div>
                </>
              );
            })()}
          </Card>

          {/* Modal plano */}
          {modalPlano && (
            <div style={m.overlay} onClick={() => setModalPlano(false)}>
              <div style={m.modal} onClick={e => e.stopPropagation()}>
                <div style={m.header}>
                  <span style={m.title}>{editPlanoId ? 'Editar item' : 'Novo item do plano'}</span>
                  <button style={m.closeBtn} onClick={() => setModalPlano(false)}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={s.label}>Procedimento *</label>
                    <select
                      value={formPlano.procedimento}
                      onChange={e => {
                        const nome = e.target.value;
                        const proc = procedimentosCadastrados.find(p => p.nome === nome);
                        setFormPlano({ ...formPlano, procedimento: nome, valor: proc ? String(proc.preco) : formPlano.valor });
                      }}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
                      autoFocus
                    >
                      <option value="">Selecione um procedimento</option>
                      {procedimentosCadastrados.map(p => (
                        <option key={p.id} value={p.nome}>{p.nome} — R$ {Number(p.preco).toFixed(2).replace('.', ',')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Valor (R$)</label>
                    <input type="number" min="0" step="0.01" value={formPlano.valor} onChange={e => setFormPlano({ ...formPlano, valor: e.target.value })}
                      placeholder="0,00"
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={s.label}>Status</label>
                    <select value={formPlano.status} onChange={e => setFormPlano({ ...formPlano, status: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
                      <option value="pendente">Pendente</option>
                      <option value="feito">Feito</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <Button variant="ghost" onClick={() => setModalPlano(false)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleSalvarPlano} disabled={salvandoPlano} style={{ flex: 1 }}>
                      {salvandoPlano ? 'Salvando...' : editPlanoId ? 'Salvar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal recebimento */}
          {modalRecebimento && (
            <div style={m.overlay} onClick={() => setModalRecebimento(null)}>
              <div style={{ ...m.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div style={m.header}>
                  <span style={m.title}>Registrar recebimento</span>
                  <button style={m.close} onClick={() => setModalRecebimento(null)}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: '#F0FBF6', border: '1px solid #A8D5C2', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{modalRecebimento.procedimento}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#27AE60', marginTop: 4 }}>
                      R$ {Number(modalRecebimento.valor).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div>
                    <label style={m.label}>Forma de pagamento *</label>
                    <select value={formRecebimento.forma_pagamento}
                      onChange={e => setFormRecebimento({ ...formRecebimento, forma_pagamento: e.target.value })}
                      style={m.input}>
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
                    <input type="date" value={formRecebimento.data_recebimento}
                      onChange={e => setFormRecebimento({ ...formRecebimento, data_recebimento: e.target.value })}
                      style={m.input} />
                  </div>
                  <div>
                    <label style={m.label}>Observações</label>
                    <textarea value={formRecebimento.observacoes}
                      onChange={e => setFormRecebimento({ ...formRecebimento, observacoes: e.target.value })}
                      placeholder="Ex: Pago em 2x no cartão..."
                      style={{ ...m.input, minHeight: 70, resize: 'vertical', fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <Button variant="ghost" onClick={() => setModalRecebimento(null)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleRegistrarRecebimento} disabled={salvandoRecebimento} style={{ flex: 1 }}>
                      {salvandoRecebimento ? 'Registrando...' : 'Confirmar recebimento'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'Evolução clínica' && (
        <>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Evolução clínica</span>
              <button onClick={() => abrirModalEvolucao()} style={{ background: 'none', border: 'none', color: '#A8D5C2', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nova evolução</button>
            </div>
            {evolucoes.length === 0 ? (
              <p style={{ color: '#AAA', fontSize: 13, padding: '8px 0' }}>Nenhuma evolução registrada. Clique em "+ Nova evolução" para adicionar.</p>
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
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button style={s.acaoBotao} onClick={() => abrirModalEvolucao(e)}>Editar</button>
                      <button style={{ ...s.acaoBotao, color: '#E53E3E' }} onClick={() => handleExcluirEvolucao(e.id)}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Modal evolução */}
          {modalEvolucao && (
            <div style={m.overlay} onClick={() => setModalEvolucao(false)}>
              <div style={m.modal} onClick={e => e.stopPropagation()}>
                <div style={m.header}>
                  <span style={m.title}>{editEvolucaoId ? 'Editar evolução' : 'Nova evolução'}</span>
                  <button style={m.closeBtn} onClick={() => setModalEvolucao(false)}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={s.label}>Procedimento *</label>
                    <select value={formEvolucao.procedimento}
                      onChange={e => setFormEvolucao({ ...formEvolucao, procedimento: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
                      autoFocus>
                      <option value="">Selecione um procedimento</option>
                      {procedimentosCadastrados.map(p => (
                        <option key={p.id} value={p.nome}>{p.nome}</option>
                      ))}
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Descrição / Observações *</label>
                    <textarea value={formEvolucao.descricao}
                      onChange={e => setFormEvolucao({ ...formEvolucao, descricao: e.target.value })}
                      placeholder="Descreva o procedimento realizado, observações clínicas..."
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', minHeight: 90, resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={s.label}>Dentista responsável</label>
                    <input value={formEvolucao.dentista}
                      onChange={e => setFormEvolucao({ ...formEvolucao, dentista: e.target.value })}
                      placeholder="Ex: Dr. Silva"
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#F8F8F8', color: '#555' }} />
                    <span style={{ fontSize: 11, color: '#AAA', marginTop: 4, display: 'block' }}>Preenchido automaticamente com o usuário logado</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <Button variant="ghost" onClick={() => setModalEvolucao(false)} style={{ flex: 1 }}>Cancelar</Button>
                    <Button onClick={handleSalvarEvolucao} disabled={salvandoEvolucao} style={{ flex: 1 }}>
                      {salvandoEvolucao ? 'Salvando...' : editEvolucaoId ? 'Salvar' : 'Registrar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'Documentos' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Documentos</span>
            <label style={{ cursor: 'pointer', background: '#1A1A1A', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              + Enviar documento
              <input type="file" style={{ display: 'none' }} onChange={handleSelecionarArquivo} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            </label>
          </div>
          {documentos.length === 0 ? (
            <p style={{ color: '#AAA', fontSize: 13, padding: '8px 0' }}>Nenhum documento enviado. Clique em "+ Enviar documento" para adicionar.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {documentos.map(doc => (
                <div key={doc.id} style={s.docItem}>
                  <div style={s.docIcon}>{doc.tipo === 'Imagem' ? '🖼' : '📄'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.nome}</div>
                    {doc.descricao && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{doc.descricao}</div>}
                    <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>
                      {new Date(doc.criado_em).toLocaleDateString('pt-BR')} · {doc.tamanho}
                    </div>
                  </div>
                  <Badge color="gray">{doc.tipo}</Badge>
                  <button style={s.docBtn} onClick={() => handleBaixarDocumento(doc)}>Baixar</button>
                  <button style={{ ...s.docBtn, color: '#E53E3E' }} onClick={() => handleExcluirDocumento(doc)}>Excluir</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {modalDoc && (
        <div style={s.modalOverlay} onClick={() => setModalDoc(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Enviar documento</span>
              <button style={s.modalClose} onClick={() => setModalDoc(null)}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={s.label}>Nome do documento *</label>
                <input value={formDoc.nome} onChange={e => setFormDoc({ ...formDoc, nome: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={s.label}>Descrição</label>
                <textarea value={formDoc.descricao} onChange={e => setFormDoc({ ...formDoc, descricao: e.target.value })}
                  placeholder="Ex: Radiografia panorâmica inicial, laudo de exame..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ fontSize: 12, color: '#AAA', background: '#F8F8F8', borderRadius: 8, padding: '8px 12px' }}>
                <span>{modalDoc.arquivo.name} · {modalDoc.tamanhoOriginal} · {modalDoc.tipo}</span>
                {modalDoc.tipo === 'Imagem' && (
                  <span style={{ color: '#27AE60', marginLeft: 8 }}>✓ será comprimida automaticamente</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <Button variant="ghost" onClick={() => setModalDoc(null)} style={{ flex: 1 }}>Cancelar</Button>
                <Button onClick={handleUploadDocumento} disabled={uploadando} style={{ flex: 1 }}>
                  {uploadando ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToothModal tooth={selectedTooth} onSelect={setToothStatus} onClose={() => setSelectedTooth(null)} />
        </>
      ) : (
        <Card>
          <CardTitle>Selecione um paciente</CardTitle>
          <p style={{ fontSize: 13, color: '#777', marginTop: 10 }}>
            Para abrir o prontuário, selecione um paciente na busca acima ou clique em "Prontuário" na lista de pacientes.
          </p>
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
  tab: { padding: '13px 20px', fontSize: 13, cursor: 'pointer', color: '#888', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  tabActive: { color: '#1A1A1A', fontWeight: 500, borderBottomColor: '#1A1A1A' },
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F5F5' },
  planItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#FAFAFA' },
  planCheck: { width: 18, height: 18, borderRadius: '50%', borderWidth: '1.5px', borderStyle: 'solid', borderColor: '#DDD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planCheckDone: { background: '#27AE60', borderColor: '#27AE60' },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },
  evoItem: { display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #F5F5F5' },
  evoDate: { fontSize: 11, color: '#AAA', minWidth: 80, paddingTop: 2 },
  editBtn: { background: 'none', border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#555', fontFamily: "'DM Sans', sans-serif" },
  anamneseGrid: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 },
  anamneseItem: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, paddingBottom: 14, borderBottom: '1px solid #F5F5F5' },
  anamneseLabel: { fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: 1 },
  anamneseValue: { fontSize: 13, color: '#333', lineHeight: 1.5 },
  condTag: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid #EFEFEF', fontSize: 12, color: '#AAA', display: 'flex', alignItems: 'center', gap: 5 },
  condTagActive: { background: '#F0FBF6', border: '1.5px solid #A8D5C2', color: '#27AE60' },
  docItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: '#FAFAFA' },
  docIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  docBtn: { padding: '6px 14px', border: '1.5px solid #EFEFEF', borderRadius: 8, background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBox: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F0F0F0' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 17 },
  modalClose: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#AAA', lineHeight: 1 },
};
