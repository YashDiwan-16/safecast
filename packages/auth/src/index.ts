import { client } from "@safecast/db";
import { env } from "@safecast/env/server";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

export function createAuth() {
  return betterAuth({
    database: mongodbAdapter(client),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}

export const auth = createAuth();
