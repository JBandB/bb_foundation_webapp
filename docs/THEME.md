<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De themagids

Hoe kleur, typografie en vorm in dit project werken, en waarom. De regels zijn kort; de rest is
gereedschap dat ze afdwingt.

**Alles visueels woont in drie bestanden.** `app/theme.css` is gegenereerd uit de acht merkkleuren in
`project.config.json` (`pnpm template:generate` schrijft hem opnieuw; niet bewerken).
`app/project.css` is van het project: eigen tokens en overrides, en wint van theme.css omdat hij erna
wordt ingelezen. `app/globals.css` koppelt de tokens aan Tailwind en zet de basis. Een kleurwaarde
ergens anders in `app`, `components` of `lib` weigert de huisregel `no-hardcoded-colour`; de enige
uitzondering is `lib/brand/tokens.ts`, ook gegenereerd, voor de plekken zonder CSS (mail, de
browserbalk).

## 1. Twee modi

Licht staat op `:root` en is de standaard. Donker staat onder `.dark` en komt uit
`user_preferences.theme`, per persoon, door de root-layout als class op `<html>` gezet in het HTML
dat de server verstuurt. Zonder dat ziet wie donker koos eerst een wit scherm dat een tel later
omslaat. Staat `darkMode` in de configuratie op `off`, dan is er geen schuifje en blijft alles licht.

Het inlogscherm staat vast op licht, via een layout die een `.light` om de tak zet: dat scherm is
technisch publiek en hoort er voor iedereen hetzelfde uit te zien. Zo'n geneste `.light` schildert
zijn eigen achtergrond (`bg-background`), want `body` houdt de kleur van de root.

De `dark:`-variant van Tailwind luistert naar onze class en niet naar de systeeminstelling:
`@custom-variant dark (&:where(.dark, .dark *))` bovenaan globals.css.

## 2. Tokens

De namen volgen het shadcn/ui-contract, zodat het token en de Tailwind-klasse dezelfde string zijn:
`--muted-foreground` is `text-muted-foreground`. Daarbovenop:

- Vier tekstniveaus: `--foreground`, `--foreground-soft`, `--muted-foreground`,
  `--subtle-foreground`. Het contract kent er drie; een vierde scheelt tientallen plaatselijke
  uitzonderingen.
- `--on-dark`: inkt op een vlak dat in beide modi donker is (de rail, de primaire knop).
- `--accent-quiet`: de kleur van een koppeling en van een actieve stand, rustiger dan `--accent`.
- Statusdrieklanken: `--success`, `--warning`, `--destructive`, `--info`, elk met `-bg` en
  `-fg` voor de pil. De volle kleur is voor een punt, een balk of een icoon; zet hem nooit als
  tekst op `--background`. `--neutral-bg` en `--neutral-fg` zijn de pil zonder oordeel.
- De rail: `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`,
  `--sidebar-border`. De rail is het merk en verschuift niet met de modus.
- Grafieken: `--chart-1` tot en met `--chart-6` op volgorde, `--chart-grid`, `--chart-track`.
- Vorm en beweging: `--radius`, `--radius-tight`, `--radius-card`, `--ring`, `--ring-width`,
  `--shadow-float`, `--shadow-panel`, `--overlay`, `--dur-fast`, `--dur-base`, `--ease`,
  `--skeleton`, `--skeleton-sheen`.

De acht merkkleuren uit de configuratie (`primary`, `accent`, `surface`, `ink`, `success`,
`warning`, `danger`, `info`) worden door de generator uitgewerkt tot dit hele palet, licht en
donker, in OKLCH, en daarna nagerekend: elk paar uit `template/generators/contrast-pairs.json` haalt
de norm (4,5:1 voor tekst, 3:1 voor randen en uitgeschakelde tekst, WCAG 2.2, 1.4.3 en 1.4.11).
Haalt een paar het niet, dan stelt de generator de tint in stapjes bij met behoud van de kleur; lukt
dat niet, dan faalt hij met de naam van het paar. `pnpm check:contrast` rekent dezelfde paren na,
inclusief wat `app/project.css` erover heen legt.

**Radius** komt uit `brand.radius`: `sharp` is 4 pixels (2 voor dichte bediening, 8 voor kaarten),
`soft` een slag ronder. Chips, avatars en schuifjes zijn altijd een pil.

**Maatvoering.** Tabelrijen 44 pixels, knoppen en invoervelden 36, kaartpadding 20, paginamarge
24 tot 32.

## 3. Typografie

| Rol | Familie | Maat | Gewicht |
|---|---|---|---|
| Paginatitel | display | 26px | 600 |
| Sectie- en kaarttitel | display | 17px | 600 |
| Body, tabelcellen | sans | 14px | 400 of 500 |
| Labels, meta | sans | 12,5px | 500 |
| Bovenschrift (`.overline`) | sans | 11px | 500, 0,16em spatiëring |
| Codes, datums, getallen | mono | 12,5px | 400 |

