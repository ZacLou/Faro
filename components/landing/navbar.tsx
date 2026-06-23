"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button"
import { AuthSignedIn, AuthSignedOut } from "@/components/auth/auth-gates"
import { AuthUserButton } from "@/components/auth/auth-buttons"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "#features", label: "Características" },
  { href: "#flujo", label: "Flujo" },
  { href: "#comparison", label: "Comparativa" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[hsl(var(--accent))]/15 bg-[hsl(var(--background))]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/Farologo.svg"
            alt="Faro"
            width={36}
            height={36}
            className="h-8 w-auto"
            priority
          />
          <span className="font-display text-xl font-bold text-foreground">Faro</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <AuthSignedOut>
            <ConnectWalletButton label="Conectar wallet" redirectOnConnect variant="outline" />
            <ConnectWalletButton label="Entrar" redirectOnConnect />
          </AuthSignedOut>
          <AuthSignedIn>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app">Ir al dashboard</Link>
            </Button>
            <AuthUserButton />
          </AuthSignedIn>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-muted-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4 px-6 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 border-t border-border/40 pt-4">
              <AuthSignedOut>
                <ConnectWalletButton label="Entrar con Freighter" redirectOnConnect variant="primary" className="w-full" />
              </AuthSignedOut>
              <AuthSignedIn>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/app">Ir al dashboard</Link>
                </Button>
                <div className="flex justify-center">
                  <AuthUserButton />
                </div>
              </AuthSignedIn>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
