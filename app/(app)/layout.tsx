import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSession();

  return <AppShell>{children}</AppShell>;
}
