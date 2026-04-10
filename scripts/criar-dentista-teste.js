#!/usr/bin/env node

const http = require('http');

// Dados do dentista de teste
const dados = {
  email: 'dentista@teste.com',
  senha: 'senha123',
  nome: 'Dr. Teste Dentista',
  role: 'dentista',
  clinica_id: '40b09a3e-5f6e-4d11-948b-bdcc43cff8c1', // ID da última clínica de teste criada
  adminToken: 'DentClinic_2024_SuperSecret_Thales_Hash_Key_9a8b7c6d'
};

// Fazer requisição para criar usuário
const options = {
  hostname: 'localhost',
  port: 3010,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': dados.adminToken
  }
};

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n' + '='.repeat(60));
    if (res.statusCode === 200) {
      console.log('✅ DENTISTA CRIADO COM SUCESSO!\n');
      const parsed = JSON.parse(responseData);
      console.log('Dados:');
      console.log(`  Email: ${dados.email}`);
      console.log(`  Senha: ${dados.senha}`);
      console.log(`  Nome: ${dados.nome}`);
      console.log(`  Papel: ${dados.role}`);
      console.log('\n🔑 Agora você pode fazer login com:\n');
      console.log(`  Email: ${dados.email}`);
      console.log(`  Senha: ${dados.senha}`);
    } else {
      console.log('❌ ERRO AO CRIAR DENTISTA\n');
      console.log('Resposta:', responseData);
    }
    console.log('='.repeat(60) + '\n');
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
  console.log('\n⚠️  Certifique-se que o servidor Next.js está rodando em http://localhost:3000');
  process.exit(1);
});

const bodyData = JSON.stringify({
  email: dados.email,
  senha: dados.senha,
  nome: dados.nome,
  role: dados.role,
  clinica_id: dados.clinica_id
});

console.log('🔄 Criando dentista de teste...\n');
req.write(bodyData);
req.end();
