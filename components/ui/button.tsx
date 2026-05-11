import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50",
      secondary:
        "bg-[#1c2030] hover:bg-[#252a38] text-slate-200 border border-[#252a38]",
      ghost:
        "bg-transparent hover:bg-[#1c2030] text-slate-400 hover:text-slate-200 border border-transparent",
      danger:
        "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30",
    };

    const sizes = {
      sm: "px-2.5 py-1 text-xs",
      md: "px-3.5 py-1.5 text-sm",
      lg: "px-5 py-2 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded font-medium transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
