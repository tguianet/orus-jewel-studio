const SENSITIVE_KEY =
  /^(password|passwd|access_token|refresh_token|authorization|api[_-]?key|pix_key|account_number|account_digit|document|cpf|cnpj|phone|email|address|customer_name|customer_phone|customer_address|payment_details|consent|consents|cookie|cookies|localstorage|secret|token)$/i;

const ALLOWED_KEY =
  /^(order_id|withdrawal_id|return_id|reseller_id|store_id|rpc_name|route|operation|status|http_status|error_code|correlation_id|entity_type|entity_id|severity|category|code|retryable|page|page_size)$/i;

const MAX_DEPTH = 4;
const MAX_KEYS = 40;
const MAX_STRING = 200;

export type SanitizedContext = Record<string, unknown>;

export function sanitizeErrorContext(
  input: unknown,
  depth = 0,
): SanitizedContext {
  if (input == null || typeof input !== "object") return {};
  if (depth > MAX_DEPTH) return { truncated: true };

  const src = input as Record<string, unknown>;
  const out: SanitizedContext = {};
  let count = 0;

  for (const [rawKey, value] of Object.entries(src)) {
    if (count >= MAX_KEYS) {
      out._truncated_keys = true;
      break;
    }
    const key = String(rawKey);

    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
      count += 1;
      continue;
    }

    if (key === "metadata" || key === "context") {
      if (value && typeof value === "object") {
        out[key] = sanitizeErrorContext(value, depth + 1);
        count += 1;
      }
      continue;
    }

    // Apenas chaves allowlisted — evita stringify cego
    if (!ALLOWED_KEY.test(key)) {
      continue;
    }

    out[key] = sanitizeValue(value, depth + 1);
    count += 1;
  }

  return out;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof value === "object") {
    return sanitizeErrorContext(value, depth);
  }
  return String(value).slice(0, MAX_STRING);
}

export function maskSensitiveString(value: string): string {
  const v = String(value ?? "");
  if (v.length <= 4) return "••••";
  return `••••${v.slice(-2)}`;
}
