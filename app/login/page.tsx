"use client";

import GoogleLoginButton from "../../components/GoogleLoginButton";

function loginWithGoogle(): Promise<void> {
  // Auth0 requires a full-page request to start its external redirect flow.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/api/auth/login?connection=google-oauth2";

  // Keep the button busy until the browser leaves this page.
  return new Promise<void>(() => {});
}

export default function LoginPage() {
  return (
    <div
      className="flex flex-1 items-center justify-center bg-zinc-50 px-4
        py-12 font-sans dark:bg-black"
    >
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-sm rounded-2xl border border-zinc-200
          bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <p
          className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400"
        >
          Graphing Gophers
        </p>

        <h1
          id="login-heading"
          className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50"
        >
          Sign in
        </h1>

        <p
          className="mb-6 mt-3 text-sm leading-6 text-zinc-600
            dark:text-zinc-400"
        >
          Sign in with your Google account to use Graphing Gophers.
        </p>

        <GoogleLoginButton onGoogleLogin={loginWithGoogle} />
      </section>
    </div>
  );
}