// @vitest-environment node

import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { getAuth0Options } from "../lib/auth0-config";

const legacyEnvironment = {
  AUTH0_ISSUER_BASE_URL: "https://tenant.example.test/",
  AUTH0_BASE_URL: "http://localhost:3000",
};

function createClient() {
  const discovery = vi.fn(async () => Response.json({
    issuer: "https://tenant.example.test/",
    authorization_endpoint: "https://tenant.example.test/authorize",
    token_endpoint: "https://tenant.example.test/oauth/token",
    jwks_uri: "https://tenant.example.test/.well-known/jwks.json",
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  }));
  const client = new Auth0Client({
    ...getAuth0Options(legacyEnvironment),
    clientId: "test-client",
    clientSecret: "test-client-secret",
    secret: "0123456789abcdef".repeat(4),
    customFetch: discovery,
  });
  return { client, discovery };
}

describe("Auth0 v4 migration", () => {
  it("accepts legacy environment names and prefers v4 names", () => {
    expect(getAuth0Options(legacyEnvironment)).toMatchObject({
      domain: "tenant.example.test",
      appBaseUrl: "http://localhost:3000",
    });
    expect(getAuth0Options({
      ...legacyEnvironment,
      AUTH0_DOMAIN: "new.example.test",
      APP_BASE_URL: "https://app.example.test",
      AUTH0_AUDIENCE: "https://api.example.test",
      AUTH0_SCOPE: "openid email",
    })).toMatchObject({
      domain: "new.example.test",
      appBaseUrl: "https://app.example.test",
      authorizationParameters: {
        audience: "https://api.example.test",
        scope: "openid email",
      },
    });
  });

  it("preserves the Google redirect, callback, and PKCE", async () => {
    const { client, discovery } = createClient();
    const warnings: string[] = [];
    const onWarning = (warning: Error & { code?: string }) => {
      if (warning.code) warnings.push(warning.code);
    };
    process.on("warning", onWarning);
    try {
      const response = await client.middleware(new NextRequest(
        "http://localhost:3000/api/auth/login?connection=google-oauth2",
      ));
      expect(response.status).toBe(307);
      const url = new URL(response.headers.get("location")!);
      expect(url.origin).toBe("https://tenant.example.test");
      expect(url.pathname).toBe("/authorize");
      expect(url.searchParams.get("connection")).toBe("google-oauth2");
      expect(url.searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/api/auth/callback",
      );
      expect(url.searchParams.get("scope")).toBe("openid profile email");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("state")).toBeTruthy();
      expect(response.headers.get("set-cookie")).toBeTruthy();
      expect(discovery).toHaveBeenCalledTimes(1);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(warnings).not.toContain("DEP0169");
    } finally {
      process.off("warning", onWarning);
    }
  });

  it("rejects a callback without state", async () => {
    const { client } = createClient();
    const response = await client.middleware(new NextRequest(
      "http://localhost:3000/api/auth/callback",
    ));
    // The SDK's default callback reports an invalid transaction as 500.
    expect(response.status).toBe(500);
    expect(await response.text()).toContain("state");
  });

  it("keeps the homepage public and profile compatible", async () => {
    const { client, discovery } = createClient();
    const home = await client.middleware(new NextRequest(
      "http://localhost:3000/",
    ));
    expect(home.headers.get("x-middleware-next")).toBe("1");
    const profile = await client.middleware(new NextRequest(
      "http://localhost:3000/api/auth/me",
    ));
    expect(profile.status).toBe(204);
    expect(discovery).not.toHaveBeenCalled();
  });
});
