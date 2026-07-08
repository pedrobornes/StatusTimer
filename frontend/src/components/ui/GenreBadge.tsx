interface GenreBadgeProps {
  label: string;
}

export default function GenreBadge({ label }: GenreBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-100">
      {label}
    </span>
  );
}
