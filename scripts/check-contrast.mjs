#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Rekent het contrast van elk tekst-op-vlak-paar uit de tokens na, in beide modi.
 *
 * Gebruik: pnpm check:contrast. Geen database nodig, dus dit kan in CI.
 *
 * ---
 *
 * **Waarom dit bestaat.** Een donkere modus ziet er bijna altijd goed uit en is bijna nooit
 * leesbaar: de kleuren zijn met het oog gekozen op een scherm met veel licht eromheen, en het
 * verschil tussen 3:1 en 4,5:1 zie je niet, je merkt het pas na een uur lezen. Handmatig langs alle
 * schermen lopen vindt dat niet. Rekenen wel.
 *
 * **De norm per token, en waarom die verschilt.** WCAG 2.2 vraagt 4,5:1 voor gewone tekst en 3:1
 * voor grote tekst en voor de omtrek van een bedieningselement. Tekst die uitgeschakeld of louter
 * decoratief is, valt buiten de eis. `--subtle-foreground` staat op precies dat: het woord "geen"
 * in een lege cel, een tijdstempel naast iets dat er wel toe doet. Die krijgt 3:1 en niet meer.
 *
 * **Wat hij leest.** De drie blokken uit `app/theme.css` (gegenereerd), en daarna de overrides uit
 * `app/project.css` onder `:root`, `.light` en `.dark`. De paren staan in
 * `template/generators/contrast-pairs.json`, gedeeld met de generator die theme.css schrijft, zodat
 * de generator en de controle nooit over verschillende paren praten.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const THEME = readFileSync(join(process.cwd(), "app", "theme.css"), "utf8");
const PROJECT_CSS_PATH = join(process.cwd(), "app", "project.css");
const PROJECT_CSS = existsSync(PROJECT_CSS_PATH) ? readFileSync(PROJECT_CSS_PATH, "utf8") : "";
const PAIRS = JSON.parse(
  readFileSync(join(process.cwd(), "template", "generators", "contrast-pairs.json"), "utf8"),
).pairs;

const TOKEN = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;

/** De blokken uit theme.css: eerst de constanten, dan de modus eroverheen. */
function tokensOf(...selectors) {
  const values = {};
  for (const selector of selectors) {
    const start = THEME.indexOf(selector);
    if (start === -1) throw new Error(`Blok ${selector} niet gevonden in app/theme.css`);
    const block = THEME.slice(start, THEME.indexOf("\n}", start));
    for (const [, name, value] of block.matchAll(TOKEN)) values[name] = value;
  }
  return values;
}

/**
 * De overrides van het project: elk `:root`, `.light` of `.dark` blok in project.css.
 *
 * Een eenvoudige lezer, bewust: een selector die met `.dark` begint is donker, al het andere
 * licht. Wie iets ingewikkelders doet in project.css, zet zijn kleuren via de config in theme.css.
 */
function overridesOf(mode) {
  const values = {};
  for (const block of PROJECT_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (block[1] ?? "").trim();
    const isDark = selector.startsWith(".dark");
    if ((mode === "dark") !== isDark) continue;
    for (const [, name, value] of (block[2] ?? "").matchAll(TOKEN)) values[name] = value;
  }
  return values;
}

const darkOff = THEME.includes("/* dark mode: off */");
const LIGHT = { ...tokensOf("/* ---------- 1. Constanten", "/* ---------- 2. Licht"), ...overridesOf("light") };
const DARK = darkOff
  ? undefined
  : { ...tokensOf("/* ---------- 1. Constanten", "/* ---------- 3. Donker"), ...overridesOf("dark") };

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const problems = [];
let checked = 0;

/*
 * Elk token uit het donkere blok heeft een tegenhanger in het lichte blok.
 *
 * Dat klinkt als ordening en is een reparatie: een token dat alleen in `.dark` staat, wordt door
 * een geneste `.light` niet teruggezet en erft dan de donkere waarde van `<html>`. Een deel van een
 * pagina dat op licht vaststaat (een inlogscherm, een afdruk) valt dan om.
 */
if (DARK !== undefined) {
  for (const name of Object.keys(DARK)) {
    if (!Object.hasOwn(LIGHT, name)) {
      problems.push(
        `--${name} staat alleen in het donkere blok; een geneste .light erft dan de donkere waarde`,
      );
    }
  }
}

const modes = DARK === undefined ? [["licht", LIGHT]] : [["licht", LIGHT], ["donker", DARK]];
for (const [modeName, tokens] of modes) {
  for (const [fg, bg, minimum] of PAIRS) {
    const front = tokens[fg];
    const back = tokens[bg];
    if (front === undefined || back === undefined) {
      problems.push(`${modeName}: token --${front === undefined ? fg : bg} bestaat niet`);
      continue;
    }
    checked += 1;
    const value = ratio(front, back);
    if (value < minimum) {
      problems.push(
        `${modeName}: --${fg} op --${bg} haalt ${value.toFixed(2)}:1, minimaal ${minimum}:1 ` +
          `(${front} op ${back})`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Contrast: ${problems.length} probleem(en).\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `Contrast: schoon. ${checked} paren gerekend in ${modes.length === 1 ? "lichte modus (donker staat uit)" : "twee modi"}.`,
);
