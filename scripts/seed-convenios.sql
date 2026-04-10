-- ============================================
-- SEED: Convênios para tabela convenios
-- Execute no Supabase SQL Editor
-- ============================================

-- Inserir convênios que ainda não existem (sem duplicar)
INSERT INTO convenios (nome, codigo, tipo, ativo)
SELECT nome, codigo, tipo, ativo FROM (VALUES
  ('Particular',     'PART',    'particular', true),
  ('Unimed',         'UNI',     'plano',      true),
  ('Bradesco',       'BRAD',    'plano',      true),
  ('Amil',           'AMIL',    'plano',      true),
  ('Seguros Unimed', 'SEGUNI',  'plano',      true),
  ('SulAmérica',     'SULAM',   'plano',      true),
  ('Porto Seguro',   'PORTO',   'plano',      true)
) AS novos(nome, codigo, tipo, ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM convenios WHERE convenios.nome = novos.nome
);

-- Verificar resultado
SELECT id, nome, codigo, tipo, ativo FROM convenios ORDER BY nome;
