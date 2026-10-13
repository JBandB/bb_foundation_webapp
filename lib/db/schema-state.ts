/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Loopt de database achter op de code.
 *
 * **Waarom dit bestaat.** Nieuwe code tegen een database die een migratie mist faalt niet bij het
 * opstarten en niet op een beheerscherm, maar diep in een schrijfactie, met een foutmelding uit een
 * trigger die alleen een ontwikkelaar kan plaatsen. De vraag "loopt de database achter" is in één
 * query te beantwoorden, en het antwoord hoort op Beheer, Systeem te staan. Dan is het de eerste plek
 * waar je kijkt in plaats van de laatste.
 *
 * **Het aantal komt uit het journal van drizzle**, dus uit dezelfde bron die de migratieloper
 * gebruikt. Er is niets om bij te houden en niets om te vergeten: een migratie toevoegen verhoogt dit
 * getal vanzelf.
 *
 * **Dit is geen vervanging van `pnpm db:status`.** Dat script vertelt je tegen welk endpoint je praat
 * en wat erin staat. Dit zegt alleen of de vorm bij de code past, en dat is precies de vraag die je
 * op een deploy hebt.
 */

import { sql } from "drizzle-orm";
import journal from "./migrations/meta/_journal.json";
import type { DbOrTransaction } from "./client";
import { rowsOf } from "./rows";

/** Hoeveel migraties deze code kent. */
export const EXPECTED_MIGRATIONS = journal.entries.length;

/** De laatste die deze code kent, voor op het scherm. */
export const LATEST_MIGRATION = journal.entries[journal.entries.length - 1]?.tag ?? "geen";

export interface SchemaState {
  readonly expected: number;
  /** Wat de database zegt, of `null` als het niet op te vragen was. */
  readonly applied: number | null;
  /** Loopt de database achter. Bij `null` als antwoord is dit `false`: niet weten is niet achter. */
  readonly behind: boolean;
  readonly latest: string;
}

/**
 * De stand van het schema.
 *
 * **Faalt zacht.** Kan de tabel niet gelezen worden, dan is het antwoord "onbekend" en niet een
 * scherm dat niet laadt. Dit is een hulpmiddel bij het opsporen van storingen; het hoort zelf geen
 * storing te kunnen zijn.
 */
export async function schemaState(db: DbOrTransaction): Promise<SchemaState> {
  try {
    const result = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    const applied = rowsOf<{ n: number }>(result)[0]?.n ?? 0;

    return {
      expected: EXPECTED_MIGRATIONS,
      applied,
      /*
       * Meer toegepast dan de code kent is geen fout maar een oudere deploy naast een nieuwere
       * database, en dat komt goed zodra deze code live staat. Alleen minder is een probleem.
       */
      behind: applied < EXPECTED_MIGRATIONS,
      latest: LATEST_MIGRATION,
    };
  } catch {
    return { expected: EXPECTED_MIGRATIONS, applied: null, behind: false, latest: LATEST_MIGRATION };
  }
}
