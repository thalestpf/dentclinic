#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  try {
    console.log('🏥 Criando clínicas de exemplo...\n');

    // 1. Criar clínicas
    const clinicas = [
      {
        nome: 'Clínica Sorriso Perfeito',
        cnpj: '12.345.678/0001-90',
        cpf: '123.456.789-00',
        responsavel: 'Dr. João Silva',
        email: 'contato@sorriso.com.br',
        telefone: '(11) 3456-7890',
        endereco: 'Rua das Flores, 123',
        cidade: 'São Paulo',
        status: 'ativo',
      },
      {
        nome: 'Clínica Odonto Plus',
        cnpj: '98.765.432/0001-10',
        cpf: '987.654.321-00',
        responsavel: 'Dra. Maria Santos',
        email: 'contato@odontoplus.com.br',
        telefone: '(11) 9876-5432',
        endereco: 'Av. Paulista, 1000',
        cidade: 'São Paulo',
        status: 'ativo',
      },
      {
        nome: 'Clínica DentalCare',
        cnpj: '55.555.555/0001-55',
        cpf: '555.555.555-00',
        responsavel: 'Dr. Pedro Costa',
        email: 'contato@dentalcare.com.br',
        telefone: '(21) 2555-5555',
        endereco: 'Rua do Comércio, 500',
        cidade: 'Rio de Janeiro',
        status: 'ativo',
      },
    ];

    const { data: clinicasData, error: clinicasError } = await supabase
      .from('clinicas')
      .insert(clinicas)
      .select();

    if (clinicasError) throw clinicasError;
    console.log(`✅ ${clinicasData.length} clínicas criadas\n`);

    // 2. Criar dentistas para cada clínica
    const dentistas = [
      {
        clinica_id: clinicasData[0].id,
        nome: 'Dr. Carlos Mendes',
        email: 'carlos@sorriso.com.br',
        cro: '123456',
        especialidade: 'Implantodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicasData[0].id,
        nome: 'Dra. Ana Paula',
        email: 'ana@sorriso.com.br',
        cro: '234567',
        especialidade: 'Ortodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicasData[1].id,
        nome: 'Dr. Fernando Oliveira',
        email: 'fernando@odontoplus.com.br',
        cro: '345678',
        especialidade: 'Endodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicasData[1].id,
        nome: 'Dra. Juliana Castro',
        email: 'juliana@odontoplus.com.br',
        cro: '456789',
        especialidade: 'Periodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicasData[2].id,
        nome: 'Dr. Roberto Lima',
        email: 'roberto@dentalcare.com.br',
        cro: '567890',
        especialidade: 'Geral',
        status: 'ativo',
      },
    ];

    const { data: dentistasData, error: dentistasError } = await supabase
      .from('dentistas')
      .insert(dentistas)
      .select();

    if (dentistasError) throw dentistasError;
    console.log(`✅ ${dentistasData.length} dentistas criados\n`);

    // 3. Criar pacientes de exemplo
    console.log('👥 Criando pacientes de exemplo...\n');

    const pacientes = [
      {
        clinica_id: clinicasData[0].id,
        nome: 'João Silva',
        cpf: '111.222.333-44',
        telefone: '(11) 98765-4321',
        email: 'joao@email.com',
        nascimento: '1985-03-15',
        convenio: 'Unimed',
        endereco: 'Rua A, 100, São Paulo',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicasData[0].id,
        nome: 'Maria Santos',
        cpf: '222.333.444-55',
        telefone: '(11) 97654-3210',
        email: 'maria@email.com',
        nascimento: '1990-07-22',
        convenio: 'Bradesco',
        endereco: 'Rua B, 200, São Paulo',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicasData[1].id,
        nome: 'Pedro Costa',
        cpf: '333.444.555-66',
        telefone: '(21) 99876-5432',
        email: 'pedro@email.com',
        nascimento: '1988-11-30',
        convenio: 'Amil',
        endereco: 'Rua C, 300, Rio de Janeiro',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicasData[1].id,
        nome: 'Ana Costa',
        cpf: '444.555.666-77',
        telefone: '(21) 98765-4321',
        email: 'ana@email.com',
        nascimento: '1992-05-10',
        convenio: 'Particular',
        endereco: 'Rua D, 400, Rio de Janeiro',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicasData[2].id,
        nome: 'Carlos Lima',
        cpf: '555.666.777-88',
        telefone: '(11) 96543-2109',
        email: 'carlos@email.com',
        nascimento: '1987-09-18',
        convenio: 'Seguros Unimed',
        endereco: 'Rua E, 500, São Paulo',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
    ];

    const { data: pacientesData, error: pacientesError } = await supabase
      .from('pacientes')
      .insert(pacientes)
      .select();

    if (pacientesError) throw pacientesError;
    console.log(`✅ ${pacientesData.length} pacientes criados\n`);

    // 4. Criar agendamentos de exemplo
    console.log('📅 Criando agendamentos de exemplo...\n');

    const agora = new Date();
    const agendamentos = [
      {
        clinica_id: clinicasData[0].id,
        dentista_id: dentistasData[0].id,
        paciente: pacientesData[0].nome,
        paciente_id: pacientesData[0].id,
        data: new Date(agora.getTime() + 86400000).toISOString().split('T')[0],
        hora: '10:00',
        procedimento: 'Limpeza',
        duracao: '30 min',
        status: 'confirmado',
        observacoes: 'Paciente alérgico a penicilina',
      },
      {
        clinica_id: clinicasData[0].id,
        dentista_id: dentistasData[1].id,
        paciente: pacientesData[1].nome,
        paciente_id: pacientesData[1].id,
        data: new Date(agora.getTime() + 172800000).toISOString().split('T')[0],
        hora: '14:00',
        procedimento: 'Avaliação Ortodôntica',
        duracao: '60 min',
        status: 'pendente',
        observacoes: '',
      },
      {
        clinica_id: clinicasData[1].id,
        dentista_id: dentistasData[2].id,
        paciente: pacientesData[2].nome,
        paciente_id: pacientesData[2].id,
        data: new Date(agora.getTime() + 259200000).toISOString().split('T')[0],
        hora: '11:00',
        procedimento: 'Tratamento de Canal',
        duracao: '90 min',
        status: 'confirmado',
        observacoes: 'Dente 36',
      },
    ];

    const { data: agendamentosData, error: agendamentosError } = await supabase
      .from('agendamentos')
      .insert(agendamentos)
      .select();

    if (agendamentosError) throw agendamentosError;
    console.log(`✅ ${agendamentosData.length} agendamentos criados\n`);

    console.log('🎉 SETUP DE DADOS DE TESTE COMPLETO!\n');
    console.log('Resumo:');
    console.log(`  📍 Clínicas: ${clinicasData.length}`);
    console.log(`  👨‍⚕️ Dentistas: ${dentistasData.length}`);
    console.log(`  👥 Pacientes: ${pacientesData.length}`);
    console.log(`  📅 Agendamentos: ${agendamentosData.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

setup();
