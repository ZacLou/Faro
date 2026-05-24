"use client"

/**
 * Wizard de onboarding de wallet para Faro.
 *
 * Lleva al usuario paso a paso desde "no tengo wallet" hasta "lista para
 * usar Faro": conectar Freighter → red Testnet → fondear → trustline USDC.
 * Cada paso muestra su estado (pendiente/✓) detectado por useWalletStatus,
 * y ofrece la acción concreta cuando corresponde (incluido un botón de
 * "Añadir trustline" que firma y envía la ChangeTrust con un solo click).
 */

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Wallet,
  Network,
  Coins,
  Banknote,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import { useWalletStatus } from "@/lib/wallet/use-wallet-status"
import { useWalletOnboarding } from "@/lib/wallet/wallet-onboarding-context"
import { addUsdcTrustline } from "@/lib/wallet/add-usdc-trustline"
import { formatBalance } from "@/lib/wallet/get-account-balances"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface StepProps {
  index: number
  done: boolean
  active: boolean
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Step({ index, done, active, title, icon, children }: StepProps) {
  return (
    <div className={cn("flex gap-4", !active && !done && "opacity-60")}>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-muted/30 text-muted-foreground"
          )}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
        </div>
        <div
          className={cn(
            "mt-1 w-0.5 flex-1 transition-colors",
            done ? "bg-emerald-500/30" : "bg-border"
          )}
        />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paso {index}
          </span>
          {done && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Listo
            </span>
          )}
        </div>
        <h3 className="mt-0.5 font-semibold text-foreground">{title}</h3>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

