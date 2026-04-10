-- ============================================
-- MIGRATIONS DO DENTCLINIC - SUPABASE
-- ============================================

-- 1. CRIAR TABELA: CLINICAS
CREATE TABLE IF NOT EXISTS clinicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR NOT NULL,
  cnpj VARCHAR UNIQUE NOT NULL,
  cpf VARCHAR NOT NULL,
  responsavel VARCHAR,
  email VARCHAR,
  telefone VARCHAR,
  endereco VARCHAR,
  cidade VARCHAR,
  status VARCHAR DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 2. CRIAR TABELA: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  email VARCHAR UNIQUE NOT NULL,
  senha_hash VARCHAR NOT NULL,
  nome VARCHAR NOT NULL,
  especialidade VARCHAR,
  role VARCHAR DEFAULT 'dentista', -- 'super_admin', 'dentista', 'secretaria'
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR TABELA: DENTISTAS
CREATE TABLE IF NOT EXISTS dentistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nome VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  cro VARCHAR NOT NULL,
  especialidade VARCHAR,
  status VARCHAR DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 4. CRIAR TABELA: PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  cpf VARCHAR UNIQUE NOT NULL,
  telefone VARCHAR,
  email VARCHAR,
  nascimento DATE,
  convenio VARCHAR,
  endereco VARCHAR,
  observacoes TEXT,
  status VARCHAR DEFAULT 'ativo',
  ultima_visita DATE,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 5. CRIAR TABELA: AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  dentista_id UUID NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  procedimento VARCHAR,
  duracao VARCHAR,
  status VARCHAR DEFAULT 'pendente',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 6. CRIAR TABELA: PROCEDIMENTOS (PRECOS)
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  categoria VARCHAR,
  duracao VARCHAR,
  preco DECIMAL(10, 2),
  status VARCHAR DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 7. CRIAR TABELA: ORCAMENTOS
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  dentista_id UUID NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  subtotal DECIMAL(10, 2),
  desconto_percentual DECIMAL(5, 2) DEFAULT 0,
  total DECIMAL(10, 2),
  num_parcelas INTEGER DEFAULT 1,
  valor_parcela DECIMAL(10, 2),
  status VARCHAR DEFAULT 'rascunho',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 8. CRIAR TABELA: AGENDAMENTOS_WHATSAPP
CREATE TABLE IF NOT EXISTS agendamentos_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  numero_telefone VARCHAR NOT NULL,
  cliente_nome VARCHAR NOT NULL,
  dentista_id UUID REFERENCES dentistas(id),
  data DATE,
  hora TIME,
  status VARCHAR DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 9. CRIAR TABELA: INTEGRACAO_WHATSAPP
CREATE TABLE IF NOT EXISTS integracao_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL UNIQUE REFERENCES clinicas(id) ON DELETE CASCADE,
  numero_whatsapp VARCHAR,
  nome_exibicao VARCHAR,
  token_api VARCHAR,
  ativo BOOLEAN DEFAULT true,
  webhook_url_n8n VARCHAR,
  token_n8n VARCHAR,
  templates_boas_vindas TEXT,
  templates_confirmacao TEXT,
  templates_lembrete TEXT,
  templates_disponibilidade TEXT,
  automacao_lembrete_24h BOOLEAN DEFAULT true,
  automacao_criar_agendamento BOOLEAN DEFAULT true,
  automacao_sms BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_usuarios_clinica_id ON usuarios(clinica_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_dentistas_clinica_id ON dentistas(clinica_id);
CREATE INDEX idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX idx_agendamentos_clinica_id ON agendamentos(clinica_id);
CREATE INDEX idx_agendamentos_dentista_id ON agendamentos(dentista_id);
CREATE INDEX idx_orcamentos_clinica_id ON orcamentos(clinica_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Segurança por linha
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

-- Política: Super Admin vê tudo
-- Política: Dentista/Secretária vê só sua clínica
-- (Será configurado após implementar autenticação)

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

-- Inserir clínicas (UUIDS fixos para referência)
INSERT INTO clinicas (id, nome, cnpj, cpf, responsavel, email, telefone, endereco, cidade, status)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Clínica Dental Senior', '12.345.678/0001-90', '123.456.789-00', 'Dr. Silva', 'contato@senior.com', '(11) 3000-0000', 'Rua A, 123', 'São Paulo', 'ativo'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'Sorriso Perfeito', '98.765.432/0001-10', '987.654.321-00', 'Dra. Maria', 'contato@sorriso.com', '(11) 3111-1111', 'Rua B, 456', 'São Paulo', 'ativo')
ON CONFLICT DO NOTHING;

-- Inserir usuários (SUPER ADMIN)
-- Senha: Senha123! (hash deve ser feito pelo sistema, aqui é só exemplo)
INSERT INTO usuarios (clinica_id, email, senha_hash, nome, role, ativo)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'super@dentclinic.com', '$2b$10$YourHashedPasswordHere', 'Super Admin DentClinic', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Inserir dentistas (SENIOR)
INSERT INTO dentistas (clinica_id, nome, email, cro, especialidade, status)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Dr. Silva', 'silva@senior.com', '123456', 'Geral', 'ativo'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Dra. Maria', 'maria@senior.com', '654321', 'Ortodontia', 'ativo')
ON CONFLICT DO NOTHING;

-- Inserir dentistas (SORRISO PERFEITO)
INSERT INTO dentistas (clinica_id, nome, email, cro, especialidade, status)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'Dr. João', 'joao@sorriso.com', '789456', 'Implantodontia', 'ativo')
ON CONFLICT DO NOTHING;

-- Inserir usuários para os dentistas
INSERT INTO usuarios (clinica_id, email, senha_hash, nome, especialidade, role, ativo)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'silva@senior.com', '$2b$10$YourHashedPasswordHere', 'Dr. Silva', 'Geral', 'dentista', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'maria@senior.com', '$2b$10$YourHashedPasswordHere', 'Dra. Maria', 'Ortodontia', 'dentista', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'joao@sorriso.com', '$2b$10$YourHashedPasswordHere', 'Dr. João', 'Implantodontia', 'dentista', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- TABELA: sessoes_whatsapp (chatbot n8n)
-- ============================================
CREATE TABLE IF NOT EXISTS sessoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR NOT NULL UNIQUE,
  estado VARCHAR DEFAULT 'idle',
  dados JSONB DEFAULT '{}',
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_whatsapp_telefone ON sessoes_whatsapp(telefone);

ALTER TABLE sessoes_whatsapp ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessoes_whatsapp' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON sessoes_whatsapp USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Inserir procedimentos (SENIOR)
INSERT INTO procedimentos (clinica_id, nome, categoria, duracao, preco, status)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Limpeza', 'Preventiva', '30min', '150.00', 'ativo'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Restauração', 'Restauração', '45min', '300.00', 'ativo'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'Canal', 'Endodontia', '90min', '800.00', 'ativo')
ON CONFLICT DO NOTHING;
