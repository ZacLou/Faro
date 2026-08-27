"use client"

import { useEffect } from "react"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * General error boundary for the public-facing app.
 * Shows a retry button and a link to report the bug on GitHub.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled error caught by error boundary:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto mb-8 max-w-md">
        {/* Faro lighthouse SVG */}
        <svg
          viewBox="0 0 200 200"
          className="mx-auto h-40 w-40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Water/waves */}
          <path
            d="M20 170 Q50 160 80 170 Q110 180 140 170 Q170 160 180 170"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-300 dark:text-blue-600"
            fill="none"
          />
          <path
            d="M30 178 Q60 168 90 178 Q120 188 150 178 Q170 170 180 178"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-200 dark:text-blue-700"
            fill="none"
          />
          {/* Lighthouse body */}
          <path d="M100 40 L120 160 L80 160 Z" fill="currentColor" className="text-muted-foreground" />
          {/* Top light room */}
          <rect x="88" y="28" width="24" height="16" rx="2" fill="currentColor" className="text-muted-foreground" />
          {/* Flashing light */}
          <circle cx="100" cy="28" r="6" className="fill-amber-400" />
          <circle cx="100" cy="28" r="12" className="fill-amber-400/20" />
          {/* Roof */}
          <path d="M84 28 L100 14 L116 28 Z" fill="currentColor" className="text-muted-foreground" />
          {/* Stripe pattern */}
          <rect x="84" y="80" width="32" height="6" fill="background" />
          <rect x="82" y="110" width="36" height="6" fill="background" />
          <rect x="80" y="140" width="40" height="6" fill="background" />
          {/* Base */}
          <rect x="70" y="160" width="60" height="6" rx="2" fill="currentColor" className="text-muted-foreground" />
        </svg>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">
          Algo salió mal
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          El faro encontró un error inesperado.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "Intenta de nuevo o repórtalo al equipo."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
        <a
          href="https://github.com/Faro-T/Faro/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Reportar bug
        </a>
      </div>
    </div>
  )
}
