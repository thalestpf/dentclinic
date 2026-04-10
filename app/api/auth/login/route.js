import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPassword(password, hash) {
  try {
    // Tenta bcrypt primeiro (novo padrão)
    if (hash.startsWith('$2b$')) {
      return await bcrypt.compare(password, hash);
    }
    // Fallback para SHA-256 (legado) - para compatibilidade com senhas antigas
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return sha256Hash === hash;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

async function authenticateUser(email, password) {
  try {
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { success: false, error: 'Email ou senha inválidos' };
    }

    const passwordValid = await verifyPassword(password, data.senha_hash);
    if (!passwordValid) {
      return { success: false, error: 'Email ou senha inválidos' };
    }

    if (!data.ativo) {
      return { success: false, error: 'Email ou senha inválidos' };
    }

    return {
      success: true,
      user: {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        clinica_id: data.clinica_id,
        especialidade: data.especialidade,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
