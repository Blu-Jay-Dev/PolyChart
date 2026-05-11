import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-[#1c2030]",
        className
      )}
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-2 h-full p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="flex-1 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#252a38] bg-[#141720] p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex gap-4 p-3 border-b border-[#252a38]">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
