import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { getAuth0Options } from "./auth0-config";

export const auth0 = new Auth0Client(getAuth0Options());
