import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";

interface SectionHeadingProps {
  eyebrow?: string;
  /** Lines of the heading — each line reveals separately. */
  title: ReactNode[];
  description?: ReactNode;
  align?: "left" | "center";
  size?: "md" | "lg";
  as?: "h1" | "h2";
  id?: string;
  className?: string;
  aside?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  size = "md",
  as = "h2",
  id,
  className = "",
  aside,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-8 ${centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"} ${className}`}
    >
      <div className={centered ? "flex flex-col items-center" : "max-w-4xl"}>
        {eyebrow && (
          <Reveal variant="fadeIn">
            <p className="eyebrow mb-6 flex items-center gap-4 text-muted">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {eyebrow}
            </p>
          </Reveal>
        )}
        <RevealText
          as={as}
          lines={title}
          className={`${size === "lg" ? "text-display-lg" : "text-display-md"} font-light uppercase`}
          id={id}
        />
        {description && (
          <Reveal delay={0.15}>
            <p className={`mt-6 max-w-xl text-lead text-muted ${centered ? "mx-auto" : ""}`}>{description}</p>
          </Reveal>
        )}
      </div>
      {aside && <Reveal delay={0.2}>{aside}</Reveal>}
    </div>
  );
}
