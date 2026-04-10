import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

// Gera slots de HH:MM entre inicio e fim com intervalo em minutos, excluindo pausa de almoço
function gerarSlots(inicio, fim, intervalo, almocoInicio, almocoFim) {
  const slots = [];
  const [ihh, imm] = inicio.split(':').map(Number);
  const [fhh, fmm] = fim.split(':').map(Number);
  const inicioMin = ihh * 60 + imm;
  const fimMin = fhh * 60 + fmm;

  let almocoInicioMin = null;
  let almocoFimMin = null;
  if (almocoInicio && almocoFim) {
    const [aihh, aimm] = almocoInicio.split(':').map(Number);
    const [afhh, afmm] = almocoFim.split(':').map(Number);
    almocoInicioMin = aihh * 60 + aimm;
    almocoFimMin = afhh * 60 + afmm;
  }

  for (let min = inicioMin; min < fimMin; min += intervalo) {
    if (almocoInicioMin !== null && min >= almocoInicioMin && min < almocoFimMin) continue;
    const hh = String(Math.floor(min / 60)).padStart(2, '0');
    const mm = String(min % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export async function GET(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dias = parseInt(searchParams.get('dias') || '7');
  const clinicaId = searchParams.get('clinica_id');
  const dentistaNome = searchParams.get('dentista_nome') || null;

  // Buscar configuração de horários da clínica
  let horariosConfig = null;
  if (clinicaId) {
    const { data: clinica } = await supabaseAdmin
      .from('clinicas')
      .select('horarios_funcionamento')
      .eq('id', clinicaId)
      .maybeSingle();
    horariosConfig = clinica?.horarios_funcionamento || null;
  }

  const intervalo = horariosConfig?.intervalo || 30;

  // Usar horário de Brasília (UTC-3) — Vercel roda em UTC
  const OFFSET_BRASILIA = -3 * 60; // minutos
  const agoraUTC = new Date();
  const agoraBR = new Date(agoraUTC.getTime() + OFFSET_BRASILIA * 60 * 1000);

  // "Hoje" no fuso de Brasília
  const hojeStr = agoraBR.toISOString().split('T')[0]; // YYYY-MM-DD em BR
  const hojeDate = new Date(hojeStr + 'T00:00:00');
  const minAtualBR = agoraBR.getUTCHours() * 60 + agoraBR.getUTCMinutes();

  const resultado = [];

  for (let i = 0; i <= dias; i++) {
    const data = new Date(hojeDate);
    data.setUTCDate(hojeDate.getUTCDate() + i);
    const diaSemanaIdx = data.getUTCDay(); // 0=Dom, 6=Sab

    // Obter config do dia
    const diaConfig = horariosConfig?.dias?.[String(diaSemanaIdx)];

    // Se tem config e o dia está desativado, pular
    if (diaConfig && !diaConfig.ativo) continue;
    // Se não tem config e é domingo, pular (comportamento padrão)
    if (!diaConfig && diaSemanaIdx === 0) continue;

    const dataISO = data.toISOString().split('T')[0];
    const dataBR = `${String(data.getUTCDate()).padStart(2,'0')}/${String(data.getUTCMonth()+1).padStart(2,'0')}`;
    const diaSemana = DIAS_SEMANA[diaSemanaIdx];

    // Gerar slots do dia
    const inicio = diaConfig?.inicio || '08:00';
    const fim = diaConfig?.fim || '17:30';
    const almocoInicio = diaConfig?.almoco_inicio || null;
    const almocoFim = diaConfig?.almoco_fim || null;
    let horariosBase = gerarSlots(inicio, fim, intervalo, almocoInicio, almocoFim);

    // Para hoje (horário Brasília), filtrar slots já passados
    if (i === 0) {
      horariosBase = horariosBase.filter(h => {
        const [hh, mm] = h.split(':').map(Number);
        return (hh * 60 + mm) > minAtualBR;
      });
    }

    // Buscar horários já ocupados
    let query = supabaseAdmin
      .from('agendamentos')
      .select('hora')
      .eq('data', dataISO)
      .in('status', ['confirmado', 'pendente']);

    if (clinicaId) query = query.eq('clinica_id', clinicaId);
    if (dentistaNome) query = query.eq('dentista_nome', dentistaNome);

    const { data: ocupados } = await query;
    const horasOcupadas = (ocupados || []).map(a => a.hora.substring(0, 5));
    const disponiveis = horariosBase.filter(h => !horasOcupadas.includes(h));

    if (disponiveis.length > 0) {
      resultado.push({ data: dataISO, data_br: dataBR, dia_semana: diaSemana, horarios: disponiveis });
    }
  }

  return NextResponse.json(resultado);
}
