import {
  ERROR_CODE_CATEGORY,
  ERROR_CODE_SEVERITY,
  type AppErrorCategory,
  type AppErrorCode,
  type AppErrorSeverity,
} from "./errorCodes";
import { createCorrelationId } from "./correlationId";
import { userMessageForCode } from "./errorMessages";
import { sanitizeErrorContext, type SanitizedContext } from "./sanitizeErrorContext";

export type ErrorContext = {
  operation?: string;
  entityType?: string;
  entityId?: string | null;
  route?: string;
  rpcName?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedError = {
  code: AppErrorCode;
  category: AppErrorCategory;
  severity: AppErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  correlationId: string;
  retryable: boolean;
  operation?: string;
  entityType?: string;
  entityId?: string | null;
  metadata: SanitizedContext;
  timestamp: string;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly category: AppErrorCategory;
  readonly severity: AppErrorSeverity;
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly correlationId: string;
  readonly retryable: boolean;
  readonly operation?: string;
  readonly entityType?: string;
  readonly entityId?: string | null;
  readonly originalError?: unknown;
  readonly metadata: SanitizedContext;
  readonly timestamp: string;

  constructor(opts: {
    code: AppErrorCode;
    userMessage?: string;
    technicalMessage?: string;
    correlationId?: string;
    retryable?: boolean;
    operation?: string;
    entityType?: string;
    entityId?: string | null;
    originalError?: unknown;
    metadata?: Record<string, unknown>;
    category?: AppErrorCategory;
    severity?: AppErrorSeverity;
  }) {
    const userMessage = opts.userMessage ?? userMessageForCode(opts.code);
    super(userMessage);
    this.name = "AppError";
    this.code = opts.code;
    this.category = opts.category ?? ERROR_CODE_CATEGORY[opts.code];
    this.severity = opts.severity ?? ERROR_CODE_SEVERITY[opts.code];
    this.userMessage = userMessage;
    this.technicalMessage = opts.technicalMessage ?? userMessage;
    this.correlationId = opts.correlationId ?? createCorrelationId();
    this.retryable = Boolean(opts.retryable);
    this.operation = opts.operation;
    this.entityType = opts.entityType;
    this.entityId = opts.entityId ?? null;
    this.originalError = opts.originalError;
    this.metadata = sanitizeErrorContext(opts.metadata ?? {});
    this.timestamp = new Date().toISOString();
  }

  toNormalized(): NormalizedError {
    return {
      code: this.code,
      category: this.category,
      severity: this.severity,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      correlationId: this.correlationId,
      retryable: this.retryable,
      operation: this.operation,
      entityType: this.entityType,
      entityId: this.entityId,
      metadata: this.metadata,
      timestamp: this.timestamp,
    };
  }

  /** Payload seguro para UI — sem stack/originalError. */
  toUserPayload(includeDevDetails = import.meta.env.DEV) {
    return {
      code: this.code,
      userMessage: this.userMessage,
      correlationId: this.correlationId,
      retryable: this.retryable,
      ...(includeDevDetails
        ? { technicalMessage: this.technicalMessage, category: this.category }
        : {}),
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
