'use client';

import { useState, useEffect } from 'react';
import { Button, Badge, Card, CardTitle, PageHeader } from '../../../../components/UI';

const planosIniciais = [
  {
    id: 1,
    nome: 'Starter',
    descricao: '1 Clínica · 1 Dentista',
    preco: 99,
    moeda: 'BRL',
    ciclo: 'mensal',
    features: [
      'Agenda Digital',
      'Gerenciamento de Pacientes',
      'Prontuário Eletrônico',
      'WhatsApp Automático',
      '1 Clínica',
      '1 Dentista',
    ],
    nao_inclui: [
      'Financeiro',
      'CRM',
      'Relatórios avançados',
      'API',
    ],
    destaque: false,
    status: 'ativo',
  },
  {
    id: 2,
    nome: 'Profissional',
    descricao: '1 Clínica · 3 Dentistas',
    preco: 199,
    moeda: 'BRL',
    ciclo: 'mensal',
    features: [
      'Agenda Digital',
      'Gerenciamento de Pacientes',
      'Prontuário Eletrônico',
      'WhatsApp Automático',
      'Orçamentos',
      'Financeiro Básico',
      'Relatórios',
      '1 Clínica',
      '3 Dentistas',
    ],
    nao_inclui: [
      'CRM',
      'API',
    ],
    destaque: true,
    status: 'ativo',
  },
  {
    id: 3,
    nome: 'Enterprise',
    descricao: 'Múltiplas Clínicas · Usuários Ilimitados',
    preco: 349,
    moeda: 'BRL',
    ciclo: 'mensal',
    features: [
      'Tudo do Profissional',
      'CRM Integrado',
      'Múltiplas Clínicas',
      'Usuários Ilimitados',
      'API Acesso',
      'Suporte Prioritário',
      'Relatórios Avançados',
    ],
    nao_inclui: [],
    destaque: false,
    status: 'ativo',
  },
];

