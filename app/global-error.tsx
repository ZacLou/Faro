"use client"

/**
 * Global error fallback of last resort.
 * Rendered when the root layout itself crashes.
 * Must define its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="m-0 flex min-h-screen items-center justify-center bg-neutral-950 p-4 font-sans text-white antialiased">
        <div className="mx-auto max-w-md text-center">
          {/* Simple lighthouse icon */}
          <svg
            viewBox="0 0 200 200"
            className="mx-auto h-32 w-32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M100 40 L120 160 L80 160 Z" fill="#525252" />
            <rect x="88" y="28" width="24" height="16" rx="2" fill="#525252" />
            <circle cx="100" cy="28" r="6" fill="#fbbf24" />
            <circle cx="100" cy="28" r="12" fill="#fbbf24" opacity="0.2" />
            <path d="M84 28 L100 14 L116 28 Z" fill="#525252" />
            <rect x="84" y="80" width="32" height="6" fill="#0a0a0a" />
            <rect x="82" y="110" width="36" height="6" fill="#0a0a0a" />
            <rect x="80" y="140" width="40" height="6" fill="#0a0a0a" />
            <rect x="70" y="160" width="60" height="6" rx="2" fill="#525252" />
          </svg>

          <h1 className="mt-6 text-3xl font-bold">Error crítico</h1>
          <p className="mt-3 text-neutral-400">
            El faro encontró un error grave y no puede continuar.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {error.message || "Error inesperado en la aplicación."}
          </p>

          <button
            onClick={reset}
            className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-neutral-950 shadow transition-colors hover:bg-neutral-200"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
