"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, FileText, CheckCircle2, ExternalLink } from "lucide-react"
import {
  useInitializeEscrow,
  useFundEscrow,
  useSendTransaction,
} from "@trustless-work/escrow"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import { getStellarExpertTxUrl, getStellarExpertContractUrl } from "@/lib/stellar-explorer-urls"
import {
  USDC_TRUSTLINE_ADDRESS,
  USDC_SYMBOL,
  USDC_DIVISOR,
  TRUSTLESS_WORK_PLATFORM_FEE,
  nominalToUSDCSmallestUnits,
} from "@/lib/trustless-work/constants"
import { EscrowStepper, useEscrowStepper } from "@/components/wallet/escrow-stepper"
import { InvoiceTimeline } from "@/components/invoice/invoice-timeline"
import type { Invoice } from "@/lib/product"
import type { InitializeSingleReleaseEscrowPayload } from "@trustless-work/escrow/types"

const INVEST_STEPS = [
  { id: "init_prepare", label: "Preparando creación del escrow" },
  { id: "init_sign", label: "Firmando creación en Freighter" },
  { id: "init_send", label: "Enviando a la red" },
  { id: "fund_prepare", label: "Preparando financiamiento" },
  { id: "fund_sign", label: "Firmando financiamiento en Freighter" },
  { id: "fund_send", label: "Enviando a la red" },
] as const

function amountToInvest(amount: number, discountPercent: number): number {
  return Math.round(amount * (1 - discountPercent / 100))
}

const ESCROW_TYPE = "single-release" as const

function normalizeId(param: unknown): string {
  if (param == null) return ""
  if (typeof param === "string") return param.trim()
  if (Array.isArray(param) && param.length > 0 && typeof param[0] === "string")
    return String(param[0]).trim()
  return String(param).trim()
}

