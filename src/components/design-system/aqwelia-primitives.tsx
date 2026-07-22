import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const aqButtonVariants = cva(
  "aq-touch-target aq-focusable inline-flex items-center justify-center gap-2 rounded-[var(--aq-radius-control)] px-5 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        lagoon:
          "bg-[var(--aq-lagoon)] text-[var(--aq-night)] shadow-[var(--aq-shadow-soft)] hover:bg-[var(--aq-aqua)]",
        night:
          "bg-[var(--aq-night)] text-[var(--aq-text-on-dark)] shadow-[var(--aq-shadow-soft)] hover:bg-[var(--aq-deep-teal)]",
        champagne:
          "bg-[var(--aq-champagne)] text-[var(--aq-night)] shadow-[var(--aq-shadow-soft)] hover:brightness-105",
        outline:
          "border border-[var(--aq-border-strong)] bg-[var(--aq-surface)] text-[var(--aq-text)] hover:bg-[var(--aq-surface-strong)]",
        ghost:
          "bg-transparent text-[var(--aq-text)] shadow-none hover:bg-[var(--aq-lagoon)]/10",
      },
      aqSize: {
        sm: "min-h-11 px-4 text-sm",
        md: "min-h-12 px-5 text-sm",
        lg: "min-h-14 px-7 text-base",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      tone: "lagoon",
      aqSize: "md",
      fullWidth: false,
    },
  }
);

type AqButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "variant"
> &
  VariantProps<typeof aqButtonVariants>;

function AqButton({
  className,
  tone,
  aqSize,
  fullWidth,
  ...props
}: AqButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        aqButtonVariants({ tone, aqSize, fullWidth }),
        className
      )}
      {...props}
    />
  );
}

const aqBadgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1.5 rounded-[var(--aq-radius-pill)] border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]",
  {
    variants: {
      tone: {
        lagoon:
          "border-[var(--aq-lagoon)]/35 bg-[var(--aq-lagoon)]/10 text-[var(--aq-deep-teal)]",
        champagne:
          "border-[var(--aq-champagne)]/45 bg-[var(--aq-champagne)]/12 text-[var(--aq-deep-teal)]",
        dark:
          "border-[var(--aq-aqua)]/25 bg-[var(--aq-night)] text-[var(--aq-text-on-dark)]",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        danger:
          "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
      },
    },
    defaultVariants: {
      tone: "lagoon",
    },
  }
);

type AqBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof aqBadgeVariants> & {
    dot?: boolean;
  };

function AqBadge({ className, tone, dot = false, children, ...props }: AqBadgeProps) {
  return (
    <span className={cn(aqBadgeVariants({ tone }), className)} {...props}>
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

type AqCardProps = React.ComponentProps<typeof Card> & {
  tone?: "glass" | "strong" | "dark" | "outline";
  interactive?: boolean;
};

const aqCardTone: Record<NonNullable<AqCardProps["tone"]>, string> = {
  glass: "aq-surface",
  strong: "aq-surface-strong",
  dark: "aq-surface-dark",
  outline:
    "border border-[var(--aq-border-strong)] bg-transparent text-[var(--aq-text)] shadow-none",
};

function AqCard({
  className,
  tone = "glass",
  interactive = false,
  ...props
}: AqCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-0 py-0",
        aqCardTone[tone],
        interactive && "aq-interactive",
        className
      )}
      {...props}
    />
  );
}

type AqMetricCardProps = Omit<AqCardProps, "children"> & {
  eyebrow: string;
  value: string;
  unit?: string;
  status?: string;
  statusTone?: "success" | "warning" | "danger" | "neutral";
  footer?: React.ReactNode;
};

const statusToneClasses: Record<
  NonNullable<AqMetricCardProps["statusTone"]>,
  string
> = {
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
  danger: "text-red-600 dark:text-red-300",
  neutral: "text-[var(--aq-text-muted)]",
};

function AqMetricCard({
  eyebrow,
  value,
  unit,
  status,
  statusTone = "neutral",
  footer,
  className,
  ...props
}: AqMetricCardProps) {
  return (
    <AqCard className={cn("p-5", className)} {...props}>
      <p className="aq-eyebrow">{eyebrow}</p>
      <div className="mt-3 flex items-end gap-2">
        <strong className="font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--aq-text)]">
          {value}
        </strong>
        {unit ? (
          <span className="pb-1 text-sm text-[var(--aq-text-muted)]">{unit}</span>
        ) : null}
      </div>
      {status ? (
        <p className={cn("mt-2 text-sm font-medium", statusToneClasses[statusTone])}>
          {status}
        </p>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </AqCard>
  );
}

type AqMediaFrameProps = Omit<React.ComponentProps<"div">, "children"> & {
  src: ImageProps["src"];
  alt: string;
  priority?: boolean;
  sizes?: string;
  objectPosition?: string;
  overlay?: "light" | "dark" | "none";
  imageClassName?: string;
  children?: React.ReactNode;
};

function AqMediaFrame({
  src,
  alt,
  priority = false,
  sizes = "100vw",
  objectPosition,
  overlay = "light",
  imageClassName,
  className,
  children,
  ...props
}: AqMediaFrameProps) {
  return (
    <div className={cn("aq-media-shell", className)} {...props}>
      <Image
        aria-hidden="true"
        alt=""
        src={src}
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        className="aq-media-fill"
      />
      <Image
        alt={alt}
        src={src}
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        className={cn("aq-media-fit", imageClassName)}
        style={objectPosition ? { objectPosition } : undefined}
      />
      {overlay !== "none" ? (
        <div
          aria-hidden="true"
          className={cn(
            "aq-media-overlay",
            overlay === "dark" && "aq-media-overlay-dark"
          )}
        />
      ) : null}
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </div>
  );
}

type AqSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  titleTag?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  containerClassName?: string;
};

function AqSection({
  eyebrow,
  title,
  description,
  actions,
  titleTag = "h2",
  align = "left",
  containerClassName,
  className,
  children,
  ...props
}: AqSectionProps) {
  const Heading = titleTag;
  const centered = align === "center";

  return (
    <section className={cn("py-16 md:py-24", className)} {...props}>
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-5 md:px-8",
          containerClassName
        )}
      >
        <header
          className={cn(
            "max-w-3xl",
            centered && "mx-auto text-center"
          )}
        >
          {eyebrow ? <p className="aq-eyebrow">{eyebrow}</p> : null}
          <Heading className="aq-heading mt-4">{title}</Heading>
          {description ? (
            <div className="aq-body mt-5 text-base md:text-lg">{description}</div>
          ) : null}
          {actions ? (
            <div
              className={cn(
                "mt-7 flex flex-wrap gap-3",
                centered && "justify-center"
              )}
            >
              {actions}
            </div>
          ) : null}
        </header>
        {children ? <div className="mt-10 md:mt-14">{children}</div> : null}
      </div>
    </section>
  );
}

export {
  AqBadge,
  AqButton,
  AqCard,
  AqMediaFrame,
  AqMetricCard,
  AqSection,
  aqBadgeVariants,
  aqButtonVariants,
};
