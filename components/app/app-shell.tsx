"use client"

import { useState } from "react"
import Image from "next/image"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppHeader } from "@/components/app/app-header"
import { AppSidebar } from "@/components/app/app-sidebar"
import { WalletStatusBar } from "@/components/app/wallet-status-bar"
import { WalletOnboardingProvider } from "@/lib/wallet/wallet-onboarding-context"
import {
  WalletOnboardingDialog,
  WalletOnboardingAutoOpen,
} from "@/components/wallet/wallet-onboarding-dialog"
import { useStellarWalletKit } from "@/lib/wallet/stellar-wallet-kit-provider"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button"

function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useStellarWalletKit()

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-8 max-w-sm text-center">
          <Image
            src="/Farologo.svg"
            alt="Faro"
            width={56}
            height={56}
            className="h-14 w-auto"
            priority
          />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Conecta tu wallet</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para acceder al panel necesitas conectar tu wallet de Stellar (Freighter u otra).
              Tu dirección es tu identidad en Faro.
            </p>
          </div>
          <ConnectWalletButton
            label="Conectar wallet"
            redirectOnConnect={false}
            variant="primary"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            ¿No tienes Freighter?{" "}
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Descárgalo aquí
            </a>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <WalletOnboardingProvider>
      <WalletGate>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent
              side="left"
              className="w-64 p-0 gap-0 border-r border-border bg-sidebar md:hidden"
            >
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <AppSidebar
                variant="sheet"
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 flex-col min-w-0 md:pl-64">
            <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
            <WalletStatusBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
        <WalletOnboardingDialog />
        <WalletOnboardingAutoOpen />
      </WalletGate>
    </WalletOnboardingProvider>
  )
}
