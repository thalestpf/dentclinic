import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

export async function GET(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clinicaId = searchParams.get('clinica_id');

  let query = supabaseAdmin
    .from('clinicas')
    .select('id, nome, telefone, email, endereco, cidade, horario_atendimento, especialidades, descricao')
    .eq('status', 'ativo');

  if (clinicaId) query = query.eq('id', clinicaId);

  const { data, error } = await query.maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || {});
}
