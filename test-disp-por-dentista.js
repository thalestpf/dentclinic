const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    const value = valueParts.join('=').trim();
    if (value) process.env[key.trim()] = value;
  }
});

const N8N_SECRET_KEY = process.env.N8N_SECRET_KEY;
const CLINICA_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testarDisponibilidade(dentistaNome) {
  const params = new URLSearchParams({
    clinica_id: CLINICA_ID,
    dentista_nome: dentistaNome,
    dias: '7'
  });

  const url = `http://localhost:3000/api/n8n/disponibilidade?${params}`;
  
  console.log(`\n🔍 Testando: ${dentistaNome}\n`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${N8N_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ Erro: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    // Mostrar apenas 14/04
    const dia14 = data.find(d => d.data === '2026-04-14');
    if (dia14) {
      console.log(`Terça 14/04: ${dia14.horarios.join(', ')}`);
    } else {
      console.log('Nenhum horário disponível em 14/04');
    }
  } catch (error) {
    console.error(`❌ Erro na requisição: ${error.message}`);
  }
}

(async () => {
  const dentistas = ['Dr. Silva', 'Dr. Teste Dentista', 'Dra. Maria'];
  
  for (const dentista of dentistas) {
    await testarDisponibilidade(dentista);
  }
  
  process.exit(0);
})();
