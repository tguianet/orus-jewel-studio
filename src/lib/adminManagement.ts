import { supabase } from "@/integrations/supabase/client";
import type {
  AdminAuditResult,
  AdminGrantResult,
  AdminListResult,
  AdminRevokeResult,
  AdminSearchResult,
  AdministratorRow,
  AdminRoleAuditRow,
  AdminSearchUser,
  GrantResellerRoleInput,
  GrantResellerRoleResult,
} from "@/types/adminManagement";

/** Mensagens amigáveis — nunca expor SQL interno. */
export function friendlyAdminManagementError(raw: string | null | undefined): string {
  const m = String(raw ?? "").toLowerCase();
  if (!m) return "Falha temporária. Tente novamente.";
  if (m.includes("acesso negado") || m.includes("somente administradores") || m.includes("permission")) {
    return "Acesso negado.";
  }
  if (m.includes("usuário não encontrado") || m.includes("usuario nao encontrado")) {
    return "Usuário não encontrado.";
  }
  if (m.includes("já é admin") || m.includes("ja e admin") || m.includes("already_admin")) {
    return "Usuário já é admin.";
  }
  if (m.includes("último admin") || m.includes("ultimo admin") || m.includes("último administrador")) {
    return "Não é possível remover o último admin.";
  }
  if (m.includes("motivo obrigatório") || m.includes("motivo obrigatorio")) {
    return "Informe o motivo da remoção.";
  }
  if (m.includes("consulta muito curta") || m.includes("muito curta")) {
    return "Digite ao menos 3 caracteres para buscar.";
  }
  if (m.includes("operação já realizada") || m.includes("operacao ja realizada") || m.includes("já realizada")) {
    return "Operação já realizada.";
  }
  if (m.includes("slug já em uso") || m.includes("slug ja em uso")) {
    return "Este slug de loja já está em uso.";
  }
  if (m.includes("slug inválido") || m.includes("slug invalido")) {
    return "Slug inválido. Use apenas letras minúsculas, números e hífens.";
  }
  if (m.includes("nome da loja")) {
    return "Informe o nome da loja.";
  }
  if (m.includes("patrocinador")) {
    return "Patrocinador inválido.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
    return "Falha temporária. Tente novamente.";
  }
  return "Falha temporária. Tente novamente.";
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function asArray(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

function mapAdministrator(row: Record<string, unknown>): AdministratorRow {
  return {
    user_id: String(row.user_id ?? ""),
    nome: String(row.nome ?? ""),
    email: String(row.email ?? ""),
    status: String(row.status ?? "active"),
    created_at: String(row.created_at ?? ""),
    granted_at: row.granted_at == null ? null : String(row.granted_at),
    granted_by: row.granted_by == null ? null : String(row.granted_by),
    granted_by_name: row.granted_by_name == null ? null : String(row.granted_by_name),
    is_sacoleira: Boolean(row.is_sacoleira),
    reseller_id: row.reseller_id == null ? null : String(row.reseller_id),
    store_slug: row.store_slug == null ? null : String(row.store_slug),
    store_name: row.store_name == null ? null : String(row.store_name),
  };
}

function mapSearchUser(row: Record<string, unknown>): AdminSearchUser {
  return {
    user_id: String(row.user_id ?? ""),
    nome: String(row.nome ?? ""),
    email: String(row.email ?? ""),
    is_admin: Boolean(row.is_admin),
    is_sacoleira: Boolean(row.is_sacoleira),
    created_at: String(row.created_at ?? ""),
  };
}

function mapAuditRow(row: Record<string, unknown>): AdminRoleAuditRow {
  return {
    id: String(row.id ?? ""),
    target_user_id: String(row.target_user_id ?? ""),
    target_name: String(row.target_name ?? ""),
    target_email: row.target_email == null ? null : String(row.target_email),
    action: String(row.action ?? ""),
    previous_role: row.previous_role == null ? null : String(row.previous_role),
    new_role: row.new_role == null ? null : String(row.new_role),
    performed_by: String(row.performed_by ?? ""),
    performed_by_name: String(row.performed_by_name ?? ""),
    reason: row.reason == null ? null : String(row.reason),
    created_at: String(row.created_at ?? ""),
  };
}

async function rpcJson(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(friendlyAdminManagementError(error.message));
  return asRecord(data);
}

export async function listAdministrators(): Promise<AdminListResult> {
  const data = await rpcJson("admin_list_administrators");
  return {
    items: asArray(data.items).map((r) => mapAdministrator(asRecord(r))),
    total: Number(data.total ?? 0),
  };
}

export async function searchUsersForAdmin(
  query: string,
  limit = 20,
): Promise<AdminSearchResult> {
  const q = query.trim();
  if (q.length < 3) {
    throw new Error("Digite ao menos 3 caracteres para buscar.");
  }
  const data = await rpcJson("admin_search_users", {
    p_query: q,
    p_limit: Math.min(Math.max(limit, 1), 20),
  });
  return {
    items: asArray(data.items).map((r) => mapSearchUser(asRecord(r))),
    query: String(data.query ?? q),
    limit: Number(data.limit ?? limit),
  };
}

export async function grantAdminRole(
  userId: string,
  reason?: string | null,
): Promise<AdminGrantResult> {
  const data = await rpcJson("admin_grant_role", {
    p_user_id: userId,
    p_reason: reason?.trim() || null,
  });
  return {
    ok: Boolean(data.ok),
    already_admin: Boolean(data.already_admin),
    user_id: String(data.user_id ?? userId),
    new_role: data.new_role == null ? undefined : String(data.new_role),
    message: data.message == null ? undefined : String(data.message),
  };
}

export async function revokeAdminRole(
  userId: string,
  reason: string,
): Promise<AdminRevokeResult> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new Error("Informe o motivo da remoção.");
  }
  const data = await rpcJson("admin_revoke_role", {
    p_user_id: userId,
    p_reason: trimmed,
  });
  return {
    ok: Boolean(data.ok),
    already_revoked: Boolean(data.already_revoked),
    user_id: String(data.user_id ?? userId),
    self_revoke: Boolean(data.self_revoke),
    message: data.message == null ? undefined : String(data.message),
  };
}

