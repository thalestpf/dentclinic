#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ymgmxznnhplmjvkrbxrm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ214em5uaHBsbWp2a3JieHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0MDQ3MSwiZXhwIjoyMDkxMDE2NDcxfQ.dO-Wi13uUdTNGp49PDcA30-r7LCxwbbO36dLgchpqRI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  try {
    console.log('📊 Verificando dados existentes...\n');

    // 1. Buscar clínicas existentes
    const { data: clinicasExistentes, error: clinicasError } = await supabase
      .from('clinicas')
      .select('id, nome');

    if (clinicasError) throw clinicasError;

    console.log(`✅ Clínicas existentes: ${clinicasExistentes.length}`);
    clinicasExistentes.forEach(c => console.log(`   - ${c.nome}`));

    if (clinicasExistentes.length === 0) {
      console.log('❌ Nenhuma clínica encontrada. Execute setup-clinicas-dentistas.js primeiro');
      process.exit(1);
    }

    const clinicaId = clinicasExistentes[0].id;
    console.log(`\n👉 Usando clínica: ${clinicasExistentes[0].nome}\n`);

    // 2. Criar dentistas
    console.log('👨‍⚕️ Criando dentistas de exemplo...\n');

    const dentistas = [
      {
        clinica_id: clinicaId,
        nome: 'Dr. Carlos Mendes',
        email: 'carlos@clinic.com.br',
        cro: '123456',
        especialidade: 'Implantodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicaId,
        nome: 'Dra. Ana Paula',
        email: 'ana@clinic.com.br',
        cro: '234567',
        especialidade: 'Ortodontia',
        status: 'ativo',
      },
      {
        clinica_id: clinicaId,
        nome: 'Dr. Fernando Oliveira',
        email: 'fernando@clinic.com.br',
        cro: '345678',
        especialidade: 'Endodontia',
        status: 'ativo',
      },
    ];

    const { data: dentistasData, error: dentistasError } = await supabase
      .from('dentistas')
      .insert(dentistas)
      .select();

    if (dentistasError) {
      console.log('⚠️  Alguns dentistas podem já existir, continuando...');
    } else {
      console.log(`✅ ${dentistasData.length} dentistas criados\n`);
    }

    // Buscar dentistas para usar nos agendamentos
    const { data: dentistasParaAgendar } = await supabase
      .from('dentistas')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .limit(3);

    // 3. Criar pacientes
    console.log('👥 Criando pacientes de exemplo...\n');

    const pacientes = [
      {
        clinica_id: clinicaId,
        nome: 'João Silva',
        cpf: '111.222.333-44',
        telefone: '(11) 98765-4321',
        email: 'joao@email.com',
        nascimento: '1985-03-15',
        convenio: 'Unimed',
        endereco: 'Rua A, 100',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicaId,
        nome: 'Maria Santos',
        cpf: '222.333.444-55',
        telefone: '(11) 97654-3210',
        email: 'maria@email.com',
        nascimento: '1990-07-22',
        convenio: 'Bradesco',
        endereco: 'Rua B, 200',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
      {
        clinica_id: clinicaId,
        nome: 'Pedro Costa',
        cpf: '333.444.555-66',
        telefone: '(21) 99876-5432',
        email: 'pedro@email.com',
        nascimento: '1988-11-30',
        convenio: 'Amil',
        endereco: 'Rua C, 300',
        status: 'ativo',
        ultimaVisita: new Date().toISOString().split('T')[0],
      },
    ];

    const { data: pacientesData, error: pacientesError } = await supabase
      .from('pacientes')
      .insert(pacientes)
      .select();

    if (pacientesError) {
      console.log('⚠️  Alguns pacientes podem já existir, continuando...');
    } else {
      console.log(`✅ ${pacientesData.length} pacientes criados\n`);
    }

    // Buscar pacientes para usar nos agendamentos
    const { data: pacientesParaAgendar } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .limit(3);

    // 4. Criar agendamentos
    console.log('📅 Criando agendamentos de exemplo...\n');

    const agora = new Date();
    const agendamentos = [
      {
        clinica_id: clinicaId,
        dentista_id: dentistasParaAgendar[0]?.id || null,
        paciente: pacientesParaAgendar[0]?.nome || 'Paciente 1',
        paciente_id: pacientesParaAgendar[0]?.id || null,
        data: new Date(agora.getTime() + 86400000).toISOString().split('T')[0],
        hora: '10:00',
        procedimento: 'Limpeza',
        duracao: '30 min',
        status: 'confirmado',
        observacoes: 'Paciente alérgico a penicilina',
      },
      {
        clinica_id: clinicaId,
        dentista_id: dentistasParaAgendar[1]?.id || null,
        paciente: pacientesParaAgendar[1]?.nome || 'Paciente 2',
        paciente_id: pacientesParaAgendar[1]?.id || null,
        data: new Date(agora.getTime() + 172800000).toISOString().split('T')[0],
        hora: '14:00',
        procedimento: 'Avaliação',
        duracao: '60 min',
        status: 'pendente',
        observacoes: '',
      },
      {
        clinica_id: clinicaId,
        dentista_id: dentistasParaAgendar[2]?.id || null,
        paciente: pacientesParaAgendar[2]?.nome || 'Paciente 3',
        paciente_id: pacientesParaAgendar[2]?.id || null,
        data: new Date(agora.getTime() + 259200000).toISOString().split('T')[0],
        hora: '11:00',
        procedimento: 'Tratamento',
        duracao: '90 min',
        status: 'confirmado',
        observacoes: 'Urgência',
      },
    ];

    const { data: agendamentosData, error: agendamentosError } = await supabase
      .from('agendamentos')
      .insert(agendamentos)
      .select();

    if (agendamentosError) {
      console.log('⚠️  Alguns agendamentos podem já existir, continuando...');
    } else {
      console.log(`✅ ${agendamentosData.length} agendamentos criados\n`);
    }

    console.log('🎉 SETUP DE DADOS DE TESTE COMPLETO!\n');
    console.log('Você pode agora:\n');
    console.log('  1️⃣  Fazer login como Dentista:');
    console.log('     Email: dentista@teste.com');
    console.log('     Senha: senha123\n');
    console.log('  2️⃣  Acessar os módulos:');
    console.log('     - Pacientes (você verá os 3+ pacientes criados)');
    console.log('     - Agenda (você verá os agendamentos)');
    console.log('     - Dashboard (dados das suas clínicas)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

setup();
