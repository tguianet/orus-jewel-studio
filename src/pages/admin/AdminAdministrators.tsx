import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldPlus, Store, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminRoleConfirmDialog } from "@/components/admin/AdminRoleConfirmDialog";
import { AdminRoleAuditTable } from "@/components/admin/AdminRoleAuditTable";
import { useAuth } from "@/contexts/AuthContext";
import {
  administratorBadge,
  canRevokeAdministrator,
  formatAdminDate,
  getAdminRoleAudit,
  grantAdminRole,
  grantResellerRole,
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

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const AdminAdministrators = () => {
  const navigate = useNavigate();
  const { profile, refreshUserRoles } = useAuth();
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
  const [resellerTarget, setResellerTarget] = useState<AdministratorRow | null>(null);
  const [resellerName, setResellerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [resellerReason, setResellerReason] = useState("");

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

        const roles = await refreshUserRoles();
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

      await refreshUserRoles();
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
                <th className="px-4 py-3 font-medium">Perfis</th>
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
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                        {administratorBadge(admin)}
                      </span>
                      {admin.store_slug && (
                        <p className="mt-1 text-[11px] text-muted-foreground">/loja/{admin.store_slug}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{admin.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAdminDate(admin.granted_at || admin.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {admin.granted_by_name || (admin.granted_by ? `${admin.granted_by.slice(0, 8)}…` : "—")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {!admin.is_sacoleira && (
                        <Button
                          type="button"
                          variant="goldOutline"
                          size="sm"
                          disabled={submitting}
                          onClick={() => {
                            setResellerTarget(admin);
                            setResellerName(admin.nome || "");
                            setStoreName(admin.nome ? `Loja ${admin.nome}` : "");
                            setStoreSlug(slugify(admin.nome || admin.email.split("@")[0] || "loja"));
                            setResellerReason("");
                          }}
                        >
                          <Store className="h-4 w-4" />
                          Criar área de sacoleira
                        </Button>
                      )}
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

      <Dialog
        open={!!resellerTarget}
        onOpenChange={(open) => {
          if (!open && !submitting) setResellerTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar área de sacoleira</DialogTitle>
            <DialogDescription>
              Mantém a role admin e adiciona sacoleira + loja própria (mesmo login).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Admin:</span>{" "}
              <span className="font-medium">{resellerTarget?.nome}</span>
              <br />
              <span className="text-muted-foreground">{resellerTarget?.email}</span>
            </p>
            <div>
              <Label htmlFor="reseller-name">Nome da sacoleira</Label>
              <Input
                id="reseller-name"
                className="mt-1.5"
                value={resellerName}
                onChange={(e) => setResellerName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="store-name">Nome da loja</Label>
              <Input
                id="store-name"
                className="mt-1.5"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  if (!storeSlug || storeSlug === slugify(resellerTarget?.nome || "")) {
                    setStoreSlug(slugify(e.target.value));
                  }
                }}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="store-slug">Slug da loja</Label>
              <Input
                id="store-slug"
                className="mt-1.5"
                value={storeSlug}
                onChange={(e) => setStoreSlug(slugify(e.target.value))}
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">/loja/{storeSlug || "…"}</p>
            </div>
            <div>
              <Label htmlFor="reseller-reason">Motivo (opcional)</Label>
              <Input
                id="reseller-reason"
                className="mt-1.5"
                value={resellerReason}
                onChange={(e) => setResellerReason(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setResellerTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="gold"
              disabled={submitting || !storeName.trim() || !storeSlug.trim()}
              onClick={() => {
                if (!resellerTarget) return;
                void (async () => {
                  try {
                    setSubmitting(true);
                    const result = await grantResellerRole({
                      userId: resellerTarget.user_id,
                      resellerName,
                      storeName,
                      storeSlug,
                      reason: resellerReason,
                    });
                    if (result.already_linked) {
                      toast.info("Operação já realizada.");
                    } else {
                      toast.success("Área de sacoleira criada. Role admin preservada.");
                    }
                    setResellerTarget(null);
                    await reloadAdmins();
                    await reloadAudit(1);
                    setAuditPage(1);
                    await refreshUserRoles();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Falha temporária.");
                    showAppError(normalizeError(e, { operation: "admin_grant_reseller_role" }));
                  } finally {
                    setSubmitting(false);
                  }
                })();
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAdministrators;
