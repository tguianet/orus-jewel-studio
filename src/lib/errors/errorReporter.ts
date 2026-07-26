import { AppError } from "./AppError";
import { sanitizeErrorContext } from "./sanitizeErrorContext";
import { supabase } from "@/integrations/supabase/client";
import { sbLoose } from "@/lib/supabaseLoose";
import type { Json } from "@/integrations/supabase/types";

export type ReportableError = {
  correlationId: string;
  code: string;
  category: string;
  severity: string;
  operation?: string;
  route?: string;
  entityType?: string;
  entityId?: string | null;
  technicalSummary: string;
  sanitizedContext: Record<string, unknown>;
};

export type Breadcrumb = {
  message: string;
  category?: string;
  data?: Record<string, unknown>;
  at: string;
};

type UserContext = {
  userId?: string | null;
  role?: string | null;
  resellerId?: string | null;
  storeId?: string | null;
};

type ReporterAdapter = {
  send: (payload: ReportableError) => void | Promise<void>;
};

const breadcrumbs: Breadcrumb[] = [];
let userContext: UserContext = {};
let adapter: ReporterAdapter | null = null;
const recentKeys = new Map<string, number>();
const DEDUPE_MS = 4000;

export function setErrorReporterAdapter(next: ReporterAdapter | null) {
  adapter = next;
}

/** Preparado para Sentry/LogRocket sem acoplar serviço pago. */
export function createConsoleAdapter(): ReporterAdapter {
  return {
    send(payload) {
      if (import.meta.env.DEV) {
        console.info("[app-error]", payload);
      }
    },
  };
}

export function setUserContext(ctx: UserContext) {
  userContext = { ...userContext, ...ctx };
}

export function clearUserContext() {
  userContext = {};
}

export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  breadcrumbs.push({
    message: String(message).slice(0, 120),
    category,
    data: sanitizeErrorContext(data ?? {}),
    at: new Date().toISOString(),
  });
  if (breadcrumbs.length > 30) breadcrumbs.shift();
}

export function toReportable(error: AppError, route?: string): ReportableError {
  return {
    correlationId: error.correlationId,
    code: error.code,
    category: error.category,
    severity: error.severity,
    operation: error.operation,
    route: route ?? (error.metadata.route as string | undefined),
    entityType: error.entityType,
    entityId: error.entityId,
    technicalSummary: String(error.technicalMessage ?? error.code).slice(0, 500),
    sanitizedContext: sanitizeErrorContext({
      ...error.metadata,
      actor_role: userContext.role,
      breadcrumbs: breadcrumbs.slice(-5),
    }),
  };
}

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const prev = recentKeys.get(key);
  recentKeys.set(key, now);
  for (const [k, t] of recentKeys) {
    if (now - t > DEDUPE_MS * 3) recentKeys.delete(k);
  }
  return prev != null && now - prev < DEDUPE_MS;
}

async function persistToCloud(payload: ReportableError) {
  try {
    const { error } = await sbLoose.rpc("report_operational_error", {
      p_correlation_id: payload.correlationId,
      p_error_code: payload.code,
      p_category: payload.category,
      p_severity: payload.severity,
      p_operation: payload.operation ?? null,
      p_route: payload.route ?? null,
      p_entity_type: payload.entityType ?? null,
      p_entity_id: payload.entityId ?? null,
      p_context: payload.sanitizedContext as Json,
    });
    // RPC ausente / rate limit / rede: silencioso. Nunca chama reportError (anti-loop).
    if (error && import.meta.env.DEV) {
      console.info("[app-error] persist skipped:", error.message);
    }
  } catch {
    // telemetria não deve quebrar UX nem gerar loop
  }
}

export async function reportError(error: AppError, route?: string) {
  const payload = toReportable(error, route);
  const key = `${payload.correlationId}:${payload.code}`;
  if (shouldDedupe(key)) return;

  const active = adapter ?? createConsoleAdapter();
  await active.send(payload);

  if (error.severity === "error" || error.severity === "critical") {
    if (!import.meta.env.DEV) void persistToCloud(payload);
  }
}

export async function reportWarning(error: AppError, route?: string) {
  const payload = toReportable(error, route);
  const active = adapter ?? createConsoleAdapter();
  await active.send(payload);
}

export async function reportCritical(error: AppError, route?: string) {
  const critical =
    error.severity === "critical"
      ? error
      : new AppError({
          code: error.code,
          category: error.category,
          severity: "critical",
          userMessage: error.userMessage,
          technicalMessage: error.technicalMessage,
          correlationId: error.correlationId,
          retryable: error.retryable,
          operation: error.operation,
          entityType: error.entityType,
          entityId: error.entityId,
          originalError: error.originalError,
          metadata: error.metadata,
        });
  await reportError(critical, route);
}
