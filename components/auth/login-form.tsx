"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import authContent from "@/content/auth.json";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const copy = authContent.loginForm;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? copy.errors.signInFailed);
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[32px] border border-(--line-soft) bg-(--panel) p-5 shadow-[0_20px_80px_rgba(9,12,10,0.1)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-(--muted-dark)">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl text-(--ink)">{copy.signInTitle}</h1>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-(--text-subtle)">
        {copy.description}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-(--ink)">
            {copy.fields.emailLabel}
          </span>
          <input
            className="w-full rounded-[18px] border border-(--line-soft) bg-white/75 px-4 py-3 outline-none transition focus:border-(--accent)"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.fields.emailPlaceholder}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-(--ink)">
            {copy.fields.passwordLabel}
          </span>
          <input
            className="w-full rounded-[18px] border border-(--line-soft) bg-white/75 px-4 py-3 outline-none transition focus:border-(--accent)"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.fields.passwordPlaceholder}
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[20px] bg-(--ink) px-4 py-3 text-sm font-semibold text-(--paper) transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? copy.buttons.pending : copy.buttons.signIn}
        </button>
      </form>
    </div>
  );
}
