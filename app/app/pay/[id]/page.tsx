"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, CreditCard, Wallet, CheckCircle2, ExternalLink } from "lucide-react"
import {
  useInitializeEscrow,
  useFundEscrow,
  useSendTransaction,
} from "@trustless-work/escrow"
import type { InitializeSingleReleaseEscrowPayload } from "@trustless-work/escrow/types"
import { Button } from "@/components/ui/button"
import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import { getStellarExpertTxUrl } from "@/lib/stellar-explorer-urls"
import {
  USDC_TRUSTLINE_ADDRESS,
  USDC_SYMBOL,
  USDC_DIVISOR,
  TRUSTLESS_WORK_PLATFORM_FEE,
  nominalToUSDCSmallestUnits,
} from "@/lib/trustless-work/constants"
import { EscrowStepper, useEscrowStepper } from "@/components/wallet/escrow-stepper"
import { InvoiceTimeline } from "@/components/invoice/invoice-timeline"
import { toast } from "sonner"
import type { Invoice } from "@/lib/product"

const ESCROW_TYPE = "single-release" as const

const PAY_STEPS = [
  { id: "init_prepare", label: "Preparando creación del escrow nominal" },
  { id: "init_sign", label: "Firmando creación en Freighter" },
  { id: "init_send", label: "Enviando a la red" },
  { id: "fund_prepare", label: "Preparando financiamiento" },
  { id: "fund_sign", label: "Firmando financiamiento en Freighter" },
  { id: "fund_send", label: "Enviando a la red" },
] as const

function extractApiMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "object" && data !== null && "message" in data) {
    const m = (data as { message: unknown }).message
    if (typeof m === "string") return m
  }
  if (typeof data === "string") return data
  return null
}

