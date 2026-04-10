-- ============================================
-- HABILITAR RLS COM POLÍTICAS CORRETAS
-- ============================================

-- 1. HABILITAR RLS NAS TABELAS
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA TABELA: clinicas
-- ============================================

-- Super Admin: vê tudo
CREATE POLICY "super_admin_all_clinicas" ON clinicas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Outros: veem só sua clínica
CREATE POLICY "users_own_clinica" ON clinicas
  FOR SELECT
  USING (
    id = (
      SELECT clinica_id FROM user_roles
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS PARA TABELA: dentistas
-- ============================================

-- Super Admin: vê tudo
CREATE POLICY "super_admin_all_dentistas" ON dentistas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Outros: veem dentistas da sua clínica
CREATE POLICY "users_own_dentistas" ON dentistas
  FOR SELECT
  USING (
    clinica_id = (
      SELECT clinica_id FROM user_roles
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS PARA TABELA: pacientes
-- ============================================

-- Super Admin: vê tudo
CREATE POLICY "super_admin_all_pacientes" ON pacientes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Outros: veem pacientes da sua clínica
CREATE POLICY "users_own_pacientes" ON pacientes
  FOR SELECT
  USING (
    clinica_id = (
      SELECT clinica_id FROM user_roles
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS PARA TABELA: agendamentos
-- ============================================

-- Super Admin: vê tudo
CREATE POLICY "super_admin_all_agendamentos" ON agendamentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Outros: veem agendamentos da sua clínica
CREATE POLICY "users_own_agendamentos" ON agendamentos
  FOR SELECT
  USING (
    clinica_id = (
      SELECT clinica_id FROM user_roles
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('clinicas', 'dentistas', 'pacientes', 'agendamentos')
ORDER BY tablename;

-- Listar policies
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('clinicas', 'dentistas', 'pacientes', 'agendamentos')
ORDER BY tablename, policyname;
