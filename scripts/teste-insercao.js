#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testeCompleto() {
  try {
    console.log('🔄 Iniciando teste completo...\n');

    // 1. Criar clínica
    console.log('1️⃣  Criando clínica de teste...');
    const timestamp = Date.now().toString().slice(-6);
    const { data: clinicaData, error: clinicaError } = await supabase
      .from('clinicas')
      .insert([{
        nome: `Clínica Teste ${timestamp}`,
        cnpj: `22.${timestamp.slice(0,3)}.${timestamp.slice(3)}/0001-22`,
        cpf: `222.222.222-22`,
        status: 'ativo'
      }])
      .select();

    if (clinicaError) throw clinicaError;
    const clinicaId = clinicaData[0].id;
    console.log(`✅ Clínica criada: ${clinicaId}\n`);

    // 2. Criar paciente
    console.log('2️⃣  Criando paciente de teste...');
    const cpfNum = Math.random().toString().slice(2, 11);
    const { data: pacienteData, error: pacienteError } = await supabase
      .from('pacientes')
      .insert([{
        nome: `Paciente Teste ${timestamp}`,
        cpf: `${cpfNum.slice(0,3)}.${cpfNum.slice(3,6)}.${cpfNum.slice(6,9)}-${cpfNum.slice(9,11)}`,
        telefone: '(11) 99999-9999',
        email: `paciente${timestamp}@teste.com`,
        nascimento: '1990-01-01',
        convenio: 'Particular',
        clinica_id: clinicaId,
        status: 'ativo'
      }])
      .select();

    if (pacienteError) throw pacienteError;
    const pacienteId = pacienteData[0].id;
    console.log(`✅ Paciente criado: ${pacienteId}\n`);

    // 3. Criar dentista
    console.log('3️⃣  Criando dentista de teste...');
    const { data: dentistaData, error: dentistaError } = await supabase
      .from('dentistas')
      .insert([{
        nome: 'Dr. Teste',
        email: 'teste@clinica.com',
        cro: 'SP-99999',
        especialidade: 'Geral',
        clinica_id: clinicaId,
        status: 'ativo'
      }])
      .select();

    if (dentistaError) throw dentistaError;
    const dentistaId = dentistaData[0].id;
    console.log(`✅ Dentista criado: ${dentistaId}\n`);

    // 4. Criar agendamento
    console.log('4️⃣  Criando agendamento de teste...');
    const { data: agendamentoData, error: agendamentoError } = await supabase
      .from('agendamentos')
      .insert([{
        dentista_id: dentistaId,
        paciente_id: pacienteId,
        clinica_id: clinicaId,
        data: '2026-04-10',
        hora: '14:00',
        procedimento: 'Limpeza Profissional',
        status: 'confirmado'
      }])
      .select();

    if (agendamentoError) throw agendamentoError;
    const agendamentoId = agendamentoData[0].id;
    console.log(`✅ Agendamento criado: ${agendamentoId}\n`);

    console.log('🎉 TESTE COMPLETO COM SUCESSO!\n');
    console.log('Dados inseridos:');
    console.log(`  - Clínica: ${clinicaId}`);
    console.log(`  - Paciente: ${pacienteId}`);
    console.log(`  - Dentista: ${dentistaId}`);
    console.log(`  - Agendamento: ${agendamentoId}\n`);
    console.log('Acesse:');
    console.log('  - /super-admin/clinicas');
    console.log('  - /super-admin/dentistas');
    console.log('  - /pacientes');
    console.log('  - /agenda');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testeCompleto();
