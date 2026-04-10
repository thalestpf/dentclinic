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
  const telefone  = searchParams.get('telefone');
  const clinicaId = searchParams.get('clinica_id');

  if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });

  let query = supabaseAdmin
    .from('sessoes_whatsapp')
    .select('*')
    .eq('telefone', telefone);

  if (clinicaId) query = query.eq('clinica_id', clinicaId);

  const { data } = await query.maybeSingle();

  return NextResponse.json(data || { telefone, clinica_id: clinicaId, estado: 'idle', dados: {} });
}

export async function POST(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { telefone, clinica_id, estado, dados } = await request.json();
  if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });

  // Verificar se já existe sessão para esse telefone+clinica
  let query = supabaseAdmin
    .from('sessoes_whatsapp')
    .select('id')
    .eq('telefone', telefone);

  if (clinica_id) query = query.eq('clinica_id', clinica_id);

  const { data: existente } = await query.maybeSingle();

  const registro = { telefone, clinica_id: clinica_id || null, estado, dados, atualizado_em: new Date().toISOString() };

  let result;
  if (existente) {
    result = await supabaseAdmin
      .from('sessoes_whatsapp')
      .update(registro)
      .eq('id', existente.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from('sessoes_whatsapp')
      .insert(registro)
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}
