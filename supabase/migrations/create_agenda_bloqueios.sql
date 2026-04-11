-- Tabela: agenda_bloqueios
-- Armazena bloqueios de agenda: dias da semana fixos, datas específicas e faixas de horário
-- Substitui o localStorage ('agenda_bloqueios') para que a API n8n/disponibilidade também consiga ler

CREATE TABLE IF NOT EXISTS agenda_bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,

  -- Tipo do bloqueio: 'dia_semana' | 'data' | 'horario'
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('dia_semana', 'data', 'horario')),

  -- Para tipo 'dia_semana': 0=Dom, 1=Seg ... 6=Sab
  dia_semana SMALLINT CHECK (dia_semana >= 0 AND dia_semana <= 6),

  -- Para tipo 'data': data específica bloqueada
  data DATE,

  -- Para tipo 'horario': data + faixa de horário bloqueada
  hora_inicio TIME,
  hora_fim TIME,

  -- Motivo opcional (usado em bloqueios de horário)
  motivo VARCHAR(255),

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_bloqueios_clinica ON agenda_bloqueios(clinica_id);
CREATE INDEX idx_bloqueios_tipo ON agenda_bloqueios(clinica_id, tipo);
CREATE INDEX idx_bloqueios_data ON agenda_bloqueios(clinica_id, data) WHERE data IS NOT NULL;

-- RLS (Row Level Security) — permitir leitura pública, escrita via service_role
ALTER TABLE agenda_bloqueios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de bloqueios"
  ON agenda_bloqueios FOR SELECT
  USING (true);

CREATE POLICY "Inserção via service_role"
  ON agenda_bloqueios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Deleção via service_role"
  ON agenda_bloqueios FOR DELETE
  USING (true);
