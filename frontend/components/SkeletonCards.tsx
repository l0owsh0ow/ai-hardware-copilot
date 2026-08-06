export default function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card mb-4 animate-pulse p-5">
          <div className="mb-3 flex items-start justify-between">
            <div className="h-4 w-40 rounded bg-line-soft" />
            <div className="h-5 w-20 rounded-[20px] bg-line-soft" />
          </div>
          <div className="mb-3 flex gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-6 w-20 rounded-md bg-line-soft" />
            ))}
          </div>
          <div className="h-12 rounded-lg bg-line-soft" />
          <div className="mt-3 flex justify-between">
            <div className="h-5 w-24 rounded bg-line-soft" />
            <div className="h-7 w-24 rounded-lg bg-line-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}
