// Script temporário para aplicar políticas RLS no Supabase
// Executa via: node scripts/apply-rls.mjs
import pg from 'pg';
const { Client } = pg;

// Supabase direct connection
// Tenta SSL direto no host do projeto
const client = new Client({
  host: 'db.ymgmxznnhplmjvkrbxrm.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || process.argv[2],
  ssl: { rejectUnauthorized: false },
});

const migrations = [
  {
    nome: 'Habilitar RLS em procedimentos',
    sql: `ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;`,
  },
  {
    nome: 'Remover política anon de procedimentos (se existir)',
    sql: `DROP POLICY IF EXISTS "Enable read access for all users" ON public.procedimentos;`,
  },
  {
    nome: 'Criar política para autenticados em procedimentos',
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'procedimentos'
          AND policyname = 'apenas_autenticados_procedimentos'
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
    nome: 'Criar política para autenticados em agenda_bloqueios',
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'agenda_bloqueios'
          AND policyname = 'apenas_autenticados_bloqueios'
        ) THEN
          CREATE POLICY "apenas_autenticados_bloqueios" ON public.agenda_bloqueios
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `,
  },
];

async function run() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    for (const m of migrations) {
      try {
        await client.query(m.sql);
        console.log(`✅ ${m.nome}`);
      } catch (err) {
        console.log(`❌ ${m.nome}: ${err.message}`);
      }
    }

    console.log('\n✅ Migração concluída!');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    console.error('\nUso: node scripts/apply-rls.mjs [senha-do-banco]');
    console.error('Ou defina a variável: SUPABASE_DB_PASSWORD=senha node scripts/apply-rls.mjs');
  } finally {
    await client.end();
  }
}

run();
