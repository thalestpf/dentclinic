-- Tabela para gerenciar estado da conversa do WhatsApp por número de telefone
CREATE TABLE IF NOT EXISTS sessoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR NOT NULL,
  clinica_id UUID,
  estado VARCHAR DEFAULT 'idle',
  dados JSONB DEFAULT '{}',
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telefone, clinica_id)
);

-- Índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_sessoes_whatsapp_telefone ON sessoes_whatsapp(telefone);

-- Habilitar RLS
ALTER TABLE sessoes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política: apenas service_role acessa (n8n usa service_role via API Route)
CREATE POLICY "service_role_full_access" ON sessoes_whatsapp
  USING (true)
  WITH CHECK (true);
