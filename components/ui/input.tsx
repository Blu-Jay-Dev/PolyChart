import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded border border-[#252a38] bg-[#141720] px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600",
          "focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
