import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== process.env.ADMIN_CREATE_USER_TOKEN) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resultados = [];

  // Criamos uma função SQL temporária para executar DDL
  // Supabase permite criar funções via RPC com service_role
  const steps = [
    {
      nome: 'Habilitar RLS em procedimentos',
      sql: `ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;`,
    },
    {
      nome: 'Remover política permissiva antiga de procedimentos (se existir)',
      sql: `DROP POLICY IF EXISTS "Enable read access for all users" ON public.procedimentos;`,
    },
    {
      nome: 'Criar política autenticados em procedimentos',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'procedimentos' AND policyname = 'apenas_autenticados_procedimentos'
          ) THEN
            CREATE POLICY "apenas_autenticados_procedimentos" ON public.procedimentos
              FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `,
    },
    {
      nome: 'Habilitar RLS em agenda_bloqueios',
      sql: `ALTER TABLE public.agenda_bloqueios ENABLE ROW LEVEL SECURITY;`,
    },
    {
      nome: 'Criar política autenticados em agenda_bloqueios',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'agenda_bloqueios' AND policyname = 'apenas_autenticados_bloqueios'
          ) THEN
            CREATE POLICY "apenas_autenticados_bloqueios" ON public.agenda_bloqueios
              FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `,
    },
  ];

  for (const step of steps) {
    const { error } = await supabaseAdmin.rpc('exec_migration', { sql_query: step.sql }).catch(() => ({ error: 'rpc_not_available' }));
    resultados.push({ step: step.nome, error: error || null });
  }

  return NextResponse.json({ resultados });
}
