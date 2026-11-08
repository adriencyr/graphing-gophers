"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function NavbarAuth() {
  const { user, isLoading } = useUser();

  const buttonStyle =
    "inline-flex min-h-11 items-center justify-center rounded-lg " +
    "bg-[#774365] px-4 py-2 text-sm font-semibold text-white " +
    "hover:bg-[#603352] focus-visible:outline-4 " +
    "focus-visible:outline-offset-4 focus-visible:outline-[#F0C8DF]";

  return (
    <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-3">
      {!isLoading && user && (
        <span className="text-sm font-semibold text-white">
          Hello, {user.given_name || user.name || "there"}!
        </span>
      )}

      {isLoading ? (
        <span className="text-sm text-white/70" role="status">
          Loading...
        </span>
      ) : user ? (
        <a href="/auth/logout" className={buttonStyle}>
          Sign Out
        </a>
      ) : (
        <a
          href="/auth/login?connection=google-oauth2&returnTo=/dashboard"
          className={buttonStyle}
        >
          Sign In
        </a>
      )}
    </nav>
  );
}
