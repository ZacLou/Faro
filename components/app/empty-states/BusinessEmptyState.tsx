import React from "react"
import EmptyState from "./EmptyState"

const BusinessIcon = () => (
  <svg viewBox="0 0 160 120" className="h-28 w-36" fill="none" aria-hidden="true">
    <rect x="36" y="12" width="88" height="96" rx="6" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
    <rect x="68" y="6" width="24" height="12" rx="3" fill="currentColor" className="text-muted-foreground/25" />
    <path d="M50 36 L56 42 L72 28" stroke="currentColor" strokeWidth="2" className="text-emerald-400/60 dark:text-emerald-500/60" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M50 54 L56 60 L72 46" stroke="currentColor" strokeWidth="2" className="text-emerald-400/60 dark:text-emerald-500/60" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M50 72 L56 78 L72 64" stroke="currentColor" strokeWidth="2" className="text-emerald-400/60 dark:text-emerald-500/60" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
)

export default function BusinessEmptyState() {
  return (
    <EmptyState
      icon={<BusinessIcon />}
      title="Todo al dia"
      description="No tienes facturas pendientes. Cuando recibas una solicitud de pago, aparecera aqui."
    />
  )
}
