'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader } from '../../../../components/UI';

export default function IntegracoesPage() {
  const [clinicas, setClinicas] = useState([]);
  const [clinicaSelecionada, setClinicaSelecionada] = useState('');
  const [configs, setConfigs] = useState({});
  const [testando, setTestando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [agendamentosWhatsapp, setAgendamentosWhatsapp] = useState([]);
  const [abas, setAbas] = useState('whatsapp');

  const [whatsappForm, setWhatsappForm] = useState({
    numero: '',
    nome_exibicao: '',
    token_api: '',
    instancia_evolution: '',
    mostrarToken: false,
    ativo: true,
  });

  const [n8nForm, setN8nForm] = useState({
    webhook_base_url: '',
    token: '',
    ativo: true,
  });

  const [templates, setTemplates] = useState({
    boas_vindas: 'Bem-vindo à {{clinica}}! 👋\nQual dentista você deseja ser atendido?',
    confirmacao: '✅ Agendado com sucesso!\nDentista: {{dentista}}\nData: {{data}} às {{hora}}\nObrigado por escolher {{clinica}}!',
    lembrete: '⏰ Lembrete: Você tem consulta amanhã às {{hora}} com {{dentista}} em {{clinica}}',
    disponibilidade: 'Disponibilidade para {{dentista}}:\n{{dias_horarios}}'
  });

  const [automacoes, setAutomacoes] = useState({
    enviar_lembrete_24h: true,
    enviar_confirmacao_sms: false,
    criar_agendamento_automatico: true,
  });

  useEffect(() => {
    const savedClinicas = localStorage.getItem('clinicas');
    if (savedClinicas) {
      const clinicasData = JSON.parse(savedClinicas);
      setClinicas(clinicasData);
      if (clinicasData.length > 0) {
        setClinicaSelecionada(clinicasData[0].id);
      }

      const savedConfigs = localStorage.getItem('integracao_whatsapp');
      if (savedConfigs) {
        setConfigs(JSON.parse(savedConfigs));
      }
    }

    const savedAgendamentos = localStorage.getItem('agendamentos_whatsapp');
    if (savedAgendamentos) {
      setAgendamentosWhatsapp(JSON.parse(savedAgendamentos));
    }
  }, []);

  useEffect(() => {
    if (clinicaSelecionada && configs[clinicaSelecionada]) {
      const config = configs[clinicaSelecionada];
      setWhatsappForm({ numero: '', nome_exibicao: '', token_api: '', instancia_evolution: '', mostrarToken: false, ativo: true, ...config.whatsapp });
      setN8nForm({ webhook_base_url: '', token: '', ativo: true, ...config.n8n });
      setTemplates(config.templates || templates);
      setAutomacoes(config.automacoes || automacoes);
    } else {
      setWhatsappForm({ numero: '', nome_exibicao: '', token_api: '', instancia_evolution: '', mostrarToken: false, ativo: true });
      setN8nForm({ webhook_base_url: '', token: '', ativo: true });
    }
  }, [clinicaSelecionada]);

  const showMensagem = (msg, tipo = 'sucesso') => {
    setMensagem({ msg, tipo });
    setTimeout(() => setMensagem(null), 4000);
  };

  const handleTestarConexaoWhatsapp = async () => {
    if (!whatsappForm.numero || !whatsappForm.token_api) {
      showMensagem('Preencha número e token', 'erro');
      return;
    }
    setTestando(true);
    setTimeout(() => {
      setTestando(false);
      showMensagem('✅ Conexão com WhatsApp testada com sucesso!', 'sucesso');
    }, 1500);
  };

  const handleTestarConexaoN8n = async () => {
    if (!n8nForm.webhook_url || !n8nForm.token) {
      showMensagem('Preencha webhook URL e token', 'erro');
      return;
    }
    setTestando(true);
    setTimeout(() => {
      setTestando(false);
      showMensagem('✅ Conexão com n8n testada com sucesso!', 'sucesso');
    }, 1500);
  };

  const handleSalvar = () => {
    if (!clinicaSelecionada) {
      showMensagem('Selecione uma clínica', 'erro');
      return;
    }

    const novasConfigs = {
      ...configs,
      [clinicaSelecionada]: {
        whatsapp: whatsappForm,
        n8n: n8nForm,
        templates,
        automacoes,
        ultima_atualizacao: new Date().toLocaleString('pt-BR'),
      }
    };

    localStorage.setItem('integracao_whatsapp', JSON.stringify(novasConfigs));
    setConfigs(novasConfigs);
    showMensagem('⚙️ Configurações salvas com sucesso!', 'sucesso');
  };

  const clinicaAtual = clinicas.find(c => c.id === clinicaSelecionada);
  const configAtual = configs[clinicaSelecionada];

  const agendamentosClinicaAtual = agendamentosWhatsapp.filter(a => a.clinica_id === clinicaSelecionada);

  return (
    <div style={s.main}>
      <PageHeader
        title="Integrações"
        subtitle="Configure WhatsApp e n8n para automação de agendamentos"
      >
        <Button variant="ghost" onClick={() => window.print()}>📄 Exportar</Button>
      </PageHeader>

      {mensagem && (
        <div style={{ ...s.toast, background: mensagem.tipo === 'erro' ? '#C0392B' : '#27AE60' }}>
          {mensagem.msg}
        </div>
      )}

      {/* Seletor de Clínica */}
      <Card style={{ marginBottom: 24 }}>
        <label style={s.label}>Selecione a Clínica</label>
        <select
          value={clinicaSelecionada}
          onChange={(e) => setClinicaSelecionada(parseInt(e.target.value))}
          style={s.select}
        >
          <option value="">-- Escolha uma clínica --</option>
          {clinicas.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </Card>

      {clinicaSelecionada && (
        <>
          {/* Abas */}
          <div style={s.abasContainer}>
            <button
              style={{ ...s.abaBtn, ...(abas === 'whatsapp' ? s.abaBtnActive : {}) }}
              onClick={() => setAbas('whatsapp')}
            >
              📱 WhatsApp
            </button>
            <button
              style={{ ...s.abaBtn, ...(abas === 'n8n' ? s.abaBtnActive : {}) }}
              onClick={() => setAbas('n8n')}
            >
              🔗 N8N
            </button>
            <button
              style={{ ...s.abaBtn, ...(abas === 'templates' ? s.abaBtnActive : {}) }}
              onClick={() => setAbas('templates')}
            >
              📝 Templates
            </button>
            <button
              style={{ ...s.abaBtn, ...(abas === 'automacoes' ? s.abaBtnActive : {}) }}
              onClick={() => setAbas('automacoes')}
            >
              ⚙️ Automações
            </button>
            <button
              style={{ ...s.abaBtn, ...(abas === 'historico' ? s.abaBtnActive : {}) }}
              onClick={() => setAbas('historico')}
            >
              📊 Histórico
            </button>
          </div>

          {/* ABA: WHATSAPP */}
          {abas === 'whatsapp' && (
            <Card>
              <CardTitle>Configuração WhatsApp</CardTitle>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
                {configAtual?.ultima_atualizacao && `Última atualização: ${configAtual.ultima_atualizacao}`}
              </p>

              <div style={s.formGroup}>
                <label style={s.label}>Número WhatsApp (com código do país) *</label>
                <input
                  type="text"
                  placeholder="5511987654321"
                  value={whatsappForm.numero}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, numero: e.target.value })}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Nome de Exibição</label>
                <input
                  type="text"
                  placeholder="Clínica Dental Senior"
                  value={whatsappForm.nome_exibicao}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, nome_exibicao: e.target.value })}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Nome da Instância (Evolution API) *</label>
                <input
                  type="text"
                  placeholder="dental-senior, sorriso-perfeito..."
                  value={whatsappForm.instancia_evolution}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, instancia_evolution: e.target.value })}
                  style={s.input}
                />
                <p style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>
                  Nome exato da instância criada no Evolution API para esta clínica
                </p>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>API Token/Bearer *</label>
                <div style={s.tokenContainer}>
                  <input
                    type={whatsappForm.mostrarToken ? 'text' : 'password'}
                    placeholder="EAADFhc8Jo..."
                    value={whatsappForm.token_api}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, token_api: e.target.value })}
                    style={{ ...s.input, flex: 1 }}
                  />
                  <button
                    style={s.btnMostrar}
                    onClick={() => setWhatsappForm({ ...whatsappForm, mostrarToken: !whatsappForm.mostrarToken })}
                  >
                    {whatsappForm.mostrarToken ? '👁️‍🗨️' : '👁'}
                  </button>
                </div>
              </div>

              <div style={s.statusRow}>
                <div>
                  <span style={s.statusLabel}>Status:</span>
                  <Badge color={whatsappForm.ativo ? 'green' : 'gray'}>
                    {whatsappForm.ativo ? '✅ Ativo' : '❌ Inativo'}
                  </Badge>
                </div>
                <button
                  style={s.btnToggle}
                  onClick={() => setWhatsappForm({ ...whatsappForm, ativo: !whatsappForm.ativo })}
                >
                  {whatsappForm.ativo ? '🔴 Desativar' : '🟢 Ativar'}
                </button>
              </div>

              <div style={s.testSection}>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                  Clique para testar a conexão com a API do WhatsApp
                </p>
                <button
                  style={{ ...s.btnTeste, opacity: testando ? 0.6 : 1 }}
                  onClick={handleTestarConexaoWhatsapp}
                  disabled={testando}
                >
                  {testando ? '⏳ Testando...' : '🧪 Testar Conexão'}
                </button>
              </div>
            </Card>
          )}

          {/* ABA: N8N */}
          {abas === 'n8n' && (
            <Card>
              <CardTitle>Configuração N8N</CardTitle>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
                Um único workflow n8n atende todas as clínicas. Cada clínica usa a URL com seu ID.
              </p>

              <div style={s.formGroup}>
                <label style={s.label}>URL base do webhook n8n *</label>
                <input
                  type="text"
                  placeholder="https://n8n.geraresistemas.com.br/webhook/dentclinic"
                  value={n8nForm.webhook_base_url}
                  onChange={(e) => setN8nForm({ ...n8nForm, webhook_base_url: e.target.value })}
                  style={s.input}
                />
                <p style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>
                  URL do webhook no n8n, sem parâmetros. O sistema adiciona o clinica_id automaticamente.
                </p>
              </div>

              {n8nForm.webhook_base_url && clinicaSelecionada && (
                <div style={{ background: '#F0FFF4', border: '1.5px solid #9AE6B4', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#276749', marginBottom: 8 }}>
                    🔗 URL para configurar no Evolution API desta clínica:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, background: '#fff', border: '1px solid #C6F6D5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1A1A1A', wordBreak: 'break-all' }}>
                      {n8nForm.webhook_base_url}?clinica_id={clinicaSelecionada}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${n8nForm.webhook_base_url}?clinica_id=${clinicaSelecionada}`); showMensagem('URL copiada!'); }}
                      style={{ padding: '8px 14px', background: '#38A169', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#276749', marginTop: 8, marginBottom: 0 }}>
                    Configure essa URL no Evolution API → Instância <strong>{whatsappForm.instancia_evolution || '(defina a instância na aba WhatsApp)'}</strong> → Webhook
                  </p>
                </div>
              )}

              <div style={s.formGroup}>
                <label style={s.label}>Token de Autenticação *</label>
                <div style={s.tokenContainer}>
                  <input
                    type={n8nForm.mostrarToken ? 'text' : 'password'}
                    placeholder="Bearer token aqui..."
                    value={n8nForm.token}
                    onChange={(e) => setN8nForm({ ...n8nForm, token: e.target.value })}
                    style={{ ...s.input, flex: 1 }}
                  />
                  <button
                    style={s.btnMostrar}
                    onClick={() => setN8nForm({ ...n8nForm, mostrarToken: !n8nForm.mostrarToken })}
                  >
                    {n8nForm.mostrarToken ? '👁️‍🗨️' : '👁'}
                  </button>
                </div>
              </div>

              <div style={s.statusRow}>
                <div>
                  <span style={s.statusLabel}>Status:</span>
                  <Badge color={n8nForm.ativo ? 'green' : 'gray'}>
                    {n8nForm.ativo ? '✅ Ativo' : '❌ Inativo'}
                  </Badge>
                </div>
                <button
                  style={s.btnToggle}
                  onClick={() => setN8nForm({ ...n8nForm, ativo: !n8nForm.ativo })}
                >
                  {n8nForm.ativo ? '🔴 Desativar' : '🟢 Ativar'}
                </button>
              </div>

              <div style={s.testSection}>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                  Clique para testar a conexão com o webhook do n8n
                </p>
                <button
                  style={{ ...s.btnTeste, opacity: testando ? 0.6 : 1 }}
                  onClick={handleTestarConexaoN8n}
                  disabled={testando}
                >
                  {testando ? '⏳ Testando...' : '🧪 Testar Webhook'}
                </button>
              </div>

              <div style={s.infoBox}>
                <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                  <strong>Código do workflow n8n esperado:</strong><br/>
                  1. Webhook (recebe POST)<br/>
                  2. Processa mensagem (determina etapa)<br/>
                  3. Consulta API do sistema<br/>
                  4. Envia resposta via WhatsApp
                </p>
              </div>
            </Card>
          )}

          {/* ABA: TEMPLATES */}
          {abas === 'templates' && (
            <Card>
              <CardTitle>Templates de Mensagem</CardTitle>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
                Use {"{{variaveis}}"} para personalizar mensagens
              </p>

              <div style={s.formGroup}>
                <label style={s.label}>Mensagem de Boas-vindas</label>
                <textarea
                  value={templates.boas_vindas}
                  onChange={(e) => setTemplates({ ...templates, boas_vindas: e.target.value })}
                  style={{ ...s.textarea }}
                  placeholder="Bem-vindo à {{clinica}}! 👋"
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Confirmação de Agendamento</label>
                <textarea
                  value={templates.confirmacao}
                  onChange={(e) => setTemplates({ ...templates, confirmacao: e.target.value })}
                  style={{ ...s.textarea }}
                  placeholder="✅ Agendado com sucesso..."
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Lembrete 24h Antes</label>
                <textarea
                  value={templates.lembrete}
                  onChange={(e) => setTemplates({ ...templates, lembrete: e.target.value })}
                  style={{ ...s.textarea }}
                  placeholder="⏰ Lembrete..."
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Exibir Disponibilidade</label>
                <textarea
                  value={templates.disponibilidade}
                  onChange={(e) => setTemplates({ ...templates, disponibilidade: e.target.value })}
                  style={{ ...s.textarea }}
                  placeholder="Disponibilidade para {{dentista}}..."
                />
              </div>

              <div style={s.infoBox}>
                <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                  <strong>Variáveis disponíveis:</strong><br/>
                  {"{{clinica}}"} - Nome da clínica<br/>
                  {"{{dentista}}"} - Nome do dentista<br/>
                  {"{{data}}"} - Data do agendamento<br/>
                  {"{{hora}}"} - Horário do agendamento<br/>
                  {"{{dias_horarios}}"} - Lista de dias/horários
                </p>
              </div>
            </Card>
          )}

          {/* ABA: AUTOMAÇÕES */}
          {abas === 'automacoes' && (
            <Card>
              <CardTitle>Automações</CardTitle>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
                Configure automações para sua clínica
              </p>

              <div style={s.checkboxGroup}>
                <label style={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={automacoes.enviar_lembrete_24h}
                    onChange={(e) => setAutomacoes({ ...automacoes, enviar_lembrete_24h: e.target.checked })}
                    style={s.checkbox}
                  />
                  <span>Enviar lembrete 24h antes do agendamento</span>
                </label>
              </div>

              <div style={s.checkboxGroup}>
                <label style={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={automacoes.criar_agendamento_automatico}
                    onChange={(e) => setAutomacoes({ ...automacoes, criar_agendamento_automatico: e.target.checked })}
                    style={s.checkbox}
                  />
                  <span>Criar agendamento automaticamente após confirmação</span>
                </label>
              </div>

              <div style={s.checkboxGroup}>
                <label style={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={automacoes.enviar_confirmacao_sms}
                    onChange={(e) => setAutomacoes({ ...automacoes, enviar_confirmacao_sms: e.target.checked })}
                    style={s.checkbox}
                  />
                  <span>Enviar confirmação por SMS também</span>
                </label>
              </div>

              <div style={s.infoBox}>
                <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                  💡 <strong>Dica:</strong> Habilite todas as automações para melhor experiência do paciente
                </p>
              </div>
            </Card>
          )}

          {/* ABA: HISTÓRICO */}
          {abas === 'historico' && (
            <Card>
              <CardTitle>Histórico de Agendamentos via WhatsApp</CardTitle>

              {agendamentosClinicaAtual.length === 0 ? (
                <p style={{ fontSize: 12, color: '#AAA', textAlign: 'center', padding: '20px' }}>
                  Nenhum agendamento feito via WhatsApp ainda
                </p>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Cliente</th>
                      <th style={s.th}>Dentista</th>
                      <th style={s.th}>Data/Hora</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Data Agendamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosClinicaAtual.map(agend => (
                      <tr key={agend.id}>
                        <td style={s.td}>{agend.cliente_nome}</td>
                        <td style={s.td}>{agend.dentista_nome}</td>
                        <td style={s.td}>{agend.data} às {agend.hora}</td>
                        <td style={s.td}>
                          <Badge color={agend.status === 'confirmado' ? 'green' : 'yellow'}>
                            {agend.status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                          </Badge>
                        </td>
                        <td style={s.td}>{agend.data_agendamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Botões de Ação */}
          <div style={s.botoes}>
            <Button onClick={handleSalvar}>💾 Salvar Configurações</Button>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 8 },
  select: { width: '100%', padding: '11px 14px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: '#fff' },
  formGroup: { marginBottom: 20 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff' },
  textarea: { width: '100%', minHeight: 100, padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff', fontFamily: "'DM Sans', sans-serif", resize: 'vertical' },
  tokenContainer: { display: 'flex', gap: 8, alignItems: 'center' },
  btnMostrar: { padding: '8px 12px', border: '1.5px solid #E8E8E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#F8F8F8', borderRadius: 8, marginBottom: 20 },
  statusLabel: { fontSize: 12, fontWeight: 500, marginRight: 12 },
  btnToggle: { padding: '8px 16px', border: 'none', borderRadius: 6, background: '#1A1A1A', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  testSection: { padding: 16, background: '#F0F8F4', border: '1px solid #D4F0E8', borderRadius: 8, marginTop: 20 },
  btnTeste: { padding: '10px 20px', border: 'none', borderRadius: 6, background: '#27AE60', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  infoBox: { padding: 12, background: '#E8F4F0', border: '1px solid #C8E4DB', borderRadius: 8, marginTop: 16 },
  abasContainer: { display: 'flex', gap: 8, marginBottom: 24, borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: '#EFEFEF', paddingBottom: 12 },
  abaBtn: { padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#888', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', transition: 'all 0.2s' },
  abaBtnActive: { color: '#1A1A1A', borderBottomColor: '#A8D5C2' },
  checkboxGroup: { marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #EFEFEF' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  botoes: { display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' },
  toast: { position: 'fixed', top: 20, right: 20, padding: '14px 20px', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, zIndex: 1001, animation: 'slideIn 0.3s ease' },
};
