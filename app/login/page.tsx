"use client";

import GoogleLoginButton from "../../components/GoogleLoginButton";

// Replace this preview handler with the auth team's client API.
async function previewGoogleLogin() {
  throw new Error("Authentication is not connected.");
}

export default function LoginPage() {
  return (
    <main
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
          Frontend preview. Google sign-in will be available when
          authentication is connected.
        </p>
        <GoogleLoginButton
          onGoogleLogin={previewGoogleLogin}
          errorMessage={
            "Google sign-in is not available yet. Please try again later."
          }
        />
      </section>
    </main>
  );
}
