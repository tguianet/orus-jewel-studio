import { AppError, type ErrorContext, isAppError } from "./AppError";
import type { AppErrorCode } from "./errorCodes";
import { userMessageForCode } from "./errorMessages";
import { classifySignupError, signupErrorMetadata } from "@/lib/signupErrors";

type LooseErr = {
  message?: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
  name?: string;
  details?: string;
  hint?: string;
  error?: string;
};

const NON_RETRYABLE_OPS = new Set([
  "create_public_order",
  "mark_order_paid",
  "request_withdrawal",
  "mark_withdrawal_paid",
  "cancel_withdrawal",
  "cancel_paid_order",
  "refund_paid_order",
  "register_physical_return",
  "record_authenticated_consent",
  "record_checkout_consents",
  "update_user_password",
  "sign_in",
  "sign_up",
]);

export function normalizeError(error: unknown, context: ErrorContext = {}): AppError {
  if (isAppError(error)) {
    if (context.correlationId && error.correlationId !== context.correlationId) {
      return new AppError({
        ...error.toNormalized(),
        correlationId: context.correlationId,
        operation: context.operation ?? error.operation,
        entityType: context.entityType ?? error.entityType,
        entityId: context.entityId ?? error.entityId,
        originalError: error.originalError ?? error,
        metadata: { ...error.metadata, ...context.metadata },
      });
    }
    return error;
  }

  const raw = asLoose(error);
  const message = extractMessage(error, raw);
  const lower = message.toLowerCase();
  const pgCode = extractPgCode(raw, message);
  const http = Number(raw.status ?? raw.statusCode ?? 0) || undefined;

  let code: AppErrorCode = "UNKNOWN_ERROR";
  let retryable = false;
  let technicalMessage = message.slice(0, 400);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // Cadastro: classificação dedicada (nunca cai em UNKNOWN_ERROR cego)
  if (!offline && context.operation === "sign_up") {
    const info = classifySignupError(error);
    return new AppError({
      code: info.code,
      userMessage: userMessageForCode(info.code),
      technicalMessage: info.technicalMessage,
      correlationId: context.correlationId,
      retryable: false,
      operation: "sign_up",
      entityType: context.entityType,
      entityId: context.entityId,
      originalError: error,
      metadata: {
        ...context.metadata,
        route: context.route,
        ...signupErrorMetadata(info),
      },
    });
  }

  if (offline) {
    code = "NETWORK_OFFLINE";
  } else if (raw.name === "AbortError" || lower.includes("aborted")) {
    code = "NETWORK_TIMEOUT";
    retryable = isReadOperation(context.operation);
  } else if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("fetch failed")) {
    code = "NETWORK_OFFLINE";
    retryable = isReadOperation(context.operation);
  } else if (lower.includes("timeout") || http === 504) {
    code = "NETWORK_TIMEOUT";
    retryable = isReadOperation(context.operation);
  } else if (http === 502 || http === 503) {
    code = "RPC_FAILED";
    retryable = isReadOperation(context.operation);
  } else if (pgCode === "23505") {
    code = "DATABASE_CONFLICT";
  } else if (pgCode === "23514" || pgCode === "23503") {
    code = "DATABASE_VALIDATION";
  } else if (pgCode === "40001" || pgCode === "40P01") {
    code = "DATABASE_CONCURRENCY";
    retryable = isReadOperation(context.operation);
  } else if (String(raw.code) === "PGRST116") {
    code = "VALIDATION_FAILED";
    technicalMessage = "Registro não encontrado (PGRST116)";
  } else if (
    lower.includes("invalid login")
    || lower.includes("invalid credentials")
    || lower.includes("wrong password")
  ) {
    code = "AUTH_INVALID_CREDENTIALS";
  } else if (
    lower.includes("refresh token")
    || lower.includes("session expired")
    || lower.includes("jwt expired")
  ) {
    code = "AUTH_SESSION_EXPIRED";
  } else if (
    lower.includes("permission")
    || lower.includes("acesso negado")
    || lower.includes("not authorized")
    || lower.includes("somente administradores")
    || http === 401
    || http === 403
  ) {
    code = "AUTH_ACCESS_DENIED";
  } else if (
    lower.includes("termos foram atualizados")
    || lower.includes("consentimento")
    || lower.includes("terms")
  ) {
    code = lower.includes("atualiz") ? "CHECKOUT_TERMS_UPDATED" : "CONSENT_FAILED";
  } else if (lower.includes("estoque insuficiente") || lower.includes("insufficient stock")) {
    code = "INVENTORY_INSUFFICIENT";
  } else if (
    lower.includes("checkout_token já utilizado")
    || lower.includes("already processed")
  ) {
    code = "ORDER_ALREADY_PROCESSED";
  } else if (lower.includes("saque") || context.operation?.includes("withdrawal")) {
    code = "WITHDRAWAL_FAILED";
  } else if (lower.includes("devolução") || context.operation?.includes("return")) {
    code = "RETURN_FAILED";
  } else if (lower.includes("carteira") || context.operation?.includes("wallet")) {
    code = "WALLET_OPERATION_FAILED";
  } else if (lower.includes("comiss") || context.operation?.includes("commission")) {
    code = "COMMISSION_PROCESSING_FAILED";
  } else if (context.operation === "create_public_order" || lower.includes("pedido")) {
    code = "CHECKOUT_FAILED";
  } else if (raw.code || lower.includes("rpc") || context.rpcName) {
    code = "RPC_FAILED";
  }

  if (context.operation && NON_RETRYABLE_OPS.has(context.operation)) {
    retryable = false;
  }

  return new AppError({
    code,
    userMessage: userMessageForCode(code),
    technicalMessage,
    correlationId: context.correlationId,
    retryable,
    operation: context.operation,
    entityType: context.entityType,
    entityId: context.entityId,
    originalError: error,
    metadata: {
      ...context.metadata,
      rpc_name: context.rpcName,
      route: context.route,
      http_status: http,
      error_code: pgCode ?? raw.code,
    },
  });
}

function asLoose(error: unknown): LooseErr {
  if (error && typeof error === "object") return error as LooseErr;
  return {};
}

function extractMessage(error: unknown, raw: LooseErr): string {
  if (typeof error === "string") return error;
  if (raw.message) return String(raw.message);
  if (raw.error) return String(raw.error);
  if (raw.details) return String(raw.details);
  try {
    return String(error ?? "unknown");
  } catch {
    return "unknown";
  }
}

function extractPgCode(raw: LooseErr, message: string): string | undefined {
  const code = String(raw.code ?? "");
  if (/^\d{5}$/.test(code) || code === "40P01") return code;
  const m = message.match(/\b(23505|23503|23514|40001|40P01)\b/);
  return m?.[1];
}

function isReadOperation(operation?: string): boolean {
  if (!operation) return false;
  if (NON_RETRYABLE_OPS.has(operation)) return false;
  return /^(load|fetch|list|get|read|query)/i.test(operation);
}
