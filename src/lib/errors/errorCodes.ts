export type AppErrorCategory =
  | "authentication"
  | "authorization"
  | "validation"
  | "network"
  | "timeout"
  | "database"
  | "rpc"
  | "checkout"
  | "inventory"
  | "commission"
  | "wallet"
  | "withdrawal"
  | "return"
  | "consent"
  | "pwa"
  | "unknown";

export type AppErrorSeverity = "info" | "warning" | "error" | "critical";

export type AppErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_ACCESS_DENIED"
  | "AUTH_EMAIL_TAKEN"
  | "AUTH_SIGNUP_REFERRAL_INVALID"
  | "AUTH_SIGNUP_DB_ERROR"
  | "NETWORK_OFFLINE"
  | "NETWORK_TIMEOUT"
  | "RPC_FAILED"
  | "DATABASE_CONFLICT"
  | "DATABASE_VALIDATION"
  | "DATABASE_CONCURRENCY"
  | "VALIDATION_FAILED"
  | "CHECKOUT_FAILED"
  | "CHECKOUT_TERMS_UPDATED"
  | "INVENTORY_INSUFFICIENT"
  | "ORDER_ALREADY_PROCESSED"
  | "COMMISSION_PROCESSING_FAILED"
  | "WALLET_OPERATION_FAILED"
  | "WITHDRAWAL_FAILED"
  | "RETURN_FAILED"
  | "CONSENT_FAILED"
  | "PWA_UPDATE_FAILED"
  | "UNKNOWN_ERROR";

export const ERROR_CODE_CATEGORY: Record<AppErrorCode, AppErrorCategory> = {
  AUTH_INVALID_CREDENTIALS: "authentication",
  AUTH_SESSION_EXPIRED: "authentication",
  AUTH_ACCESS_DENIED: "authorization",
  AUTH_EMAIL_TAKEN: "validation",
  AUTH_SIGNUP_REFERRAL_INVALID: "validation",
  AUTH_SIGNUP_DB_ERROR: "database",
  NETWORK_OFFLINE: "network",
  NETWORK_TIMEOUT: "timeout",
  RPC_FAILED: "rpc",
  DATABASE_CONFLICT: "database",
  DATABASE_VALIDATION: "database",
  DATABASE_CONCURRENCY: "database",
  VALIDATION_FAILED: "validation",
  CHECKOUT_FAILED: "checkout",
  CHECKOUT_TERMS_UPDATED: "consent",
  INVENTORY_INSUFFICIENT: "inventory",
  ORDER_ALREADY_PROCESSED: "checkout",
  COMMISSION_PROCESSING_FAILED: "commission",
  WALLET_OPERATION_FAILED: "wallet",
  WITHDRAWAL_FAILED: "withdrawal",
  RETURN_FAILED: "return",
  CONSENT_FAILED: "consent",
  PWA_UPDATE_FAILED: "pwa",
  UNKNOWN_ERROR: "unknown",
};

export const ERROR_CODE_SEVERITY: Record<AppErrorCode, AppErrorSeverity> = {
  AUTH_INVALID_CREDENTIALS: "warning",
  AUTH_SESSION_EXPIRED: "warning",
  AUTH_ACCESS_DENIED: "warning",
  AUTH_EMAIL_TAKEN: "warning",
  AUTH_SIGNUP_REFERRAL_INVALID: "warning",
  AUTH_SIGNUP_DB_ERROR: "critical",
  NETWORK_OFFLINE: "warning",
  NETWORK_TIMEOUT: "warning",
  RPC_FAILED: "error",
  DATABASE_CONFLICT: "warning",
  DATABASE_VALIDATION: "warning",
  DATABASE_CONCURRENCY: "warning",
  VALIDATION_FAILED: "warning",
  CHECKOUT_FAILED: "error",
  CHECKOUT_TERMS_UPDATED: "warning",
  INVENTORY_INSUFFICIENT: "warning",
  ORDER_ALREADY_PROCESSED: "info",
  COMMISSION_PROCESSING_FAILED: "critical",
  WALLET_OPERATION_FAILED: "critical",
  WITHDRAWAL_FAILED: "critical",
  RETURN_FAILED: "critical",
  CONSENT_FAILED: "error",
  PWA_UPDATE_FAILED: "warning",
  UNKNOWN_ERROR: "error",
};
