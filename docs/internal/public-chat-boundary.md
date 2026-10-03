# INTERN UTCAST — ikke produksjon

- Dato: 2026-10-03
- Forfatter: Nexorait Engineering Bot
- Revisjon: 4
- Status: revisjon 4, implementasjonsutkast lokalt. Ikke publisert, ikke deployet, ikke committet, ikke lagt i repoet, ingen kjørende kode. Funn 1, 2 og 3 er faste stopp under. Mottaket er av. Ingen lagringskode.
- Gjelder: skillet mellom offentlig chatbot (Nexorait Kundeservicebot på nexorait.no) og interne agenter.

Kravene i dette dokumentet er krav. De er ikke antakelser.

## Hva som faktisk finnes i repoet

Lest read-only via `user-Github` som `nexorait-norway`, repo `nexorait-norway/nexorait-no` (privat, eneste repo på kontoen):

| Sti | Hva den sier |
| --- | --- |
| `README.md` | Privat repo for nettsiden. Statisk utkast. Ikke koblet til domenet, ikke publisert. Neste steg nevner kontaktskjema, hosting, og at `nexorait.no` kobles først etter at DNS- og Purelymail-poster er sikret. |
| `index.html` | Statisk forside, `lang="no"`. Ankre: `#top`, `#problem`, `#hvordan`, `#for-hvem`, `#faq`. Kontakt er `mailto:kontakt@nexorait.no`. Ingen chatbot, ingen API-kall. |
| `wrangler.jsonc` | Worker-navn `nexorait-site`. Kun statiske assets fra `./public`. Ingen bindings, ingen secrets i fila. |
| `.github/workflows/deploy.yml` | Workflow «Deploy Nexorait to Cloudflare» på push til `main` og `workflow_dispatch`. `npx wrangler deploy` med `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID`. |

`cursor-github` er ikke brukt (ikke autentisert). `public/index.html` er ikke lest; størrelsen er 9486 byte, samme som rotfila, men innholdet er ikke sammenlignet.

**Avvik:** repoet har ingen chatbot, ingen adapter, ingen `/public/chat/messages`, ingen intent-navn og ingen av agentnavnene under. Der repoet har et navn, er det navnet brukt. Ingenting under er et nytt funn i repoet.

**Avgrensning mot repoet:** «Nexorait Kundeservicebot» og agentlisten (Orchestrator, Engineering, Nettsted, Research, Voice, QA & Security, Operations, Compliance, Growth) kommer fra oppdraget, ikke fra repoet. «Operasjonssenter» i `index.html` er en illustrasjon på forsiden, ikke Orchestrator.

Statisk side på Cloudflare er greit. Det er worker `nexorait-site`: statiske assets, deployet med `wrangler` i `deploy.yml`. Cloudflare-API er noe annet. `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID` hører til den deployen, og skal ikke ligge i offentlig chat-prosess.

## Skillet

| | Offentlig | Internt |
| --- | --- | --- |
| Hva | Nexorait Kundeservicebot på nexorait.no | Orchestrator, Engineering, Nettsted, Research, Voice, QA & Security, Operations, Compliance, Growth |
| Hvem | Uinnlogget besøkende. Fast rolle `public_visitor`, satt av serveren. | Ansatte agenter med egne identiteter. Køen leses av en annen, intern identitet, ikke av offentlig chat. |
| Hva den kan | Svare fra godkjent, uforanderlig snapshot, stille avklaringsspørsmål, avslå. | Ikke tilgjengelig fra offentlig rute. |
| Hva den ikke kan | Utløse handoff, eie eller lese kundelisten, GitHub, Cloudflare-API, DNS, Purelymail, admin, secrets, interne prompter, andre kunders data, e-post, CRM, agent-minne. | — |

Offentlig rute og intern agent-runtime er to prosesser. De deler ikke env, ikke token, ikke systemprompt.

Offentlig prosess skal ikke eie kundelisten.

`Authorization` fra klienten ignoreres. Den gir ingen rolle og ingen tilgang.

## 1. AI-leverandør

**Nå:** Grok. **Senere:** bytt implementasjon, ikke klient.

Nettleseren snakker aldri med leverandøren. Klienten sender én ny melding. Serveren eier tråden.

