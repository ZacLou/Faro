"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  DollarSign,
  FileText,
  TrendingUp,
  Clock,
  PlusCircle,
  Store,
  FileCheck,
  Loader2,
  Wallet,
  CreditCard,
  ExternalLink,
  Banknote,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import type { Invoice } from "@/lib/product"
import { INVOICE_STATUS_LABELS } from "@/lib/product"

const quickActions = [
  { href: "/app/tokenize", icon: PlusCircle, label: "Subir factura" },
  { href: "/app/market", icon: Store, label: "Explorar mercado" },
]

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
}

function getStatusClass(status: Invoice["status"]) {
  if (status === "pagada")
    return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/25"
  if (status === "financiada")
    return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
  if (status === "en_mercado")
    return "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/20"
  return ""
}

function getRoleBadgeClass(role: "provider" | "investor" | "deudor") {
  if (role === "provider")
    return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
  if (role === "deudor")
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
  return "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/20"
}

export default function DashboardPage() {
  const { address, isConnected } = useStellarWalletKit()
  const [providerInvoices, setProviderInvoices] = useState<Invoice[]>([])
  const [investorInvoices, setInvestorInvoices] = useState<Invoice[]>([])
  const [debtorInvoices, setDebtorInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityFilter, setActivityFilter] = useState<"all" | "provider" | "investor" | "deudor">("all")

  useEffect(() => {
    if (!address) {
      setProviderInvoices([])
      setInvestorInvoices([])
      setDebtorInvoices([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const enc = encodeURIComponent(address)
    const opts = { cache: "no-store" as RequestCache }
    Promise.all([
      fetch(`/api/invoices?provider=${enc}`, opts).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/invoices?investor=${enc}`, opts).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/invoices?debtor=${enc}`, opts).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([provider, investor, debtor]: [Invoice[], Invoice[], Invoice[]]) => {
        if (!cancelled) {
          setProviderInvoices(Array.isArray(provider) ? provider : [])
          setInvestorInvoices(Array.isArray(investor) ? investor : [])
          setDebtorInvoices(Array.isArray(debtor) ? debtor : [])
        }
      })
      .catch(() => {
        if (!cancelled) setError("Error al cargar actividad")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [address])

  useEffect(() => {
    if (!address) return
    const onFocus = () => {
      const enc = encodeURIComponent(address)
      const opts = { cache: "no-store" as RequestCache }
      Promise.all([
        fetch(`/api/invoices?provider=${enc}`, opts).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch(`/api/invoices?investor=${enc}`, opts).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch(`/api/invoices?debtor=${enc}`, opts).then((r) =>
          r.ok ? r.json() : []
        ),
      ])
        .then(([provider, investor, debtor]: [Invoice[], Invoice[], Invoice[]]) => {
          setProviderInvoices(Array.isArray(provider) ? provider : [])
          setInvestorInvoices(Array.isArray(investor) ? investor : [])
          setDebtorInvoices(Array.isArray(debtor) ? debtor : [])
        })
        .catch(() => setError("Error al cargar actividad"))
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [address])

  const totalCertified = providerInvoices.reduce((s, i) => s + i.amount, 0)
  const activeAsProvider = providerInvoices.filter(
    (i) => i.status === "en_mercado" || i.status === "financiada"
  ).length
  const avgReturn =
    investorInvoices.length > 0
      ? investorInvoices.reduce((s, i) => s + i.discountRatePercent, 0) /
        investorInvoices.length
      : null
  const totalInvested =
    investorInvoices.length > 0
      ? investorInvoices.reduce(
          (s, i) => s + Math.round(i.amount * (1 - i.discountRatePercent / 100)),
          0
        )
      : 0
  const pendingCollectionProvider = providerInvoices.filter(
    (i) => i.status === "financiada" && !i.providerClaimedAt
  ).length
  const pendingCollection = [
    ...providerInvoices.filter((i) => i.status === "financiada" && !i.providerClaimedAt),
    ...investorInvoices.filter(
      (i) =>
        i.status === "financiada" ||
        (i.status === "pagada" && Boolean(i.escrowNominalId) && !i.investorClaimedAt)
    ),
  ].length
  const pendingPayAsDebtor = debtorInvoices.filter((i) => i.status === "financiada").length

  const allActivity = [
    ...providerInvoices.map((i) => ({ ...i, role: "provider" as const })),
    ...investorInvoices.map((i) => ({ ...i, role: "investor" as const })),
    ...debtorInvoices.map((i) => ({ ...i, role: "deudor" as const })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 20)

  const filteredActivity =
    activityFilter === "all"
      ? allActivity
      : allActivity.filter((row) => row.role === activityFilter)

  const pendingClaimInvestor = investorInvoices.filter(
    (i) => i.status === "pagada" && Boolean(i.escrowNominalId) && !i.investorClaimedAt
  ).length
  const hasPendingActions =
    pendingPayAsDebtor > 0 || pendingCollectionProvider > 0 || pendingClaimInvestor > 0
  const firstDebtorPending = debtorInvoices.find((i) => i.status === "financiada")
  const firstProviderPending = providerInvoices.find(
    (i) => i.status === "financiada" && !i.providerClaimedAt
  )
  const firstInvestorPending = investorInvoices.find(
    (i) => i.status === "pagada" && Boolean(i.escrowNominalId) && !i.investorClaimedAt
  )

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tu actividad en Faro
          </p>
        </div>
        <div className="glass-panel flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <p className="font-medium text-foreground">Conecta tu wallet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Usa el botón «Entrar» en la barra superior para conectar tu wallet y ver tus facturas e inversiones.
          </p>
          <Button asChild className="gap-2 mt-2">
            <Link href="/">
              Ir a inicio
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tu actividad en Faro
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 hover:bg-primary/5"
            >
              <Link href={action.href}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando actividad...
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <>
          {/* Resumen por rol */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tu actividad:</span>
            <span>{providerInvoices.length} como proveedor</span>
            <span className="text-border">·</span>
            <span>{investorInvoices.length} como inversionista</span>
            <span className="text-border">·</span>
            <span>{debtorInvoices.length} como negocio</span>
          </div>

          {/* Acciones pendientes destacadas */}
          {hasPendingActions && (
            <div className="glass-panel border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground mb-3">Acciones pendientes</p>
              <div className="flex flex-wrap gap-2">
                {pendingPayAsDebtor > 0 && firstDebtorPending && (
                  <Button size="sm" asChild className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600">
                    <Link href={`/app/pay/${firstDebtorPending.id}`}>
                      <CreditCard className="h-3.5 w-3.5" />
                      Pagar {pendingPayAsDebtor} factura{pendingPayAsDebtor !== 1 ? "s" : ""} (negocio)
                    </Link>
                  </Button>
                )}
                {pendingCollectionProvider > 0 && firstProviderPending && (
                  <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href={`/app/claim-provider/${firstProviderPending.id}`}>
                      <Banknote className="h-3.5 w-3.5" />
                      Cobrar {pendingCollectionProvider} factura{pendingCollectionProvider !== 1 ? "s" : ""} (proveedor)
                    </Link>
                  </Button>
                )}
                {pendingClaimInvestor > 0 && firstInvestorPending && (
                  <Button size="sm" asChild className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                    <Link href={`/app/claim-investor/${firstInvestorPending.id}`}>
                      <Banknote className="h-3.5 w-3.5" />
                      Reclamar {pendingClaimInvestor} cobro{pendingClaimInvestor !== 1 ? "s" : ""} (inversionista)
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="glass-panel p-5 transition-all hover:shadow-md border-[hsl(var(--accent))]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total certificado</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                ${totalCertified.toLocaleString("es-MX")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Como proveedor
              </p>
            </div>
            <div className="glass-panel p-5 transition-all hover:shadow-md border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Facturas activas</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-[hsl(var(--accent))]">
                {activeAsProvider}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                En mercado o financiadas
              </p>
            </div>
            <div className="glass-panel p-5 transition-all hover:shadow-md border-[hsl(var(--accent))]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total invertido</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                ${totalInvested.toLocaleString("es-MX")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                En tus inversiones
              </p>
            </div>
            <div className="glass-panel p-5 transition-all hover:shadow-md border-[hsl(var(--accent))]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rend. promedio</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                {avgReturn != null ? `${avgReturn.toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tasa en inversiones
              </p>
            </div>
            <div className="glass-panel p-5 transition-all hover:shadow-md border-[hsl(var(--accent))]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Por cobrar</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                {pendingCollection}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Financiadas, en espera
              </p>
            </div>
            <div className="glass-panel p-5 transition-all hover:shadow-md border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Por pagar</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <FileCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                {pendingPayAsDebtor}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Como negocio
              </p>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Actividad reciente
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "provider", "investor", "deudor"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActivityFilter(filter)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      activityFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {filter === "all"
                      ? "Todas"
                      : filter === "provider"
                        ? "Proveedor"
                        : filter === "investor"
                          ? "Inversionista"
                          : "Negocio"}
                  </button>
                ))}
                <Button variant="ghost" size="sm" asChild className="gap-2 text-primary ml-1">
                  <Link href="/app/market">
                    <FileCheck className="h-4 w-4" />
                    Ver mercado
                  </Link>
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {allActivity.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted-foreground">
                  <p className="font-medium">Sin actividad aún</p>
                  <p className="mt-1 text-sm">
                    Sube una factura, invierte en el mercado o conecta como deudor para ver actividad aquí.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button asChild size="sm" className="gap-2">
                      <Link href="/app/tokenize">
                        <PlusCircle className="h-4 w-4" />
                        Subir factura
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <Link href="/app/market">Explorar mercado</Link>
                    </Button>
                  </div>
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No hay actividad con el filtro «
                  {activityFilter === "provider"
                    ? "Proveedor"
                    : activityFilter === "investor"
                      ? "Inversionista"
                      : "Negocio"}
                  ». Cambia el filtro o realiza acciones en ese rol.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Deudor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivity.map((row) => (
                      <tr
                        key={`${row.id}-${row.role}`}
                        className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          <Link
                            href={
                              row.role === "deudor" && row.status === "financiada"
                                ? `/app/pay/${row.id}`
                                : row.role === "provider" && row.status === "financiada" && !row.providerClaimedAt
                                  ? `/app/claim-provider/${row.id}`
                                  : row.role === "investor" && row.status === "pagada" && row.escrowNominalId && !row.investorClaimedAt
                                    ? `/app/claim-investor/${row.id}`
                                    : `/app/market/${row.id}`
                            }
                            className="hover:underline"
                          >
                            {row.id}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {row.debtorName}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          ${row.amount.toLocaleString("es-MX")} {row.currency}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="secondary"
                            className={getStatusClass(row.status)}
                          >
                            {INVOICE_STATUS_LABELS[row.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="secondary"
                            className={getRoleBadgeClass(row.role)}
                          >
                            {row.role === "provider"
                              ? "Proveedor"
                              : row.role === "deudor"
                                ? "Negocio"
                                : "Inversionista"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground" title={new Date(row.createdAt).toLocaleString("es-MX")}>
                          {formatRelativeDate(row.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {row.role === "deudor" && row.status === "financiada" ? (
                            <Button asChild size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                              <Link href={`/app/pay/${row.id}`}>
                                <CreditCard className="h-3.5 w-3.5" />
                                Pagar
                              </Link>
                            </Button>
                          ) : row.role === "provider" && row.status === "financiada" && !row.providerClaimedAt ? (
                            <Button asChild size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                              <Link href={`/app/claim-provider/${row.id}`}>
                                <Banknote className="h-3.5 w-3.5" />
                                Cobrar factura
                              </Link>
                            </Button>
                          ) : row.role === "investor" && row.status === "pagada" && row.escrowNominalId && !row.investorClaimedAt ? (
                            <Button asChild size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                              <Link href={`/app/claim-investor/${row.id}`}>
                                <Banknote className="h-3.5 w-3.5" />
                                Reclamar cobro
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                              <Link href={`/app/market/${row.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver
                              </Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
