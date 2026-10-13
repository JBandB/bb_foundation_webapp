<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Fonts van de applicatie

De drie fonts die `app/layout.tsx` via `next/font/local` laadt. Zelf gehost, zodat noch de build
noch de browser een fontdienst nodig heeft.

| Bestand | Font | Gewichten | Rol |
|---|---|---|---|
| `space-grotesk-latin-var.woff2` | Space Grotesk | 300 tot 700, variabel | Koppen |
| `manrope-latin-var.woff2` | Manrope | 200 tot 800, variabel | Bodytekst |
| `jetbrains-mono-latin-var.woff2` | JetBrains Mono | 100 tot 800, variabel | Cijfers en code |

Alle drie staan onder de SIL Open Font License 1.1 en mogen worden meegeleverd. Het is de latin
subset zoals Google Fonts die aanbiedt.

Eigen letters van een project komen in `public/fonts/` met een `@font-face`-blok in
`app/project.css`, en gaan in `--font-display` of `--font-sans` vooraan staan. Zie docs/THEME.md.
