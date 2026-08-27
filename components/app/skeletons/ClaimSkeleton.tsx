import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton loader matching the claim status page layout with timeline. */
export default function ClaimStatusSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-3 w-48" />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Skeleton className="h-6 w-6 rounded-full" />
              {i < 2 && <Skeleton className="mt-1 h-8 w-0.5" />}
            </div>
            <div className="flex-1 space-y-2 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Action area */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}
