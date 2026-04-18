'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
  Bot,
  CheckCircle2,
  MessageCircleMore,
  PauseCircle,
  PlayCircle,
  Search,
  Send,
  UserRound,
  XCircle,
} from 'lucide-react';

const CORES_AVATAR = [
  { bg: '#A8D5C2', text: '#3E7D63' },
  { bg: '#B5CFF5', text: '#3A5FA5' },
  { bg: '#F5D5A8', text: '#A57A3A' },
  { bg: '#D5B5F5', text: '#6B3FA5' },
  { bg: '#F5C4B5', text: '#A55A3A' },
];

function corAvatar(chave) {
  if (!chave) return CORES_AVATAR[0];
  return CORES_AVATAR[chave.charCodeAt(0) % CORES_AVATAR.length];
}

function formatarTelefone(telefone = '') {
  const limpo = String(telefone).replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (limpo.length === 13) return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  if (limpo.length === 12) return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 8)}-${limpo.slice(8)}`;
  return limpo || telefone || 'Sem telefone';
}

function formatarDataHora(dataISO) {
  if (!dataISO) return 'Sem registro';
  return new Date(dataISO).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizarTextoMensagem(texto = '') {
  return texto.replace('[Manual] ', '').trim();
}

export default function WhatsAppPage() {
  const [clinicaId, setClinicaId] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [selecionadaId, setSelecionadaId] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const chatRef = useRef(null);

  const showFeedback = (msg, tipo = 'sucesso') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 3200);
  };

  const resolverClinicaId = async () => {
    const clinicaIdLocal = localStorage.getItem('dentclinic_clinica_id');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return clinicaIdLocal || null;

      let data = null;

      const consultaPorId = await supabase
        .from('user_roles')
        .select('clinica_id')
        .eq('id', userId)
        .maybeSingle();

      data = consultaPorId.data;

      if (!data) {
        const consultaPorUserId = await supabase
          .from('user_roles')
          .select('clinica_id')
          .eq('user_id', userId)
          .maybeSingle();
        data = consultaPorUserId.data;
      }

      const clinicaIdSessao = data?.clinica_id || null;
      if (clinicaIdSessao) {
        localStorage.setItem('dentclinic_clinica_id', clinicaIdSessao);
        return clinicaIdSessao;
      }
      return clinicaIdLocal || null;
    } catch {
      return clinicaIdLocal || null;
    }
  };

  useEffect(() => {
    let intervalo = null;
    const iniciar = async () => {
      const id = await resolverClinicaId();
      setClinicaId(id || null);
      await carregarConversas(id || null, true);
      intervalo = setInterval(() => {
        carregarConversas(id || null);
      }, 15000);
    };

    iniciar();

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, []);

  const conversaSelecionada = useMemo(
    () => conversas.find(c => c.id === selecionadaId) || null,
    [conversas, selecionadaId]
  );

  const historicoSelecionado = conversaSelecionada?.dados?.historico || [];

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [historicoSelecionado.length, conversaSelecionada?.id]);

  const carregarConversas = async (cid, primeiraCarga = false) => {
    try {
      if (primeiraCarga) setLoading(true);
      const url = cid ? `/api/whatsapp?clinica_id=${cid}` : '/api/whatsapp';
      const res = await fetch(url);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];

      setConversas(lista);

      if (!selecionadaId && lista[0]?.id) {
        setSelecionadaId(lista[0].id);
      } else if (selecionadaId && !lista.some(c => c.id === selecionadaId)) {
        setSelecionadaId(lista[0]?.id || null);
      }
    } catch {
      showFeedback('Erro ao carregar conversas do WhatsApp', 'erro');
    } finally {
      if (primeiraCarga) setLoading(false);
    }
  };

  const conversasFiltradas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    return conversas.filter(c => {
      const nomeBusca = formatarTelefone(c.telefone).toLowerCase();
      const textoBusca = String(c.ultimo_texto || '').toLowerCase();
      const matchBusca = !termo || nomeBusca.includes(termo) || textoBusca.includes(termo);
      const matchEstado = filtroEstado === 'todas'
        || (filtroEstado === 'pausadas' && !!c.pausada)
        || (filtroEstado === 'ativas' && !c.pausada);
      return matchBusca && matchEstado;
    });
  }, [conversas, filtroBusca, filtroEstado]);

  const kpis = useMemo(() => {
    const total = conversas.length;
    const pausadas = conversas.filter(c => c.pausada).length;
    const ativas = total - pausadas;
    const hoje = new Date().toISOString().slice(0, 10);
    const mensagensHoje = conversas.reduce((acc, c) => {
      const hist = c?.dados?.historico || [];
      const qtdHoje = hist.filter(m => {
        const data = m?.timestamp || c.ultimo_contato || c.atualizado_em;
        return data && String(data).slice(0, 10) === hoje;
      }).length;
      return acc + qtdHoje;
    }, 0);
    return { total, pausadas, ativas, mensagensHoje };
  }, [conversas]);

  const handleSelecionar = (conversa) => {
    setSelecionadaId(conversa.id);
    setMensagem('');
  };

  const handlePausarIA = async (pausar) => {
    if (!conversaSelecionada || atualizandoStatus) return;
    setAtualizandoStatus(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao_id: conversaSelecionada.id,
          telefone: conversaSelecionada.telefone,
          clinica_id: clinicaId,
          pausada: pausar,
        }),
      });

      if (!res.ok) throw new Error();
      showFeedback(pausar ? 'Automação pausada para atendimento manual' : 'Automação retomada');
      await carregarConversas(clinicaId);
    } catch {
      showFeedback('Não foi possível atualizar o status da automação', 'erro');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const handleEnviarMensagem = async () => {
    if (!conversaSelecionada || !mensagem.trim() || enviando) return;
    if (!conversaSelecionada.pausada) {
      showFeedback('Pause a automação para responder manualmente', 'erro');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao_id: conversaSelecionada.id,
          telefone: conversaSelecionada.telefone,
          mensagem: mensagem.trim(),
          clinica_id: clinicaId,
        }),
      });

      if (!res.ok) throw new Error();
      setMensagem('');
      showFeedback('Mensagem manual enviada com sucesso');
      await carregarConversas(clinicaId);
    } catch {
      showFeedback('Erro ao enviar mensagem manual', 'erro');
    } finally {
      setEnviando(false);
    }
  };

  const renderStatusBadge = (conversa) => (
    conversa.pausada
      ? <span style={{ ...s.statusBadge, ...s.statusPausada }}><PauseCircle size={11} /> IA pausada</span>
      : <span style={{ ...s.statusBadge, ...s.statusAtiva }}><Bot size={11} /> IA ativa</span>
  );

  return (
    <div style={s.main}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {feedback && (
        <div style={{
          ...s.toast,
          background: feedback.tipo === 'sucesso' ? '#E8F5E9' : '#FFEBEE',
          color: feedback.tipo === 'sucesso' ? '#27AE60' : '#C62828',
          borderColor: feedback.tipo === 'sucesso' ? '#C8E6C9' : '#FFCDD2',
        }}>
          {feedback.tipo === 'sucesso' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, letterSpacing: '-0.5px', fontWeight: 400 }}>
            Central WhatsApp
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 300, marginTop: 2 }}>
            Acompanhe conversas, revise respostas da automação e assuma manualmente quando necessário
          </p>
        </div>
      </div>

      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Conversas totais</div>
          <div style={s.kpiValue}>{loading ? '—' : kpis.total}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>IA ativa</div>
          <div style={s.kpiValue}>{loading ? '—' : kpis.ativas}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>IA pausada</div>
          <div style={s.kpiValue}>{loading ? '—' : kpis.pausadas}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Mensagens hoje</div>
          <div style={s.kpiValue}>{loading ? '—' : kpis.mensagensHoje}</div>
        </div>
      </div>

      <div style={s.container}>
        <div style={s.listaColuna}>
          <div style={s.listaHeader}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="#BBB" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                style={{ ...s.input, paddingLeft: 32 }}
                placeholder="Buscar por telefone ou texto..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
              />
            </div>

            <div style={s.chipWrap}>
              {[
                { v: 'todas', l: 'Todas' },
                { v: 'ativas', l: 'IA ativa' },
                { v: 'pausadas', l: 'Pausadas' },
              ].map(opcao => {
                const ativo = filtroEstado === opcao.v;
                return (
                  <button
                    key={opcao.v}
                    style={{ ...s.chip, ...(ativo ? s.chipAtivo : {}) }}
                    onClick={() => setFiltroEstado(opcao.v)}
                  >
                    {opcao.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={s.listaConversas}>
            {loading ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4, 5].map(i => <div key={i} style={s.skeleton} />)}
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIconWrap}><MessageCircleMore size={24} color="#BBB" /></div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 10, fontWeight: 500 }}>Nenhuma conversa encontrada</div>
                <div style={{ fontSize: 12, color: '#AAA', marginTop: 4 }}>Ajuste os filtros ou aguarde novos atendimentos</div>
                <div style={{ fontSize: 11, color: '#BBB', marginTop: 8 }}>
                  Clínica atual: {clinicaId || 'não identificada'}
                </div>
              </div>
            ) : (
              conversasFiltradas.map((conversa) => {
                const selecionada = conversa.id === selecionadaId;
                const cor = corAvatar(String(conversa.telefone || conversa.id || 'X')[0]);
                return (
                  <button
                    key={conversa.id}
                    onClick={() => handleSelecionar(conversa)}
                    style={{
                      ...s.itemConversa,
                      ...(selecionada ? s.itemConversaAtiva : {}),
                    }}
                  >
                    <div style={{ ...s.avatar, background: `${cor.bg}33`, borderColor: cor.bg, color: cor.text }}>
                      {formatarTelefone(conversa.telefone).slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={s.nomeConversa}>{formatarTelefone(conversa.telefone)}</div>
                        <div style={s.horaConversa}>{formatarDataHora(conversa.ultimo_contato || conversa.atualizado_em)}</div>
                      </div>
                      <div style={s.previewConversa}>{conversa.ultimo_texto || 'Sem mensagens recentes'}</div>
                      <div style={{ marginTop: 6 }}>{renderStatusBadge(conversa)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={s.chatColuna}>
          {!conversaSelecionada ? (
            <div style={s.semConversa}>
              <div style={s.emptyIconWrap}><MessageCircleMore size={28} color="#BBB" /></div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 10 }}>Selecione uma conversa para visualizar o histórico</div>
            </div>
          ) : (
            <>
              <div style={s.chatHeader}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{formatarTelefone(conversaSelecionada.telefone)}</div>
                  <div style={{ marginTop: 4 }}>{renderStatusBadge(conversaSelecionada)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {conversaSelecionada.pausada ? (
                    <button
                      style={{ ...s.acaoHeaderBtn, ...s.btnRetomar }}
                      onClick={() => handlePausarIA(false)}
                      disabled={atualizandoStatus}
                    >
                      <PlayCircle size={13} />
                      Retomar IA
                    </button>
                  ) : (
                    <button
                      style={{ ...s.acaoHeaderBtn, ...s.btnPausar }}
                      onClick={() => handlePausarIA(true)}
                      disabled={atualizandoStatus}
                    >
                      <PauseCircle size={13} />
                      Pausar IA
                    </button>
                  )}
                </div>
              </div>

              <div style={s.chatMensagens} ref={chatRef}>
                {historicoSelecionado.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIconWrap}><Bot size={22} color="#BBB" /></div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 10 }}>Sem histórico nessa conversa</div>
                  </div>
                ) : (
                  historicoSelecionado.map((msg, idx) => {
                    const role = msg?.role || 'assistant';
                    const conteudoOriginal = String(msg?.content || '');
                    const manual = conteudoOriginal.startsWith('[Manual]');
                    const conteudo = normalizarTextoMensagem(conteudoOriginal);
                    const mensagemDoCliente = role === 'user';
                    return (
                      <div
                        key={`${conversaSelecionada.id}-${idx}`}
                        style={{
                          ...s.linhaMensagem,
                          justifyContent: mensagemDoCliente ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            ...s.balao,
                            ...(mensagemDoCliente ? s.balaoCliente : manual ? s.balaoManual : s.balaoIA),
                          }}
                        >
                          <div style={s.cabecalhoBalao}>
                            {mensagemDoCliente ? <UserRound size={11} /> : <Bot size={11} />}
                            <span>
                              {mensagemDoCliente ? 'Paciente' : manual ? 'Resposta manual' : 'Automação'}
                            </span>
                          </div>
                          <div style={s.textoBalao}>{conteudo || 'Mensagem sem conteúdo'}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={s.chatFooter}>
                {!conversaSelecionada.pausada && (
                  <div style={s.avisoAutomacao}>
                    A automação está ativa. Pause para enviar mensagens manuais.
                  </div>
                )}
                <div style={s.inputRow}>
                  <textarea
                    style={s.textarea}
                    rows={2}
                    placeholder={conversaSelecionada.pausada ? 'Digite a resposta manual...' : 'Pause a IA para responder manualmente'}
                    value={mensagem}
                    disabled={!conversaSelecionada.pausada || enviando}
                    onChange={(e) => setMensagem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEnviarMensagem();
                      }
                    }}
                  />
                  <button
                    style={{
                      ...s.btnEnviar,
                      opacity: (!conversaSelecionada.pausada || !mensagem.trim() || enviando) ? 0.45 : 1,
                      cursor: (!conversaSelecionada.pausada || !mensagem.trim() || enviando) ? 'not-allowed' : 'pointer',
                    }}
                    disabled={!conversaSelecionada.pausada || !mensagem.trim() || enviando}
                    onClick={handleEnviarMensagem}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  main: {
    flex: 1,
    padding: 28,
    overflowY: 'auto',
    background: '#F8F8F8',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  toast: {
    position: 'fixed',
    top: 24,
    right: 24,
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid',
    fontSize: 13,
    fontWeight: 500,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    animation: 'fadeIn 0.2s ease-out',
  },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  kpiCard: { background: '#fff', border: '1.5px solid #EFEFEF', borderRadius: 12, padding: '16px 18px' },
  kpiLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 },
  kpiValue: { marginTop: 6, fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#1A1A1A', lineHeight: 1 },

  container: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: 14,
    minHeight: 'calc(100vh - 260px)',
  },

  listaColuna: {
    background: '#fff',
    border: '1.5px solid #EFEFEF',
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 540,
  },
  listaHeader: {
    borderBottom: '1.5px solid #F0F0F0',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  input: {
    width: '100%',
    height: 36,
    border: '1.5px solid #E8E8E8',
    borderRadius: 8,
    padding: '0 10px',
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    color: '#1A1A1A',
  },
  chipWrap: { display: 'flex', gap: 4, background: '#F5F5F5', padding: 3, borderRadius: 8 },
  chip: {
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 11,
    color: '#777',
    cursor: 'pointer',
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
  },
  chipAtivo: { background: '#fff', color: '#1A1A1A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  listaConversas: { overflowY: 'auto', flex: 1 },
  itemConversa: {
    width: '100%',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: '1px solid #F5F5F5',
    borderLeft: 'none',
    background: '#fff',
    padding: '12px 12px',
    display: 'flex',
    gap: 10,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  itemConversaAtiva: { background: '#F8FBF9', borderLeft: '3px solid #A8D5C2' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  nomeConversa: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  horaConversa: { fontSize: 10, color: '#AAA', flexShrink: 0 },
  previewConversa: {
    marginTop: 3,
    fontSize: 11,
    color: '#888',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 999,
    padding: '3px 8px',
  },
  statusAtiva: { background: '#E8F5E9', color: '#2E9E5B' },
  statusPausada: { background: '#FFF3E0', color: '#D9822B' },

  chatColuna: {
    background: '#fff',
    border: '1.5px solid #EFEFEF',
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 540,
  },
  semConversa: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  chatHeader: {
    padding: '14px 16px',
    borderBottom: '1.5px solid #F0F0F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  acaoHeaderBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  btnRetomar: { background: '#E8F5E9', color: '#2E9E5B' },
  btnPausar: { background: '#FFF3E0', color: '#D9822B' },

  chatMensagens: { flex: 1, overflowY: 'auto', padding: '16px 16px', background: '#F4F7F9' },
  linhaMensagem: { display: 'flex', marginBottom: 9 },
  balao: {
    maxWidth: '76%',
    borderRadius: 12,
    padding: '8px 10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  balaoCliente: { background: '#fff', borderRadius: '0 12px 12px 12px' },
  balaoIA: { background: '#DCF8C6', borderRadius: '12px 0 12px 12px' },
  balaoManual: { background: '#FFF3E0', borderRadius: '12px 0 12px 12px' },
  cabecalhoBalao: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 600,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  textoBalao: { fontSize: 13, color: '#1A1A1A', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },

  chatFooter: { padding: 12, borderTop: '1.5px solid #F0F0F0', background: '#FAFAFA' },
  avisoAutomacao: {
    fontSize: 11,
    color: '#D9822B',
    marginBottom: 8,
    background: '#FFF7EB',
    border: '1px solid #F8DEB7',
    borderRadius: 8,
    padding: '7px 10px',
  },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: {
    flex: 1,
    border: '1.5px solid #E8E8E8',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    resize: 'none',
    outline: 'none',
    background: '#fff',
  },
  btnEnviar: {
    width: 42,
    height: 42,
    border: 'none',
    borderRadius: 8,
    background: '#1A1A1A',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  skeleton: {
    height: 66,
    borderRadius: 10,
    background: 'linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite linear',
  },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' },
  emptyIconWrap: { width: 54, height: 54, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
