export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    const formatted = absolute / 1_000_000;
    return `${trimTrailingZero(formatted.toFixed(1))}M`;
  }

  if (absolute >= 1_000) {
    const formatted = absolute / 1_000;
    return `${trimTrailingZero(formatted.toFixed(1))}K`;
  }

  return absolute.toLocaleString("en-US");
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, "");
}
