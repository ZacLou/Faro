"use client"

import { useEffect } from "react"

interface AppErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for the authenticated /app/* section.
 * Suggests reconnecting the wallet as a potential fix.
 */
export default function AppErrorPage({ error, reset }: AppErrorPageProps) {
  useEffect(() => {
    console.error("App section error caught by error boundary:", error)
  }, [error])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-6 max-w-md">
        <svg
          viewBox="0 0 200 200"
          className="mx-auto h-32 w-32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Wallet-style icon — simplified */}
          <rect x="50" y="60" width="100" height="80" rx="8" fill="currentColor" className="text-muted-foreground" opacity="0.3" />
          <rect x="80" y="60" width="40" height="80" fill="currentColor" className="text-muted-foreground" opacity="0.15" />
          <circle cx="120" cy="100" r="14" fill="currentColor" className="text-amber-400" opacity="0.5" />
          <path d="M115 95 L120 90 L125 95 L120 100 Z" fill="currentColor" className="text-destructive" />
        </svg>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          Error en la aplicación
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ocurrió un problema al cargar esta sección.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Intenta reconectar tu wallet o recargar la página.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Reconectar wallet
        </button>
      </div>
    </div>
  )
}