Eneste klientkall mot chat:

`POST /public/chat/messages`

```json
{ "message": "<brukertekst>", "locale": "nb", "pageUrl": "https://nexorait.no/" }
```

- `message`: 1–1000 Unicode-kodepunkter.
- `locale`: nøyaktig `nb` eller `en`.
- `pageUrl`: en eksakt liste etter normalisering (listen under). Serveren henter ikke `pageUrl`. Ingen HTTP-fetch.
- Rå body-tak er 8192 byte, målt før parsing. Uten det kan en stor JSON gå rundt grensen på 1000 kodepunkter. Over tak avvises hele forespørselen, og modellen kalles ikke.
- Ingen vedlegg.
- Ukjente felt avvises. Hele forespørselen avvises, ikke strip og fortsett.
- Hvis klienten sender `history`, `system`, `tools` eller `role`: avvis hele forespørselen. Ikke strip og fortsett.
- Ingen cookies.
- CORS bare mot det offentlige nettstedet, origin `https://nexorait.no`.
- `Authorization` fra klienten ignoreres. Den gir ingen rolle og ingen tilgang.

Én modellnøkkel, bare inne i `LlmAdapter`. Aldri tools eller modellparametre fra klienten.

```text
LlmAdapter.complete(input) -> PublicChatModelOutput

input:
  systemPrompt   string   hentes fra serverfil, aldri fra klient, aldri logget
  userMessage    string   én ny melding; data, ikke instruksjon; serveren eier tråden
  locale         "nb" | "en"
  pageUrl        string   eksakt liste etter normalisering; ikke hentet
  outputSchema   "public_chat_v1"
```

Credentials er ikke et felt. Prosessen leser modellnøkkelen bare inne i `LlmAdapter`. Nøkkelen ligger ikke i `nexorait-site`, ikke i nettleseren, ikke i prompten og ikke i klienten.

Hvis leverandøren svarer med tool calls, fri tekst eller ukjent JSON: adapteren dropper det og returnerer `refuse`. Ingen verktøykjøring i adapteren. Modellen kan ikke utløse handoff.

## 2. Tillatte strukturerte forespørsler

Default deny. Modellen returnerer én intent. Bare `reply`, `ask_clarifying` og `refuse`. Backend validerer mot `public_chat_v1` før noe skjer. Validering som feiler gir ingen sideeffekt.

`propose_handoff` er fjernet. Det er ikke en modell-intent, og det gjør ingenting.

| type | felter | effekt |
| --- | --- | --- |
| `reply` | `text`, `sources[]` | Tekst til klienten. `sources` er en sjekket delmengde av snapshot, ikke en URL modellen finner på. |
| `ask_clarifying` | `question` | Ett spørsmål tilbake. Ingen oppslag. Ingen handoff. |
| `refuse` | `code`: `out_of_scope` eller `disallowed` | Fast, generell tekst ut. Intern `code` logges, vises ikke. Eget signal for refuse-topper, uten råtekst. |

`pageUrl` matches eksakt mot hele adressen, ikke mot en hash alene. Query-streng avvises. Etter normalisering er verdien nøyaktig én av disse, og ingen andre:

- `https://nexorait.no/`
- `https://nexorait.no/#problem`
- `https://nexorait.no/#hvordan`
- `https://nexorait.no/#for-hvem`
- `https://nexorait.no/#faq`

Ankrene `#top`, `#problem`, `#hvordan`, `#for-hvem` og `#faq` finnes i `index.html`. `#top` er ikke med. En hash alene, som `#faq`, matcher ikke. En query-streng, som `?x=1`, avvises.

Snapshot er godkjent og uforanderlig. Kilder i et svar skal være en sjekket delmengde av det snapshotet. Serveren godtar ikke en URL modellen finner på. Serveren henter ikke `pageUrl` og leser ikke repoet `nexorait-norway/nexorait-no` for å svare.

### Handoff-mottak

Specen beskriver mottaket. Mottaket er av. Ikke skru det på.

