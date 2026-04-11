import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/bloqueios?clinica_id=xxx — lista bloqueios da clínica
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clinicaId = searchParams.get('clinica_id');

  if (!clinicaId) {
    return NextResponse.json({ error: 'clinica_id obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('agenda_bloqueios')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrupa no formato que a agenda espera: { diasSemana: [], datas: [], horarios: [] }
  const resultado = { diasSemana: [], datas: [], horarios: [] };

  (data || []).forEach(b => {
    if (b.tipo === 'dia_semana') {
      resultado.diasSemana.push(b.dia_semana);
    } else if (b.tipo === 'data') {
      resultado.datas.push(b.data);
    } else if (b.tipo === 'horario') {
      resultado.horarios.push({
        id: b.id,
        data: b.data,
        inicio: b.hora_inicio?.substring(0, 5),
        fim: b.hora_fim?.substring(0, 5),
        motivo: b.motivo || '',
      });
    }
  });

  return NextResponse.json(resultado);
}

// POST /api/bloqueios — cria um bloqueio
// Body: { clinica_id, tipo, dia_semana?, data?, hora_inicio?, hora_fim?, motivo? }
export async function POST(request) {
  const body = await request.json();
  const { clinica_id, tipo, dia_semana, data, hora_inicio, hora_fim, motivo } = body;

  if (!clinica_id || !tipo) {
    return NextResponse.json({ error: 'clinica_id e tipo são obrigatórios' }, { status: 400 });
  }

  // Validações por tipo
  if (tipo === 'dia_semana' && (dia_semana === undefined || dia_semana === null)) {
    return NextResponse.json({ error: 'dia_semana obrigatório para tipo dia_semana' }, { status: 400 });
  }
  if (tipo === 'data' && !data) {
    return NextResponse.json({ error: 'data obrigatória para tipo data' }, { status: 400 });
  }
  if (tipo === 'horario' && (!data || !hora_inicio || !hora_fim)) {
    return NextResponse.json({ error: 'data, hora_inicio e hora_fim obrigatórios para tipo horario' }, { status: 400 });
  }

  // Evitar duplicatas para dia_semana
  if (tipo === 'dia_semana') {
    const { data: existente } = await supabaseAdmin
      .from('agenda_bloqueios')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'dia_semana')
      .eq('dia_semana', dia_semana)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ msg: 'Já bloqueado' });
    }
  }

  // Evitar duplicatas para data
  if (tipo === 'data') {
    const { data: existente } = await supabaseAdmin
      .from('agenda_bloqueios')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'data')
      .eq('data', data)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ msg: 'Já bloqueado' });
    }
  }

  const registro = {
    clinica_id,
    tipo,
    dia_semana: tipo === 'dia_semana' ? dia_semana : null,
    data: (tipo === 'data' || tipo === 'horario') ? data : null,
    hora_inicio: tipo === 'horario' ? hora_inicio : null,
    hora_fim: tipo === 'horario' ? hora_fim : null,
    motivo: motivo || null,
  };

  const { data: novo, error } = await supabaseAdmin
    .from('agenda_bloqueios')
    .insert([registro])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(novo);
}

// DELETE /api/bloqueios — remove um bloqueio
// Body: { clinica_id, tipo, dia_semana?, data?, id? }
export async function DELETE(request) {
  const body = await request.json();
  const { clinica_id, tipo, dia_semana, data, id } = body;

  if (!clinica_id) {
    return NextResponse.json({ error: 'clinica_id obrigatório' }, { status: 400 });
  }

  // Se tem id direto, deleta por id
  if (id) {
    const { error } = await supabaseAdmin
      .from('agenda_bloqueios')
      .delete()
      .eq('id', id)
      .eq('clinica_id', clinica_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Deleta por tipo + campo específico
  if (tipo === 'dia_semana' && dia_semana !== undefined) {
    const { error } = await supabaseAdmin
      .from('agenda_bloqueios')
      .delete()
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'dia_semana')
      .eq('dia_semana', dia_semana);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (tipo === 'data' && data) {
    const { error } = await supabaseAdmin
      .from('agenda_bloqueios')
      .delete()
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'data')
      .eq('data', data);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
}
