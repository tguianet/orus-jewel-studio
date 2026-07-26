export type AdminUserStatus = "active" | "disabled";

export type AdministratorRow = {
  user_id: string;
  nome: string;
  email: string;
  status: AdminUserStatus | string;
  created_at: string;
  granted_at: string | null;
  granted_by: string | null;
  granted_by_name?: string | null;
};

export type AdminSearchUser = {
  user_id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  is_sacoleira: boolean;
  created_at: string;
};

export type AdminRoleAuditAction = "admin_granted" | "admin_revoked";

export type AdminRoleAuditRow = {
  id: string;
  target_user_id: string;
  target_name: string;
  target_email: string | null;
  action: AdminRoleAuditAction | string;
  previous_role: string | null;
  new_role: string | null;
  performed_by: string;
  performed_by_name: string;
  reason: string | null;
  created_at: string;
};

export type AdminGrantResult = {
  ok: boolean;
  already_admin?: boolean;
  user_id: string;
  new_role?: string;
  message?: string;
};

export type AdminRevokeResult = {
  ok: boolean;
  already_revoked?: boolean;
  user_id: string;
  self_revoke?: boolean;
  message?: string;
};

export type AdminListResult = {
  items: AdministratorRow[];
  total: number;
};

export type AdminSearchResult = {
  items: AdminSearchUser[];
  query: string;
  limit: number;
};

export type AdminAuditResult = {
  items: AdminRoleAuditRow[];
  total: number;
  page: number;
  page_size: number;
};
