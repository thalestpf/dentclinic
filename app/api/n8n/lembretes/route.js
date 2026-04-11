import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

// GET /api/n8n/lembretes?dias=2&clinica_id=xxx
// Retorna agendamentos que acontecem daqui a X dias (padrão 2)
export async function GET(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dias = parseInt(searchParams.get('dias') || '2');
  const clinicaId = searchParams.get('clinica_id');

  // Calcular data alvo em horário de Brasília
  const OFFSET_BRASILIA = -3 * 60;
  const agoraUTC = new Date();
  const agoraBR = new Date(agoraUTC.getTime() + OFFSET_BRASILIA * 60 * 1000);
  const dataAlvo = new Date(agoraBR);
  dataAlvo.setUTCDate(dataAlvo.getUTCDate() + dias);
  const dataISO = dataAlvo.toISOString().split('T')[0];

  let query = supabaseAdmin
    .from('agendamentos')
    .select('id, paciente_nome, paciente_fone, paciente_email, data, hora, procedimento, dentista_nome, status, observacoes')
    .eq('data', dataISO)
    .in('status', ['pendente', 'confirmado']);

  if (clinicaId) query = query.eq('clinica_id', clinicaId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtrar apenas os que têm telefone
  const comTelefone = (data || []).filter(a => a.paciente_fone && a.paciente_fone.trim());

  // Formatar data BR
  const [ano, mes, dia] = dataISO.split('-');
  const dataBR = `${dia}/${mes}/${ano}`;
  const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const diaSemana = DIAS_SEMANA[dataAlvo.getUTCDay()];

  return NextResponse.json({
    data: dataISO,
    data_br: dataBR,
    dia_semana: diaSemana,
    total: comTelefone.length,
    agendamentos: comTelefone.map(a => ({
      id: a.id,
      paciente_nome: a.paciente_nome,
      paciente_fone: a.paciente_fone,
      hora: a.hora?.substring(0, 5),
      procedimento: a.procedimento,
      dentista_nome: a.dentista_nome,
      status: a.status,
    })),
  });
}
