import React from "react"
import EmptyState from "./EmptyState"

const InvestmentIcon = () => (
  <svg viewBox="0 0 160 120" className="h-28 w-36" fill="none" aria-hidden="true">
    <rect x="24" y="8" width="112" height="104" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
    <line x1="44" y1="88" x2="128" y2="88" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/25" />
    <line x1="44" y1="24" x2="44" y2="88" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/25" />
    <line x1="52" y1="72" x2="120" y2="72" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" strokeDasharray="4 3" />
    <circle cx="112" cy="36" r="12" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/35" />
    <line x1="120" y1="44" x2="128" y2="52" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground/35" strokeLinecap="round" />
  </svg>
)

export default function InvestorEmptyState() {
  return (
    <EmptyState
      icon={<InvestmentIcon />}
      title="Sin inversiones activas"
      description="Explora el marketplace para encontrar facturas tokenizadas e invertir en negocios reales."
      action={{ label: "Explorar marketplace", href: "/app/market" }}
    />
  )
}
