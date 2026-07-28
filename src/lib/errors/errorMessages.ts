import type { AppErrorCode } from "./errorCodes";

export const USER_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: "Email ou senha inválidos.",
  AUTH_SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
  AUTH_ACCESS_DENIED: "Você não tem permissão para esta ação.",
  AUTH_EMAIL_TAKEN: "Este e-mail já está cadastrado.",
  AUTH_SIGNUP_REFERRAL_INVALID: "O código de indicação não é mais válido.",
  AUTH_SIGNUP_DB_ERROR: "Não foi possível concluir o cadastro agora. Tente novamente em instantes.",
  NETWORK_OFFLINE: "Você está offline. Conecte-se à internet para continuar.",
  NETWORK_TIMEOUT: "A operação demorou demais. Tente novamente.",
  RPC_FAILED: "Não foi possível concluir a operação. Tente novamente.",
  DATABASE_CONFLICT: "Esta operação já foi processada ou conflita com outra.",
  DATABASE_VALIDATION: "Os dados informados não atendem às regras do sistema.",
  DATABASE_CONCURRENCY: "Seu saldo ou estoque foi atualizado por outra operação. Recarregue e tente novamente.",
  VALIDATION_FAILED: "Verifique os dados informados e tente novamente.",
  CHECKOUT_FAILED: "Não foi possível concluir o pedido. Tente novamente.",
  CHECKOUT_TERMS_UPDATED: "Os termos foram atualizados. Revise e aceite novamente.",
  INVENTORY_INSUFFICIENT: "Estoque insuficiente para um ou mais itens.",
  ORDER_ALREADY_PROCESSED: "Este pedido já foi processado.",
  COMMISSION_PROCESSING_FAILED: "Não foi possível processar a comissão.",
  WALLET_OPERATION_FAILED: "Não foi possível concluir a operação na carteira.",
  WITHDRAWAL_FAILED: "Não foi possível concluir o saque.",
  RETURN_FAILED: "Não foi possível registrar a devolução.",
  CONSENT_FAILED: "Não foi possível registrar o consentimento.",
  PWA_UPDATE_FAILED: "Não foi possível atualizar o aplicativo. Tente novamente.",
  STORE_TEMPLATE_UNAVAILABLE:
    "Os modelos de loja ainda não estão liberados no banco. Peça ao administrador para aplicar a atualização de banco (coluna template_key).",
  STORE_TEMPLATE_UPDATE_FAILED: "Não foi possível aplicar o modelo. Tente novamente.",
  UNKNOWN_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
};

export function userMessageForCode(code: AppErrorCode): string {
  return USER_ERROR_MESSAGES[code] ?? USER_ERROR_MESSAGES.UNKNOWN_ERROR;
}
