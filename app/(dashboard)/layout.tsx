import { ClerkProvider } from "@clerk/nextjs";
import { Sidebar } from "@/components/nav/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0d0f12]">{children}</main>
      </div>
    </ClerkProvider>
  );
}
