import type { ReactNode } from "react";
import { isLiveUrl } from "@/lib/links";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** External link that renders as a quiet "soon" label while the URL is a placeholder. */
export function ExternalLink({ href, children, className = "" }: ExternalLinkProps) {
  if (!isLiveUrl(href)) {
    return (
      <span className={`inline-flex items-baseline gap-2 text-faint ${className}`}>
        {children}
        <span className="eyebrow text-[9px]! text-faint">Soon</span>
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`link-underline ${className}`}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
