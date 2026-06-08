import { ClerkProvider } from "@clerk/nextjs";
import { Sidebar } from "@/components/nav/sidebar";

const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0d0f12]">{children}</main>
    </div>
  );

  if (hasClerkKeys) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