Drie open fonts, zelf gehost uit `public/fonts` via `next/font/local`: opgehaald bij het bouwen,
geserveerd van het eigen domein, nooit een `<link>` naar een fontdienst. Een project met eigen
merkletters zet ze in `public/fonts` en wijst ze aan in `app/fonts/`; de rollen blijven dezelfde.

Elk getal is tabular via de klasse `.num`. Elk bovenschrift is `.overline` en elk label `.label`:
één klasse, niet vier losse die op drie maten voorkomen.

## 4. Componenten

De UI-kit staat in `components/ui/` en is van het template; eigen componenten van het project gaan in
`components/<domein>/`.

**Knoppen.** 36 pixels, `--radius`, gewicht 500. Varianten in `components/ui/button.ts`: `primary`,
`secondary`, `outline`, `quiet`, `danger`, `bare`. Hover verschuift de vulling, indrukken zakt een
pixel, focus is `--ring-width` van `--ring` op twee pixels afstand.

**Invoervelden.** 36 pixels, vulling `--input`, rand `--border-strong`. Die rand is niet decoratief:
in lichte modus is een veld wit op wit, en de rand is het enige dat hem als veld aanwijst.

**Tabellen** (`components/ui/table.tsx`). Geen verticale lijnen; kopregel in `.overline` op
`--muted`; rijen 44 pixels met een haarlijn en een lichte baan bij hover. Getallen rechts met `.num`,
tekst links.

**Kaarten.** `--card` op `--background`, haarlijn, `--radius-card`, 20 pixels padding, plat. Er is
met opzet geen schaduw voor een kaart in de pagina.

**Statuschips** (`components/ui/chip.tsx`). Een pil met het `-bg`/`-fg`-paar. De betekenis zit in het
woord, nooit alleen in de kleur.

**Schuifjes** (`components/ui/switch.tsx`). Elke aan-uitkeuze. Geen JavaScript: het vakje blijft een
vakje met `sr-only` en de baan reageert op `:checked`.

**Tabbladen** zijn onderstreept: een balk van twee pixels in `--accent` onder het actieve blad
(`components/ui/sub-nav.tsx`), met echte routes per blad.

**Update, plusje, zwevend paneel.** Een sectie met bewerkingen heeft rechtsboven het woord Update en
een plusje (`components/ui/panel-section.tsx`). Wat opengaat zweeft boven de pagina bij de knop die
het opende, en sluit bij een klik ernaast of Escape (`components/ui/popover-panel.tsx`). Een blok
dat in de pagina groeit duwt het overzicht weg, en dat is de meest gemelde ergernis in een eerder
project.

**Terug** is één pijl links van de paginatitel (`components/ui/back-link.tsx`), met de bestemming in
`aria-label`. Geen onderstreepte tekstlinks.

**Lege toestanden** (`components/ui/empty-state.tsx`): gecentreerd, een kader in `--muted`, een
titel, één regel, hoogstens één actie. "Er is nog niets" vraagt om een knop; "je filter levert
niets op" vraagt om het filter aanpassen.

**Skeletons**: de klasse `.skeleton`, in de vorm van het echte element, nooit meer dan één schermdeel
tegelijk in beweging.

## 5. Schaduw en beweging

Twee schaduwen, allebei voor iets dat zweeft: `shadow-float` voor een popover of keuzelijst,
`shadow-panel` voor een dialoog of drawer. Verlopen zijn nergens.

`--dur-fast` (120 ms) voor hover en kleur, `--dur-base` (180 ms) voor panelen en tabbladen, op
`--ease`. Niets duurt langer dan 250 ms, en `prefers-reduced-motion` is in globals.css afgevangen.

## 6. Het merk

Het merk is tekst of een bestand, nooit nagetekend. Met `logo.kind: "wordmark"` zet
`components/brand/mark.tsx` de projectnaam als woordmerk; met `kind: "image"` toont hij het SVG uit
`public/brand/` (en een donkere variant als die er is). De organisatienaam staat onderin de rail.
Nooit herkleuren, nooit in tekst nabouwen wat als beeld is aangeleverd.

## 7. Eigen tokens toevoegen

In `app/project.css`, onder `:root` en onder `.dark`, allebei: een token dat je alleen in `.dark`
zet, erft in een genest licht deel de donkere waarde. Noem hem naar wat hij betekent in dit project,
niet naar de kleur. Draai daarna `pnpm check:contrast`; staat je token in een tekst-op-vlak-paar,
voeg dat paar dan toe aan de paren die het project zelf rekent (zie het commentaar bovenin
`scripts/check-contrast.mjs`).

## 8. Voordat je een scherm mergeet

- [ ] Geen hex buiten `app/theme.css`, `app/project.css` en `lib/brand/tokens.ts`; `pnpm lint`
      controleert het.
- [ ] `pnpm check:contrast` schoon, ook als je alleen een tint hebt aangeraakt.
- [ ] Het scherm klopt in beide modi, met het oog nagekeken en niet alleen gerekend.
- [ ] Elk getal is tabular, elk bovenschrift `.overline`, elk label `.label`.
- [ ] Focus zichtbaar met alleen het toetsenbord.
- [ ] Een statuskleur draagt nooit alleen de betekenis: er staat een woord bij.