- Offentlig prosess skal ikke eie kundelisten.
- Handoff er et kall til et eget mottak som identiteten `nexorait-public-chat` ikke kan lese.
- Kallet kan legge inn én rad. Det får ikke andres data i svaret. Svaret er tomt, eller en kvittering uten rader.
- Køen leses av en annen, intern identitet, ikke av offentlig chat.
- Modellen kan ikke utløse handoff. Bare en eksplisitt brukerhandling kan kalle mottaket.
- Selv da er mottaket av, inntil lagring er godkjent.
- Ekte leads skal ikke lagres før eieren har sagt ja etter ekstern vurdering.
- Ingen lagring av kontakt, samtykke eller samtale i denne revisjonen som kjørbar oppførsel.
- Handoff-taket settes først når mottaket skal skrus på. Det skrus ikke på. Ingen lagringskode.
- Dette utkastet sender ingen e-post og rører ikke Purelymail. `kontakt@nexorait.no` er ikke avsender.

## 3. Det backend må avslå

Avslås selv om modell eller klient ber om det. Offentlig prosess skal ikke ha disse credentialene i det hele tatt.

| Handling | Konkret |
| --- | --- |
| GitHub | Ingen GitHub-nøkkel. Ikke skriv, og ikke les private repoer, inkludert `nexorait-norway/nexorait-no` (issues, PR, contents, actions). |
| Cloudflare-API | Ingen Cloudflare-API-nøkkel. Ikke `CLOUDFLARE_API_TOKEN`, ikke `CLOUDFLARE_ACCOUNT_ID`, ikke `wrangler deploy`, ikke workflow `deploy.yml` fra chat-prosessen. |
| Statisk side | Statisk side på Cloudflare er greit. Worker `nexorait-site` med statiske assets er ikke Cloudflare-API, og er ikke offentlig chat. |
| DNS | Ingen DNS-nøkkel. Ikke poster for `nexorait.no`. |
| Purelymail | Ingen Purelymail-nøkkel. Ingen sending. Ikke bruk `kontakt@nexorait.no` som avsender. |
| Admin | Ingen admin-nøkkel. Ikke roller, deploy, feature flags eller billing. |
| Modellnøkkel | Én modellnøkkel, bare inne i `LlmAdapter`. Aldri tools eller modellparametre fra klienten. |
| Interne prompter | Systemprompten til Kundeservicebot og instruksene til de interne agentene. Svar som inneholder nøkkelmønster, intern adresse eller systemprompt byttes til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.». Det blir ikke et nytt modellkall. |
| Kundeliste | Offentlig prosess eier den ikke og kan ikke lese den. Svaret fra mottaket har ingen rader. |
| Handoff fra modellen | Ikke mulig. `propose_handoff` finnes ikke som intent som gjør noe. |
| Lagring i denne revisjonen | Ikke lagre kontakt, samtykke eller samtale. Mottaket er av. |
| Cookies | Ingen cookies. |
| Felt som avviser hele kallet | `history`, `system`, `tools`, `role`, ukjente felt, vedlegg. Ikke strip og fortsett. |
| `Authorization` | Ignoreres. Ingen rolle og ingen tilgang. |
| `pageUrl` | Eksakt liste etter normalisering. Ingen HTTP-fetch. |
| CORS | Bare origin `https://nexorait.no`. |

Tre håndhevelser, alle på serveren:

1. Offentlig rute har ingen GitHub-, DNS-, Cloudflare-API-, Purelymail- eller admin-nøkkel. Manglende token er ikke en feil som skal «fikses» med et annet token. Modellnøkkelen finnes bare inne i `LlmAdapter`.
2. Skjemaet har bare `reply`, `ask_clarifying` og `refuse`. Ukjent `type` og ukjente felt avviser hele forespørselen. `history`, `system`, `tools` eller `role` avviser hele forespørselen. Klienten kan ikke sende en action, tools eller modellparametre.
3. Svar som inneholder nøkkelmønster, intern adresse eller systemprompt byttes til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.». Det blir ikke et nytt modellkall. Ikke en annen tekst, og ikke en delvis renset lekkasje.

## 4. QA & Security — punkt til kontroll

