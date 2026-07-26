import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet, Lock, Banknote } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/system/ListPagination";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import { WithdrawalRequestModal } from "@/components/withdrawals/WithdrawalRequestModal";
import { formatBRL } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  cancelWithdrawal,
  fetchMyWithdrawalSummary,
  friendlyWithdrawalError,
  listMyWithdrawals,
} from "@/lib/withdrawals";
import { canSellerCancel } from "@/lib/withdrawalStatus";
import {
  hasActiveConsentFor,
  recordAuthenticatedConsent,
} from "@/lib/legalConsents";
import type { WithdrawalListItem, WithdrawalSummary } from "@/types/withdrawals";
import { toast } from "sonner";

const SellerWithdrawals = () => {
  const nav = useNavigate();
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [items, setItems] = useState<WithdrawalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        fetchMyWithdrawalSummary(),
        listMyWithdrawals(page, DEFAULT_PAGE_SIZE),
      ]);
      setSummary(s);
      setItems(list.items);
      setTotal(list.total);
    } catch (e) {
      toast.error("Não foi possível carregar saques", {
        description: friendlyWithdrawalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onCancel = async (id: string) => {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await cancelWithdrawal(id);
      toast.success("Cancelamento realizado.");
      await reload();
    } catch (e) {
      toast.error("Não foi possível cancelar", {
        description: friendlyWithdrawalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Saques"
        title="Meus saques"
        description="Solicite transferências do seu saldo disponível e acompanhe o status."
      />

      {loading && !summary ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <StatCard
              label="Disponível para saque"
              value={formatBRL(summary?.available ?? 0)}
              icon={Wallet}
              hint="já descontados os bloqueios"
            />
            <StatCard
              label="Bloqueado"
              value={formatBRL(summary?.blocked ?? 0)}
              icon={Lock}
              hint="em análise ou aprovado"
            />
            <StatCard
              label="Valor mínimo"
              value={formatBRL(summary?.minimum_withdrawal_amount ?? 50)}
              icon={Banknote}
              hint="configurado pela administração"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              variant="gold"
              disabled={(summary?.available ?? 0) < (summary?.minimum_withdrawal_amount ?? 50)}
              onClick={async () => {
                const ok = await hasActiveConsentFor("withdrawal_policy");
                if (!ok) {
                  const accept = window.confirm(
                    "É necessário aceitar a Política de Saques vigente antes de solicitar. Deseja aceitar agora?",
                  );
                  if (!accept) {
                    nav("/sacoleira/consentimentos");
                    return;
                  }
                  try {
                    await recordAuthenticatedConsent("withdrawal_policy", "withdrawal_request");
                    toast.success("Política de Saques aceita");
                  } catch (e) {
                    toast.error("Aceite a política em Consentimentos", {
                      description: e instanceof Error ? e.message : "Erro",
                    });
                    nav("/sacoleira/consentimentos");
                    return;
                  }
                }
                setModalOpen(true);
              }}
            >
              Solicitar saque
            </Button>
            <Button asChild variant="outline">
              <Link to="/sacoleira/clientes">Ver carteira</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/politica-de-saques">Política de saques</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-xl">Histórico</h3>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Atualizando…
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma solicitação ainda.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((w) => (
                  <div key={w.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{formatBRL(w.amount)}</p>
                        <WithdrawalStatusBadge status={w.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.requested_at).toLocaleString("pt-BR")}
                        {" · "}
                        {w.payment_method === "pix" ? "PIX" : "Transferência"}
                      </p>
                      {w.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">Motivo: {w.rejection_reason}</p>
                      )}
                      {w.status === "paid" && w.receipt_url && (
                        <a
                          href={w.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline mt-1 inline-block"
                        >
                          Ver comprovante
                        </a>
                      )}
                      {w.status === "paid" && w.payment_reference && (
                        <p className="text-xs text-muted-foreground mt-0.5">Ref: {w.payment_reference}</p>
                      )}
                    </div>
                    {canSellerCancel(w.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancellingId === w.id}
                        onClick={() => onCancel(w.id)}
                      >
                        {cancellingId === w.id ? "Cancelando…" : "Cancelar"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <ListPagination
              page={page}
              total={total}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </>
      )}

      <WithdrawalRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        available={summary?.available ?? 0}
        minimum={summary?.minimum_withdrawal_amount ?? 50}
        onSuccess={() => { void reload(); }}
      />
    </SellerLayout>
  );
};

export default SellerWithdrawals;
