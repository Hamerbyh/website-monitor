import { redirect } from "next/navigation";

import authContent from "@/content/auth.json";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const copy = authContent.loginPage;
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-(--line) bg-(--panel-strong) p-6 text-(--paper) shadow-[0_24px_90px_rgba(9,12,10,0.24)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-(--muted)">
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 max-w-[11ch] font-display text-6xl leading-[0.92] tracking-[-0.04em] sm:text-7xl">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-(--soft) sm:text-base">
            {copy.description}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {copy.steps.map((step) => (
              <div
                key={step.eyebrow}
                className={`rounded-[24px] border border-(--line) p-4 ${
                  step.accent
                    ? "bg-(--accent) text-(--accent-ink)"
                    : "bg-white/6"
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-[0.28em] ${
                    step.accent ? "opacity-70" : "text-(--muted)"
                  }`}
                >
                  {step.eyebrow}
                </p>
                <p className="mt-3 text-lg font-semibold">{step.title}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
