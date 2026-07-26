// Expira reservas de checkout abandonadas.
// Executada pelo Job nativo (Cloud -> Jobs) a cada 5 minutos.
// Nunca deve ser chamada pelo frontend: sem CORS, exige segredo interno.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JOB_SECRET = Deno.env.get("EXPIRE_JOB_SECRET") ?? "";

const BATCH_LIMIT = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Sem CORS: navegadores comuns não conseguem consumir a resposta.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

/** Comparação em tempo constante para não vazar o segredo por timing. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const headerSecret = (req.headers.get("x-job-secret") ?? "").trim();

  // A) chamada interna do mecanismo de Jobs (service role key do próprio projeto)
  if (SERVICE_ROLE_KEY && safeEqual(bearer, SERVICE_ROLE_KEY)) return true;
  // B/C) segredo interno guardado em Cloud -> Secrets
  if (JOB_SECRET && (safeEqual(headerSecret, JOB_SECRET) || safeEqual(bearer, JOB_SECRET))) return true;
  return false;
}

/** Registro de erro que jamais derruba nem faz loop no handler. */
async function safeReport(
  admin: ReturnType<typeof createClient>,
  correlationId: string,
  message: string,
  context: Record<string, unknown>,
) {
  try {
    await admin.rpc("report_operational_error", {
      p_correlation_id: correlationId,
      p_code: "EXPIRE_JOB_FAILED",
      p_area: "jobs",
      p_severity: "error",
      p_message: message.slice(0, 500),
      p_context: context as never,
    } as never);
  } catch (_e) {
    // anti-loop: persist skipped, apenas log local sem segredos
    console.error("[expire-abandoned-orders] persist skipped", correlationId);
  }
}

Deno.serve(async (req) => {
  // Preflight de navegador é recusado de propósito.
  if (req.method === "OPTIONS") return new Response("Not allowed", { status: 405 });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }
  if (!isAuthorized(req)) {
    return json({ success: false, error: "unauthorized" }, 401);
  }

  const correlationId = crypto.randomUUID();
  const executedAt = new Date().toISOString();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await admin.rpc("expire_abandoned_orders", { _limit: BATCH_LIMIT });
    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    const expiredCount = Number(row?.expired_count ?? 0);
    const unitsRestored = Number(row?.units_restored ?? 0);
    const orders: string[] = row?.order_ids ?? [];

    console.log(
      `[expire-abandoned-orders] ${correlationId} expired=${expiredCount} units=${unitsRestored}`,
    );

    return json({
      success: true,
      expired_count: expiredCount,
      units_restored: unitsRestored,
      orders,
      executed_at: executedAt,
      correlation_id: correlationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error(`[expire-abandoned-orders] ${correlationId} failed`);
    await safeReport(admin, correlationId, message, { limit: BATCH_LIMIT, executed_at: executedAt });
    return json(
      {
        success: false,
        expired_count: 0,
        units_restored: 0,
        orders: [],
        executed_at: executedAt,
        correlation_id: correlationId,
        error: message,
      },
      500,
    );
  }
});
