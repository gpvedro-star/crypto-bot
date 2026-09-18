import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[4px] font-sans font-semibold whitespace-nowrap transition-colors duration-200 select-none";
const variants: Record<Variant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950",
  secondary: "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white",
  ghost: "text-navy-900 hover:bg-mist",
  inverse: "bg-white text-navy-900 hover:bg-sky-100",
};
const sizes: Record<Size, string> = {
  sm: "min-h-[40px] px-4 text-[0.9rem]",
  md: "min-h-[46px] px-5 text-[0.95rem]",
  lg: "min-h-[52px] px-6 text-[1.02rem]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & ComponentProps<"button"> & { href?: undefined };
type LinkProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href">;

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if ("href" in props && props.href) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as LinkProps;
    void _v; void _s; void _c; void _ch;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps;
  void _v; void _s; void _c; void _ch;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
