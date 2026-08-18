# Prototype: «Natten så langt» og redigering

**Spørsmål:** hvordan skal en natt vises og rettes?

Dagens løsning er én periodeliste med utfoldbare rader. Den virker, men
oppleves som treg å bruke. Napper ble nevnt som referanse — den plotter
alt på en 24-timers skive og lar deg trykke rett på tidslinja.

**Prototypen:** `prototype-natten.html`, tre varianter på samme rute,
byttes med `?variant=A|B|C` eller piltastene.

| | | Primærgrep |
|---|---|---|
| A | Døgnskive | Trykk på buen, dra i endene. Spatial, som Napper. |
| B | Natten fortalt | Natten som setninger; tallene i teksten er feltene. |
| C | Gjennomgang | Én hendelse om gangen, appen flagger det som ser rart ut. |

Leser virkelige netter fra samme Supabase-rom som appen, men skriver
aldri tilbake. Endringer lever i minnet til siden lastes på nytt.
Den ekte appen er i bruk hver natt og må ikke kunne ryke herfra.

De tre innebygde nettene er valgt for ulik tetthet: 3. aug har 5 økter
og 11 besøk, 6. aug har 7 økter, 15. aug har én. En variant som bare
ser bra ut på den tomme natten er ikke god nok.

## Svar

**A vant**, med tre endringer fra prototypen:

- **Halvsirkel, ikke hele døgnet.** 220 grader som åpner nedover, og
  bare de timene natten faktisk dekker. Timetallene ble helt fjernet —
  buen dekker jo bare natten, så de sa lite.
- **Ingen dra-og-slipp.** Den var upresis. Du trykker på en boble, og
  retter i panelet.
- **Hver hendelse er en boble**, ikke et buesegment. Brukerens eget
  bilde: «hver hendelse som en boble på en ellers stille natt». Det
  løste samtidig treffeproblemet — en tre minutters oppvåkning ble
  under to piksler som segment, men får nå minst 22 px treffeflate.

Lagt til utover forslagene:

- Buen er **slått sammen med nedtellingen**. Ett objekt: natten ytterst,
  nedtellingen som en indre ring som bare finnes når den teller, status
  i midten.
- Mens natten pågår ender buen ved **antatt stå-opp-tid** — snittet av
  tidligere netter uten uteliggere — så buen ligger stille og «nå»
  beveger seg mot morgenen.
- **Månen er leggetiden**, sola er morgenen. Begge kan trykkes.

B og C ble ikke brukt. C sin idé om å flagge det som ser rart ut lever
videre i at besøk over minuttet farges røde.

## Etterpå

Prototypen er foldet inn. `prototype-natten.html` og denne fila kan
slettes når du er ferdig med å sammenligne.
