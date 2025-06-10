import { cn } from "../../lib/utils";
import { forwardRef } from "react";
import { Button } from "./button";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  gradient?: string;
  glow?: boolean;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, gradient, glow, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          `relative overflow-hidden rounded-md px-6 py-3 font-semibold text-white shadow-lg transition-all 
          duration-300 ease-in-out
          ${gradient || 'bg-gradient-to-r from-blue-500 to-purple-600'}
          ${glow ? 'shadow-blue-500/30 hover:shadow-blue-500/40' : ''}
          hover:brightness-110 active:scale-[0.98]`,
          className
        )}
        {...props}
      >
        {/* Glow effect */}
        {glow && (
          <span className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        )}

        {/* Content container */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Button>
    );
  }
);

GradientButton.displayName = "GradientButton";