export default function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="volt-card overflow-hidden">
          <div className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="skeleton h-5 w-36 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="mb-3 flex gap-1.5">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="skeleton h-5 w-16 rounded-full" />
              ))}
            </div>
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/70 px-5 py-3">
            <div className="skeleton h-3 w-40 rounded-full" />
            <div className="skeleton h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