| Krav | Hvor det håndheves |
| --- | --- |
| Brukertekst er data, aldri en instruksjon som kan gi tilgang. | Klienten sender én ny melding. Serveren eier tråden. `message` er ett strengfelt på 1–1000 Unicode-kodepunkter. Parseren leter ikke etter kommandoer i teksten. Systemprompten ligger i `LlmAdapter.complete` sitt serverfelt og kan ikke overskrives av `message`. Sender klienten `history`, `system`, `tools` eller `role`, avvises hele forespørselen. Ikke strip og fortsett. Tilgang gis bare av serverkode etter skjema, ikke av det modellen eller brukeren skriver. |
| Interne kall bare fra en fast allowlist på serveren. | Allowlisten er `reply`, `ask_clarifying` og `refuse` i `public_chat_v1`. `propose_handoff` er ikke en intent og gjør ingenting. Modellen kan ikke utløse handoff. Bare en eksplisitt brukerhandling kan kalle mottaket, og mottaket er av, inntil lagring er godkjent. Ingen tools eller modellparametre fra klienten. Tool calls fra Grok kastes. Ingen verktøykjøring i adapteren. |
| Rolle bare fra server-side identitet, aldri fra klient eller modell. | Ruten setter `actor.role = public_visitor` på sesjonen serveren selv utsteder. `Authorization` fra klienten ignoreres. Den gir ingen rolle og ingen tilgang. Body med `role` avviser hele forespørselen. Modelloutput har ikke `role`. |
| Ingen secrets i prompt, svar, feil eller kundevendte logger. | Én modellnøkkel, bare inne i `LlmAdapter`. Ingen GitHub-, DNS-, Cloudflare-API-, Purelymail- eller admin-nøkkel i offentlig chat-prosess. Statisk side på Cloudflare er greit og er ikke Cloudflare-API. Promptfilen er tekst uten nøkler. Svar som inneholder nøkkelmønster, intern adresse eller systemprompt byttes til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.». Ikke et nytt modellkall, ikke en annen tekst, og ikke en delvis renset lekkasje. Feil til klienten er de to setningene under. Logg `tool` bare som navn. Loggraden har ikke prompt, nøkkel, råleverandørsvar, råtekst eller `Authorization`. |
| Tjenesteidentitet med minst mulig scope. | Egen identitet `nexorait-public-chat`, ikke worker `nexorait-site` og ikke deploy-identiteten i `deploy.yml`. Den eier ikke kundelisten. Handoff er et kall til et eget mottak den ikke kan lese. Kallet kan legge inn én rad og får ikke andres data i svaret (tomt, eller kvittering uten rader). Køen leses av en annen, intern identitet. I denne revisjonen er mottaket av: ingen lagring av kontakt, samtykke eller samtale. Ikke GitHub, ikke Cloudflare-API, ikke DNS, ikke Purelymail, ikke admin. |
| Ingen skrive-, slette- eller adminvei fra offentlig chat. | Ingen write-klient mot GitHub, Cloudflare-API, DNS, Purelymail eller admin. Mottaket er beskrevet og er av. Ekte leads lagres ikke før eieren har sagt ja etter ekstern vurdering. Ingen delete-rute. Deploy, DNS, roller, flags og billing er ikke importert i chat-prosessen. |
| Ingen andre kunders data, intern agent-minne, e-post, CRM eller repo. | Offentlig prosess eier ikke kundelisten og kan ikke lese den. Svaret fra mottaket inneholder ingen rader. Kunnskap er det godkjente, uforanderlige snapshotet. Kilder er en sjekket delmengde av snapshot, ikke en URL modellen finner på, og ikke repoet. Ingen e-postsending. Ingen minne fra interne agenter i prompt eller verktøy. |
| Rate limit per plattform-IP og per sesjon, avvis over tak. | Krav. Før modellkall: 10 forespørsler per minutt per plattform-IP, og 40 per time per serverutstedt sesjon. Over tak: HTTP 429 og ingen modellkall. Klientteksten er den samme som for 400 og 500. Handoff-taket settes først når mottaket skal skrus på. Det skrus ikke på. Ingen lagringskode. |
| Begrens lengde, tegnsett, vedlegg og URL før modell og verktøy. | Rå body-tak er 8192 byte før parsing, så en stor JSON ikke går rundt grensen på 1000 kodepunkter. Deretter, før `LlmAdapter.complete`: `message` 1–1000 Unicode-kodepunkter; avvis `\u0000`–`\u001F` unntatt `\n` og `\t`, avvis `\u007F`–`\u009F` og `U+202E` / `U+200B`–`U+200F`. `locale` nøyaktig `nb` eller `en`. `pageUrl` matches eksakt mot de fem hele adressene, ikke mot en hash alene. Query-streng avvises. `#top` er ikke med. Serveren henter ikke `pageUrl` (ingen HTTP-fetch). Ingen vedlegg. Ukjente felt avviser hele forespørselen. Ingen cookies. |
| Logg tid, sesjon, verktøy, utfall og korrelasjons-id, ikke rå secrets. | Ett internt event: `at` (ISO-8601, lagres i UTC), `sessionId`, `tool` bare som navn, `outcome`, `correlationId`. Ikke `message`, ikke prompt, ikke nøkkel, ikke argumenter, ikke råtekst. Eget signal for refuse-topper, uten råtekst. |
| Generell feilmelding ut til klienten. | 400, 429 og 500 bruker de samme to setningene: «Noe gikk galt.» og «Prøv igjen senere.» Ikke en egen 429-tekst som avslører rate limit. Ingen stack, ingen leverandørtekst, ingen intern `code`. Svar som inneholder nøkkelmønster, intern adresse eller systemprompt byttes til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.». Det blir ikke et nytt modellkall. |

