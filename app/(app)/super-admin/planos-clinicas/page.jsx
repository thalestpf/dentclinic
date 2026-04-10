'use client';

import { useState, useEffect } from 'react';
import { Button, Card, PageHeader, Badge } from '../../../../components/UI';
import { PLANOS_MODULOS } from '../../../../lib/planos-modulos';
import { supabase } from '@/lib/supabase-client';

export default function PlanosClinicasPage() {
  const [clinicas, setClinicas] = useState([]);
  const [clinicasPlanos, setClinicasPlanos] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedClinica, setSelectedClinica] = useState(null);
  const [selectedPlano, setSelectedPlano] = useState('Starter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      // Carregar clínicas do Supabase para garantir IDs UUID corretos
      const { data: clinicasData } = await supabase.from('clinicas').select('*');
      if (clinicasData) setClinicas(clinicasData);
    } catch {
      // Fallback para localStorage
      const savedClinicas = localStorage.getItem('clinicas');
      if (savedClinicas) setClinicas(JSON.parse(savedClinicas));
    } finally {
      setLoading(false);
    }

    const savedClinicasPlanos = localStorage.getItem('clinicas_planos');
    if (savedClinicasPlanos) {
      setClinicasPlanos(JSON.parse(savedClinicasPlanos));
    }
  };

  const getPlanoClinica = (clinicaId) => {
    const cp = clinicasPlanos.find(cp => cp.clinica_id === clinicaId && cp.ativo);
    return cp ? cp.plano_nome : null;
  };

  const handleAtribuirPlano = (clinica) => {
    setSelectedClinica(clinica);
    setSelectedPlano(getPlanoClinica(clinica.id) || 'Starter');
    setModal('atribuir');
  };

  const handleSalvarPlano = () => {
    if (!selectedClinica || !selectedPlano) return;

    // Desativa plano anterior se existir
    const updated = clinicasPlanos
      .map(cp =>
        cp.clinica_id === selectedClinica.id && cp.ativo
          ? { ...cp, ativo: false, data_fim: new Date().toISOString().split('T')[0] }
          : cp
      )
      .filter(cp => !(cp.clinica_id === selectedClinica.id && !cp.ativo && !cp.data_fim));

    // Adiciona novo plano
    const novoPlano = {
      id: Math.random().toString(36).substr(2, 9),
      clinica_id: selectedClinica.id,
      plano_nome: selectedPlano,
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: null,
      ativo: true,
    };

    const final = [...updated, novoPlano];
    setClinicasPlanos(final);
    localStorage.setItem('clinicas_planos', JSON.stringify(final));
    setModal(null);
  };

  return (
    <div style={s.main}>
      <PageHeader
        title="Planos por Clínica"
        subtitle="Atribua planos de assinatura às suas clínicas"
      />

      <div style={s.grid}>
        {clinicas.map(clinica => {
          const plano = getPlanoClinica(clinica.id);
          const planosInfo = PLANOS_MODULOS[plano] || null;

          return (
            <Card key={clinica.id} style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.clinicaNome}>{clinica.nome}</h3>
                {plano && (
                  <Badge color="green">
                    {plano} — R$ {planosInfo?.preco}
                  </Badge>
                )}
              </div>

              <p style={s.cardSub}>
                {plano ? `Plano: ${plano}` : 'Nenhum plano atribuído'}
              </p>

              {plano && (
                <div style={s.modulos}>
                  <p style={s.modulosTitle}>✅ Módulos habilitados:</p>
                  <div style={s.modulosList}>
                    {planosInfo.modulos
                      .filter(m => m.habilitado)
                      .map(m => (
                        <div key={m.id} style={s.moduloItem}>
                          • {m.label}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Button
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => handleAtribuirPlano(clinica)}
              >
                {plano ? '✏️ Mudar plano' : '+ Atribuir plano'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {modal === 'atribuir' && selectedClinica && (
        <div style={s.modalOverlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Atribuir Plano — {selectedClinica.nome}</h2>

            <div style={s.formGroup}>
              <label style={s.label}>Selecione o plano:</label>
              <select
                value={selectedPlano}
                onChange={(e) => setSelectedPlano(e.target.value)}
                style={s.input}
              >
                {Object.keys(PLANOS_MODULOS).map(planoNome => (
                  <option key={planoNome} value={planoNome}>
                    {planoNome} — R$ {PLANOS_MODULOS[planoNome].preco}/mês
                  </option>
                ))}
              </select>
            </div>

            {selectedPlano && (
              <div style={s.preview}>
                <p style={s.previewTitle}>Módulos habilitados:</p>
                <div style={s.modulosList}>
                  {PLANOS_MODULOS[selectedPlano].modulos
                    .filter(m => m.habilitado)
                    .map(m => (
                      <div key={m.id} style={s.moduloItem}>
                        ✅ {m.label}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div style={s.modalButtons}>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarPlano}>Confirmar plano</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 40 },
  card: { padding: 24, display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  clinicaNome: { fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0, fontFamily: "'DM Serif Display', serif" },
  cardSub: { fontSize: 12, color: '#888', margin: 0, marginBottom: 16 },
  modulos: { marginBottom: 16, paddingBottom: 16, borderBottom: '1.5px solid #EFEFEF', flex: 1 },
  modulosTitle: { fontSize: 11, fontWeight: 600, color: '#1A1A1A', margin: '0 0 8px 0', textTransform: 'uppercase' },
  modulosList: { display: 'flex', flexDirection: 'column', gap: 6 },
  moduloItem: { fontSize: 12, color: '#555', lineHeight: 1.4 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 24, color: '#1A1A1A' },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 8 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' },
  preview: { marginBottom: 20, padding: 16, background: '#F5F5F5', borderRadius: 8 },
  previewTitle: { fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: '0 0 8px 0' },
  modalButtons: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
};