export default function MarketInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = normalizeId(params?.id)
  const { address, isConnected, signTransaction, getWalletNetwork } = useStellarWalletKit()
  const { deployEscrow } = useInitializeEscrow()
  const { fundEscrow } = useFundEscrow()
  const { sendTransaction } = useSendTransaction()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [investing, setInvesting] = useState(false)
  const [investError, setInvestError] = useState<string | null>(null)
  const [investSuccess, setInvestSuccess] = useState<{
    contractId: string
    initTxHash?: string
    fundTxHash?: string
    invoice: Invoice
    toPay: number
  } | null>(null)
  const investInProgressRef = useRef(false)
  const stepper = useEscrowStepper([...INVEST_STEPS])
  // currentStepRef rastrea cuál paso está in_progress para marcarlo como
  // failed si algo lanza durante esa etapa.
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
    if (!id) {
      setLoading(false)
      setError("Factura no encontrada")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
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

  async function handleInvest() {
    if (investInProgressRef.current) return
    if (!invoice || !address) return
    if (invoice.status !== "en_mercado") {
      setInvestError("Esta factura ya no está disponible para inversión.")
      return
    }
    setInvestError(null)
    investInProgressRef.current = true
    setInvesting(true)
    stepper.reset()
    try {
      const toPay = amountToInvest(invoice.amount, invoice.discountRatePercent)
      const hasApiKey =
        typeof process !== "undefined" &&
        Boolean(
          process.env.NEXT_PUBLIC_API_KEY ||
            process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY
        )

      // El escrow on-chain es obligatorio para invertir: si no se puede crear,
      // NO registramos la inversión en la base de datos. Avisamos con un error claro.
      if (!hasApiKey) {
        throw new Error(
          "La integración de escrow (Trustless Work) no está configurada: falta la API key. No se puede crear el escrow, así que la inversión no se registró."
        )
      }
      if (!invoice.debtorAddress) {
        throw new Error(
          "Esta factura no tiene asignada la wallet del deudor, así que no se puede crear el escrow on-chain. Pide que la factura se registre con la dirección Stellar (G...) del deudor e inténtalo de nuevo."
        )
      }

      let contractId: string | undefined
      let initTxHash: string | undefined
      let fundTxHash: string | undefined

      {
        // Validar que la wallet esté en testnet antes de firmar
        const walletNet = await getWalletNetwork()
        if (walletNet) {
          const isWalletTestnet =
            /testnet/i.test(walletNet.network) ||
            walletNet.networkPassphrase?.includes("Test SDF")
          if (!isWalletTestnet) {
            throw new Error(
              `Tu wallet (Freighter) está en la red "${walletNet.network}" pero la app usa Testnet. Cambia la red en Freighter a Testnet e intenta de nuevo.`
            )
          }
        }
        // La API exige que platformAddress y disputeResolver tengan USDC. Si no hay plataforma configurada, usamos al inversionista (quien ya tiene USDC).
        const platformAddress =
          (typeof process !== "undefined" &&
            process.env.NEXT_PUBLIC_TRUSTLESS_WORK_PLATFORM_ADDRESS?.trim()) ||
          address
        // La API Trustless Work espera montos en unidades "humanas" (ej. 24 USDC), no en unidades mínimas
        const nominalMajor = Math.round(nominalToUSDCSmallestUnits(invoice.amount) / USDC_DIVISOR)
        const toPayMajor = Math.round(nominalToUSDCSmallestUnits(toPay) / USDC_DIVISOR)
        if (nominalMajor <= 0 || toPayMajor <= 0) {
          throw new Error("El monto a invertir o el nominal debe ser mayor que 0")
        }

        // Escrow 1 (inversión): inversionista fondea; se libera cuando el proveedor cobra (receiver = proveedor, releaseSigner = proveedor).
        const initPayload: InitializeSingleReleaseEscrowPayload = {
          signer: address,
          engagementId: invoice.id,
          title: `Factura ${invoice.id}`,
          description: `Inversión factura ${invoice.id} - liquidez al proveedor al cobrar`,
          amount: nominalMajor,
          platformFee: TRUSTLESS_WORK_PLATFORM_FEE,
          trustline: { address: USDC_TRUSTLINE_ADDRESS, symbol: USDC_SYMBOL },
          roles: {
            approver: invoice.providerAddress,
            serviceProvider: invoice.providerAddress,
            platformAddress,
            releaseSigner: invoice.providerAddress,
            disputeResolver: platformAddress,
            receiver: invoice.providerAddress,
          },
          milestones: [
            { description: `Cobro de factura ${invoice.id} por el proveedor` },
          ],
        }

        let initRes: Awaited<ReturnType<typeof deployEscrow>>
        beginStep("init_prepare", "Calculando la transacción con Trustless Work…")
        try {
          initRes = await deployEscrow(initPayload, ESCROW_TYPE)
        } catch (apiErr: unknown) {
          const res = (apiErr as { response?: { data?: unknown } })?.response?.data
          const msg =
            typeof res === "object" && res !== null && "message" in res && typeof (res as { message: unknown }).message === "string"
              ? (res as { message: string }).message
              : typeof res === "object" && res !== null && "error" in res && typeof (res as { error: unknown }).error === "string"
                ? (res as { error: string }).error
                : (apiErr as Error)?.message
          throw new Error(msg ? `Trustless Work: ${msg}` : "No se pudo crear el escrow")
        }
        if (initRes.status === "FAILED" || !initRes.unsignedTransaction) {
          throw new Error(
            (initRes as { message?: string }).message || "No se pudo crear el escrow"
          )
        }
        const contractIdFromInit = (initRes as { contractId?: string }).contractId
        endStep("init_prepare")

        beginStep("init_sign", "Confirma en la ventana de Freighter")
        const { signedTxXdr: signedInitXdr } = await signTransaction(
          initRes.unsignedTransaction
        )
        endStep("init_sign")

        beginStep("init_send", "Enviando a Stellar…")
        let sendInitRes: { status?: string; contractId?: string; message?: string; transactionHash?: string }
        try {
          sendInitRes = await sendTransaction(signedInitXdr) as typeof sendInitRes
        } catch (sendErr: unknown) {
          const axiosData = (sendErr as { response?: { data?: unknown } })?.response?.data
          console.error("[Escrow] send-transaction 400 body:", JSON.stringify(axiosData))
          const apiMsg =
            typeof axiosData === "object" && axiosData !== null && "message" in axiosData
              ? (axiosData as { message: string }).message
              : typeof axiosData === "string"
                ? axiosData
                : null
          throw new Error(apiMsg ? `Trustless Work: ${apiMsg}` : "Error al enviar la transacción del escrow. Verifica que Freighter esté en Testnet y tenga trustline USDC.")
        }
        if (sendInitRes?.status === "FAILED") {
          throw new Error(sendInitRes?.message || "Error al enviar la transacción del escrow")
        }
        contractId = contractIdFromInit ?? sendInitRes?.contractId
        if (!contractId) {
          throw new Error("No se recibió el contractId del escrow")
        }
        initTxHash = sendInitRes?.transactionHash
        endStep("init_send")

        beginStep("fund_prepare", "Calculando la transacción de financiamiento…")
        const fundRes = await fundEscrow(
          { contractId, amount: toPayMajor, signer: address },
          ESCROW_TYPE
        )
        if (fundRes.status === "FAILED" || !fundRes.unsignedTransaction) {
          throw new Error(
            (fundRes as { message?: string }).message || "No se pudo financiar el escrow"
          )
        }
        endStep("fund_prepare")

        beginStep("fund_sign", "Confirma en la ventana de Freighter")
        const { signedTxXdr: signedFundXdr } = await signTransaction(
          fundRes.unsignedTransaction
        )
        endStep("fund_sign")

        beginStep("fund_send", "Enviando a Stellar…")
        let sendFundRes: { status?: string; message?: string; transactionHash?: string }
        try {
          sendFundRes = await sendTransaction(signedFundXdr) as typeof sendFundRes
        } catch (sendErr: unknown) {
          const axiosData = (sendErr as { response?: { data?: unknown } })?.response?.data
          console.error("[Escrow] fund send-transaction 400 body:", JSON.stringify(axiosData))
          const apiMsg =
            typeof axiosData === "object" && axiosData !== null && "message" in axiosData
              ? (axiosData as { message: string }).message
              : typeof axiosData === "string"
                ? axiosData
                : null
          throw new Error(apiMsg ? `Trustless Work (fund): ${apiMsg}` : "Error al financiar el escrow. Verifica que tengas USDC testnet (trustline y balance) en Freighter.")
        }
        if (sendFundRes?.status === "FAILED") {
          throw new Error(sendFundRes?.message || "Error al enviar el financiamiento del escrow")
        }
        fundTxHash = sendFundRes?.transactionHash
        endStep("fund_send")
      }

      const res = await fetch(`/api/invoices/${id}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorAddress: address,
          ...(contractId && { contractId }),
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        const errMsg = data?.error || "Error al invertir"
        if (res.status === 400 && errMsg.includes("no está disponible para inversión") && id) {
          const refetchRes = await fetch(`/api/invoices/${encodeURIComponent(id)}`)
          if (refetchRes.ok) {
            const updated = await refetchRes.json() as Invoice
            setInvoice(updated)
          }
        }
        throw new Error(errMsg)
      }
      let verified = (data as Invoice | undefined)?.status === "financiada"
      if (!verified && id) {
        const checkRes = await fetch(`/api/invoices/${encodeURIComponent(id)}`, { cache: "no-store" })
        if (checkRes.ok) {
          const current = await checkRes.json() as Invoice
          if (current.status === "en_mercado") {
            await fetch(`/api/invoices/${encodeURIComponent(id)}/invest`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                investorAddress: address,
                ...(contractId && { contractId }),
              }),
            })
          }
        }
      }
      setConfirmOpen(false)
      if (contractId) {
        setInvestSuccess({
          contractId,
          initTxHash,
          fundTxHash,
          invoice,
          toPay,
        })
      } else {
        router.push("/app")
      }
    } catch (e) {
      const err = e as { code?: number; message?: string }
      const raw = err instanceof Error ? err.message : String(err?.message ?? "Error al invertir")
      const isSetWalletFirst = err?.code === -3 || /set the wallet first/i.test(raw)
      const isUsdcTrustline =
        /receiver|required asset|USDC|trustline/i.test(raw)
      const friendly =
        isSetWalletFirst
          ? "La sesión de la wallet no está lista para firmar. Desconecta y vuelve a conectar tu wallet (Conectar wallet), luego intenta de nuevo."
          : isUsdcTrustline
            ? "Tu wallet debe tener USDC (trustline) para poder invertir y recibir el pago al vencimiento. Añade el activo USDC en tu wallet (p. ej. Freighter) y vuelve a intentar."
            : raw
      setInvestError(friendly)
      if (currentStepRef.current) stepper.fail(currentStepRef.current, friendly)
      console.error("Error al invertir:", e)
    } finally {
      investInProgressRef.current = false
      setInvesting(false)
    }
  }

  function openConfirm() {
    if (!isConnected || !address) {
      setInvestError("Conecta tu wallet para invertir.")
      return
    }
    setInvestError(null)
    setConfirmOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
          <Link href="/app/market">
            <ArrowLeft className="h-4 w-4" />
            Volver al mercado
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando...
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
          <Link href="/app/market">
            <ArrowLeft className="h-4 w-4" />
            Volver al mercado
          </Link>
        </Button>
        <p className="text-destructive">{error ?? "Factura no encontrada"}</p>
      </div>
    )
  }

  if (investSuccess) {
    const { contractId, initTxHash, fundTxHash, invoice: inv, toPay: paid } = investSuccess
    const expertContractUrl = getStellarExpertContractUrl(contractId)
    return (
      <div className="flex flex-col gap-8 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
          <Link href="/app/market">
            <ArrowLeft className="h-4 w-4" />
            Volver al mercado
          </Link>
        </Button>
        <div className="glass-panel p-6 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Inversión realizada</h1>
              <p className="text-sm text-muted-foreground">Comprobante de inversión — Trustless Work (escrow)</p>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Factura</dt>
              <dd className="mt-1 font-medium">{inv.id}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Monto invertido</dt>
              <dd className="mt-1 font-display font-bold">
                ${paid.toLocaleString("es-MX")} {inv.currency}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Nominal al vencimiento</dt>
              <dd className="mt-1 font-display font-bold">
                ${inv.amount.toLocaleString("es-MX")} {inv.currency}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Descuento</dt>
              <dd className="mt-1 font-medium">{inv.discountRatePercent}%</dd>
            </div>
            {inv.debtorAddress && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Deudor (quien pagará al vencimiento)</dt>
                <dd className="mt-1 font-mono text-xs break-all text-muted-foreground">
                  {inv.debtorAddress}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">
                  Esa wallet verá la factura como «por pagar» en su dashboard al conectar.
                </p>
              </div>
            )}
          </dl>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Verificar en Stellar Expert (testnet)</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={expertContractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Contrato escrow (Trustless Work)
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              {initTxHash && (
                <li>
                  <a
                    href={getStellarExpertTxUrl(initTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Tx. inicialización escrow
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              )}
              {fundTxHash && (
                <li>
                  <a
                    href={getStellarExpertTxUrl(fundTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Tx. financiamiento (tu pago)
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link href="/app">Ir al dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={expertContractUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Stellar Expert (testnet)
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isAvailable = invoice.status === "en_mercado"
  const toPay = amountToInvest(invoice.amount, invoice.discountRatePercent)

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="gap-2 w-fit">
        <Link href="/app/market">
          <ArrowLeft className="h-4 w-4" />
          Volver al mercado
        </Link>
      </Button>

      <InvoiceTimeline invoice={invoice} />

      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{invoice.id}</h1>
            <p className="text-sm text-muted-foreground">{invoice.debtorName}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Emisor</dt>
            <dd className="mt-1 font-medium">{invoice.emitterName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Deudor</dt>
            <dd className="mt-1 font-medium">{invoice.debtorName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Monto nominal</dt>
            <dd className="mt-1 font-display text-lg font-bold">
              ${invoice.amount.toLocaleString("es-MX")} {invoice.currency}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Tasa de descuento</dt>
            <dd className="mt-1 font-display text-lg font-bold text-primary">
              {invoice.discountRatePercent}%
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Vencimiento</dt>
            <dd className="mt-1 font-medium">
              {new Date(invoice.dueDate).toLocaleDateString("es-MX")}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Estado</dt>
            <dd className="mt-1 font-medium">{invoice.status}</dd>
          </div>
        </dl>

        {isAvailable && (
          <>
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-foreground">Si inviertes ahora</p>
              <p className="mt-1 text-2xl font-display font-bold text-primary">
                ${toPay.toLocaleString("es-MX")} {invoice.currency}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                (valor nominal menos {invoice.discountRatePercent}% descuento). Al vencimiento recibes el nominal; tu ganancia es el descuento.
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Requisito: tu wallet debe tener el activo USDC (trustline) para invertir y recibir el pago. Si no lo tienes, añádelo en tu wallet (p. ej. Freighter) antes de continuar.
            </p>
          </>
        )}

        {stepper.active && (
          <div className="mt-4">
            <EscrowStepper steps={stepper.steps} />
          </div>
        )}

        {investError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {investError}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-3">
          {isAvailable ? (
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={openConfirm}
            >
              Invertir en esta factura
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta factura ya no está disponible para inversión ({invoice.status}).
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar inversión</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a invertir{" "}
              <strong>
                ${toPay.toLocaleString("es-MX")} {invoice.currency}
              </strong>{" "}
              en la factura {invoice.id} (descuento {invoice.discountRatePercent}%). El proveedor recibirá esa liquidez. Al vencimiento, el negocio paga el nominal y tú recibes{" "}
              <strong>${invoice.amount.toLocaleString("es-MX")} {invoice.currency}</strong>; tu ganancia es el descuento. ¿Continuar?
            </AlertDialogDescription>
            {investError && (
              <p className="text-destructive text-sm font-medium" role="alert">
                {investError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={investing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleInvest()
              }}
              disabled={investing}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {investing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Confirmar inversión"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
