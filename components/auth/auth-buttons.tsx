"use client"

import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import { Button } from "@/components/ui/button"

/**
 * Botón que abre el modal de wallet (equivale a "iniciar sesión").
 */
export function AuthSignInButton({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  const { openConnectModal } = useStellarWalletKit()
  return (
    <button className={className} onClick={() => openConnectModal()}>
      {children ?? "Conectar wallet"}
    </button>
  )
}

/**
 * Alias de AuthSignInButton para compatibilidad con el resto de la UI.
 */
export function AuthSignUpButton({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  const { openConnectModal } = useStellarWalletKit()
  return (
    <button className={className} onClick={() => openConnectModal()}>
      {children ?? "Conectar wallet"}
    </button>
  )
}

/**
 * Muestra la dirección truncada de la wallet conectada + botón de desconectar.
 */
export function AuthUserButton(_props?: object) {
  const { address, disconnect } = useStellarWalletKit()
  if (!address) return null
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={disconnect}
      className="font-mono text-xs text-muted-foreground hover:text-destructive"
      title={`Desconectar ${address}`}
    >
      {short} · Salir
    </Button>
  )
}