`outcome` er ett av: `reply`, `ask_clarifying`, `refuse`, `rejected_schema`, `rate_limited`, `error`.

`tool` logges bare som navn, ett av: `none`, `llm.complete`. Handoff-kall logges bare med et navn, og bare hvis et slikt kall finnes senere. Denne revisjonen lagrer ikke.

Rate-limit-tallene (10 per minutt per plattform-IP, og 40 per time per serverutstedt sesjon) er krav. De er ikke en antakelse.

## 5. Deploy stoppes hvis

Deploy av Kundeservicebot stoppes hvis noe av dette er sant:

- en testprompt når et internt verktøy, systemprompten, eller data utenfor det godkjente snapshotet
- modellen kan utløse handoff
- offentlig prosess kan lese kundelisten, eller eier den
- hever rolle eller scope, inkludert at `Authorization` fra klienten gir rolle, et body-felt `role`, eller et svar som påstår intern rolle
- lekker secret, token, env, intern adresse, systemprompt eller en annen kundes data, også som en delvis renset lekkasje
- `pageUrl` hentes (HTTP-fetch)
- `pageUrl` matcher en hash alene, eller godtar en query-streng, i stedet for eksakt treff mot de fem hele adressene
- rå body over 8192 byte når parser eller modell
- handoff-tak eller lagringskode finnes mens mottaket er av
- `history`, `system`, `tools` eller `role` godtas, i stedet for at hele forespørselen avvises
- cookies settes
- CORS er videre enn nettstedet (noe annet enn origin `https://nexorait.no`)
- 429-tekst skiller seg fra 400/500
- åpner en skrivevei (GitHub, Cloudflare-API, DNS, e-post, CRM, slett, admin, deploy), eller lagrer kontakt, samtykke eller samtale mens mottaket er av
- omgår rate limit (forespørsel 11 i samme minutt fra samme plattform-IP, eller forespørsel 41 i samme time på samme serverutstedte sesjon, treffer modellen)
- viser intern detalj i klienten (stack, `code`, promptfragment, agentinstruks, repo-sti, secret-navn)
- et stoppet svar (nøkkelmønster, intern adresse eller systemprompt) utløser et nytt modellkall, eller bruker en annen tekst enn «Noe gikk galt.» og «Prøv igjen senere.»

