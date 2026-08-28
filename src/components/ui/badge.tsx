import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-signal-500/20 bg-signal-600/20 text-signal-400",
        secondary: "border-white/[0.06] bg-white/[0.06] text-surface-300",
        success: "border-neon-500/20 bg-neon-600/15 text-neon-400",
        warning: "border-amber-500/20 bg-amber-500/15 text-amber-400",
        danger: "border-danger-500/20 bg-danger-500/15 text-danger-500",
        outline: "border-white/10 text-surface-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
