import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminRoleConfirmDialog } from "@/components/admin/AdminRoleConfirmDialog";
import { AdminRoleAuditTable } from "@/components/admin/AdminRoleAuditTable";
import { useAuth } from "@/contexts/AuthContext";
import {
  canRevokeAdministrator,
  formatAdminDate,
  getAdminRoleAudit,
  grantAdminRole,
  listAdministrators,
  revokeAdminRole,
  searchUsersForAdmin,
} from "@/lib/adminManagement";
import { normalizeError, showAppError } from "@/lib/errors";
import type {
  AdministratorRow,
  AdminRoleAuditRow,
  AdminSearchUser,
} from "@/types/adminManagement";

const AUDIT_PAGE_SIZE = 10;

const AdminAdministrators = () => {
  const navigate = useNavigate();
  const { profile, refreshUserRole } = useAuth();
  const [admins, setAdmins] = useState<AdministratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"grant" | "revoke">("grant");
  const [selected, setSelected] = useState<AdminSearchUser | AdministratorRow | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [audit, setAudit] = useState<AdminRoleAuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(true);

  const currentUserId = profile?.user.id ?? "";

  const reloadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdministrators();
      setAdmins(result.items);
    } catch (e) {
      showAppError(normalizeError(e, { operation: "admin_list_administrators" }));
      toast.error(e instanceof Error ? e.message : "Acesso negado.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAudit = useCallback(async (page: number) => {
    setAuditLoading(true);
    try {
      const result = await getAdminRoleAudit(page, AUDIT_PAGE_SIZE);
      setAudit(result.items);
      setAuditTotal(result.total);
      setAuditPage(result.page);
    } catch (e) {
      showAppError(normalizeError(e, { operation: "admin_get_role_audit" }));
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAdmins();
  }, [reloadAdmins]);

  useEffect(() => {
    void reloadAudit(auditPage);
  }, [auditPage, reloadAudit]);

  const openGrantConfirm = (user: AdminSearchUser) => {
    if (user.is_admin) {
      toast.info("Usuário já é admin.");
      return;
    }
    setSelected(user);
    setConfirmMode("grant");
    setReason("");
    setConfirmOpen(true);
    setAddOpen(false);
  };

  const openRevokeConfirm = (admin: AdministratorRow) => {
    const guard = canRevokeAdministrator(admin.user_id, admins);
    if (guard.ok === false) {
      toast.error(guard.reason);
      return;
    }
    setSelected(admin);
    setConfirmMode("revoke");
    setReason("");
    setConfirmOpen(true);
  };

  const selectedName = useMemo(() => {
    if (!selected) return "";
    return "nome" in selected ? selected.nome : "";
  }, [selected]);

  const selectedEmail = useMemo(() => {
    if (!selected) return "";
    return "email" in selected ? selected.email : "";
  }, [selected]);

  const selectedUserId = useMemo(() => {
    if (!selected) return "";
    return selected.user_id;
  }, [selected]);

  const handleConfirm = async () => {
    if (!selectedUserId || submitting) return;
    try {
      setSubmitting(true);
      if (confirmMode === "grant") {
        const result = await grantAdminRole(selectedUserId, reason);
        if (result.already_admin) {
          toast.info("Operação já realizada.");
        } else {
          toast.success("Administrador adicionado com sucesso.");
        }
      } else {
        const result = await revokeAdminRole(selectedUserId, reason);
        if (result.already_revoked) {
          toast.info("Operação já realizada.");
        } else {
          toast.success("Acesso administrativo revogado.");
        }

        const roles = await refreshUserRole();
        const stillAdmin = roles.includes("admin");

        if (result.self_revoke || selectedUserId === currentUserId) {
          if (!stillAdmin) {
            toast.message("Seu acesso admin foi revogado.");
            navigate("/login-admin", { replace: true });
            return;
          }
        }
      }

      setConfirmOpen(false);
      setSelected(null);
      setReason("");
      await reloadAdmins();
      await reloadAudit(1);
      setAuditPage(1);

      // Atualiza role local após qualquer alteração (inclui se alguém removeu o próprio usuário em outra aba).
      await refreshUserRole();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha temporária. Tente novamente.";
      toast.error(msg);
      showAppError(normalizeError(e, {
        operation: confirmMode === "grant" ? "admin_grant_role" : "admin_revoke_role",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Configurações"
        title="Administradores"
        description="Gerencie quem tem acesso total ao painel. Alterações passam pelo banco (RPCs) e são auditadas."
      />

      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/configuracoes">
            <ArrowLeft className="h-4 w-4" />
            Voltar às configurações
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {admins.length} administrador(es) ativo(s) na fonte oficial <code className="text-xs">user_roles</code>.
        </p>
        <Button
          variant="gold"
          onClick={() => setAddOpen(true)}
          disabled={loading || submitting}
        >
          <ShieldPlus className="h-4 w-4" />
          Adicionar administrador
        </Button>
      </div>

      <div className="mb-10 overflow-x-auto rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando administradores...
          </div>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum administrador encontrado.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Admin desde</th>
                <th className="px-4 py-3 font-medium">Concedido por</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const guard = canRevokeAdministrator(admin.user_id, admins);
                const canRevoke = guard.ok === true;
                const revokeBlockedReason = guard.ok === false ? guard.reason : "Remover admin";
                const isSelf = admin.user_id === currentUserId;
                return (
                  <tr key={admin.user_id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {admin.nome || "—"}
                      {isSelf && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">você</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.email || "—"}</td>
                    <td className="px-4 py-3 capitalize">{admin.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAdminDate(admin.granted_at || admin.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {admin.granted_by_name || (admin.granted_by ? `${admin.granted_by.slice(0, 8)}…` : "—")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={submitting || !canRevoke}
                        title={revokeBlockedReason}
                        onClick={() => openRevokeConfirm(admin)}
                      >
                        <UserMinus className="h-4 w-4" />
                        Remover
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AdminRoleAuditTable
        items={audit}
        total={auditTotal}
        page={auditPage}
        pageSize={AUDIT_PAGE_SIZE}
        loading={auditLoading}
        onPageChange={setAuditPage}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar administrador</DialogTitle>
          </DialogHeader>
          <AdminUserSearch
            disabled={submitting}
            onSearch={async (q) => {
              const result = await searchUsersForAdmin(q);
              return result.items;
            }}
            onSelect={openGrantConfirm}
          />
        </DialogContent>
      </Dialog>

      <AdminRoleConfirmDialog
        open={confirmOpen}
        mode={confirmMode}
        userName={selectedName}
        userEmail={selectedEmail}
        reason={reason}
        onReasonChange={setReason}
        submitting={submitting}
        onCancel={() => {
          if (submitting) return;
          setConfirmOpen(false);
          setSelected(null);
          setReason("");
        }}
        onConfirm={() => void handleConfirm()}
      />
    </AdminLayout>
  );
};

export default AdminAdministrators;
