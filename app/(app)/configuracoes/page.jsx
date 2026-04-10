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

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [roleAtual, setRoleAtual] = useState('');
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

  const tabs = ['Usuários', 'Clínica', 'Convênios', 'Procedimentos'];

  // ========== CARREGAR DADOS ==========
  useEffect(() => {
    setRoleAtual(localStorage.getItem('dentclinic_role') || '');
    carregarUsuarios();
  }, []);

  useEffect(() => {
    if (activeTab === 'convenios') carregarConvenios();
    if (activeTab === 'procedimentos') carregarProcedimentos();
  }, [activeTab]);

  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const clinicaId = session ? (await supabase.from('user_roles').select('clinica_id').eq('id', session.user.id).maybeSingle()).data?.clinica_id : null;
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
      alert('Preencha o nome do convênio');
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
    } catch (e) {
      alert('Erro ao salvar convênio');
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
      alert('Erro ao excluir convênio');
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
      alert('Erro ao atualizar status');
    }
  };

  // ========== USUÁRIOS ==========
  const handleNovoUsuario = () => {
    setEditIdUsuario(null);
    setFormUsuario({ nome: '', email: '', senha: '', perfil: 'Recepção', status: 'ativo', permissoes: { ...PERMISSOES_RECEPCAO } });
    setModalUsuario('novo');
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
    else { const d = await res.json(); alert('Erro: ' + d.error); }
  };

  const handleSalvarUsuario = async () => {
    if (!formUsuario.nome || !formUsuario.perfil) { alert('Preencha nome e perfil'); return; }
    if (modalUsuario === 'novo' && (!formUsuario.email || !formUsuario.senha)) { alert('Email e senha são obrigatórios para novo usuário'); return; }
    if (formUsuario.senha && formUsuario.senha.length < 6) { alert('Senha deve ter no mínimo 6 caracteres'); return; }
    setSalvandoUsuario(true);
    try {
      if (modalUsuario === 'novo') {
        const { data: { session } } = await supabase.auth.getSession();
        const clinicaId = session ? (await supabase.from('user_roles').select('clinica_id').eq('id', session.user.id).maybeSingle()).data?.clinica_id : null;
        const res = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formUsuario, clinica_id: clinicaId }) });
        const d = await res.json();
        if (!res.ok) { alert('Erro: ' + d.error); return; }
      } else {
        const res = await fetch('/api/usuarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editIdUsuario, nome: formUsuario.nome, email: formUsuario.email, perfil: formUsuario.perfil, permissoes: formUsuario.permissoes, senha: formUsuario.senha || undefined }) });
        const d = await res.json();
        if (!res.ok) { alert('Erro: ' + d.error); return; }
      }
      setModalUsuario(null);
      carregarUsuarios();
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
      alert('Preencha os campos obrigatórios');
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
    if (!formProc.nome || !formProc.preco) { alert('Informe descrição e valor'); return; }
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
    } catch { alert('Erro ao salvar procedimento'); }
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

  return (
    <div style={s.main}>
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
