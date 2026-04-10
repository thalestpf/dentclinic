'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader } from '../../../components/UI';
import { supabase } from '@/lib/supabase-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MODULOS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'prontuario', label: 'Prontuário' },
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
];

const PERMISSOES_RECEPCAO = {
  dashboard: true, agenda: true, prontuario: false,
  pacientes: true, orcamento: true, financeiro: false,
  estoque: false, relatorios: false, configuracoes: false,
};

const categorias = ['Geral', 'Prevenção', 'Restaurações', 'Endodontia', 'Cirurgia', 'Estética', 'Implantodontia', 'Ortodontia'];

const DIAS_SEMANA = [
  { key: '0', label: 'Domingo' },
  { key: '1', label: 'Segunda-feira' },
  { key: '2', label: 'Terça-feira' },
  { key: '3', label: 'Quarta-feira' },
  { key: '4', label: 'Quinta-feira' },
  { key: '5', label: 'Sexta-feira' },
  { key: '6', label: 'Sábado' },
];

const HORARIOS_PADRAO = {
  intervalo: 30,
  dias: {
    '0': { ativo: false, inicio: '08:00', fim: '17:30', almoco_inicio: '', almoco_fim: '' },
    '1': { ativo: true,  inicio: '08:00', fim: '17:30', almoco_inicio: '12:00', almoco_fim: '13:00' },
    '2': { ativo: true,  inicio: '08:00', fim: '17:30', almoco_inicio: '12:00', almoco_fim: '13:00' },
    '3': { ativo: true,  inicio: '08:00', fim: '17:30', almoco_inicio: '12:00', almoco_fim: '13:00' },
    '4': { ativo: true,  inicio: '08:00', fim: '17:30', almoco_inicio: '12:00', almoco_fim: '13:00' },
    '5': { ativo: true,  inicio: '08:00', fim: '17:30', almoco_inicio: '12:00', almoco_fim: '13:00' },
    '6': { ativo: false, inicio: '08:00', fim: '12:00', almoco_inicio: '', almoco_fim: '' },
  },
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [roleAtual, setRoleAtual] = useState('');
  const [clinicaId, setClinicaId] = useState(null);

  // Stats de uso da clínica
  const [usageStats, setUsageStats] = useState({ dentistas: 0, secretarias: 0, pacientes: 0 });

  // Horários de funcionamento
  const [horarios, setHorarios] = useState(HORARIOS_PADRAO);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);

  // Toast
  const [toast, setToast] = useState(null); // { msg, tipo: 'sucesso' | 'erro' }
  const showToast = (msg, tipo = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [clinica, setClinica] = useState({
    nome: 'DentClinic Premium',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    telefone: '(11) 3000-1234',
    email: 'contato@dentclinic.com',
    responsavel: 'Dr. Silva',
  });

  // Modal para usuários
  const [modalUsuario, setModalUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', senha: '', perfil: '', status: 'ativo', permissoes: {} });
  const [editIdUsuario, setEditIdUsuario] = useState(null);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);

  // Edit mode para clínica
  const [editClinica, setEditClinica] = useState(false);
  const [formClinica, setFormClinica] = useState({ ...clinica });

  // Convênios
  const [convenios, setConvenios] = useState([]);
  const [carregandoConvenios, setCarregandoConvenios] = useState(false);
  const [modalConvenio, setModalConvenio] = useState(false);
  const [editIdConvenio, setEditIdConvenio] = useState(null);
  const [formConvenio, setFormConvenio] = useState({ nome: '', codigo: '', tipo: 'plano', ativo: true });
  const [salvandoConvenio, setSalvandoConvenio] = useState(false);

  // Procedimentos
  const [procedimentos, setProcedimentos] = useState([]);
  const [carregandoProc, setCarregandoProc] = useState(false);
  const [modalProc, setModalProc] = useState(false);
  const [editIdProc, setEditIdProc] = useState(null);
  const [formProc, setFormProc] = useState({ nome: '', categoria: 'Geral', preco: '', status: 'ativo' });
  const [salvandoProc, setSalvandoProc] = useState(false);

  const tabs = ['Usuários', 'Clínica', 'Convênios', 'Procedimentos', 'Horários'];

  // ========== CARREGAR DADOS ==========
  useEffect(() => {
    setRoleAtual(localStorage.getItem('dentclinic_role') || '');
    carregarUsuarios();
    carregarClinicaId();
  }, []);

  useEffect(() => {
    if (activeTab === 'convenios') carregarConvenios();
    if (activeTab === 'procedimentos') carregarProcedimentos();
    if (activeTab === 'horarios') carregarHorarios();
    if (activeTab === 'clinica') carregarUsageStats();
  }, [activeTab]);

  const carregarClinicaId = async () => {
    try {
      // Busca clínicas via API (service role — não depende de Supabase Auth)
      const res = await fetch('/api/clinica');
      const clinicas = await res.json();
      if (!Array.isArray(clinicas) || clinicas.length === 0) return;

      // Pega a primeira clínica (para multi-clínica, futuramente usar seletor)
      const cl = clinicas[0];
      setClinicaId(cl.id);
      setClinica(prev => ({ ...prev, nome: cl.nome || prev.nome }));

      // Carregar horários já na inicialização
      if (cl.horarios_funcionamento) {
        setHorarios(prev => ({
          ...prev,
          ...cl.horarios_funcionamento,
          dias: { ...prev.dias, ...cl.horarios_funcionamento.dias },
        }));
      }
    } catch {}
  };

  const carregarUsageStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: role } = await supabase.from('user_roles').select('clinica_id').eq('user_id', session.user.id).maybeSingle();
      if (!role?.clinica_id) return;
      const cid = role.clinica_id;

      const [{ count: cDentistas }, { count: cSecretarias }, { count: cPacientes }] = await Promise.all([
        supabase.from('dentistas').select('*', { count: 'exact', head: true }).eq('clinica_id', cid).eq('status', 'ativo'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('clinica_id', cid).eq('role', 'secretaria'),
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('clinica_id', cid),
      ]);

      setUsageStats({ dentistas: cDentistas || 0, secretarias: cSecretarias || 0, pacientes: cPacientes || 0 });
    } catch {}
  };

  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const clinicaId = session ? (await supabase.from('user_roles').select('clinica_id').eq('user_id', session.user.id).maybeSingle()).data?.clinica_id : null;
      const params = clinicaId ? `?clinica_id=${clinicaId}` : '';
      const res = await fetch(`/api/usuarios${params}`);
      const data = await res.json();
      const roleLabel = { dentista: 'Dentista', secretaria: 'Recepção', super_admin: 'Admin' };
      setUsuarios((Array.isArray(data) ? data : []).map(u => ({ ...u, perfil: roleLabel[u.role] || u.role })));
    } catch {
      setUsuarios([]);
    }
    setCarregandoUsuarios(false);
  };

  const carregarConvenios = async () => {
    setCarregandoConvenios(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/convenios?order=nome.asc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      const data = await res.json();
      setConvenios(Array.isArray(data) ? data : []);
    } catch (e) {
      setConvenios([]);
    } finally {
      setCarregandoConvenios(false);
    }
  };

  // ========== CRUD CONVÊNIOS ==========
  const handleNovoConvenio = () => {
    setEditIdConvenio(null);
    setFormConvenio({ nome: '', codigo: '', tipo: 'plano', ativo: true });
    setModalConvenio(true);
  };

  const handleEditarConvenio = (convenio) => {
    setEditIdConvenio(convenio.id);
    setFormConvenio({
      nome: convenio.nome || '',
      codigo: convenio.codigo || '',
      tipo: convenio.tipo || 'plano',
      ativo: convenio.ativo !== false,
    });
    setModalConvenio(true);
  };

  const handleSalvarConvenio = async () => {
    if (!formConvenio.nome.trim()) {
      showToast('Preencha o nome do convênio', 'erro');
      return;
    }
    setSalvandoConvenio(true);
    try {
      if (editIdConvenio) {
        await fetch(`${SUPABASE_URL}/rest/v1/convenios?id=eq.${editIdConvenio}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(formConvenio),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/convenios`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(formConvenio),
        });
      }
      setModalConvenio(false);
      carregarConvenios();
      showToast(editIdConvenio ? 'Convênio atualizado!' : 'Convênio cadastrado!');
    } catch (e) {
      showToast('Erro ao salvar convênio', 'erro');
    } finally {
      setSalvandoConvenio(false);
    }
  };

  const handleExcluirConvenio = async (id) => {
    if (!window.confirm('Deseja realmente excluir este convênio?')) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/convenios?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      carregarConvenios();
    } catch (e) {
      showToast('Erro ao excluir convênio', 'erro');
    }
  };

  const handleToggleAtivoConvenio = async (convenio) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/convenios?id=eq.${convenio.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ativo: !convenio.ativo }),
      });
      carregarConvenios();
    } catch (e) {
      showToast('Erro ao atualizar status', 'erro');
    }
  };

  // ========== USUÁRIOS ==========
  const handleNovoUsuario = () => {
    const limiteSecretarias = 3;
    const limiteDentistas = 5;

    if (usageStats.secretarias >= limiteSecretarias && usageStats.dentistas >= limiteDentistas) {
      showToast(`Limite do plano atingido. Faça upgrade para adicionar mais usuários.`, 'erro');
      return;
    }

    setEditIdUsuario(null);
    setFormUsuario({ nome: '', email: '', senha: '', perfil: 'Recepção', status: 'ativo', permissoes: { ...PERMISSOES_RECEPCAO } });
    setModalUsuario('novo');
  };

  const validarLimiteUsuario = (perfil) => {
    if (perfil === 'Recepção' && usageStats.secretarias >= 3) {
      showToast('Limite de secretárias atingido (máx. 3). Faça upgrade do plano.', 'erro');
      return false;
    }
    if (perfil === 'Dentista' && usageStats.dentistas >= 5) {
      showToast('Limite de dentistas atingido (máx. 5). Faça upgrade do plano.', 'erro');
      return false;
    }
    return true;
  };

  const handleEditarUsuario = (usuario) => {
    setEditIdUsuario(usuario.id);
    setFormUsuario({ nome: usuario.nome || '', email: usuario.email || '', senha: '', perfil: usuario.perfil || 'Recepção', status: 'ativo', permissoes: usuario.permissoes || { ...PERMISSOES_RECEPCAO } });
    setModalUsuario('editar');
  };

  const handleExcluirUsuario = async (id) => {
    if (!window.confirm('Deseja realmente excluir este usuário?')) return;
    const res = await fetch('/api/usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) { carregarUsuarios(); }
    else { const d = await res.json(); showToast('Erro: ' + d.error, 'erro'); }
  };

  const handleSalvarUsuario = async () => {
    if (!formUsuario.nome || !formUsuario.perfil) { showToast('Preencha nome e perfil', 'erro'); return; }
    if (modalUsuario === 'novo' && (!formUsuario.email || !formUsuario.senha)) { showToast('Email e senha são obrigatórios para novo usuário', 'erro'); return; }
    if (formUsuario.senha && formUsuario.senha.length < 6) { showToast('Senha deve ter no mínimo 6 caracteres', 'erro'); return; }
    if (modalUsuario === 'novo' && !validarLimiteUsuario(formUsuario.perfil)) return;
    setSalvandoUsuario(true);
    try {
      if (modalUsuario === 'novo') {
        const { data: { session } } = await supabase.auth.getSession();
        const clinicaId = session ? (await supabase.from('user_roles').select('clinica_id').eq('user_id', session.user.id).maybeSingle()).data?.clinica_id : null;
        const res = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formUsuario, clinica_id: clinicaId }) });
        const d = await res.json();
        if (!res.ok) { showToast('Erro: ' + d.error, 'erro'); return; }
      } else {
        const res = await fetch('/api/usuarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editIdUsuario, nome: formUsuario.nome, email: formUsuario.email, perfil: formUsuario.perfil, permissoes: formUsuario.permissoes, senha: formUsuario.senha || undefined }) });
        const d = await res.json();
        if (!res.ok) { showToast('Erro: ' + d.error, 'erro'); return; }
      }
      setModalUsuario(null);
      carregarUsuarios();
      showToast(modalUsuario === 'novo' ? 'Usuário criado com sucesso!' : 'Usuário atualizado!');
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const handleFecharModalUsuario = () => {
    setModalUsuario(null);
    setFormUsuario({ nome: '', email: '', senha: '', perfil: '', status: 'ativo', permissoes: {} });
  };

  const handleTogglePermissao = (key) => {
    setFormUsuario(prev => ({ ...prev, permissoes: { ...prev.permissoes, [key]: !prev.permissoes[key] } }));
  };

  const handlePerfilChange = (perfil) => {
    const permissoes = perfil === 'Recepção' ? { ...PERMISSOES_RECEPCAO } : MODULOS.reduce((acc, m) => ({ ...acc, [m.key]: true }), {});
    setFormUsuario(prev => ({ ...prev, perfil, permissoes }));
  };

  // ========== CLÍNICA ==========
  const handleSalvarClinica = () => {
    if (!formClinica.nome || !formClinica.cnpj) {
      showToast('Preencha os campos obrigatórios', 'erro');
      return;
    }
    setClinica({ ...formClinica });
    setEditClinica(false);
  };

  const handleCancelarClinica = () => {
    setFormClinica({ ...clinica });
    setEditClinica(false);
  };

  // ========== CRUD PROCEDIMENTOS ==========
  const carregarProcedimentos = async () => {
    setCarregandoProc(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/procedimentos?order=nome.asc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const data = await res.json();
      setProcedimentos(Array.isArray(data) ? data : []);
    } catch { setProcedimentos([]); }
    finally { setCarregandoProc(false); }
  };

  const handleNovoProc = () => {
    setEditIdProc(null);
    setFormProc({ nome: '', categoria: 'Geral', preco: '', status: 'ativo' });
    setModalProc(true);
  };

  const handleEditarProc = (proc) => {
    setEditIdProc(proc.id);
    setFormProc({ nome: proc.nome, categoria: proc.categoria || 'Geral', preco: String(proc.preco), status: proc.status || 'ativo' });
    setModalProc(true);
  };

  const handleSalvarProc = async () => {
    if (!formProc.nome || !formProc.preco) { showToast('Informe descrição e valor', 'erro'); return; }
    setSalvandoProc(true);
    const dados = { nome: formProc.nome, categoria: formProc.categoria, preco: parseFloat(formProc.preco), status: formProc.status };
    try {
      if (editIdProc) {
        await fetch(`${SUPABASE_URL}/rest/v1/procedimentos?id=eq.${editIdProc}`, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(dados),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/procedimentos`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(dados),
        });
      }
      setModalProc(false);
      carregarProcedimentos();
      showToast(editIdProc ? 'Procedimento atualizado!' : 'Procedimento cadastrado!');
    } catch { showToast('Erro ao salvar procedimento', 'erro'); }
    finally { setSalvandoProc(false); }
  };

  const handleExcluirProc = async (id) => {
    if (!window.confirm('Deseja excluir este procedimento?')) return;
    await fetch(`${SUPABASE_URL}/rest/v1/procedimentos?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    carregarProcedimentos();
  };

  const tipoLabel = (tipo) => {
    const map = { plano: 'Plano de Saúde', particular: 'Particular', convenio: 'Convênio' };
    return map[tipo] || tipo;
  };

  // ========== HORÁRIOS DE FUNCIONAMENTO ==========
  const carregarHorarios = async () => {
    try {
      const res = await fetch('/api/clinica');
      const cls = await res.json();
      const hf = cls?.[0]?.horarios_funcionamento;
      if (hf) {
        setHorarios({ ...HORARIOS_PADRAO, ...hf, dias: { ...HORARIOS_PADRAO.dias, ...hf.dias } });
      }
    } catch {}
  };

  const gerarTextoHorario = (horariosConfig) => {
    const abrevDia = { '1':'Seg','2':'Ter','3':'Qua','4':'Qui','5':'Sex','6':'Sáb','0':'Dom' };
    const diasAtivos = Object.entries(horariosConfig.dias)
      .filter(([, d]) => d.ativo)
      .sort(([a], [b]) => Number(a) - Number(b));
    if (diasAtivos.length === 0) return '';

    // Agrupar dias consecutivos com mesmo horário
    const grupos = [];
    diasAtivos.forEach(([key, d]) => {
      const horario = `${d.inicio} às ${d.fim}`;
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.horario === horario && Number(key) === Number(ultimo.ultimoKey) + 1) {
        ultimo.fim = abrevDia[key];
        ultimo.ultimoKey = key;
      } else {
        grupos.push({ inicio: abrevDia[key], fim: abrevDia[key], horario, ultimoKey: key });
      }
    });

    const partes = grupos.map(g => {
      const dia = g.inicio === g.fim ? g.inicio : `${g.inicio}-${g.fim}`;
      return `${dia}: ${g.horario}`;
    });

    // Adicionar intervalo se existir (pega do primeiro dia ativo)
    const primeiroDia = diasAtivos[0]?.[1];
    if (primeiroDia?.almoco_inicio && primeiroDia?.almoco_fim) {
      partes.push(`intervalo ${primeiroDia.almoco_inicio}-${primeiroDia.almoco_fim}`);
    }

    return partes.join(' | ');
  };

  const salvarHorarios = async () => {
    let cid = clinicaId;
    if (!cid) {
      // Re-buscar clinicaId via API se ainda não tiver
      try {
        const res = await fetch('/api/clinica');
        const cls = await res.json();
        cid = cls?.[0]?.id;
        if (cid) setClinicaId(cid);
      } catch {}
    }
    if (!cid) { showToast('Clínica não encontrada', 'erro'); return; }

    setSalvandoHorarios(true);
    try {
      const horario_atendimento = gerarTextoHorario(horarios);
      const res = await fetch('/api/clinica', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: cid, horarios_funcionamento: horarios, horario_atendimento }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      showToast('Horários salvos com sucesso!');
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message, 'erro');
    } finally {
      setSalvandoHorarios(false);
    }
  };

  const atualizarDia = (diaKey, campo, valor) => {
    setHorarios(prev => ({
      ...prev,
      dias: { ...prev.dias, [diaKey]: { ...prev.dias[diaKey], [campo]: valor } },
    }));
  };

  return (
    <div style={s.main}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 2000,
          background: toast.tipo === 'erro' ? '#FFF5F5' : '#F0FFF4',
          border: `1.5px solid ${toast.tipo === 'erro' ? '#FC8181' : '#68D391'}`,
          color: toast.tipo === 'erro' ? '#C53030' : '#276749',
          borderRadius: 10, padding: '14px 20px', fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 260,
          animation: 'slideUp 0.2s ease',
        }}>
          <span style={{ fontSize: 18 }}>{toast.tipo === 'erro' ? '❌' : '✅'}</span>
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="Configurações"
        subtitle="Gerencie usuários, dados da clínica e procedimentos"
      />

      {/* ABAS */}
      <div style={s.tabs}>
        {tabs.map(tab => {
          const key = tab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const isActive = activeTab === key;
          return (
            <div
              key={tab}
              style={{
                ...s.tab,
                ...(isActive ? s.tabActive : {}),
              }}
              onClick={() => setActiveTab(key)}
            >
              {tab}
            </div>
          );
        })}
      </div>

      {/* ABA 1: USUÁRIOS */}
      {activeTab === 'usuarios' && (
        <>
          <div style={s.tabHeader}>
            <h2 style={s.sectionTitle}>Gerenciar Usuários</h2>
            <Button onClick={handleNovoUsuario}>+ Novo Usuário</Button>
          </div>

          <Card>
            {carregandoUsuarios ? (
              <p style={{ color: '#AAA', fontSize: 13 }}>Carregando...</p>
            ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Perfil</th>
                  <th style={s.th}>Acessos</th>
                  <th style={s.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => {
                  const permsAtivas = usuario.permissoes ? Object.entries(usuario.permissoes).filter(([, v]) => v).map(([k]) => MODULOS.find(m => m.key === k)?.label).filter(Boolean) : [];
                  return (
                    <tr key={usuario.id}>
                      <td style={s.td}>{usuario.nome}</td>
                      <td style={s.td}>{usuario.email || '—'}</td>
                      <td style={s.td}>
                        <Badge color={usuario.perfil === 'Admin' ? 'red' : usuario.perfil === 'Dentista' ? 'blue' : 'green'}>{usuario.perfil}</Badge>
                      </td>
                      <td style={s.td}>
                        {permsAtivas.length > 0
                          ? <span style={{ fontSize: 11, color: '#666' }}>{permsAtivas.join(', ')}</span>
                          : <span style={{ fontSize: 11, color: '#AAA' }}>Acesso total</span>
                        }
                      </td>
                      <td style={s.td}>
                        <div style={s.acoes}>
                          <button style={s.acaoBotao} onClick={() => handleEditarUsuario(usuario)}>Editar</button>
                          <button style={{ ...s.acaoBotao, color: '#E53E3E' }} onClick={() => handleExcluirUsuario(usuario.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </Card>

          {/* MODAL USUÁRIO */}
          {modalUsuario && (
            <div style={s.modalOverlay} onClick={handleFecharModalUsuario}>
              <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h2 style={s.modalTitle}>
                  {modalUsuario === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}
                </h2>

                <div style={s.formGroup}>
                  <label style={s.label}>Nome *</label>
                  <input type="text" value={formUsuario.nome} onChange={e => setFormUsuario({ ...formUsuario, nome: e.target.value })} style={s.input} placeholder="Ex: Ana Recepção" autoFocus />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Email {modalUsuario === 'novo' ? '*' : '(ler-apenas)'}</label>
                  <input
                    type="email"
                    value={formUsuario.email}
                    onChange={modalUsuario === 'novo' ? (e) => setFormUsuario({ ...formUsuario, email: e.target.value }) : undefined}
                    style={{...s.input, backgroundColor: modalUsuario === 'editar' ? '#F8F8F8' : '#fff', cursor: modalUsuario === 'editar' ? 'not-allowed' : 'text'}}
                    placeholder="ana@clinica.com"
                    disabled={modalUsuario === 'editar'}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>{modalUsuario === 'novo' ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}</label>
                  <input type="password" value={formUsuario.senha} onChange={e => setFormUsuario({ ...formUsuario, senha: e.target.value })} style={s.input} placeholder="Mínimo 6 caracteres" />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Perfil *</label>
                  <select value={formUsuario.perfil} onChange={e => handlePerfilChange(e.target.value)} style={s.input}>
                    <option value="">Selecione um perfil</option>
                    <option value="Dentista">Dentista</option>
                    <option value="Recepção">Recepção</option>
                  </select>
                </div>

                {formUsuario.perfil === 'Recepção' && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Permissões de acesso</label>
                    <div style={{ background: '#F8F8F8', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {MODULOS.map(m => (
                        <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={!!formUsuario.permissoes[m.key]}
                            onChange={() => handleTogglePermissao(m.key)}
                            style={{ accentColor: '#A8D5C2', width: 15, height: 15 }}
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#AAA', marginTop: 6, display: 'block' }}>Marque os módulos que esta recepcionista poderá acessar</span>
                  </div>
                )}

                <div style={s.modalButtons}>
                  <Button variant="ghost" onClick={handleFecharModalUsuario}>Cancelar</Button>
                  <Button onClick={handleSalvarUsuario} disabled={salvandoUsuario}>
                    {salvandoUsuario ? 'Salvando...' : 'Salvar Usuário'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 2: CLÍNICA */}
      {activeTab === 'clinica' && (
        <>
          <div style={s.tabHeader}>
            <h2 style={s.sectionTitle}>Dados da Clínica</h2>
            {!editClinica && roleAtual === 'super_admin' && (
              <Button onClick={() => setEditClinica(true)}>Editar Dados</Button>
            )}
          </div>

          <Card>
            {!editClinica ? (
              <div style={s.dataDisplay}>
                <div style={s.dataRow}>
                  <label>Nome da Clínica:</label>
                  <span>{clinica.nome}</span>
                </div>
                <div style={s.dataRow}>
                  <label>CNPJ:</label>
                  <span>{clinica.cnpj}</span>
                </div>
                <div style={s.dataRow}>
                  <label>Endereço:</label>
                  <span>{clinica.endereco}</span>
                </div>
                <div style={s.dataRow}>
                  <label>Telefone:</label>
                  <span>{clinica.telefone}</span>
                </div>
                <div style={s.dataRow}>
                  <label>Email:</label>
                  <span>{clinica.email}</span>
                </div>
                <div style={s.dataRow}>
                  <label>Responsável:</label>
                  <span>{clinica.responsavel}</span>
                </div>
              </div>
            ) : (
              <div style={s.formSection}>
                <div style={s.formGroup}>
                  <label style={s.label}>Nome da Clínica *</label>
                  <input
                    type="text"
                    value={formClinica.nome}
                    onChange={(e) => setFormClinica({ ...formClinica, nome: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>CNPJ *</label>
                  <input
                    type="text"
                    value={formClinica.cnpj}
                    onChange={(e) => setFormClinica({ ...formClinica, cnpj: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Endereço</label>
                  <input
                    type="text"
                    value={formClinica.endereco}
                    onChange={(e) => setFormClinica({ ...formClinica, endereco: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Telefone</label>
                  <input
                    type="tel"
                    value={formClinica.telefone}
                    onChange={(e) => setFormClinica({ ...formClinica, telefone: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Email</label>
                  <input
                    type="email"
                    value={formClinica.email}
                    onChange={(e) => setFormClinica({ ...formClinica, email: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Responsável</label>
                  <input
                    type="text"
                    value={formClinica.responsavel}
                    onChange={(e) => setFormClinica({ ...formClinica, responsavel: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.formButtons}>
                  <Button variant="ghost" onClick={handleCancelarClinica}>Cancelar</Button>
                  <Button onClick={handleSalvarClinica}>Salvar Alterações</Button>
                </div>
              </div>
            )}
          </Card>

          {/* PLANO */}
          <h2 style={{ ...s.sectionTitle, marginTop: 32, marginBottom: 16 }}>Plano Atual</h2>
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              {/* Badge do plano */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #A8D5C2 0%, #6dbfa3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  🦷
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', fontFamily: "'DM Serif Display', serif" }}>Plano Pro</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Renovação anual · Ativo</div>
                </div>
                <span style={{ background: '#F0FFF4', color: '#276749', border: '1px solid #9AE6B4', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  ✓ Ativo
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 24 }}>
              {[
                { label: 'Dentistas', usado: usageStats.dentistas, limite: 5, icon: '👨‍⚕️' },
                { label: 'Secretárias', usado: usageStats.secretarias, limite: 3, icon: '💼' },
                { label: 'Pacientes', usado: usageStats.pacientes, limite: null, icon: '🧑‍🤝‍🧑' },
              ].map(({ label, usado, limite, icon }) => {
                const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : null;
                const cor = pct >= 90 ? '#E53E3E' : pct >= 70 ? '#D69E2E' : '#38A169';
                return (
                  <div key={label} style={{ background: '#F8F8F8', borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{icon} {label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                        {usado}{limite ? `/${limite}` : ''}
                      </span>
                    </div>
                    {limite ? (
                      <>
                        <div style={{ height: 6, background: '#E8E8E8', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#AAA', marginTop: 5 }}>{pct}% utilizado</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 5 }}>Ilimitado</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1.5px solid #EFEFEF', marginTop: 20, paddingTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Agenda inteligente', 'WhatsApp IA', 'Múltiplos dentistas', 'Relatórios', 'Suporte prioritário'].map(f => (
                <span key={f} style={{ background: '#EBF8FF', color: '#2C7A7B', border: '1px solid #BEE3F8', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ABA 3: CONVÊNIOS */}
      {activeTab === 'convenios' && (
        <>
          <div style={s.tabHeader}>
            <h2 style={s.sectionTitle}>Gerenciar Convênios</h2>
            <Button onClick={handleNovoConvenio}>+ Novo Convênio</Button>
          </div>

          <Card>
            {carregandoConvenios ? (
              <p style={{ color: '#888', fontSize: 13, padding: 16 }}>Carregando convênios...</p>
            ) : convenios.length === 0 ? (
              <p style={{ color: '#888', fontSize: 13, padding: 16 }}>Nenhum convênio cadastrado.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {convenios.map(conv => (
                    <tr key={conv.id}>
                      <td style={s.td}>{conv.nome}</td>
                      <td style={s.td}>{conv.codigo || '—'}</td>
                      <td style={s.td}>{tipoLabel(conv.tipo)}</td>
                      <td style={s.td}>
                        <Badge color={conv.ativo ? 'green' : 'gray'}>
                          {conv.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td style={s.td}>
                        <div style={s.acoes}>
                          <button style={s.acaoBotao} onClick={() => handleEditarConvenio(conv)}>Editar</button>
                          <button style={s.acaoBotao} onClick={() => handleToggleAtivoConvenio(conv)}>
                            {conv.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                          <button style={{ ...s.acaoBotao, color: '#E53E3E' }} onClick={() => handleExcluirConvenio(conv.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* MODAL CONVÊNIO */}
          {modalConvenio && (
            <div style={s.modalOverlay} onClick={() => setModalConvenio(false)}>
              <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={s.modalTitle}>
                  {editIdConvenio ? 'Editar Convênio' : 'Novo Convênio'}
                </h2>

                <div style={s.formGroup}>
                  <label style={s.label}>Nome *</label>
                  <input
                    type="text"
                    value={formConvenio.nome}
                    onChange={(e) => setFormConvenio({ ...formConvenio, nome: e.target.value })}
                    style={s.input}
                    placeholder="Ex: Unimed, Bradesco Saúde..."
                    autoFocus
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Código</label>
                  <input
                    type="text"
                    value={formConvenio.codigo}
                    onChange={(e) => setFormConvenio({ ...formConvenio, codigo: e.target.value })}
                    style={s.input}
                    placeholder="Código do convênio (opcional)"
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Tipo</label>
                  <select
                    value={formConvenio.tipo}
                    onChange={(e) => setFormConvenio({ ...formConvenio, tipo: e.target.value })}
                    style={s.input}
                  >
                    <option value="plano">Plano de Saúde</option>
                    <option value="convenio">Convênio</option>
                    <option value="particular">Particular</option>
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select
                    value={formConvenio.ativo ? 'ativo' : 'inativo'}
                    onChange={(e) => setFormConvenio({ ...formConvenio, ativo: e.target.value === 'ativo' })}
                    style={s.input}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div style={s.modalButtons}>
                  <Button variant="ghost" onClick={() => setModalConvenio(false)}>Cancelar</Button>
                  <Button onClick={handleSalvarConvenio} disabled={salvandoConvenio}>
                    {salvandoConvenio ? 'Salvando...' : 'Salvar Convênio'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 4: PROCEDIMENTOS */}
      {activeTab === 'procedimentos' && (
        <>
          <div style={s.tabHeader}>
            <h2 style={s.sectionTitle}>Gerenciar Procedimentos</h2>
            <Button onClick={handleNovoProc}>+ Novo Procedimento</Button>
          </div>

          <Card>
            {carregandoProc ? (
              <p style={{ color: '#888', fontSize: 13, padding: 16 }}>Carregando procedimentos...</p>
            ) : procedimentos.length === 0 ? (
              <p style={{ color: '#888', fontSize: 13, padding: 16 }}>Nenhum procedimento cadastrado.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Categoria</th>
                    <th style={s.th}>Preço</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {procedimentos.map(proc => (
                    <tr key={proc.id}>
                      <td style={s.td}>{proc.nome}</td>
                      <td style={s.td}>{proc.categoria || '—'}</td>
                      <td style={{ ...s.td, color: '#27AE60', fontWeight: 600 }}>
                        R$ {Number(proc.preco).toFixed(2).replace('.', ',')}
                      </td>
                      <td style={s.td}>
                        <Badge color={proc.status === 'ativo' ? 'green' : 'gray'}>
                          {proc.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td style={s.td}>
                        <div style={s.acoes}>
                          <button style={s.acaoBotao} onClick={() => handleEditarProc(proc)}>Editar</button>
                          <button style={{ ...s.acaoBotao, color: '#E53E3E' }} onClick={() => handleExcluirProc(proc.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* MODAL PROCEDIMENTO */}
          {modalProc && (
            <div style={s.modalOverlay} onClick={() => setModalProc(false)}>
              <div style={s.modal} onClick={e => e.stopPropagation()}>
                <h2 style={s.modalTitle}>{editIdProc ? 'Editar Procedimento' : 'Novo Procedimento'}</h2>

                <div style={s.formGroup}>
                  <label style={s.label}>Descrição *</label>
                  <input type="text" value={formProc.nome}
                    onChange={e => setFormProc({ ...formProc, nome: e.target.value })}
                    style={s.input} placeholder="Ex: Limpeza Profissional" autoFocus />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Categoria</label>
                  <select value={formProc.categoria}
                    onChange={e => setFormProc({ ...formProc, categoria: e.target.value })} style={s.input}>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Valor (R$) *</label>
                  <input type="number" min="0" step="0.01" value={formProc.preco}
                    onChange={e => setFormProc({ ...formProc, preco: e.target.value })}
                    style={s.input} placeholder="0,00" />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select value={formProc.status}
                    onChange={e => setFormProc({ ...formProc, status: e.target.value })} style={s.input}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div style={s.modalButtons}>
                  <Button variant="ghost" onClick={() => setModalProc(false)}>Cancelar</Button>
                  <Button onClick={handleSalvarProc} disabled={salvandoProc}>
                    {salvandoProc ? 'Salvando...' : 'Salvar Procedimento'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 5: HORÁRIOS */}
      {activeTab === 'horarios' && (
        <>
          <div style={s.tabHeader}>
            <h2 style={s.sectionTitle}>Horários de Funcionamento</h2>
            <Button onClick={salvarHorarios} disabled={salvandoHorarios}>
              {salvandoHorarios ? 'Salvando...' : 'Salvar Horários'}
            </Button>
          </div>

          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0 16px' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Duração de cada consulta</span>
              <select
                value={horarios.intervalo}
                onChange={e => setHorarios(prev => ({ ...prev, intervalo: parseInt(e.target.value) }))}
                style={{ ...s.input, width: 120 }}
              >
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Dia</th>
                  <th style={s.th}>Atende</th>
                  <th style={s.th}>Início</th>
                  <th style={s.th}>Fim</th>
                  <th style={s.th}>Intervalo início</th>
                  <th style={s.th}>Intervalo fim</th>
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map(({ key, label }) => {
                  const dia = horarios.dias[key] || {};
                  return (
                    <tr key={key}>
                      <td style={{ ...s.td, fontWeight: 500 }}>{label}</td>
                      <td style={s.td}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!dia.ativo}
                            onChange={e => atualizarDia(key, 'ativo', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 13, color: dia.ativo ? '#38A169' : '#AAA' }}>
                            {dia.ativo ? 'Sim' : 'Não'}
                          </span>
                        </label>
                      </td>
                      <td style={s.td}>
                        <input
                          type="time"
                          value={dia.inicio || ''}
                          onChange={e => atualizarDia(key, 'inicio', e.target.value)}
                          disabled={!dia.ativo}
                          style={{ ...s.input, width: 110, opacity: dia.ativo ? 1 : 0.4 }}
                        />
                      </td>
                      <td style={s.td}>
                        <input
                          type="time"
                          value={dia.fim || ''}
                          onChange={e => atualizarDia(key, 'fim', e.target.value)}
                          disabled={!dia.ativo}
                          style={{ ...s.input, width: 110, opacity: dia.ativo ? 1 : 0.4 }}
                        />
                      </td>
                      <td style={s.td}>
                        <input
                          type="time"
                          value={dia.almoco_inicio || ''}
                          onChange={e => atualizarDia(key, 'almoco_inicio', e.target.value)}
                          disabled={!dia.ativo}
                          style={{ ...s.input, width: 110, opacity: dia.ativo ? 1 : 0.4 }}
                          placeholder="--:--"
                        />
                      </td>
                      <td style={s.td}>
                        <input
                          type="time"
                          value={dia.almoco_fim || ''}
                          onChange={e => atualizarDia(key, 'almoco_fim', e.target.value)}
                          disabled={!dia.ativo}
                          style={{ ...s.input, width: 110, opacity: dia.ativo ? 1 : 0.4 }}
                          placeholder="--:--"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p style={{ fontSize: 12, color: '#AAA', marginTop: 16 }}>
              O intervalo de almoço é opcional. Deixe em branco se não houver pausa.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  tabs: { display: 'flex', background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', overflow: 'hidden', marginBottom: 28 },
  tab: {
    padding: '13px 20px', fontSize: 13, cursor: 'pointer', color: '#888',
    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap', flex: 1, textAlign: 'center',
  },
  tabActive: { color: '#1A1A1A', fontWeight: 500, borderBottomColor: '#1A1A1A' },
  tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#1A1A1A', margin: 0 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  acoes: { display: 'flex', gap: 8 },
  acaoBotao: { padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#F0F0F0', color: '#1A1A1A', fontWeight: 500 },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 24, color: '#1A1A1A' },

  // Formulário
  formSection: {},
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  formButtons: { display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  modalButtons: { display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' },

  // Exibição de dados
  dataDisplay: {},
  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #EFEFEF', fontSize: 13 },
};
