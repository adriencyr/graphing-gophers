# Auth0 SDK migration

The project uses `@auth0/nextjs-auth0` 4.33.0 and `openid-client` 6.8.9.
The previous SDK used `openid-client` 5.7.1, whose discovery code called the
legacy `url.parse()` API and triggered Node.js warning DEP0169.

## Implementation

- `lib/auth0-config.ts` maps configuration into the v4 client options. It accepts
  the existing `AUTH0_ISSUER_BASE_URL` and `AUTH0_BASE_URL` variables, so local
  and deployed secrets do not need to change for this migration. The newer
  `AUTH0_DOMAIN` and `APP_BASE_URL` names take precedence when provided.
- `lib/auth0.ts` creates the shared server-side SDK client. Credentials and the
  cookie secret continue to come from server environment variables.
- `proxy.ts` delegates requests to the SDK using the Next.js 16 proxy convention.
  This replaces `app/api/auth/[auth0]/route.tsx`, whose v3 handlers are no longer
  available. The SDK handles auth endpoints and rolling sessions. Pages remain
  public; the proxy does not introduce route protection.
- `tests/auth0.test.ts` exercises real SDK login and callback handling against
  mocked discovery metadata, without using real credentials or external calls.

## Existing configuration

Keep the following server-side variables configured:

- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`
- `AUTH0_ISSUER_BASE_URL` or `AUTH0_DOMAIN`
- `AUTH0_BASE_URL` or `APP_BASE_URL`

Existing URLs remain `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`,
and `/api/auth/me`. No Auth0 dashboard callback changes are required.
The Google button still uses `/api/auth/login?connection=google-oauth2`.
`AUTH0_AUDIENCE` and `AUTH0_SCOPE` are preserved when supplied. The default scope
remains `openid profile email`, and the optional browser access-token endpoint
is disabled. A logged-out `/api/auth/me` request still returns 204.

Restart the development server after updating dependencies so it loads v4.
Do not copy or edit files inside `node_modules` to maintain this fix.

## Verification

- All 13 tests, TypeScript, lint, and the production build pass.
- A production server started with `--trace-deprecation` returned the expected
  Google authorization redirect without warning DEP0169.
- The redirect retained `/api/auth/callback`, state, PKCE with S256, and a
  transaction cookie. The login redirect status is now 307 instead of 302.
- The public homepage returned 200 and the logged-out profile returned 204.
- Completing Google login and logout still requires a manual browser check.

References: [Auth0 migration guide][migration] and [Next.js integration][setup].

[migration]: https://github.com/auth0/nextjs-auth0/blob/main/V4_MIGRATION_GUIDE.md
[setup]: https://github.com/auth0/nextjs-auth0#4-add-the-authentication-middleware