export async function getAdminRoleAudit(
  page = 1,
  pageSize = 20,
): Promise<AdminAuditResult> {
  const data = await rpcJson("admin_get_role_audit", {
    p_page: page,
    p_page_size: pageSize,
  });
  return {
    items: asArray(data.items).map((r) => mapAuditRow(asRecord(r))),
    total: Number(data.total ?? 0),
    page: Number(data.page ?? page),
    page_size: Number(data.page_size ?? pageSize),
  };
}

/** Proteção de UI: último admin ativo não pode ser removido. */
export function canRevokeAdministrator(
  targetUserId: string,
  admins: AdministratorRow[],
): { ok: true } | { ok: false; reason: string } {
  const active = admins.filter((a) => a.status !== "disabled");
  if (active.length <= 1 && active.some((a) => a.user_id === targetUserId)) {
    return { ok: false, reason: "Não é possível remover o último admin." };
  }
  if (admins.length <= 1 && admins.some((a) => a.user_id === targetUserId)) {
    return { ok: false, reason: "Não é possível remover o último admin." };
  }
  return { ok: true };
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export function adminActionLabel(action: string): string {
  if (action === "admin_granted") return "Concedeu admin";
  if (action === "admin_revoked") return "Removeu admin";
  if (action === "reseller_granted") return "Criou área sacoleira";
  if (action === "reseller_revoked") return "Removeu área sacoleira";
  return action;
}

export function administratorBadge(admin: AdministratorRow): string {
  return admin.is_sacoleira ? "Admin + Sacoleira" : "Admin";
}

export async function grantResellerRole(
  input: GrantResellerRoleInput,
): Promise<GrantResellerRoleResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) {
    throw new Error("Slug inválido. Use apenas letras minúsculas, números e hífens.");
  }
  if (!input.storeName.trim()) {
    throw new Error("Informe o nome da loja.");
  }
  const data = await rpcJson("admin_grant_reseller_role", {
    p_user_id: input.userId,
    p_reseller_name: input.resellerName.trim() || input.storeName.trim(),
    p_store_name: input.storeName.trim(),
    p_store_slug: storeSlug,
    p_sponsor_reseller_id: input.sponsorResellerId || null,
    p_reason: input.reason?.trim() || null,
  });
  return {
    ok: Boolean(data.ok),
    already_linked: Boolean(data.already_linked),
    user_id: String(data.user_id ?? input.userId),
    reseller_id: data.reseller_id == null ? undefined : String(data.reseller_id),
    store_id: data.store_id == null ? undefined : String(data.store_id),
    store_slug: data.store_slug == null ? undefined : String(data.store_slug),
    kept_admin: Boolean(data.kept_admin),
    has_sacoleira: Boolean(data.has_sacoleira),
    message: data.message == null ? undefined : String(data.message),
  };
}
