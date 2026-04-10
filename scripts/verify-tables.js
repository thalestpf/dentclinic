const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('📋 Verificando tabelas...\n');

  const tables = ['clinicas', 'dentistas', 'pacientes', 'agendamentos', 'user_roles'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: Acessível`);
    }
  }

  console.log('\n📊 Tentando ler clinicas novamente...\n');
  const { data: clinicas, error } = await supabase
    .from('clinicas')
    .select('*');

  if (error) {
    console.log(`❌ Erro ao ler clinicas: ${error.message}`);
  } else {
    console.log(`✅ Total de clinicas: ${clinicas.length}`);
  }
}

verify();
