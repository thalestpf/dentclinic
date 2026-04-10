const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
  try {
    console.log('🔍 Verificando se conseguimos ler clinicas...\n');

    // Tentar ler clinicas com service role (bypass RLS)
    const { data, error } = await supabase
      .from('clinicas')
      .select('*');

    if (error) {
      console.error('❌ Erro ao ler clinicas:', error.message);
      return;
    }

    console.log(`✅ Total de clínicas no banco: ${data.length}`);
    data.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome} (ID: ${c.id})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkRLS();
