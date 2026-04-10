import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente para operações do lado do cliente
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para operações do lado do servidor (admin)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Hash simples de senha (usar bcrypt em produção)
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verificar senha
 */
export async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

/**
 * Buscar usuário por email e validar senha
 */
export async function authenticateUser(email, password) {
  try {
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const passwordValid = await verifyPassword(password, data.senha_hash);

    if (!passwordValid) {
      return { success: false, error: 'Senha incorreta' };
    }

    if (!data.ativo) {
      return { success: false, error: 'Usuário inativo' };
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
    console.error('Erro na autenticação:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Criar novo usuário
 */
export async function createUser(email, password, nome, clinica_id, role = 'dentista', especialidade) {
  try {
    const senha_hash = await hashPassword(password);

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          email,
          senha_hash,
          nome,
          clinica_id,
          role,
          especialidade,
          ativo: true,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Obter clínicas
 */
export async function getClinicas() {
  try {
    const { data, error } = await supabaseClient
      .from('clinicas')
      .select('*')
      .eq('status', 'ativo');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar clínicas:', error);
    return [];
  }
}

/**
 * Obter dados da clínica
 */
export async function getClinica(clinica_id) {
  try {
    const { data, error } = await supabaseClient
      .from('clinicas')
      .select('*')
      .eq('id', clinica_id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar clínica:', error);
    return null;
  }
}

/**
 * Obter dentistas da clínica
 */
export async function getDentistasClinica(clinica_id) {
  try {
    const { data, error } = await supabaseClient
      .from('dentistas')
      .select('*')
      .eq('clinica_id', clinica_id)
      .eq('status', 'ativo');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar dentistas:', error);
    return [];
  }
}

/**
 * Obter pacientes da clínica
 */
export async function getPacientesClinica(clinica_id) {
  try {
    const { data, error } = await supabaseClient
      .from('pacientes')
      .select('*')
      .eq('clinica_id', clinica_id)
      .eq('status', 'ativo');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return [];
  }
}
