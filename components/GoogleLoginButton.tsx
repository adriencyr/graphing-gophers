"use client";

import { useId, useRef, useState } from "react";

export interface GoogleLoginButtonProps {
  /** Start authentication; resolve when complete or reject on failure. */
  onGoogleLogin: () => void | Promise<void>;
  /** Prevent interaction when sign-in is unavailable. Defaults to false. */
  disabled?: boolean;
  /** Safe, user-facing message shown for any callback failure. */
  errorMessage?: string;
}

export default function GoogleLoginButton({
  onGoogleLogin,
  disabled = false,
  errorMessage = "Unable to sign in with Google. Please try again.",
}: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inFlight = useRef(false);
  const errorId = useId();

  async function handleLogin() {
    // The ref closes the gap before React renders the disabled state.
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setHasError(false);
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch {
      // Never expose raw provider errors or credentials in the UI.
      setHasError(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleLogin}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-describedby={hasError ? errorId : undefined}
        className="
          flex min-h-11 w-full items-center justify-center gap-2.5 rounded
          border border-[#747775] bg-white px-3 py-2 text-sm font-medium
          text-[#1f1f1f] transition-colors hover:bg-zinc-100
          focus-visible:outline-2 focus-visible:outline-offset-4
          focus-visible:outline-blue-600 disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="20"
          height="20"
          viewBox="0 0 48 48"
          className="shrink-0"
        >
          <path
            fill="#4285F4"
            d="
              M 43.61 24.46 c 0 -1.36 -.12 -2.66 -.35 -3.92 H 24 v 7.42 h 11 a
              9.4 9.4 0 0 1 -4.08 6.18 v 5.14 h 6.61 c 3.87 -3.56 6.08 -8.81
              6.08 -14.82 Z
            "
          />
          <path
            fill="#34A853"
            d="
              M 24 44 c 5.51 0 10.13 -1.83 13.51 -4.96 l -6.61 -5.14 c -1.83
              1.22 -4.17 1.96 -6.9 1.96 -5.32 0 -9.84 -3.59 -11.46 -8.43 H
              5.72 v 5.3 A 20 20 0 0 0 24 44 Z
            "
          />
          <path
            fill="#FBBC05"
            d="
              M 12.54 27.43 A 12 12 0 0 1 11.9 24 c 0 -1.19 .22 -2.34 .64
              -3.43 v -5.3 H 5.72 A 20 20 0 0 0 4 24 c 0 3.14 .72 6.1 1.72
              8.73 l 6.82 -5.3 Z
            "
          />
          <path
            fill="#EA4335"
            d="
              M 24 12.14 c 3.01 0 5.69 1.04 7.82 3.09 l 5.86 -5.86 A 19.6 19.6
              0 0 0 24 4 20 20 0 0 0 5.72 15.27 l 6.82 5.3 c 1.62 -4.84 6.14
              -8.43 11.46 -8.43 Z
            "
          />
        </svg>
        <span>{loading ? "Signing in…" : "Sign in with Google"}</span>
      </button>
      <span role="status" className="sr-only">
        {loading ? "Signing in with Google. Please wait." : ""}
      </span>
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-3 text-sm text-red-700 dark:text-red-300"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
