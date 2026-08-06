export default function Spinner({ text, sub }: { text?: string; sub?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-primary-light border-t-primary" />
      {text && <div className="text-sm text-soft">{text}</div>}
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </div>
  );
}
