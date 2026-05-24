"use client"

/**
 * Timeline visual del ciclo de vida de una factura en Faro:
 *
 *   1. Tokenizada (mint Soroban)
 *   2. Invertida (Escrow 1 creado y fondeado por inversionista)
 *   3. Cobrada por proveedor (Escrow 1 liberado → proveedor recibe liquidez)
 *   4. Pagada por deudor (Escrow 2 creado y fondeado con el nominal)
 *   5. Reclamada por inversionista (Escrow 2 liberado → inversionista recibe nominal)
 *
 * Cada paso muestra fecha, contrapartes y enlaces a Stellar Expert (tx o contrato)
 * cuando hay datos on-chain. Pensado para incrustarse en cualquier pantalla de
 * detalle (market, pay, claim-provider, claim-investor).
 */

import {
  CheckCircle2,
  Circle,
  Loader2,
  ExternalLink,
  CircleDashed,
} from "lucide-react"
import {
  getStellarExpertContractUrl,
  getStellarExpertTxUrl,
} from "@/lib/stellar-explorer-urls"
import { cn } from "@/lib/utils"
import type { Invoice } from "@/lib/product"

type StepStatus = "done" | "current" | "pending"

interface TimelineEvent {
  id: string
  title: string
  status: StepStatus
  date?: string | null
  description?: React.ReactNode
  /** Enlaces on-chain a Stellar Expert */
  links?: { label: string; href: string }[]
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return null
  }
}

function shortenAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return ""
  if (addr.length <= chars * 2) return addr
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`
}

function amountToInvest(amount: number, discountPercent: number): number {
  return Math.round(amount * (1 - discountPercent / 100))
}

function buildEvents(invoice: Invoice): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const invested = amountToInvest(invoice.amount, invoice.discountRatePercent)

  // 1. Tokenizada
  events.push({
    id: "tokenized",
    title: "Factura tokenizada",
    status: "done",
    date: invoice.createdAt,
    description: (
      <>
        El proveedor{" "}
        <code className="font-mono text-xs">
          {shortenAddress(invoice.providerAddress)}
        </code>{" "}
        emitió la factura por{" "}
        <strong>
          ${invoice.amount.toLocaleString("es-MX")} {invoice.currency}
        </strong>{" "}
        (descuento {invoice.discountRatePercent}%).
      </>
    ),
    links: invoice.tokenizeTxHash
      ? [
          {
            label: "Ver mint en Stellar Expert",
            href: getStellarExpertTxUrl(invoice.tokenizeTxHash),
          },
        ]
      : [],
  })

  // 2. Invertida (Escrow 1)
  const isFinanced =
    invoice.status === "financiada" ||
    invoice.status === "pagada" ||
    Boolean(invoice.investorAddress) ||
    Boolean(invoice.escrowId)
  events.push({
    id: "invested",
    title: "Inversionista financia (Escrow 1 creado)",
    status: isFinanced ? "done" : "pending",
    date: invoice.financedAt,
    description: isFinanced ? (
      <>
        Inversionista{" "}
        <code className="font-mono text-xs">
          {shortenAddress(invoice.investorAddress)}
        </code>{" "}
        bloqueó <strong>{invested.toLocaleString("es-MX")} USDC</strong> en el
        escrow para entregar al proveedor.
      </>
    ) : (
      <>Pendiente: la factura está en el mercado esperando inversionista.</>
    ),
    links: invoice.escrowId
      ? [
          {
            label: "Ver Escrow 1 en Stellar Expert",
            href: getStellarExpertContractUrl(invoice.escrowId),
          },
        ]
      : [],
  })

  // 3. Cobrada por proveedor (Escrow 1 liberado)
  const providerClaimed = Boolean(invoice.providerClaimedAt)
  events.push({
    id: "provider_claimed",
    title: "Proveedor cobra (Escrow 1 liberado)",
    status: providerClaimed
      ? "done"
      : isFinanced
        ? "current"
        : "pending",
    date: invoice.providerClaimedAt,
    description: providerClaimed ? (
      <>
        El proveedor recibió{" "}
        <strong>{invested.toLocaleString("es-MX")} USDC</strong> en su wallet.
      </>
    ) : (
      <>
        Pendiente: el proveedor debe pulsar &quot;Cobrar factura&quot; para
        recibir su liquidez.
      </>
    ),
  })

  // 4. Pagada por deudor (Escrow 2)
  const isPaid =
    invoice.status === "pagada" ||
    Boolean(invoice.paidAt) ||
    Boolean(invoice.escrowNominalId)
  events.push({
    id: "paid",
    title: "Deudor paga (Escrow 2 creado)",
    status: isPaid ? "done" : providerClaimed ? "current" : "pending",
    date: invoice.paidAt,
    description: isPaid ? (
      <>
        El deudor bloqueó el nominal de{" "}
        <strong>
          ${invoice.amount.toLocaleString("es-MX")} {invoice.currency}
        </strong>{" "}
        en el escrow para el inversionista.
      </>
    ) : (
      <>
        Pendiente: el deudor debe confirmar el pago bloqueando el nominal en
        Escrow 2.
      </>
    ),
    links: invoice.escrowNominalId
      ? [
          {
            label: "Ver Escrow 2 en Stellar Expert",
            href: getStellarExpertContractUrl(invoice.escrowNominalId),
          },
        ]
      : [],
  })

  // 5. Reclamada por inversionista (Escrow 2 liberado)
  const investorClaimed = Boolean(invoice.investorClaimedAt)
  events.push({
    id: "investor_claimed",
    title: "Inversionista reclama (Escrow 2 liberado)",
    status: investorClaimed
      ? "done"
      : isPaid
        ? "current"
        : "pending",
    date: invoice.investorClaimedAt,
    description: investorClaimed ? (
      <>
        El inversionista recibió el nominal de{" "}
        <strong>
          ${invoice.amount.toLocaleString("es-MX")} {invoice.currency}
        </strong>
        . Ciclo completo.
      </>
    ) : (
      <>
        Pendiente: el inversionista debe pulsar &quot;Reclamar cobro&quot; para
        recibir el nominal.
      </>
    ),
  })

  return events
}

function StepDot({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/15">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    )
  }
  if (status === "current") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary/15">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-muted/30">
      <CircleDashed className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export function InvoiceTimeline({
  invoice,
  className,
}: {
  invoice: Invoice
  className?: string
}) {
  const events = buildEvents(invoice)
  const doneCount = events.filter((e) => e.status === "done").length

  return (
    <div className={cn("glass-panel border-primary/20 p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Ciclo de vida de la factura
          </h3>
          <p className="text-xs text-muted-foreground">
            Progreso on-chain de cada movimiento
          </p>
        </div>
        <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {doneCount}/{events.length}
        </span>
      </div>

      <ol className="flex flex-col">
        {events.map((event, i) => {
          const isLast = i === events.length - 1
          const formattedDate = formatDate(event.date)
          return (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepDot status={event.status} />
                {!isLast && (
                  <div
                    className={cn(
                      "mt-1 w-0.5 flex-1 transition-colors",
                      event.status === "done" ? "bg-emerald-500/40" : "bg-border"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pb-5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      event.status === "done"
                        ? "text-foreground"
                        : event.status === "current"
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  >
                    {event.title}
                  </span>
                  {formattedDate && (
                    <span className="text-xs text-muted-foreground">
                      · {formattedDate}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
                {event.links && event.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-primary transition-colors hover:bg-muted hover:text-primary/80"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {doneCount === events.length ? (
        <div className="mt-1 flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ciclo completo — todos los movimientos están confirmados on-chain.
        </div>
      ) : null}
    </div>
  )
}
