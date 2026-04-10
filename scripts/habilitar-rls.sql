-- ============================================
-- HABILITAR RLS E CRIAR POLICIES SEGURAS
-- ============================================

-- 1. CLINICAS - Super Admin vê tudo
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinicas_select_super_admin" ON clinicas;
CREATE POLICY "clinicas_select_super_admin" ON clinicas
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "clinicas_insert_super_admin" ON clinicas;
CREATE POLICY "clinicas_insert_super_admin" ON clinicas
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "clinicas_update_super_admin" ON clinicas;
CREATE POLICY "clinicas_update_super_admin" ON clinicas
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "clinicas_delete_super_admin" ON clinicas;
CREATE POLICY "clinicas_delete_super_admin" ON clinicas
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- 2. DENTISTAS - Super Admin vê tudo, Dentista vê apenas sua clínica
ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dentistas_select_super_admin" ON dentistas;
CREATE POLICY "dentistas_select_super_admin" ON dentistas
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "dentistas_select_clinica" ON dentistas;
CREATE POLICY "dentistas_select_clinica" ON dentistas
  FOR SELECT USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "dentistas_insert_super_admin" ON dentistas;
CREATE POLICY "dentistas_insert_super_admin" ON dentistas
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "dentistas_update_super_admin" ON dentistas;
CREATE POLICY "dentistas_update_super_admin" ON dentistas
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "dentistas_delete_super_admin" ON dentistas;
CREATE POLICY "dentistas_delete_super_admin" ON dentistas
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- 3. PACIENTES - Super Admin vê tudo, Dentista/Secretária veem apenas da sua clínica
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pacientes_select_super_admin" ON pacientes;
CREATE POLICY "pacientes_select_super_admin" ON pacientes
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "pacientes_select_clinica" ON pacientes;
CREATE POLICY "pacientes_select_clinica" ON pacientes
  FOR SELECT USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "pacientes_insert_super_admin" ON pacientes;
CREATE POLICY "pacientes_insert_super_admin" ON pacientes
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "pacientes_insert_clinica" ON pacientes;
CREATE POLICY "pacientes_insert_clinica" ON pacientes
  FOR INSERT WITH CHECK (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "pacientes_update_super_admin" ON pacientes;
CREATE POLICY "pacientes_update_super_admin" ON pacientes
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "pacientes_update_clinica" ON pacientes;
CREATE POLICY "pacientes_update_clinica" ON pacientes
  FOR UPDATE USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "pacientes_delete_super_admin" ON pacientes;
CREATE POLICY "pacientes_delete_super_admin" ON pacientes
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "pacientes_delete_clinica" ON pacientes;
CREATE POLICY "pacientes_delete_clinica" ON pacientes
  FOR DELETE USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

-- 4. AGENDAMENTOS - Super Admin vê tudo, Dentista/Secretária veem apenas da sua clínica
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agendamentos_select_super_admin" ON agendamentos;
CREATE POLICY "agendamentos_select_super_admin" ON agendamentos
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "agendamentos_select_clinica" ON agendamentos;
CREATE POLICY "agendamentos_select_clinica" ON agendamentos
  FOR SELECT USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "agendamentos_insert_super_admin" ON agendamentos;
CREATE POLICY "agendamentos_insert_super_admin" ON agendamentos
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "agendamentos_insert_clinica" ON agendamentos;
CREATE POLICY "agendamentos_insert_clinica" ON agendamentos
  FOR INSERT WITH CHECK (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "agendamentos_update_super_admin" ON agendamentos;
CREATE POLICY "agendamentos_update_super_admin" ON agendamentos
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "agendamentos_update_clinica" ON agendamentos;
CREATE POLICY "agendamentos_update_clinica" ON agendamentos
  FOR UPDATE USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

DROP POLICY IF EXISTS "agendamentos_delete_super_admin" ON agendamentos;
CREATE POLICY "agendamentos_delete_super_admin" ON agendamentos
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "agendamentos_delete_clinica" ON agendamentos;
CREATE POLICY "agendamentos_delete_clinica" ON agendamentos
  FOR DELETE USING (
    clinica_id::text = auth.jwt() ->> 'clinica_id'
  );

-- 5. USUARIOS - Sem RLS (auth é sensível)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TESTE: Verificar se RLS está ativado
-- ============================================
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clinicas', 'dentistas', 'pacientes', 'agendamentos', 'usuarios');
