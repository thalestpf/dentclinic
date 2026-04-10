-- ============================================
-- FIX: Recriar tabela orcamentos com schema correto
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Remover tabela antiga (se existir com schema errado)
DROP TABLE IF EXISTS orcamentos;

-- 2. Criar com schema que o código usa
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_nome VARCHAR,
  procedimentos TEXT,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  desconto_pct DECIMAL(5, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  parcelas INTEGER DEFAULT 1,
  status VARCHAR DEFAULT 'rascunho',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- 3. Desabilitar RLS (acesso público via anon key)
ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;

-- 4. Verificar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orcamentos'
ORDER BY ordinal_position;