export default function PlanosPage() {
  const [planos, setPlanos] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    moeda: 'BRL',
    ciclo: 'mensal',
    features: '',
    nao_inclui: '',
    destaque: false,
    status: 'ativo',
  });

  useEffect(() => {
    const saved = localStorage.getItem('planos_dentclinic');
    if (saved) {
      setPlanos(JSON.parse(saved));
    } else {
      setPlanos(planosIniciais);
      localStorage.setItem('planos_dentclinic', JSON.stringify(planosIniciais));
    }
  }, []);

  const salvarNoLocalStorage = (dados) => {
    localStorage.setItem('planos_dentclinic', JSON.stringify(dados));
  };

  const handleNovo = () => {
    setEditId(null);
    setForm({
      nome: '',
      descricao: '',
      preco: '',
      moeda: 'BRL',
      ciclo: 'mensal',
      features: '',
      nao_inclui: '',
      destaque: false,
      status: 'ativo',
    });
    setModal('novo');
  };

  const handleEditar = (plano) => {
    setEditId(plano.id);
    setForm({
      ...plano,
      features: plano.features.join('\n'),
      nao_inclui: plano.nao_inclui.join('\n'),
    });
    setModal('editar');
  };

  const handleExcluir = (id) => {
    if (window.confirm('Deseja realmente excluir este plano?')) {
      const updated = planos.filter(p => p.id !== id);
      setPlanos(updated);
      salvarNoLocalStorage(updated);
    }
  };

  const handleSalvar = () => {
    if (!form.nome || !form.preco) {
      alert('Preencha nome e preço');
      return;
    }

    const featuresArray = form.features
      .split('\n')
      .map(f => f.trim())
      .filter(f => f);
    const nao_incluiArray = form.nao_inclui
      .split('\n')
      .map(f => f.trim())
      .filter(f => f);

    let updated;
    if (modal === 'novo') {
      const newId = Math.max(...planos.map(p => p.id), 0) + 1;
      updated = [...planos, {
        id: newId,
        ...form,
        preco: parseFloat(form.preco),
        features: featuresArray,
        nao_inclui: nao_incluiArray,
      }];
    } else {
      updated = planos.map(p =>
        p.id === editId ? {
          ...p,
          ...form,
          preco: parseFloat(form.preco),
          features: featuresArray,
          nao_inclui: nao_incluiArray,
        } : p
      );
    }

    setPlanos(updated);
    salvarNoLocalStorage(updated);
    setModal(null);
  };

  const handleFecharModal = () => {
    setModal(null);
  };

  const handleMarcarDestaque = (id) => {
    const updated = planos.map(p => ({
      ...p,
      destaque: p.id === id,
    }));
    setPlanos(updated);
    salvarNoLocalStorage(updated);
  };

  return (
    <div style={s.main}>
      <PageHeader
        title="Planos e Preços"
        subtitle="Gerenciar modelos de assinatura do DentClinic"
      >
        <Button onClick={handleNovo}>+ Novo Plano</Button>
      </PageHeader>

      {/* Aviso */}
      <Card style={{ marginBottom: 24, background: '#FEF3CD', borderLeft: '4px solid #FFC107' }}>
        <p style={{ fontSize: 12, color: '#856404', margin: 0 }}>
          💡 <strong>Nota:</strong> Estes preços são o modelo padrão. Integração com pagamento será feita na próxima fase.
        </p>
      </Card>

      {/* Grid de Planos */}
      <div style={s.grid}>
        {planos.map(plano => (
          <Card key={plano.id} style={{ ...s.planoCard, ...(plano.destaque ? s.planoBorder : {}) }}>
            <div style={s.planoHeader}>
              <div>
                <h3 style={s.planoNome}>{plano.nome}</h3>
                <p style={s.planoDesc}>{plano.descricao}</p>
              </div>
              {plano.destaque && <Badge color="green">DESTAQUE</Badge>}
            </div>

            <div style={s.preco}>
              <span style={s.valor}>R$ {plano.preco}</span>
              <span style={s.ciclo}>/{plano.ciclo}</span>
            </div>

            <div style={s.features}>
              <p style={s.featuresTitle}>✅ Incluído:</p>
              {plano.features.map((feat, i) => (
                <div key={i} style={s.feature}>• {feat}</div>
              ))}
            </div>

            {plano.nao_inclui.length > 0 && (
              <div style={s.naoInclui}>
                <p style={s.featuresTitle}>❌ Não incluído:</p>
                {plano.nao_inclui.map((feat, i) => (
                  <div key={i} style={s.feature}>• {feat}</div>
                ))}
              </div>
            )}

            <div style={s.acoes}>
              <button
                style={{ ...s.acaoBotao, ...(!plano.destaque ? s.btnDestaque : s.btnDestacado) }}
                onClick={() => handleMarcarDestaque(plano.id)}
              >
                {plano.destaque ? '⭐ Destaque' : '☆ Marcar destaque'}
              </button>
              <button style={s.acaoBotao} onClick={() => handleEditar(plano)}>✏️ Editar</button>
              <button style={s.acaoBotao} onClick={() => handleExcluir(plano.id)}>🗑️ Excluir</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.modalOverlay} onClick={handleFecharModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>
              {modal === 'novo' ? 'Novo Plano' : 'Editar Plano'}
            </h2>

            <div style={s.formGroup}>
              <label style={s.label}>Nome do Plano *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={s.input}
                placeholder="Ex: Profissional"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Descrição</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                style={s.input}
                placeholder="Ex: 1 Clínica · 3 Dentistas"
              />
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Preço (R$) *</label>
                <input
                  type="number"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  style={s.input}
                  placeholder="199"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Ciclo</label>
                <select
                  value={form.ciclo}
                  onChange={(e) => setForm({ ...form, ciclo: e.target.value })}
                  style={s.input}
                >
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Funcionalidades Incluídas</label>
              <textarea
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                style={{ ...s.textarea }}
                placeholder="Uma funcionalidade por linha&#10;Ex:&#10;Agenda Digital&#10;Gerenciamento de Pacientes&#10;Prontuário Eletrônico"
              />
              <small style={{ color: '#888' }}>Uma funcionalidade por linha</small>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Funcionalidades NÃO Incluídas</label>
              <textarea
                value={form.nao_inclui}
                onChange={(e) => setForm({ ...form, nao_inclui: e.target.value })}
                style={{ ...s.textarea }}
                placeholder="Uma funcionalidade por linha&#10;Ex:&#10;CRM&#10;API Acesso"
              />
              <small style={{ color: '#888' }}>Uma funcionalidade por linha (deixe em branco se n/a)</small>
            </div>

            <div style={s.checkboxGroup}>
              <label style={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.destaque}
                  onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
                  style={s.checkbox}
                />
                <span>Marcar como plano destaque (recomendado)</span>
              </label>
            </div>

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={handleFecharModal}>Cancelar</Button>
              <Button onClick={handleSalvar}>Salvar Plano</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 },
  planoCard: { padding: 24, display: 'flex', flexDirection: 'column', transition: 'all 0.3s' },
  planoBorder: { borderLeft: '4px solid #A8D5C2', boxShadow: '0 4px 12px rgba(168, 213, 194, 0.15)' },
  planoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  planoNome: { fontSize: 18, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px 0', fontFamily: "'DM Serif Display', serif" },
  planoDesc: { fontSize: 12, color: '#888', margin: 0 },
  preco: { marginBottom: 20, paddingBottom: 20, borderBottom: '1.5px solid #EFEFEF' },
  valor: { fontSize: 32, fontWeight: 700, color: '#1A1A1A', fontFamily: "'DM Serif Display', serif" },
  ciclo: { fontSize: 14, color: '#888', fontWeight: 400 },
  features: { marginBottom: 16, flex: 1 },
  featuresTitle: { fontSize: 11, fontWeight: 600, color: '#1A1A1A', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  feature: { fontSize: 12, color: '#555', padding: '4px 0', lineHeight: 1.5 },
  naoInclui: { marginBottom: 20, padding: 12, background: '#F5F5F5', borderRadius: 8 },
  acoes: { display: 'flex', gap: 8, flexDirection: 'column' },
  acaoBotao: { padding: '10px 12px', fontSize: 12, border: '1.5px solid #E8E8E8', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1A1A1A', fontWeight: 500, transition: 'all 0.2s' },
  btnDestaque: { borderColor: '#A8D5C2', color: '#A8D5C2' },
  btnDestacado: { background: '#A8D5C2', borderColor: '#A8D5C2', color: '#fff' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 24, color: '#1A1A1A' },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 8 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff' },
  textarea: { width: '100%', minHeight: 100, padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: '#fff', resize: 'vertical' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  checkboxGroup: { marginBottom: 20, paddingBottom: 20, borderBottom: '1.5px solid #EFEFEF' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
  modalButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
};
