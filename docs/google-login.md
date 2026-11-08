# Google sign-in frontend

Visit `/` to view the responsive sign-in page. Clicking the Google button
navigates to `/api/auth/login?connection=google-oauth2`. The existing Auth0
route starts authentication with the Google connection.

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `onGoogleLogin` | `() => void \| Promise<void>` | Required |
| `disabled` | `boolean` | `false` |
| `errorMessage` | `string` | See below |

`onGoogleLogin` initiates sign-in. Return the promise covering the operation so
loading lasts until it settles. Reject or throw on failure.

`disabled` prevents interaction when sign-in is unavailable.

`errorMessage` provides safe user-facing failure text. Its default is "Unable to
sign in with Google. Please try again." Raw callback errors are never rendered.

## Connect authentication

`loginWithGoogle` in `components/GoogleSignIn.tsx` sets `window.location.href`
to the Auth0 login URL. Its promise stays pending to keep the button disabled
until navigation unloads the page. The reusable button remains
provider-independent. `GoogleSignIn` supplies the Auth0 callback within a small
Client Component so the homepage and shared layout can remain Server Components.
The homepage keeps its original skip link, gradient, guest button styling, and
responsive layout: actions are side by side at the `sm` breakpoint and above.
The Google option replaces the original Sign In / Register control, with a flex
container allowing it to use the remaining row width. Callbacks originate in a
Client Component because functions cannot cross the server/client boundary.

When Back or Forward restores the page from the browser cache, `GoogleSignIn`
handles the persisted `pageshow` event by remounting the button. This resets
loading, errors, and duplicate-click protection so sign-in can be retried.
Ordinary `pageshow` events leave an active sign-in attempt unchanged. The event
listener is removed when the wrapper unmounts.

The existing Auth0 route and server environment must be configured, and the
`google-oauth2` connection must be enabled for the application in Auth0.
Callback errors before navigation appear in the button's alert. Authentication
errors after navigation are handled by the authentication route and provider.

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
guard, and retryable errors. A synchronous callback is supported, but async work
must return its promise. Errors clear on the next attempt. Separate mounted
buttons have independent state; use `disabled` if a parent needs a shared lock.

The native `type="button"` supports Tab, Enter, and Space without submitting a
parent form. Tailwind provides a visible keyboard focus outline, full-width
layout, and a minimum 48px touch target. Busy status is announced in a live
region; failures use an alert associated with the button. The white button and
multicolor G use Google's light-button design. See the [Google branding
guidelines][google].

[google]: https://developers.google.com/identity/branding-guidelines

## Preview

Run `npm run dev`, then open `http://localhost:3000/` in your browser. Use the
port printed in the terminal if it differs from 3000. The homepage uses
`app/page.js`, `app/layout.js`, and `public/graph-background.jpg`. The old
standalone login page is removed; sign-in now starts on the homepage.

## Verification

- `npm test`: mock callback success, synchronous/asynchronous failure, loading,
  duplicate-click protection, external disablement, retry, keyboard activation,
  form behavior, and the Google login redirect with pending state.
- `npm run lint`
- `npm run typecheck`: generate Next.js route types and independently check
  TypeScript (the existing configuration skips build-time type errors).
- `npm run build`

For visual review, open `/` at mobile and desktop widths, including dark mode.
Tab to the button to inspect focus visibility.

Verified for the homepage integration:

- All 9 interaction tests, TypeScript, and the production build pass.
- Lint passes for changed files. Project-wide lint still reports two existing
  `no-explicit-any` errors in `app/api/auth/[auth0]/route.tsx`.
- HTTP checks return 200 for `/` and `/graph-background.jpg`.
- The configured login endpoint returns 302 to Auth0's `/authorize` endpoint
  with `connection=google-oauth2`. No external login was completed.
- Browser visual review is pending because the browser tool is unavailable.

The test configuration enables JSX in `.js` pages before Vite import analysis,
matching Next.js support for the existing `app/page.js` interface.
