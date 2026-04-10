-- ============================================
-- CONFIGURAR SUPABASE AUTH COM ROLE E CLINICA_ID
-- ============================================

-- 1. Criar extensão para JWT customizado
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- 2. Criar tabela de metadata de usuários
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'dentista', -- 'super_admin', 'dentista', 'secretaria'
  clinica_id UUID REFERENCES clinicas(id) ON DELETE SET NULL,
  nome VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Habilitar RLS na tabela de roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT USING (
    auth.uid() = id OR auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS "user_roles_update_super_admin" ON user_roles;
CREATE POLICY "user_roles_update_super_admin" ON user_roles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- 4. Criar função que retorna role e clinica_id no JWT
CREATE OR REPLACE FUNCTION public.custom_jwt_claims()
RETURNS json AS $$
  SELECT json_build_object(
    'role', COALESCE((SELECT role FROM public.user_roles WHERE id = auth.uid()), 'dentista'),
    'clinica_id', COALESCE((SELECT clinica_id::text FROM public.user_roles WHERE id = auth.uid()), '')
  );
$$ LANGUAGE sql STABLE;

-- 5. Atualizar as RLS policies para usar a função
-- (As policies já criadas vão funcionar porque consultam auth.jwt())

-- 6. Criar função para inserir metadata ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (id, role, nome)
  VALUES (NEW.id, 'dentista', NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para executar função ao criar novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Teste: Consultar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_roles', 'clinicas', 'dentistas', 'pacientes', 'agendamentos');
