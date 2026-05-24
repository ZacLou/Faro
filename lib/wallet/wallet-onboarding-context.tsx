"use client"

/**
 * Contexto minimalista para abrir el wizard de onboarding de wallet desde
 * cualquier componente dentro de /app (header, barra de estado, banners, etc.).
 * El diálogo se monta una sola vez en AppShell.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react"

interface WalletOnboardingContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const Context = createContext<WalletOnboardingContextValue | null>(null)

export function WalletOnboardingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useWalletOnboarding(): WalletOnboardingContextValue {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error("useWalletOnboarding debe usarse dentro de WalletOnboardingProvider")
  }
  return ctx
}
