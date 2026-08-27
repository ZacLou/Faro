import React from "react"
import EmptyState from "./EmptyState"

const MarketIcon = () => (
  <svg viewBox="0 0 160 120" className="h-28 w-36" fill="none" aria-hidden="true">
    <rect x="40" y="8" width="80" height="104" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
    <rect x="52" y="28" width="56" height="4" rx="2" fill="currentColor" className="text-muted-foreground/20" />
    <rect x="52" y="40" width="40" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/15" />
    <rect x="52" y="50" width="48" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/15" />
    <rect x="52" y="60" width="32" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/15" />
    <text x="102" y="88" className="fill-muted-foreground/40" fontSize="28" fontWeight="bold" fontFamily="system-ui" textAnchor="middle">?</text>
  </svg>
)

export default function MarketEmptyState() {
  return (
    <EmptyState
      icon={<MarketIcon />}
      title="Sin facturas disponibles"
      description="El marketplace esta vacio. Vuelve mas tarde o conecta tu wallet para tokenizar tus propias facturas."
    />
  )
}
