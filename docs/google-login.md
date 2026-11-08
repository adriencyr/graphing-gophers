# Google sign-in frontend

Visit `/login` to view the responsive sign-in page. Clicking the Google button
navigates to `/api/auth/login?connection=google-oauth2`.
The existing Auth0 route starts authentication with the Google connection.

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

`loginWithGoogle` in `app/login/page.tsx` sets `window.location.href` to the
Auth0 login URL. Its promise stays pending to keep the button disabled until
navigation unloads the page. The reusable button remains provider-independent.
Callbacks must originate in a Client Component because ordinary functions cannot
cross the Next.js server/client boundary.

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
guard, and retryable errors. A synchronous callback is supported, but async
work must return its promise. Errors clear on the next attempt. Separate mounted
buttons have independent state; use `disabled` if a parent needs a shared lock.

The native `type="button"` supports Tab, Enter, and Space without submitting a
parent form. Tailwind provides a visible keyboard focus outline, full-width
layout, and a minimum 44px touch target. Busy status is announced in a live
region; failures use an alert associated with the button. The white button and
multicolor G use Google's light-button design. See the [Google branding
guidelines][google].

[google]: https://developers.google.com/identity/branding-guidelines

## Preview

Run `npm run dev`, then open `http://localhost:3000/login` in your browser.
Use the port printed in the terminal if it differs from 3000. The root route `/`
currently displays the Next.js starter page; it is separate from `/login`.

## Verification

- `npm test`: mock callback success, synchronous/asynchronous failure, loading,
  duplicate-click protection, external disablement, retry, keyboard activation,
  form behavior, and the Google login redirect with pending state.
- `npm run lint`
- `npm run typecheck`: generate Next.js route types and independently check
  TypeScript (the existing configuration skips build-time type errors).
- `npm run build`

For visual review, open `/login` at mobile and desktop widths, including dark
mode. Tab to the button to inspect focus visibility.

Interaction tests mock browser navigation; they do not perform a live Google
login. Production build previously passed in the user's terminal. A live sign-in
still needs verification with the configured Auth0 environment.
