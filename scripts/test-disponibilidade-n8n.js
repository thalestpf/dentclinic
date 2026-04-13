#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value) process.env[key.trim()] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const n8nSecretKey = process.env.N8N_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

if (!n8nSecretKey) {
  console.error('❌ ERRO: Configure N8N_SECRET_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDisponibilidade() {
  try {
    console.log('🔍 Buscando "Dental Senior" no Supabase...\n');

    // 1. Buscar clínica "Dental Senior"
    const { data: clinicasData, error: clinicasError } = await supabase
      .from('clinicas')
      .select('id, nome')
      .ilike('nome', '%Dental Senior%')
      .limit(1);

    if (clinicasError) throw clinicasError;
    if (!clinicasData || clinicasData.length === 0) {
      console.log('❌ Clínica "Dental Senior" não encontrada no Supabase');
      console.log('\n📍 Clínicas disponíveis:');
      const { data: todasClinicas } = await supabase
        .from('clinicas')
        .select('id, nome');
      todasClinicas.forEach(c => console.log(`   - ${c.nome} (${c.id})`));
      process.exit(1);
    }

    const clinica = clinicasData[0];
    console.log(`✅ Clínica encontrada: ${clinica.nome} (ID: ${clinica.id})\n`);

    // 2. Buscar dentista "Dr. Silva" dessa clínica
    console.log('🔍 Buscando "Dr. Silva" nessa clínica...\n');

    const { data: dentistasData, error: dentistasError } = await supabase
      .from('dentistas')
      .select('id, nome, email, cro, especialidade, status')
      .eq('clinica_id', clinica.id)
      .ilike('nome', '%Silva%')
      .limit(1);

    if (dentistasError) throw dentistasError;
    if (!dentistasData || dentistasData.length === 0) {
      console.log('❌ Dentista "Dr. Silva" não encontrado nessa clínica');
      console.log('\n👨‍⚕️ Dentistas disponíveis:');
      const { data: todosDentistas } = await supabase
        .from('dentistas')
        .select('id, nome, email, especialidade')
        .eq('clinica_id', clinica.id);
      todosDentistas.forEach(d => console.log(`   - ${d.nome} (${d.email})`));
      process.exit(1);
    }

    const dentista = dentistasData[0];
    console.log(`✅ Dentista encontrado:`);
    console.log(`   Nome: ${dentista.nome}`);
    console.log(`   Email: ${dentista.email}`);
    console.log(`   CRO: ${dentista.cro}`);
    console.log(`   Especialidade: ${dentista.especialidade}`);
    console.log(`   Status: ${dentista.status}\n`);

    // 3. Chamar endpoint /api/n8n/disponibilidade
    console.log('🌐 Consultando disponibilidade via API n8n...\n');

    const params = new URLSearchParams({
      clinica_id: clinica.id,
      dentista_nome: dentista.nome,
      dias: '7',
    });

    const response = await fetch(`${appUrl}/api/n8n/disponibilidade?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${n8nSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Erro na API (${response.status}): ${error}`);
      process.exit(1);
    }

    const disponibilidade = await response.json();

    // 4. Exibir resultado
    console.log('📅 DISPONIBILIDADE DO DR. SILVA');
    console.log(`Clínica: ${clinica.nome}`);
    console.log(`Dentista: ${dentista.nome}`);
    console.log(`Período: 7 dias\n`);

    if (disponibilidade.length === 0) {
      console.log('⚠️  Nenhum horário disponível nos próximos 7 dias');
    } else {
      disponibilidade.forEach(dia => {
        console.log(`\n📆 ${dia.dia_semana} - ${dia.data_br}`);
        console.log(`   Horários: ${dia.horarios.join(', ')}`);
      });
    }

    console.log('\n✅ TESTE COMPLETO!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

testDisponibilidade();
