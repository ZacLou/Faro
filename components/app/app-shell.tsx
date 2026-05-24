"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppHeader } from "@/components/app/app-header"
import { AppSidebar } from "@/components/app/app-sidebar"
import { WalletStatusBar } from "@/components/app/wallet-status-bar"
import { WalletOnboardingProvider } from "@/lib/wallet/wallet-onboarding-context"
import {
  WalletOnboardingDialog,
  WalletOnboardingAutoOpen,
} from "@/components/wallet/wallet-onboarding-dialog"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <WalletOnboardingProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop: sidebar fija (hidden en móvil por CSS). Mobile: Sheet al pulsar menú */}
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
    </WalletOnboardingProvider>
  )
}
