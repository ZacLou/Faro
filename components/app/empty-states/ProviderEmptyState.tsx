import React from "react"
import EmptyState from "./EmptyState"

const TokenizeIcon = () => (
  <svg viewBox="0 0 160 120" className="h-28 w-36" fill="none" aria-hidden="true">
    <rect x="24" y="16" width="72" height="88" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
    <rect x="36" y="32" width="48" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/20" />
    <rect x="36" y="42" width="36" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/15" />
    <rect x="36" y="52" width="44" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/15" />
    <circle cx="120" cy="60" r="24" stroke="currentColor" strokeWidth="2" className="text-amber-400/60 dark:text-amber-500/60" />
    <text x="120" y="66" className="fill-amber-500 dark:fill-amber-400" fontSize="18" fontWeight="bold" fontFamily="system-ui" textAnchor="middle">$</text>
    <path d="M96 56 L114 56" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
  </svg>
)

export default function ProviderEmptyState() {
  return (
    <EmptyState
      icon={<TokenizeIcon />}
      title="No tienes facturas tokenizadas"
      description="Convierte tus facturas en activos digitales. Empieza tokenizando tu primera factura."
      action={{ label: "Tokenizar mi primera factura", href: "/app/tokenize" }}
    />
  )
}
