'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/UI';

export default function WhatsAppPage() {
  const [conversas, setConversas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clinicaId, setClinicaId] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem('dentclinic_clinica_id');
    setClinicaId(id);
    carregarConversas(id);
    const intervalo = setInterval(() => carregarConversas(id), 15000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [selecionada]);

  const carregarConversas = async (cid) => {
    try {
      const url = cid ? `/api/whatsapp?clinica_id=${cid}` : '/api/whatsapp';
      const res = await fetch(url);
      const data = await res.json();
      setConversas(Array.isArray(data) ? data : []);

      // Atualizar conversa selecionada se ainda estiver aberta
      if (selecionada) {
        const atualizada = data.find(c => c.telefone === selecionada.telefone);
        if (atualizada) setSelecionada(atualizada);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionar = (conversa) => {
    setSelecionada(conversa);
    setMensagem('');
  };

  const handleEnviar = async () => {
    if (!mensagem.trim() || !selecionada) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: selecionada.telefone.replace('@s.whatsapp.net', ''),
          mensagem: mensagem.trim(),
          clinica_id: clinicaId,
        }),
      });
      if (res.ok) {
        setMensagem('');
        await carregarConversas(clinicaId);
      }
    } finally {
      setEnviando(false);
    }
  };

  const handlePausar = async (conversa, pausar) => {
    await fetch('/api/whatsapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone: conversa.telefone,
        clinica_id: clinicaId,
        pausada: pausar,
      }),
    });
    await carregarConversas(clinicaId);
    if (selecionada?.telefone === conversa.telefone) {
      setSelecionada(prev => ({ ...prev, pausada: pausar }));
    }
  };

  const historico = selecionada?.dados?.historico || [];

  const formatarTel = (tel) => {
    const limpo = tel.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (limpo.length === 13) return `+${limpo.slice(0,2)} (${limpo.slice(2,4)}) ${limpo.slice(4,9)}-${limpo.slice(9)}`;
    if (limpo.length === 12) return `+${limpo.slice(0,2)} (${limpo.slice(2,4)}) ${limpo.slice(4,8)}-${limpo.slice(8)}`;
    return limpo;
  };

  const formatarHora = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  };

  if (loading) return <div style={s.main}><p>Carregando...</p></div>;

  return (
    <div style={s.main}>
      <PageHeader title="WhatsApp" subtitle="Monitore e responda conversas dos pacientes" />

      <div style={s.container}>
        {/* Lista de conversas */}
        <div style={s.lista}>
          <div style={s.listaHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Conversas</span>
            <span style={s.badge}>{conversas.length}</span>
          </div>

          {conversas.length === 0 ? (
            <div style={s.vazio}>Nenhuma conversa ainda</div>
          ) : (
            conversas.map(c => (
              <div
                key={c.id}
                style={{
                  ...s.item,
                  background: selecionada?.id === c.id ? '#F0FFF4' : '#fff',
                  borderLeft: selecionada?.id === c.id ? '3px solid #A8D5C2' : '3px solid transparent',
                }}
                onClick={() => handleSelecionar(c)}
              >
                <div style={s.itemAvatar}>
                  {(c.telefone || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={s.itemNome}>{formatarTel(c.telefone)}</span>
                    {c.pausada && <span style={s.tagPausada}>Pausada</span>}
                  </div>
                  <div style={s.itemUltima}>{c.ultimo_texto || '—'}</div>
                  <div style={s.itemHora}>{formatarHora(c.ultimo_contato || c.atualizado_em)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Área do chat */}
        <div style={s.chat}>
          {!selecionada ? (
            <div style={s.semConversa}>
              <div style={{ fontSize: 32 }}>💬</div>
              <p style={{ color: '#888', marginTop: 8 }}>Selecione uma conversa</p>
            </div>
          ) : (
            <>
              {/* Header do chat */}
              <div style={s.chatHeader}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{formatarTel(selecionada.telefone)}</div>
                  <div style={{ fontSize: 11, color: selecionada.pausada ? '#E07B39' : '#2E9E5B', marginTop: 2 }}>
                    {selecionada.pausada ? '⏸ IA pausada — atendimento manual' : '🤖 IA ativa'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selecionada.pausada ? (
                    <button style={s.btnRetomar} onClick={() => handlePausar(selecionada, false)}>
                      ▶ Retomar IA
                    </button>
                  ) : (
                    <button style={s.btnPausar} onClick={() => handlePausar(selecionada, true)}>
                      ⏸ Pausar IA
                    </button>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div style={s.mensagens} ref={chatRef}>
                {historico.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#AAA', marginTop: 40, fontSize: 13 }}>
                    Sem histórico de mensagens
                  </div>
                ) : (
                  historico.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const isManual = msg.content?.startsWith('[Manual]');
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
                        <div style={{
                          ...s.balao,
                          background: isUser ? '#fff' : isManual ? '#FFF3E0' : '#DCF8C6',
                          borderRadius: isUser ? '0 12px 12px 12px' : '12px 0 12px 12px',
                          maxWidth: '72%',
                        }}>
                          {isManual && <div style={{ fontSize: 10, color: '#E07B39', fontWeight: 600, marginBottom: 2 }}>✍ Manual</div>}
                          <div style={{ fontSize: 13, color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>
                            {msg.content?.replace('[Manual] ', '')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de envio */}
              <div style={s.inputArea}>
                {!selecionada.pausada && (
                  <div style={s.avisoIA}>
                    ⚠️ IA ativa — pause para responder manualmente
                  </div>
                )}
                <div style={s.inputRow}>
                  <textarea
                    style={s.textArea}
                    placeholder={selecionada.pausada ? 'Digite sua mensagem...' : 'Pause a IA para enviar manualmente'}
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    disabled={!selecionada.pausada || enviando}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
                    rows={2}
                  />
                  <button
                    style={{
                      ...s.btnEnviar,
                      opacity: (!selecionada.pausada || !mensagem.trim() || enviando) ? 0.4 : 1,
                      cursor: (!selecionada.pausada || !mensagem.trim() || enviando) ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleEnviar}
                    disabled={!selecionada.pausada || !mensagem.trim() || enviando}
                  >
                    {enviando ? '...' : '➤'}
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
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  container: { display: 'flex', gap: 0, background: '#fff', borderRadius: 12, border: '1.5px solid #EFEFEF', overflow: 'hidden', height: 'calc(100vh - 180px)', minHeight: 500 },
  lista: { width: 300, borderRight: '1.5px solid #EFEFEF', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 },
  listaHeader: { padding: '16px 16px 12px', borderBottom: '1px solid #EFEFEF', display: 'flex', alignItems: 'center', gap: 8 },
  badge: { background: '#A8D5C2', color: '#1A1A1A', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  vazio: { padding: 24, color: '#AAA', fontSize: 13, textAlign: 'center' },
  item: { display: 'flex', gap: 10, padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5', transition: 'background 0.15s' },
  itemAvatar: { width: 38, height: 38, borderRadius: '50%', background: '#A8D5C2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 },
  itemNome: { fontSize: 13, fontWeight: 600, color: '#1A1A1A' },
  itemUltima: { fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemHora: { fontSize: 11, color: '#AAA', marginTop: 2 },
  tagPausada: { fontSize: 10, background: '#FFF3E0', color: '#E07B39', padding: '2px 6px', borderRadius: 6, fontWeight: 600 },
  chat: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  semConversa: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { padding: '14px 20px', borderBottom: '1.5px solid #EFEFEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' },
  mensagens: { flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#F0F4F8' },
  balao: { padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', wordBreak: 'break-word' },
  inputArea: { borderTop: '1.5px solid #EFEFEF', padding: '12px 16px', background: '#FAFAFA' },
  avisoIA: { fontSize: 11, color: '#E07B39', marginBottom: 8 },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textArea: { flex: 1, padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'none', outline: 'none' },
  btnEnviar: { width: 42, height: 42, borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  btnPausar: { padding: '7px 14px', fontSize: 12, border: 'none', borderRadius: 6, background: '#FFF3E0', color: '#E07B39', fontWeight: 600, cursor: 'pointer' },
  btnRetomar: { padding: '7px 14px', fontSize: 12, border: 'none', borderRadius: 6, background: '#E8F5E9', color: '#2E9E5B', fontWeight: 600, cursor: 'pointer' },
};
