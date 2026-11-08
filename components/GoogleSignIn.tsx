"use client";

import { useEffect, useState } from "react";
import GoogleLoginButton from "./GoogleLoginButton";

function loginWithGoogle(): Promise<void> {
  // Auth0 requires a full-page request to start its external redirect flow.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href =
  "/auth/login?connection=google-oauth2&returnTo=%2Fdashboard";

  // Keep the button busy until the browser leaves this page.
  return new Promise<void>(() => {});
}

export default function GoogleSignIn() {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      // Back/Forward cache restores React state, including the pending login.
      if (event.persisted) setAttempt((previous) => previous + 1);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Remount on restoration to reset loading, errors, and the click guard.
  return <GoogleLoginButton key={attempt} onGoogleLogin={loginWithGoogle} />;
}
