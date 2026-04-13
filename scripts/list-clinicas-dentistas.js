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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listarClinicas() {
  try {
    console.log('🏥 Carregando todas as clínicas...\n');

    // Buscar todas as clínicas
    const { data: clinicas, error: clinicasError } = await supabase
      .from('clinicas')
      .select('id, nome, cnpj, responsavel, email, telefone, cidade, status')
      .order('nome');

    if (clinicasError) throw clinicasError;

    if (!clinicas || clinicas.length === 0) {
      console.log('❌ Nenhuma clínica encontrada');
      process.exit(1);
    }

    console.log(`📍 TOTAL DE CLÍNICAS: ${clinicas.length}\n`);
    console.log('=' .repeat(100) + '\n');

    for (const clinica of clinicas) {
      // Buscar dentistas dessa clínica
      const { data: dentistas, error: dentistasError } = await supabase
        .from('dentistas')
        .select('id, nome, email, cro, especialidade, status')
        .eq('clinica_id', clinica.id)
        .order('nome');

      if (dentistasError) throw dentistasError;

      console.log(`🏥 ${clinica.nome}`);
      console.log(`   Status: ${clinica.status === 'ativo' ? '✅ Ativo' : '❌ Inativo'}`);
      console.log(`   CNPJ: ${clinica.cnpj}`);
      console.log(`   Responsável: ${clinica.responsavel || 'N/A'}`);
      console.log(`   Email: ${clinica.email || 'N/A'}`);
      console.log(`   Telefone: ${clinica.telefone || 'N/A'}`);
      console.log(`   Cidade: ${clinica.cidade || 'N/A'}`);
      console.log(`   ID: ${clinica.id}`);
      console.log(`\n   👨‍⚕️ DENTISTAS (${dentistas?.length || 0}):`);

      if (!dentistas || dentistas.length === 0) {
        console.log(`      ❌ Nenhum dentista cadastrado`);
      } else {
        dentistas.forEach((d, idx) => {
          console.log(`      ${idx + 1}. ${d.nome}`);
          console.log(`         Email: ${d.email}`);
          console.log(`         CRO: ${d.cro}`);
          console.log(`         Especialidade: ${d.especialidade || 'N/A'}`);
          console.log(`         Status: ${d.status === 'ativo' ? '✅ Ativo' : '❌ Inativo'}`);
          console.log(`         ID: ${d.id}\n`);
        });
      }

      console.log('=' .repeat(100) + '\n');
    }

    // Resumo geral
    let totalDentistas = 0;
    for (const clinica of clinicas) {
      const { data: dentistas } = await supabase
        .from('dentistas')
        .select('id')
        .eq('clinica_id', clinica.id);
      totalDentistas += dentistas?.length || 0;
    }

    console.log('📊 RESUMO GERAL:');
    console.log(`   Total de Clínicas: ${clinicas.length}`);
    console.log(`   Total de Dentistas: ${totalDentistas}`);
    console.log('\n✅ LISTAGEM COMPLETA!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

listarClinicas();
