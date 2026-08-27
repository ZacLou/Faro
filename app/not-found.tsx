import Link from "next/link"

/**
 * 404 page with Faro branding.
 * Server-renderable, no client dependencies.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto mb-8 max-w-md">
        {/* Faro lighthouse SVG — dimmed variant for "off" state */}
        <svg
          viewBox="0 0 200 200"
          className="mx-auto h-40 w-40 opacity-40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Lighthouse body */}
          <path d="M100 40 L120 160 L80 160 Z" fill="currentColor" className="text-muted-foreground" />
          {/* Top light room */}
          <rect x="88" y="28" width="24" height="16" rx="2" fill="currentColor" className="text-muted-foreground" />
          {/* Light beam (off/dim) */}
          <circle cx="100" cy="28" r="6" fill="currentColor" className="text-muted-foreground" opacity="0.3" />
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
          404
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          El faro no encuentra esta página.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          La ruta que buscas no existe o fue movida.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
        <Link
          href="/market"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Ver marketplace
        </Link>
      </div>
    </div>
  )
}