export default function PayInvoicePage() {
  const params = useParams()
  const id = params.id as string
  const { address, isConnected, signTransaction, getWalletNetwork } = useStellarWalletKit()
  const { deployEscrow } = useInitializeEscrow()
  const { fundEscrow } = useFundEscrow()
  const { sendTransaction } = useSendTransaction()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)
  const [payTxHash, setPayTxHash] = useState<string | null>(null)
  const stepper = useEscrowStepper([...PAY_STEPS])
  const currentStepRef = useRef<string | null>(null)
  function beginStep(id: string, detail?: string) {
    currentStepRef.current = id
    stepper.start(id, detail)
  }
  function endStep(id: string) {
    stepper.complete(id)
    if (currentStepRef.current === id) currentStepRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    fetch(`/api/invoices/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Factura no encontrada")
        if (!res.ok) throw new Error("Error al cargar")
        return res.json()
      })
      .then((data: Invoice) => {
        if (!cancelled) setInvoice(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handlePay() {
    if (!invoice || !address) return
    setPaying(true)
    stepper.reset()
    try {
      const hasApiKey =
        typeof process !== "undefined" &&
        Boolean(
          process.env.NEXT_PUBLIC_API_KEY ||
            process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY
        )
      if (!hasApiKey) {
        throw new Error(
          "La integración de escrow (Trustless Work) no está configurada: falta la API key. No se puede bloquear el nominal on-chain."
        )
      }
      if (!invoice.investorAddress) {
        throw new Error(
          "Esta factura no tiene un inversionista registrado, así que no se puede crear el escrow del nominal."
        )
      }

      // Validar que la wallet esté en testnet antes de firmar
      const walletNet = await getWalletNetwork()
      if (walletNet) {
        const isWalletTestnet =
          /testnet/i.test(walletNet.network) ||
          walletNet.networkPassphrase?.includes("Test SDF")
        if (!isWalletTestnet) {
          throw new Error(
            `Tu wallet (Freighter) está en la red "${walletNet.network}" pero la app usa Testnet. Cambia la red a Testnet e intenta de nuevo.`
          )
        }
      }

      const platformAddress =
        (typeof process !== "undefined" &&
          process.env.NEXT_PUBLIC_TRUSTLESS_WORK_PLATFORM_ADDRESS?.trim()) ||
        address
      const nominalMajor = Math.round(
        nominalToUSDCSmallestUnits(invoice.amount) / USDC_DIVISOR
      )
      if (nominalMajor <= 0) {
        throw new Error("El nominal de la factura debe ser mayor que 0")
      }

      // Escrow 2 (nominal): el deudor fondea el nominal completo; se libera cuando
      // el inversionista reclama (receiver = inversionista, releaseSigner = inversionista).
      const initPayload: InitializeSingleReleaseEscrowPayload = {
        signer: address,
        engagementId: `${invoice.id}-nominal`,
        title: `Factura ${invoice.id} - nominal`,
        description: `Pago del nominal de la factura ${invoice.id} al inversionista`,
        amount: nominalMajor,
        platformFee: TRUSTLESS_WORK_PLATFORM_FEE,
        trustline: { address: USDC_TRUSTLINE_ADDRESS, symbol: USDC_SYMBOL },
        roles: {
          approver: invoice.investorAddress,
          serviceProvider: invoice.investorAddress,
          platformAddress,
          releaseSigner: invoice.investorAddress,
          disputeResolver: platformAddress,
          receiver: invoice.investorAddress,
        },
        milestones: [
          { description: `Cobro del nominal de la factura ${invoice.id} por el inversionista` },
        ],
      }

      let initRes: Awaited<ReturnType<typeof deployEscrow>>
      beginStep("init_prepare", "Calculando la transacción con Trustless Work…")
      try {
        initRes = await deployEscrow(initPayload, ESCROW_TYPE)
      } catch (apiErr: unknown) {
        const msg = extractApiMessage(apiErr) ?? (apiErr as Error)?.message
        throw new Error(msg ? `Trustless Work: ${msg}` : "No se pudo crear el escrow del nominal")
      }
      if (initRes.status === "FAILED" || !initRes.unsignedTransaction) {
        throw new Error(
          (initRes as { message?: string }).message || "No se pudo crear el escrow del nominal"
        )
      }
      const contractIdFromInit = (initRes as { contractId?: string }).contractId
      endStep("init_prepare")

      beginStep("init_sign", "Confirma en la ventana de Freighter")
      const { signedTxXdr: signedInitXdr } = await signTransaction(initRes.unsignedTransaction)
      endStep("init_sign")

      beginStep("init_send", "Enviando a Stellar…")
      let sendInitRes: { status?: string; contractId?: string; message?: string; transactionHash?: string }
      try {
        sendInitRes = await sendTransaction(signedInitXdr) as typeof sendInitRes
      } catch (sendErr: unknown) {
        const apiMsg = extractApiMessage(sendErr)
        throw new Error(
          apiMsg
            ? `Trustless Work: ${apiMsg}`
            : "Error al enviar la transacción del escrow. Verifica que Freighter esté en Testnet y tenga trustline y saldo USDC."
        )
      }
      if (sendInitRes?.status === "FAILED") {
        throw new Error(sendInitRes?.message || "Error al enviar la transacción del escrow")
      }
      const escrowNominalId = contractIdFromInit ?? sendInitRes?.contractId
      if (!escrowNominalId) {
        throw new Error("No se recibió el contractId del escrow del nominal")
      }
      endStep("init_send")

      beginStep("fund_prepare", "Calculando la transacción de financiamiento…")
      const fundRes = await fundEscrow(
        { contractId: escrowNominalId, amount: nominalMajor, signer: address },
        ESCROW_TYPE
      )
      if (fundRes.status === "FAILED" || !fundRes.unsignedTransaction) {
        throw new Error(
          (fundRes as { message?: string }).message || "No se pudo financiar el escrow del nominal"
        )
      }
      endStep("fund_prepare")

      beginStep("fund_sign", "Confirma en la ventana de Freighter")
      const { signedTxXdr: signedFundXdr } = await signTransaction(fundRes.unsignedTransaction)
      endStep("fund_sign")

      beginStep("fund_send", "Enviando a Stellar…")
      let sendFundRes: { status?: string; message?: string; transactionHash?: string }
      try {
        sendFundRes = await sendTransaction(signedFundXdr) as typeof sendFundRes
      } catch (sendErr: unknown) {
        const apiMsg = extractApiMessage(sendErr)
        throw new Error(
          apiMsg
            ? `Trustless Work (fund): ${apiMsg}`
            : "Error al financiar el escrow. Verifica que tengas USDC testnet (trustline y saldo) en Freighter."
        )
      }
      if (sendFundRes?.status === "FAILED") {
        throw new Error(sendFundRes?.message || "Error al financiar el escrow del nominal")
      }
      endStep("fund_send")

      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowNominalId }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        throw new Error(data?.error || "Error al registrar el pago")
      }
      setPayTxHash(sendFundRes?.transactionHash ?? sendInitRes?.transactionHash ?? null)
      setPaySuccess(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al registrar el pago"
      if (currentStepRef.current) stepper.fail(currentStepRef.current, msg)
      toast.error(msg)
    } finally {
      setPaying(false)
    }
  }

  const isDebtor =
    invoice?.debtorAddress &&
    address &&
    invoice.debtorAddress.trim().toLowerCase() === address.trim().toLowerCase()
  const canPay = invoice?.status === "financiada" && isDebtor

  if (paySuccess && invoice) {
    return (
      <div className="mx-auto max-w-lg flex flex-col items-center gap-6 py-8">
        <div className="flex w-full flex-col items-center gap-6 rounded-2xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/10 to-background p-8 text-center shadow-lg">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 ring-4 ring-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold text-foreground">
              Pago confirmado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              El nominal de la factura <strong>{invoice.id}</strong> quedó bloqueado en el escrow on-chain. El inversionista ya puede reclamar el cobro.
            </p>
          </div>
          {payTxHash && (
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-muted-foreground">Comprobante:</p>
              <div className="w-full rounded-lg bg-secondary/80 p-3 font-mono text-xs break-all text-foreground">
                {payTxHash}
              </div>
              <Button size="sm" className="gap-2" asChild>
                <a
                  href={getStellarExpertTxUrl(payTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver en Stellar Expert
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/app">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando factura...
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
        <p className="text-destructive">{error ?? "Factura no encontrada"}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
        <Link href="/app">
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
      </Button>

      <InvoiceTimeline invoice={invoice} />

      <div className="flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Pagar factura</h1>
          <p className="text-sm text-muted-foreground">
            Soy el negocio (deudor). Conecta tu wallet para pagar el nominal.
          </p>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Factura</span>
          <span className="font-medium">{invoice.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Emisor</span>
          <span className="font-medium">{invoice.emitterName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monto a pagar (referencia {invoice.currency})</span>
          <span className="font-semibold">
            ${invoice.amount.toLocaleString("es-MX")} {invoice.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Liquidación en red</span>
          <span className="font-medium text-foreground">
            {invoice.amount.toLocaleString("es-MX")} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Vencimiento</span>
          <span>{new Date(invoice.dueDate).toLocaleDateString("es-MX")}</span>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          El monto en {invoice.currency} es referencia. El pago en la red Stellar se realiza en <strong>USDC</strong>.
        </p>
      </div>

      {invoice.status !== "financiada" && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          {invoice.status === "pagada" ? (
            <p>Esta factura ya fue pagada.</p>
          ) : invoice.status === "en_mercado" ? (
            <p>Esta factura aún no ha sido financiada por un inversionista. No hay pago pendiente.</p>
          ) : (
            <p>Estado actual: {invoice.status}. Solo se puede pagar una factura en estado «financiada».</p>
          )}
          <Button variant="outline" size="sm" asChild className="mt-3">
            <Link href="/app">Ir al dashboard</Link>
          </Button>
        </div>
      )}

      {invoice.status === "financiada" && (
        <>
          {!isConnected ? (
            <div className="rounded-lg border border-border bg-muted/30 p-5 text-center">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Conecta tu wallet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usa el botón «Entrar» en la barra superior para conectar la wallet del negocio (deudor). Solo esa wallet puede pagar esta factura.
              </p>
            </div>
          ) : !isDebtor ? (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-5 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Esta factura debe ser pagada por la wallet del negocio
              </p>
              <p className="mt-2 text-muted-foreground">
                Tu wallet actual no coincide con la dirección registrada como deudor. Conecta la wallet <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{invoice.debtorAddress?.slice(0, 10)}…{invoice.debtorAddress?.slice(-8)}</code> para poder pagar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stepper.active && <EscrowStepper steps={stepper.steps} />}
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Pagar nominal (USDC)
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Bloquearás el nominal completo en un escrow on-chain (firmarás 2 transacciones). La factura pasará a «pagada» y el inversionista podrá reclamar el cobro.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
