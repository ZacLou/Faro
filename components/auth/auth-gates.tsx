"use client"

import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"

/**
 * Renderiza hijos solo si hay wallet conectada (equivale a "signed in").
 */
export function AuthSignedIn({ children }: { children: React.ReactNode }) {
  const { isConnected } = useStellarWalletKit()
  if (!isConnected) return null
  return <>{children}</>
}

/**
 * Renderiza hijos solo si NO hay wallet conectada (equivale a "signed out").
 */
export function AuthSignedOut({ children }: { children: React.ReactNode }) {
  const { isConnected } = useStellarWalletKit()
  if (isConnected) return null
  return <>{children}</>
}
