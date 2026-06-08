import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col items-center justify-center gap-4">
      <Search className="h-8 w-8 text-slate-600" />
      <div className="text-center">
        <h1 className="text-slate-100 font-semibold text-lg mb-1">
          Page not found
        </h1>
        <p className="text-slate-500 text-sm mb-4">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/markets"
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm text-white font-medium transition-colors"
        >
          Browse markets
        </Link>
      </div>
    </div>
  );
}
