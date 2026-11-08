# Google sign-in frontend

Visit `/login` to view the responsive sign-in page. The page uses a frontend-
only
placeholder that rejects with an availability message; it does not authenticate,
redirect, contact Google, or simulate a successful login. The existing empty
`components/login-frontend` IDE file is left untouched.

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `onGoogleLogin` | `() => void \| Promise<void>` | Required |
| `disabled` | `boolean` | `false` |
| `errorMessage` | `string` | See below |

`onGoogleLogin` initiates sign-in. Return the promise covering the operation so
loading lasts until it settles. Reject or throw on failure.

`disabled` prevents interaction when sign-in is unavailable.

`errorMessage` provides safe user-facing failure text. Its default is
"Unable to sign in with Google. Please try again." Raw callback errors are never
rendered.

## Connect authentication

Replace `previewGoogleLogin` in `app/login/page.tsx` with the authentication
team's
client-side handler. Callbacks must originate in a Client Component because
ordinary functions cannot cross the Next.js server/client boundary.

```tsx
"use client";

import GoogleLoginButton from "@/components/GoogleLoginButton";

export function LoginOption({
  startGoogleLogin,
}: {
  startGoogleLogin: () => Promise<void>;
}) {
  return <GoogleLoginButton onGoogleLogin={startGoogleLogin} />;
}
```

The authentication layer owns redirects, sessions, provider configuration, and
success navigation. The button owns pending state, an immediate duplicate-click
guard, and retryable errors. A synchronous callback is supported, but
asynchronous
work must return its promise. Errors clear on the next attempt. Separate mounted
buttons have independent state; use `disabled` if a parent needs a shared lock.

The native `type="button"` supports Tab, Enter, and Space without submitting a
parent form. Tailwind provides a visible keyboard focus outline, full-width
layout, and a minimum 44px touch target. Busy status is announced in a live
region;
failures use an alert associated with the button. The white button and
multicolor
G use Google's light-button design. See the [Google branding
guidelines][google].

[google]: https://developers.google.com/identity/branding-guidelines

## Preview

Run `npm run dev`, then open `http://localhost:3000/login` in your browser.
Use the port printed in the terminal if it differs from 3000. The root route `/`
currently displays the Next.js starter page; it is separate from `/login`.

## Verification

- `npm test`: mock callback success, synchronous/asynchronous failure, loading,
  duplicate-click protection, external disablement, retry, keyboard activation,
  form behavior, and login-page integration.
- `npm run lint`
- `npm run typecheck`: generate Next.js route types and independently check
  TypeScript (the existing configuration skips build-time type errors).
- `npm run build`

For visual review, open `/login` at mobile and desktop widths, including dark
mode. Tab to the button to inspect focus visibility.

Current verification: 9 interaction tests, TypeScript, and lint pass. Production
build verification is blocked in the development environment by Turbopack's CSS
worker failing to bind a local port (`Operation not permitted`). Browser visual
review is still pending.
