import { SignUp } from "@clerk/nextjs";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <TrendingUp className="h-6 w-6 text-blue-400" />
          <span className="font-semibold text-lg tracking-wide text-slate-100">
            EPISTEME
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Start free · No credit card required
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "bg-[#141720] border border-[#252a38] shadow-none rounded-lg",
            headerTitle: "text-slate-100",
            headerSubtitle: "text-slate-500",
            socialButtonsBlockButton:
              "bg-[#1c2030] border-[#252a38] text-slate-300 hover:bg-[#252a38]",
            dividerLine: "bg-[#252a38]",
            dividerText: "text-slate-600",
            formFieldLabel: "text-slate-400",
            formFieldInput:
              "bg-[#1c2030] border-[#252a38] text-slate-200 focus:border-blue-500",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-500",
            footerActionLink: "text-blue-400",
          },
        }}
      />
      <p className="mt-6 text-xs text-slate-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
