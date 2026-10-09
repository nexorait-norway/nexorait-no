# Nexorait LeadFlow Pilot v1: produktspec og leveranseprosess

**Status 2026-10-09:** Pilotpakke og interaktiv, klientbasert demonstrasjon er laget. Demonstrasjonen behandler bare fiktive data. Kundespesifikk drift, produksjonsbetaling, telefonintegrasjoner og fagsystemkoblinger er **ikke** generelt ferdig utviklet. Ikke lov funksjonalitet før den er testet for kunden.

## Hva Nexorait selger

Nexorait hjelper små norske servicebedrifter med å svare på og følge opp kundehenvendelser. Start med ett avgrenset problem, mål effekten, og bygg videre etter kundens behov.

### A. Starter: veiledende 2 990 kr, engangsbeløp
- Kartlegging av ett definert problem med kundehenvendelser.
- Én standardisert arbeidsflyt på kundens godkjente kanal og verktøy.
- Svarutkast og oversikt over hvem som skal følge opp, med menneskelig godkjenning.
- Enkel gjennomgang ved overlevering.
- Leveransen er bare tilgjengelig når kanaltilgang og lovlig behandlingsgrunnlag er bekreftet; ekstra integrasjoner prises særskilt.

### B. Automation Setup: fra 7 500 kr, engangsbeløp
- Flere avgrensede arbeidsflyter etter spesifisert tilbud.
- Tilbud, kalender eller oppfølging **kun hvis** teknisk støtte, API-tilgang og sikkerhetskrav er verifisert.
- Individuell akseptansetest.

### C. Løpende støtte: fra 990 kr per måned
- Avtalt overvåking og feilretting for løsningene som faktisk er levert.
- Endringsarbeid og forbruk utover inkludert omfang prises etter egen aksept.
- Ingen garanti om 24/7-support, automatisk AI-telefon eller ubegrenset modellforbruk.

**Prisforbehold:** Klargjør om beløp er ekskludert eller inkludert merverdiavgift i hvert tilbud basert på Nexoraits MVA-registrering. Ingen faktura, abonnement eller betaling opprettes uten faktisk akseptert tilbud og avklart produksjonsflyt.

## Eksempel på en leverbar første pilot

Kanal: kundens nettskjema **eller** godkjente fellesinnboks.

1. Kunde sender forespørsel i valgt kanal.
2. Henvendelsen får unik referanse og lagres med definert tilgangsstyring.
3. Sak tildeles en av kategoriene: ny, under arbeid, fulgt opp.
4. Svarutkast klargjøres. En person godkjenner før utsendelse.
5. Status oppdateres; uløste saker vises i ukesoversikt.
6. Kunden kan hente ut egne saker og avslutte piloten etter avtalt prosess.

**Viktig:** Nexoraits interne support- og billing-systemer er demonstrasjoner på tekniske byggeklosser, ikke godkjente multitenant kundesystemer. Kundedata skal ikke settes inn i dem før tilgangsisolasjon, databehandleravtale, datalagringssted, backup, sletting og rollemodell er kontrollert.

## Demo

Fil: `leadflow-demo.html` på feature-branch.
- Kun syntetiske eksempeldata; ingen nettverksforespørsler eller lagring.
- Vis henvendelser, filtrer status, marker saker og kopier manuelt svarutkast.
- Tydelig tekst om at ingen ekte AI, e-post eller CRM er koblet til.
- Ikke omtale demoen som et ferdig pilotprodukt.

## Kundeprosess

### 1. Kvalifisering
- Bedrift: navn, bransje, omtrentlig størrelse og publisert bedriftkontakt.
- Hvem er rett kontaktperson, og hvordan har vi lov til å kontakte dem?
- Én konkret tidstyv eller et tapt oppfølgingspunkt.
- Nåværende kanal/verktøy og estimert månedlig volum.
- Stopp hvis kunden etterspør noe risikofylt, uavklart eller utenfor kompetansen.

### 2. Mini-audit (uten kundedata før avtale)
- 15 minutter om nåsituasjon.
- Tegn opp «henvendelse → ansvarlig → respons → avslutning».
- Foreslå én pilot med målbare effekter og forutsetninger.

### 3. Tilbud og sign-off
- Presis leveranse, tekniske avhengigheter, klient-/leverandøransvar.
- Totalpris og eventuell løpende pris; betalingstrinn 50 % ved start og 50 % etter avtalt aksept kan foreslås, men er ikke automatisk.
- Avtal tidsramme, avvik, feilretting, terminering, sikkerhet, support, eksport/sletting.
- Undersøke behov for databehandleravtale etter GDPR artikkel 28, underleverandører og eventuell overføring utenfor EØS.
- Eier godkjenner rettslig bindende avtale og aktivering av reell betaling.

### 4. Teknisk leveranse
- Opprett separat kundeoppsett og tilgangsstyring (ingen delt database uten isolasjon).
- Be om minimal nødvendig tilgang; aldri samle passord i klartekst.
- Bruk syntetiske testdata først.
- Test feil, duplikater, retries, API-grenser, rettigheter, logging og gjenoppretting.
- Godkjenn pilot med kundens representant før reelle kundehenvendelser går gjennom.

### 5. Akseptansekriterier
1. Ny sak får en vedvarende unik ID.
2. Gjentatt innsending med samme referanse gir ikke dobbel sak.
3. Kun autoriserte personer kan se en bedrifts henvendelser.
4. Kategorisering og utkast er korrekte i avtalte testscenarier.
5. Ingen ekstern utsending uten avtalte godkjenningsregler.
6. Feil varsles uten å lekke personopplysninger.
7. Kunden kan eksportere og få slettet opplysninger etter avtalen.
8. Kundens aksept dokumenteres.

## Salgs- og personvernregler
- Sjekk `/Nexorait/outreach-suppression.md` og eksisterende CRM/utsendelser før ny kontakt.
- Ingen ny kald henvendelse til Lysglimt Elektro, Rørleggervakta eller Rørlegger Olsen.
- Bruk bare lovlig markedsføringskanal og verifiser faktisk kontaktadresse; særskilte regler gjelder fysisk person.
- Maks to relevante oppfølginger når lovlig, eller færre hvis mottakeren ber om det.
- Ingen falske referansekunder, resultater, «AI svarer alltid» eller oppdiktede integrasjoner.
- Rydd opp i historikken umiddelbart etter hver faktisk utsending.
- Unngå offentlige AI-tjenester på uavklart kundedata.

## Økonomimåling
Mål ukentlig: kvalifiserte samtaler, sendte lovlige henvendelser, avtalte møter, signerte piloter, leveransekostnad, gjentakende omsetning, feil og churn. **Omsetning er ikke overskudd.**

## Leveransestatus
- [x] Prisstruktur og første tjenestebeskrivelse
- [x] Sikker syntetisk salgsdemo på feature-branch
- [x] Salgs-/leveranse-/akseptansemal
- [ ] Faktisk demo kvalitetssikret i nettleser og publisert
- [ ] Første kvalifiserte kundesamtale
- [ ] Databehandleravtale og kundeisolasjon for konkret pilot
- [ ] Første vellykkede kundespesifikke ende-til-ende pilot
- [ ] Lovlig avklart produksjonsbetaling og fakturering
