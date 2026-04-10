import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — check migration status
export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.ADMIN_CREATE_USER_TOKEN}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('sessoes_whatsapp')
    .select('id')
    .limit(1);

  const tabela_existe = !error || !error.message.includes('sessoes_whatsapp');

  const sql_para_rodar = `
-- Cole no SQL Editor do Supabase Dashboard
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
  `.trim();

  return NextResponse.json({
    tabela_sessoes_whatsapp: tabela_existe ? '✅ existe' : '❌ não existe',
    instrucoes: tabela_existe
      ? 'Tabela já existe — nenhuma ação necessária.'
      : 'Execute o SQL abaixo no Supabase Dashboard → SQL Editor',
    url_dashboard: 'https://supabase.com/dashboard/project/ymgmxznnhplmjvkrbxrm/sql/new',
    sql: tabela_existe ? null : sql_para_rodar,
  });
}
