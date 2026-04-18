/**
 * Configuração de módulos disponíveis por plano
 * Usado para controlar o acesso de clínicas aos recursos
 */

export const PLANOS_MODULOS = {
  Starter: {
    nome: 'Starter',
    preco: 99,
    modulos: [
      { id: 'dashboard', label: 'Dashboard', habilitado: true },
      { id: 'agenda', label: 'Agenda Digital', habilitado: true },
      { id: 'pacientes', label: 'Gerenciamento de Pacientes', habilitado: true },
      { id: 'prontuario', label: 'Prontuário Eletrônico', habilitado: true },
      { id: 'orcamento', label: 'Orçamentos', habilitado: false },
      { id: 'financeiro', label: 'Financeiro', habilitado: false },
      { id: 'estoque', label: 'Estoque', habilitado: false },
      { id: 'relatorios', label: 'Relatórios', habilitado: false },
      { id: 'crm', label: 'CRM', habilitado: false },
      { id: 'whatsapp', label: 'Central WhatsApp', habilitado: true },
      { id: 'integracao_whatsapp', label: 'WhatsApp Automático', habilitado: true },
    ],
  },
  Profissional: {
    nome: 'Profissional',
    preco: 199,
    modulos: [
      { id: 'dashboard', label: 'Dashboard', habilitado: true },
      { id: 'agenda', label: 'Agenda Digital', habilitado: true },
      { id: 'pacientes', label: 'Gerenciamento de Pacientes', habilitado: true },
      { id: 'prontuario', label: 'Prontuário Eletrônico', habilitado: true },
      { id: 'orcamento', label: 'Orçamentos', habilitado: true },
      { id: 'financeiro', label: 'Financeiro', habilitado: true },
      { id: 'estoque', label: 'Estoque', habilitado: true },
      { id: 'relatorios', label: 'Relatórios', habilitado: true },
      { id: 'crm', label: 'CRM', habilitado: false },
      { id: 'whatsapp', label: 'Central WhatsApp', habilitado: true },
      { id: 'integracao_whatsapp', label: 'WhatsApp Automático', habilitado: true },
    ],
  },
  Enterprise: {
    nome: 'Enterprise',
    preco: 349,
    modulos: [
      { id: 'dashboard', label: 'Dashboard', habilitado: true },
      { id: 'agenda', label: 'Agenda Digital', habilitado: true },
      { id: 'pacientes', label: 'Gerenciamento de Pacientes', habilitado: true },
      { id: 'prontuario', label: 'Prontuário Eletrônico', habilitado: true },
      { id: 'orcamento', label: 'Orçamentos', habilitado: true },
      { id: 'financeiro', label: 'Financeiro', habilitado: true },
      { id: 'estoque', label: 'Estoque', habilitado: true },
      { id: 'relatorios', label: 'Relatórios', habilitado: true },
      { id: 'crm', label: 'CRM', habilitado: true },
      { id: 'whatsapp', label: 'Central WhatsApp', habilitado: true },
      { id: 'integracao_whatsapp', label: 'WhatsApp Automático', habilitado: true },
    ],
  },
};

/**
 * Obter módulos habilitados para um plano
 */
export function getModulosPlano(nomeDoPlano) {
  const plano = PLANOS_MODULOS[nomeDoPlano];
  if (!plano) return [];
  return plano.modulos.filter(m => m.habilitado).map(m => m.id);
}

/**
 * Verificar se módulo está habilitado no plano
 */
export function ehModuloHabilitado(nomeDoPlano, moduloId) {
  const plano = PLANOS_MODULOS[nomeDoPlano];
  if (!plano) return false;
  const modulo = plano.modulos.find(m => m.id === moduloId);
  return modulo ? modulo.habilitado : false;
}
