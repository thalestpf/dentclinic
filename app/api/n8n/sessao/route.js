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
  const telefone = searchParams.get('telefone');
  if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('sessoes_whatsapp')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle();

  return NextResponse.json(data || { telefone, estado: 'idle', dados: {} });
}

export async function POST(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { telefone, estado, dados } = await request.json();
  if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('sessoes_whatsapp')
    .upsert(
      { telefone, estado, dados, atualizado_em: new Date().toISOString() },
      { onConflict: 'telefone' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
