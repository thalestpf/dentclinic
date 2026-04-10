-- ============================================
-- REMOVER POLÍTICAS RLS ANTIGAS E CONFLITANTES
-- ============================================

-- Remover políticas antigas de clinicas
DROP POLICY IF EXISTS "clinicas_select_super_admin" ON clinicas;
DROP POLICY IF EXISTS "clinicas_insert_super_admin" ON clinicas;
DROP POLICY IF EXISTS "clinicas_update_super_admin" ON clinicas;
DROP POLICY IF EXISTS "clinicas_delete_super_admin" ON clinicas;

-- Remover políticas antigas de dentistas
DROP POLICY IF EXISTS "dentistas_select_super_admin" ON dentistas;
DROP POLICY IF EXISTS "dentistas_select_clinica" ON dentistas;
DROP POLICY IF EXISTS "dentistas_insert_super_admin" ON dentistas;
DROP POLICY IF EXISTS "dentistas_update_super_admin" ON dentistas;
DROP POLICY IF EXISTS "dentistas_delete_super_admin" ON dentistas;

-- Remover políticas antigas de pacientes
DROP POLICY IF EXISTS "pacientes_select_super_admin" ON pacientes;
DROP POLICY IF EXISTS "pacientes_select_clinica" ON pacientes;
DROP POLICY IF EXISTS "pacientes_insert_super_admin" ON pacientes;
DROP POLICY IF EXISTS "pacientes_insert_clinica" ON pacientes;
DROP POLICY IF EXISTS "pacientes_update_super_admin" ON pacientes;
DROP POLICY IF EXISTS "pacientes_update_clinica" ON pacientes;
DROP POLICY IF EXISTS "pacientes_delete_super_admin" ON pacientes;
DROP POLICY IF EXISTS "pacientes_delete_clinica" ON pacientes;

-- Remover políticas antigas de agendamentos
DROP POLICY IF EXISTS "agendamentos_select_super_admin" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_select_clinica" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert_super_admin" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert_clinica" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_super_admin" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_clinica" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_delete_super_admin" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_delete_clinica" ON agendamentos;

-- ============================================
-- VERIFICAR POLÍTICAS RESTANTES
-- ============================================

SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('clinicas', 'dentistas', 'pacientes', 'agendamentos')
ORDER BY tablename, policyname;
