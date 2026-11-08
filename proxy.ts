import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

// The SDK mounts auth routes and maintains sessions without protecting pages.
export async function proxy(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|sitemap.xml|robots.txt|graph-background.jpg).*)",
  ],
};
