/**
 * Operações críticas que adiam o reload do PWA autoUpdate.
 */

export const PWA_CRITICAL_BLOCK_MESSAGE =
  "Conclua a operação atual antes de atualizar.";

const CRITICAL_PATH_RE =
  /\/checkout(?:\/|$)|\/reset-password(?:\/|$)|\/saques(?:\/|$)|\/devolucoes(?:\/|$)|\/admin\/saques(?:\/|$)|\/admin\/devolucoes(?:\/|$)|\/admin\/pedidos(?:\/|$)|\/sacoleira\/pedidos(?:\/|$)|\/aceite|lgpd|consentimento/i;

let depth = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function beginCriticalOperation(_label?: string): () => void {
  depth += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    emit();
  };
}

export function endCriticalOperation() {
  depth = Math.max(0, depth - 1);
  emit();
}

export function isCriticalOperationActive(): boolean {
  return depth > 0;
}

export function getCriticalOperationDepth(): number {
  return depth;
}

export function resetCriticalOperationsForTests() {
  depth = 0;
  listeners.clear();
}

export function subscribeCriticalOperations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isCriticalUpdatePath(pathname: string): boolean {
  return CRITICAL_PATH_RE.test(pathname);
}

/** Bloqueia update se houver op crítica ativa OU rota sensível com formulário preenchido. */
export function shouldBlockPwaUpdate(opts: {
  pathname: string;
  hasFilledForm: boolean;
  criticalActive?: boolean;
}): boolean {
  if (opts.criticalActive ?? isCriticalOperationActive()) return true;
  if (isCriticalUpdatePath(opts.pathname) && opts.hasFilledForm) return true;
  if (opts.pathname.toLowerCase().includes("/checkout") && opts.hasFilledForm) return true;
  return false;
}
