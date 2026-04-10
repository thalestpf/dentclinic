import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/clinica — lista clínicas (para o frontend escolher a correta)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('clinicas')
    .select('id, nome, horarios_funcionamento, horario_atendimento')
    .order('nome');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// PATCH /api/clinica — atualiza campos da clínica (horários, dados etc)
export async function PATCH(request) {
  const body = await request.json();
  const { clinica_id, ...campos } = body;

  if (!clinica_id) return NextResponse.json({ error: 'clinica_id obrigatório' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('clinicas')
    .update(campos)
    .eq('id', clinica_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
