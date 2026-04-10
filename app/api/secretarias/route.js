import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Usa service_role para bypassa o RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicaId = searchParams.get('clinica_id');

    let query = supabaseAdmin
      .from('user_roles')
      .select('id, nome, email, role, clinica_id, permissoes, created_at')
      .eq('role', 'secretaria');

    if (clinicaId) {
      query = query.eq('clinica_id', clinicaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
