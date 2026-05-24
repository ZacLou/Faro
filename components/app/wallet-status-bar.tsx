"use client"

/**
 * Barra de estado de la wallet visible en /app. Muestra de forma persistente:
 * - dirección conectada (truncada, copiable)
 * - red real de la wallet vs red esperada
 * - trustline USDC y balances
 *
 * Si detecta algún problema (red distinta, sin trustline, cuenta sin fondear)
 * muestra una alerta clara con la acción a tomar.
 */

import { useState } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Wallet,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useWalletStatus } from "@/lib/wallet/use-wallet-status"
import { useWalletOnboarding } from "@/lib/wallet/wallet-onboarding-context"
import { formatBalance } from "@/lib/wallet/get-account-balances"
import { cn } from "@/lib/utils"

function shortenAddress(addr: string, chars = 6): string {
  if (addr.length <= chars * 2) return addr
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}

export function WalletStatusBar() {
  const s = useWalletStatus()
  const { open: openOnboarding } = useWalletOnboarding()
  const [copied, setCopied] = useState(false)

  // Sin wallet conectada: la barra no aporta, el botón "Entrar" del header invita a conectar.
  if (!s.isConnected || !s.address) return null

  const networkMismatch = s.isOnExpectedNetwork === false
  const hasProblem =
    networkMismatch || s.accountNotFunded || !s.hasUsdcTrustline

  async function copyAddress() {
    if (!s.address) return
    try {
      await navigator.clipboard.writeText(s.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div
      className={cn(
        "border-b px-4 py-2 text-sm sm:px-6",
        hasProblem
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/20"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Indicador principal */}
        {hasProblem ? (
          <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {networkMismatch
              ? "Red incorrecta"
              : s.accountNotFunded
                ? "Cuenta sin fondear"
                : "Sin trustline USDC"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Wallet lista
          </span>
        )}

        {/* Dirección */}
        <button
          type="button"
          onClick={copyAddress}
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          title={s.address}
        >
          <Wallet className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{shortenAddress(s.address)}</span>
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3 opacity-50" />
          )}
        </button>

        {/* Red */}
        <span className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Red:</span>
          {s.isOnExpectedNetwork === true ? (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {s.expectedNetworkLabel} ✓
            </span>
          ) : s.isOnExpectedNetwork === false ? (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {s.walletNetwork?.network ?? "?"} (esperada {s.expectedNetworkLabel})
            </span>
          ) : (
            <span className="text-muted-foreground">{s.expectedNetworkLabel}</span>
          )}
        </span>

        {/* USDC */}
        <span className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">USDC:</span>
          {s.loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : s.hasUsdcTrustline && s.usdcBalance != null ? (
            <span className="font-medium text-foreground">
              {formatBalance(String(s.usdcBalance))}
            </span>
          ) : (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              sin trustline
            </span>
          )}
        </span>

        {/* XLM */}
        <span className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">XLM:</span>
          {s.loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={cn(
                "font-medium",
                s.xlmBalance > 0 ? "text-foreground" : "text-amber-700 dark:text-amber-400"
              )}
            >
              {formatBalance(String(s.xlmBalance))}
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* Configurar wallet (wizard) */}
          <button
            type="button"
            onClick={openOnboarding}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="Configurar wallet"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Configurar wallet</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={s.refetch}
            disabled={s.loading}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={cn("h-3 w-3", s.loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Detalle de problema, debajo del summary */}
      {hasProblem && (
        <div className="mt-2 text-xs text-amber-700/90 dark:text-amber-400/90">
          <button
            type="button"
            onClick={openOnboarding}
            className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 font-medium text-amber-800 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
          >
            <Sparkles className="h-3 w-3" />
            Guía paso a paso
          </button>
          {networkMismatch ? (
            <p>
              Tu wallet está en <strong>{s.walletNetwork?.network}</strong> pero
              la app usa <strong>{s.expectedNetworkLabel}</strong>. Cambia la red
              en Freighter (Configuración → Red) y pulsa <em>Actualizar</em>.
            </p>
          ) : s.accountNotFunded ? (
            <p>
              Tu cuenta aún no está fondada en {s.expectedNetworkLabel}.{" "}
              {s.expectedNetworkLabel === "Testnet" && (
                <>
                  Puedes obtener XLM testnet en{" "}
                  <a
                    href={`https://friendbot.stellar.org/?addr=${encodeURIComponent(s.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900 dark:hover:text-amber-300"
                  >
                    friendbot.stellar.org
                  </a>
                  .
                </>
              )}
            </p>
          ) : !s.hasUsdcTrustline ? (
            <p>
              No tienes trustline de USDC. Añádela en tu wallet (Freighter →
              Manage Assets → Add Asset) con el código <code className="font-mono">USDC</code> y
              el emisor{" "}
              <code className="break-all font-mono">
                GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
              </code>
              .
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
