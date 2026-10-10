import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "md" | "lg" | "sm";

const base =
  "group/btn relative isolate inline-flex select-none items-center justify-center gap-3 overflow-hidden label whitespace-nowrap transition-[color,background-color,border-color,opacity] duration-500";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ivory text-ink before:absolute before:inset-0 before:-z-10 before:translate-y-[101%] before:bg-accent before:transition-transform before:duration-500 before:ease-[var(--ease-luxe)] hover:before:translate-y-0 focus-visible:before:translate-y-0",
  outline:
    "border border-line-strong text-ivory before:absolute before:inset-0 before:-z-10 before:translate-y-[101%] before:bg-ivory before:transition-transform before:duration-500 before:ease-[var(--ease-luxe)] hover:text-ink hover:border-ivory hover:before:translate-y-0 focus-visible:text-ink focus-visible:before:translate-y-0",
  ghost: "text-ivory px-0! min-h-0! h-auto!",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-5",
  md: "min-h-12 px-7",
  lg: "min-h-14 px-9",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

function ButtonInner({ children, icon, variant }: { children: ReactNode; icon?: "right" | "external" | "none"; variant: ButtonVariant }) {
  const Icon = icon === "external" ? ArrowUpRight : ArrowRight;
  return (
    <>
      <span className={variant === "ghost" ? "link-underline group-hover/btn:bg-[length:100%_1px]" : ""}>{children}</span>
      {icon !== "none" && (
        <Icon
          aria-hidden="true"
          strokeWidth={1.5}
          className={`size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-luxe)] ${
            icon === "external" ? "group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" : "group-hover/btn:translate-x-1"
          }`}
        />
      )}
    </>
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: "right" | "external" | "none";
  cursor?: string;
}

export function ButtonLink({ variant = "primary", size = "md", icon = "right", cursor, className, children, ...props }: CommonProps & LinkProps) {
  return (
    <Link {...props} data-cursor={cursor} className={buttonClasses(variant, size, className)}>
      <ButtonInner icon={icon} variant={variant}>
        {children}
      </ButtonInner>
    </Link>
  );
}

export function ButtonAnchor({
  variant = "primary",
  size = "md",
  icon = "external",
  cursor,
  className,
  children,
  ...props
}: CommonProps & ComponentPropsWithoutRef<"a">) {
  return (
    <a {...props} data-cursor={cursor} className={buttonClasses(variant, size, className)}>
      <ButtonInner icon={icon} variant={variant}>
        {children}
      </ButtonInner>
    </a>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon = "none",
  cursor,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button {...props} type={type} data-cursor={cursor} className={buttonClasses(variant, size, className)}>
      <ButtonInner icon={icon} variant={variant}>
        {children}
      </ButtonInner>
    </button>
  );
}
