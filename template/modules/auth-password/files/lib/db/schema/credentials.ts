/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De wachtwoordlogin: eigen accounts, zonder Microsoft-tenant. Zie template/modules/auth-password/claude.md.
 *
 * `credentials` is één rij per gebruiker die een wachtwoord heeft gezet (na het aannemen van een
 * uitnodiging). De hash is scrypt met eigen zout (lib/auth/password/hash.ts); het TOTP-geheim staat
 * versleuteld (secret-box.ts) en `mfa_enabled` zegt of het al bevestigd is. `failed_attempts` en
 * `locked_until` zijn de vergrendeling per account.
 *
 * `auth_tokens` zijn de eenmalige koppelingen: een uitnodiging, een wachtwoordherstel, of de stap
 * om tweestapsverificatie in te stellen. Alleen de sha256 van het token staat hier; het token zelf
 * gaat één keer per mail. Gebruikt of verlopen is voorbij.
 */
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";
import { organisations } from "./organisations";
import { users } from "./users";

export const credentials = pgTable("credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id),
  passwordHash: text("password_hash").notNull(),
  /** Versleuteld met de sleutel uit AUTH_SECRET; leeg zolang er geen tweestapsverificatie is. */
  mfaSecret: text("mfa_secret"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export type Credentials = typeof credentials.$inferSelect;

export const authTokenKind = pgEnum("auth_token_kind", ["invite", "reset", "mfa_setup"]);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: authTokenKind("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique("auth_tokens_token_hash").on(t.tokenHash), index("auth_tokens_user_idx").on(t.userId, t.kind)],
);

export type AuthTokenKind = (typeof authTokenKind.enumValues)[number];
