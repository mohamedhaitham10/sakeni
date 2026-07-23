import Link from "next/link";
import { Compass, Home, LayoutDashboard, ShieldCheck } from "lucide-react";

const destinations = [
  { href: "/portal", label: "Open Portal", icon: Compass },
  { href: "/", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/student", label: "Student View", icon: Home },
];

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#060613] text-white flex items-center justify-center p-4">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c0c1e] p-7 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl border border-indigo-500/25 bg-indigo-500/15 flex items-center justify-center text-indigo-300 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-semibold">
              Sakeni Route Recovery
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              We could not open that exact view.
            </h1>
            <p className="text-sm leading-6 text-white/60">
              The default error screen has been replaced. Continue through a safe Sakeni entry point below.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {destinations.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/15"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
