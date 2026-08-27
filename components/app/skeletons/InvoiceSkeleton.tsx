import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton loader matching the invoice detail page layout. */
export default function InvoiceDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Amount card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-10 w-36" />
        <Skeleton className="mt-1 h-4 w-32" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Details section */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>

      {/* Action button */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}
