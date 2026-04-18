/**
 * Resolve o nome de um usuário pelo email, consultando a tabela dentistas como fallback.
 * Útil quando user_roles.nome está vazio ou contém o email como nome.
 */
export async function resolverNome(email, supabase) {
  if (!email) return email;
  const nomeEhEmail = (nome) => nome && nome.includes('@');

  const { data } = await supabase
    .from('dentistas')
    .select('nome')
    .eq('email', email)
    .maybeSingle();

  return data?.nome || email;
}

export function nomePareceCEmail(nome) {
  return Boolean(nome && nome.includes('@'));
}
