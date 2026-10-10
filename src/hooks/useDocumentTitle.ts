import { useEffect } from "react";
import { site } from "@/config/site";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline.replace(/\.$/, "")}`;
  }, [title]);
}
