import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface MediaViewMoreLinkProps {
  href: string;
  label: string;
}

export default function MediaViewMoreLink({
  href,
  label,
}: MediaViewMoreLinkProps) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
