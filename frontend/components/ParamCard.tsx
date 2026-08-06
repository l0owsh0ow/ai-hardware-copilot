export default function ParamCard({
  name,
  value,
  editable,
  onChange,
}: {
  name: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="card p-4">
      <div className="mb-1 text-[11px] text-muted">{name}</div>
      {editable ? (
        <input
          className="w-full border-none bg-transparent text-sm font-medium text-ink outline-none"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <div className="text-sm font-medium text-ink">{value || "—"}</div>
      )}
    </div>
  );
}
