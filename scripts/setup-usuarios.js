#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  try {
    console.log('🔄 Limpando registros antigos...\n');

    // 1. Listar usuários existentes
    console.log('📋 Buscando usuários antigos...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    const emailsAntigos = users.users
      .filter(u => ['thales_tpf@hotmail.com', 'dentista@teste.com'].includes(u.email))
      .map(u => u.id);

    console.log(`Encontrados ${emailsAntigos.length} usuários antigos\n`);

    // 2. Deletar registros de user_roles
    if (emailsAntigos.length > 0) {
      console.log('🗑️  Deletando registros antigos de user_roles...');
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .in('id', emailsAntigos);

      if (deleteError) throw deleteError;
      console.log('✅ Registros deletados\n');

      // 3. Deletar usuários do Auth
      console.log('🗑️  Deletando usuários antigos do Auth...');
      for (const id of emailsAntigos) {
        await supabase.auth.admin.deleteUser(id);
      }
      console.log('✅ Usuários antigos deletados\n');
    }

    // 4. Criar Super Admin
    console.log('1️⃣  Criando Super Admin...');
    const { data: superAdmin, error: errorSuperAdmin } = await supabase.auth.admin.createUser({
      email: 'thales_tpf@hotmail.com',
      password: 'senha123',
      email_confirm: true,
    });

    if (errorSuperAdmin) throw errorSuperAdmin;
    console.log(`✅ Super Admin criado: ${superAdmin.user.id}\n`);

    // Vincular Super Admin ao role (ATUALIZAR, não inserir)
    const { error: errorRoleSuperAdmin } = await supabase
      .from('user_roles')
      .update({
        role: 'super_admin',
        nome: 'Thales (Super Admin)',
        clinica_id: null,
      })
      .eq('id', superAdmin.user.id);

    if (errorRoleSuperAdmin) throw errorRoleSuperAdmin;
    console.log('✅ Super Admin vinculado ao role\n');

    // 5. Criar Dentista
    console.log('2️⃣  Criando Dentista...');
    const { data: dentista, error: errorDentista } = await supabase.auth.admin.createUser({
      email: 'dentista@teste.com',
      password: 'senha123',
      email_confirm: true,
    });

    if (errorDentista) throw errorDentista;
    console.log(`✅ Dentista criado: ${dentista.user.id}\n`);

    // Vincular Dentista ao role e clínica (ATUALIZAR, não inserir)
    const { error: errorRoleDentista } = await supabase
      .from('user_roles')
      .update({
        role: 'dentista',
        nome: 'Dr. Teste Dentista',
        clinica_id: '40b09a3e-5f6e-4d11-948b-bdcc43cff8c1',
      })
      .eq('id', dentista.user.id);

    if (errorRoleDentista) throw errorRoleDentista;
    console.log('✅ Dentista vinculado ao role e clínica\n');

    // 6. Verificar dados
    console.log('📋 Verificando usuários criados...\n');
    const { data: userRoles, error: checkError } = await supabase
      .from('user_roles')
      .select('id, role, nome, clinica_id');

    if (checkError) throw checkError;

    console.log('Usuários no banco:');
    userRoles.forEach(u => {
      console.log(`  - ${u.nome} (${u.role})`);
    });

    console.log('\n🎉 SETUP COMPLETO!\n');
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

setup();
