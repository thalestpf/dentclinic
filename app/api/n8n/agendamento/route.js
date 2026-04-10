import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

export async function POST(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { paciente_nome, paciente_fone, data, hora, clinica_id } = body;

    if (!paciente_nome || !data || !hora) {
      return NextResponse.json({ error: 'Campos obrigatórios: paciente_nome, data, hora' }, { status: 400 });
    }

    // Verificar se horário ainda está disponível
    const { data: conflito } = await supabaseAdmin
      .from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('hora', hora.length === 5 ? hora + ':00' : hora)
      .in('status', ['confirmado', 'pendente'])
      .maybeSingle();

    if (conflito) {
      return NextResponse.json({ error: 'Horário indisponível', disponivel: false }, { status: 409 });
    }

    const { data: agendamento, error } = await supabaseAdmin
      .from('agendamentos')
      .insert([{
        paciente_nome,
        paciente_fone: paciente_fone || '',
        data,
        hora: hora.length === 5 ? hora + ':00' : hora,
        procedimento: body.procedimento || 'Consulta',
        dentista_nome: body.dentista_nome || '',
        dentista_id: body.dentista_id || null,
        clinica_id: clinica_id || null,
        status: 'pendente',
        observacoes: 'Agendado via WhatsApp',
        color: 'green',
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, agendamento });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