export function WalletOnboardingDialog() {
  const { isOpen, close } = useWalletOnboarding()
  const { address, isConnected, openConnectModal, signTransaction } =
    useStellarWalletKit()
  const s = useWalletStatus()
  const [addingTrustline, setAddingTrustline] = useState(false)

  // Detectar pasos
  const step1Done = isConnected && Boolean(address)
  const step2Done = step1Done && s.isOnExpectedNetwork === true
  const step3Done = step1Done && !s.accountNotFunded && s.xlmBalance > 1
  const step4Done = step1Done && s.hasUsdcTrustline
  const allDone = step1Done && step2Done && step3Done && step4Done

  // Cuál es el paso "activo" (el primero pendiente)
  const activeStep = !step1Done
    ? 1
    : !step2Done
      ? 2
      : !step3Done
        ? 3
        : !step4Done
          ? 4
          : 5

  async function handleAddTrustline() {
    if (!address) return
    setAddingTrustline(true)
    try {
      const { hash } = await addUsdcTrustline(address, signTransaction)
      toast.success("Trustline USDC añadida", {
        description: `Tx ${hash.slice(0, 8)}…`,
      })
      // refrescar status
      setTimeout(() => s.refetch(), 1500)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo añadir la trustline USDC"
      )
    } finally {
      setAddingTrustline(false)
    }
  }

  function handleDismiss() {
    try {
      localStorage.setItem("faro_onboarding_dismissed", "1")
    } catch {}
    close()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Configura tu wallet para Faro
          </DialogTitle>
          <DialogDescription>
            Faro funciona sobre Stellar (Testnet). Sigue estos pasos una sola vez
            para poder tokenizar, invertir, pagar y reclamar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {/* Paso 1: Conectar Freighter */}
          <Step
            index={1}
            done={step1Done}
            active={activeStep === 1}
            title="Conectar Freighter"
            icon={<Wallet className="h-4 w-4" />}
          >
            <p>
              Necesitas Freighter (extensión del navegador) o una wallet
              compatible con Stellar.
            </p>
            {!step1Done && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openConnectModal()} className="gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  Conectar wallet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="gap-1.5"
                >
                  <a
                    href="https://freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Instalar Freighter
                  </a>
                </Button>
              </div>
            )}
          </Step>

          {/* Paso 2: Red Testnet */}
          <Step
            index={2}
            done={step2Done}
            active={activeStep === 2}
            title={`Cambia la red a ${s.expectedNetworkLabel}`}
            icon={<Network className="h-4 w-4" />}
          >
            <p>
              En Freighter abre <strong>Configuración → Red</strong> y selecciona{" "}
              <strong>{s.expectedNetworkLabel}</strong>.
              {s.walletNetwork &&
                s.isOnExpectedNetwork === false && (
                  <>
                    {" "}
                    Tu wallet está actualmente en{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {s.walletNetwork.network}
                    </code>
                    .
                  </>
                )}
            </p>
            {step1Done && !step2Done && (
              <Button
                size="sm"
                variant="outline"
                onClick={s.refetch}
                className="mt-3 gap-1.5"
                disabled={s.loading}
              >
                {s.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Ya cambié la red, verificar
              </Button>
            )}
          </Step>

          {/* Paso 3: Fondear con XLM */}
          <Step
            index={3}
            done={step3Done}
            active={activeStep === 3}
            title="Fondea tu cuenta con XLM"
            icon={<Coins className="h-4 w-4" />}
          >
            <p>
              Stellar cobra una pequeña reserva de XLM para activar la cuenta y
              cada activo. En Testnet es gratis con Friendbot.
              {step1Done && (
                <>
                  {" "}
                  XLM actual: <strong>{formatBalance(String(s.xlmBalance))}</strong>.
                </>
              )}
            </p>
            {step1Done && !step3Done && address && s.expectedNetworkLabel === "Testnet" && (
              <Button
                size="sm"
                asChild
                className="mt-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <a
                  href={`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Recibir XLM testnet (Friendbot)
                </a>
              </Button>
            )}
          </Step>

          {/* Paso 4: Trustline USDC */}
          <Step
            index={4}
            done={step4Done}
            active={activeStep === 4}
            title="Añade la trustline USDC"
            icon={<Banknote className="h-4 w-4" />}
          >
            <p>
              Faro mueve USDC. Añadir la trustline le dice a tu cuenta que acepta
              ese activo. Con un click la firmamos y enviamos por ti.
              {step4Done && s.usdcBalance != null && (
                <>
                  {" "}
                  USDC actual: <strong>{formatBalance(String(s.usdcBalance))}</strong>.
                </>
              )}
            </p>
            {step1Done && !step4Done && (
              <Button
                size="sm"
                onClick={handleAddTrustline}
                disabled={addingTrustline || !step3Done}
                className="mt-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addingTrustline ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Banknote className="h-3.5 w-3.5" />
                )}
                Añadir trustline USDC
              </Button>
            )}
            {!step3Done && !step4Done && step1Done && (
              <p className="mt-2 text-xs text-muted-foreground">
                Necesitas un poco de XLM antes (paso 3) para firmar esta operación.
              </p>
            )}
          </Step>

          {/* Cierre */}
          <div className="mt-2 flex gap-3 pt-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full">
              {allDone ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              {allDone ? (
                <>
                  <p className="font-semibold text-foreground">
                    Wallet lista 🎉
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ya puedes tokenizar facturas, invertir en el mercado, pagar
                    como deudor y reclamar tu cobro como inversionista.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Completa los pasos pendientes para usar todas las funciones de
                  Faro.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            No mostrar de nuevo
          </Button>
          <Button size="sm" onClick={close}>
            {allDone ? "Empezar a usar Faro" : "Cerrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Auto-abre el wizard una sola vez por usuario nuevo (cuando entra a /app
 * sin wallet conectada y nunca lo descartó). El registro de descarte se
 * guarda en localStorage para no ser intrusivo en visitas siguientes.
 */
export function WalletOnboardingAutoOpen() {
  const { isConnected } = useStellarWalletKit()
  const { open } = useWalletOnboarding()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isConnected) return
    let dismissed = false
    try {
      dismissed = localStorage.getItem("faro_onboarding_dismissed") === "1"
    } catch {}
    if (dismissed) return
    const t = setTimeout(open, 800)
    return () => clearTimeout(t)
  }, [isConnected, open])

  return null
}
