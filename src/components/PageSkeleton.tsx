const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Navbar skeleton */}
    <div className="h-14 border-b border-border/40 flex items-center px-4 gap-3">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="h-4 w-20 rounded-lg bg-muted animate-pulse" />
    </div>

    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Card skeleton */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6 space-y-4">
        <div className="h-5 w-2/5 rounded-lg bg-muted animate-pulse" />
        <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>

      {/* Second card skeleton */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6 space-y-3">
        <div className="h-4 w-1/4 rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
        <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  </div>
);

export default PageSkeleton;
