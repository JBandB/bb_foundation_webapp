/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { Pool } from "@neondatabase/serverless";
import { projectSetup } from "./project-setup";

/**
 * De database wakker maken en de staat terugzetten voordat de suite begint.
 *
 * **Waarom dit nodig is.** Een serverloze database zet de compute na een paar minuten inactiviteit
 * uit. Het eerste verzoek daarna wacht op het opstarten, en dat duurt lang genoeg om een inlogpoging
 * te laten stranden: de `authorize` van de dev-login doet een query, die valt om, Auth.js stuurt je
 * terug naar de inlog, en de test zegt dan "inloggen werkt niet". Eén `select 1` vooraf haalt die
 * kosten uit de eerste test.
 *
 * Daarna de tellers van de rate limiter en de voorkeuren leeg, zodat een run niets erft van de vorige,
 * en wat het project zelf nodig heeft (`e2e/project-setup.ts`).
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL ontbreekt. De e2e-suite draait tegen een echte database, zie playwright.config.ts.");
  }

  const pool = new Pool({ connectionString: url });
  try {
    const started = Date.now();
    await pool.query("select 1");
    console.log(`Database wakker in ${Date.now() - started} ms.`);

    await pool.query("delete from rate_limits");
    await pool.query("delete from user_preferences");
    await projectSetup(pool);
  } finally {
    await pool.end();
  }
}
