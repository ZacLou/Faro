"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button"

export function AppHeader({
  onOpenMobileMenu,
}: {
  onOpenMobileMenu?: () => void
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {onOpenMobileMenu ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú"
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/Farologo.svg"
            alt="Faro"
            width={28}
            height={28}
            className="h-7 w-auto"
          />
          <span className="font-display text-base font-bold text-foreground hidden sm:inline">Faro</span>
        </Link>
        <h2 className="text-sm font-medium text-muted-foreground border-l border-border pl-4 hidden md:block">
          Bienvenido de nuevo
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <ConnectWalletButton />
      </div>
    </header>
  )
}
