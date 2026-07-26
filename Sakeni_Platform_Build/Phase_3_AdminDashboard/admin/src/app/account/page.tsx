"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/components/KYCModal";

export default function AccountRouterPage() {
  const router = useRouter();

  useEffect(() => {
    if (getAuth("student")) {
      router.replace("/student/account");
      return;
    }
    if (getAuth("landlord")) {
      router.replace("/landlord/account");
      return;
    }
    router.replace("/admin/account");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </main>
  );
}
