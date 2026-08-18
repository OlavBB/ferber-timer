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

_Fylles ut når valget er tatt._

Interessant tilbakemelding er som regel «headeren fra B med griping
fra A» — deler, ikke hele varianter.

## Etterpå

Fold vinneren inn i `index.html` (skrevet ordentlig, ikke kopiert —
prototypekoden har ingen tester og minimal feilhåndtering), slett
`prototype-natten.html` og denne fila.
