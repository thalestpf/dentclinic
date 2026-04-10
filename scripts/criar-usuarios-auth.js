#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarUsuarios() {
  try {
    console.log('🔄 Criando usuários de teste...\n');

    // 1. Criar Super Admin
    console.log('1️⃣  Criando Super Admin...');
    const { data: superAdmin, error: errorSuperAdmin } = await supabase.auth.admin.createUser({
      email: 'thales_tpf@hotmail.com',
      password: 'senha123',
      email_confirm: true, // Confirmar email automaticamente
    });

    if (errorSuperAdmin) throw errorSuperAdmin;
    console.log(`✅ Super Admin criado: ${superAdmin.user.id}\n`);

    // Vincular Super Admin ao role
    const { error: errorRoleSuperAdmin } = await supabase
      .from('user_roles')
      .insert([{
        id: superAdmin.user.id,
        role: 'super_admin',
        nome: 'Thales (Super Admin)',
        clinica_id: null,
      }]);

    if (errorRoleSuperAdmin) throw errorRoleSuperAdmin;
    console.log('✅ Super Admin vinculado ao role\n');

    // 2. Criar Dentista
    console.log('2️⃣  Criando Dentista...');
    const { data: dentista, error: errorDentista } = await supabase.auth.admin.createUser({
      email: 'dentista@teste.com',
      password: 'senha123',
      email_confirm: true,
    });

    if (errorDentista) throw errorDentista;
    console.log(`✅ Dentista criado: ${dentista.user.id}\n`);

    // Vincular Dentista ao role e clínica
    const { error: errorRoleDentista } = await supabase
      .from('user_roles')
      .insert([{
        id: dentista.user.id,
        role: 'dentista',
        nome: 'Dr. Teste Dentista',
        clinica_id: '40b09a3e-5f6e-4d11-948b-bdcc43cff8c1', // Use a clínica criada antes
      }]);

    if (errorRoleDentista) throw errorRoleDentista;
    console.log('✅ Dentista vinculado ao role e clínica\n');

    console.log('🎉 USUÁRIOS CRIADOS COM SUCESSO!\n');
    console.log('Agora você pode fazer login com:\n');
    console.log('Super Admin:');
    console.log('  Email: thales_tpf@hotmail.com');
    console.log('  Senha: senha123\n');
    console.log('Dentista:');
    console.log('  Email: dentista@teste.com');
    console.log('  Senha: senha123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarUsuarios();
