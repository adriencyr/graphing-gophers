import type { Auth0Client } from "@auth0/nextjs-auth0/server";

/** Preserve v3 environment names and public URLs while using the v4 SDK. */
export function getAuth0Options(
  environment: Record<string, string | undefined> = process.env,
): ConstructorParameters<typeof Auth0Client>[0] {
  const legacyDomain = environment.AUTH0_ISSUER_BASE_URL
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return {
    domain: environment.AUTH0_DOMAIN ?? legacyDomain,
    appBaseUrl: environment.APP_BASE_URL ?? environment.AUTH0_BASE_URL,
    authorizationParameters: {
      scope: environment.AUTH0_SCOPE ?? "openid profile email",
      audience: environment.AUTH0_AUDIENCE,
    },
    routes: {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      callback: "/api/auth/callback",
      profile: "/api/auth/me",
    },
    noContentProfileResponseWhenUnauthenticated: true,
    // v3 did not expose a browser access-token endpoint.
    enableAccessTokenEndpoint: false,
  };
}