Stopp også hvis offentlig chat-prosess har `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, GitHub-nøkkel, DNS-nøkkel, Purelymail-credential, admin-nøkkel, eller lesetilgang til `nexorait-norway/nexorait-no`.

Statisk side på Cloudflare er ikke grunn til stopp. Cloudflare-API i den offentlige chat-prosessen er det. De to er ikke det samme. «Statisk Cloudflare-side er greit» står. Et usett unntak er ikke godkjent, og er ikke lagt inn.

Ingen av disse testene er kjørt. Dette er et utkast, ikke en deploy, og ikke klar for kode. Mottaket beskrives over og er av. Ikke skru det på. Ingen lagringskode.

## 6. Implementasjonsutkast

Dette er ikke kjørende kode. Det endrer ingen krav over. Handoff har ikke skjema her, fordi mottaket er av og det ikke skal finnes lagringskode.

Rekkefølge for `POST /public/chat/messages`. Et stopp hopper over alle senere steg. Modellen kalles bare hvis alle stopp før den er passert, og den kalles høyst én gang.

### Skjema for klientkallet

Rå body måles i byte før parsing. Over 8192 byte er stopp 1.

Etter parsing skal verdien være ett JSON-objekt. `additionalProperties` er false. Påkrevd er `message`, `locale` og `pageUrl`, og ingen andre.

- `message`: streng, 1–1000 Unicode-kodepunkter. Lengden telles i kodepunkter, ikke i UTF-16-enheter og ikke i byte.
- `locale`: nøyaktig `nb` eller `en`.
- `pageUrl`: nøyaktig én av `https://nexorait.no/`, `https://nexorait.no/#problem`, `https://nexorait.no/#hvordan`, `https://nexorait.no/#for-hvem`, `https://nexorait.no/#faq`. Ingen omskriving som kan skape et treff. En query-streng, en hash alene, eller `#top` er ikke på listen og avvises.

`history`, `system`, `tools`, `role`, `attachments` og ethvert ukjent felt avviser hele forespørselen. De skal ikke fjernes for så å fortsette. `Authorization` leses ikke som identitet. Ingen `Set-Cookie`.

### Skjema for modellsvaret

`public_chat_v1` er ett objekt med `additionalProperties` false og påkrevd `type`.

- `reply`: `type` er `reply`, `text` er streng, `sources` er en liste. Hvert element har `title` og `url`, og `url` må være en sjekket delmengde av det godkjente snapshotet. Ukjent kilde er ikke et `reply`.
- `ask_clarifying`: `type` er `ask_clarifying`, og `question` er streng.
- `refuse`: `type` er `refuse`, og `code` er `out_of_scope` eller `disallowed`. `code` logges og sendes ikke til klienten.

Tool calls, fri tekst, ukjent `type` eller ukjente felt gir ingen ny modellkalling og ingen sideeffekt. Klienten får de to faste setningene.

### Avvisninger

Alle disse gir de to setningene «Noe gikk galt.» og «Prøv igjen senere.». Ingen av dem kaller modellen. Ingen av dem lagrer melding, kontakt eller samtykke.

| Inntreffer | HTTP | Logg-outcome |
| --- | --- | --- |
| Rå body over 8192 byte, før parsing | 400 | `rejected_schema` |
| Ugyldig JSON, ukjent felt, `history`, `system`, `tools`, `role`, vedlegg, feil `locale`, `pageUrl` utenfor de fem, eller `message` utenfor 1–1000 kodepunkter | 400 | `rejected_schema` |
| Over 10 i minuttet per plattform-IP, eller over 40 i timen per serverutstedt sesjon | 429 | `rate_limited` |
| Modellsvaret bryter `public_chat_v1` | 400 | `error` |
| Svaret treffer stopp 3 | 200-kroppen byttes, uten ny statuslekasje | `error` |

429 bruker samme to setninger som 400 og 500. Den sier ikke at taket er nådd.

### De tre faste stoppene

1. Rå body over 8192 byte stoppes før parsing og før modellkall.
2. `pageUrl` som ikke er eksakt en av de fem hele adressene stoppes før modellkall. Query, hash alene og `#top` er avvist.
3. Svar som inneholder nøkkelmønster, intern adresse eller systemprompt byttes til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.». Det blir ikke et nytt modellkall.

Stopp 3 bytter hele klientkroppen til nøyaktig «Noe gikk galt.» og «Prøv igjen senere.», uten ny modellkalling og uten lagring, når svaret inneholder systemprompten, modellnøkkelens verdi, et nøkkelmønster for GitHub, DNS, Purelymail eller admin, navnene `CLOUDFLARE_API_TOKEN` eller `CLOUDFLARE_ACCOUNT_ID`, eller en adresse som ikke er en eksakt kilde i snapshot, inkludert repo-sti, `nexorait-norway/` og intern vert.

