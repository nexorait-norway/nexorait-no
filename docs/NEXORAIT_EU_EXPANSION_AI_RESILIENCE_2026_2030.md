# Nexorait 2026–2030: europeisk ekspansjon og AI-motstandsdyktig strategi

**Status:** Strategisk plan og beslutningskriterier per 9. oktober 2026. Hypoteser må valideres med betalende kunder. Ingen markedsandel, ARR, konkurrentforskjell eller veksttakt er garantert.

## 1. Hovedvalg: arbeidsflyt og kontroll, ikke bare chatbot

Målet er en leverandøruavhengig operasjonell kontroll- og integrasjonsplattform for håndverks- og feltservicebedrifter med 2–30 ansatte først, senere større kunder.

**Startprodukt:** Nexorait LeadFlow Pilot (kundehenvendelser → forslag → menneskelig godkjenning → ansvarlig oppfølger → status → dokumentert resultat). Selg pilotprosjekter for å lære og dekke utviklingskostnader.

**Langsiktig kategori:** Nexorait Operations Layer: samordner data og oppfølging på tvers av telefoni, e-post, ordre-/fagsystemer, kalender, timer, materiell, regnskap og fakturering. Ikke erstatt kundens regnskapssystem, CRM og booking dersom det finnes tilstrekkelige API-er.

**Hva vi selger:** færre oversette saker, færre manuelle overføringer mellom systemer, dokumenterbare arbeidsflyter og synlig oppdrags-/inntjeningsstatus. Dette er kundeverdi uansett om LLM-er blir raskere og billigere.

## 2. Konkurrenter og dynamikk

| Trussel | Dokumentert funksjon | Nexoraits rasjonelle respons |
|---|---|---|
| SmartDok + Tripletex | Kobling av prosjekt, timer, vareforbruk og faktureringsgrunnlag | Bli et samhandlingslag over systemene, ikke en dårligere kopi av regnskap |
| EG Holte + Tripletex | Overføring av prosjekt, time- og kostnadsdata | Integrasjon først; ikke love ny funksjonalitet uten støttet API |
| Microsoft Dynamics 365 Field Service Copilot | Spørsmål om egne ordre, sammendrag, feltoppdateringer og agentstøtte | Prioriter SMB uten Dynamics og arbeidsflyter som krysser systemgrenser |
| ServiceTitan Atlas | Integrert samtale-AI og innsikt i jobb- og kundedata | Ikke bygg forretningsmodellen på at vi er den eneste AI-assistenten |
| Jobber, Simpro, ServiceM8, Tradify, Nomadia, Praxedo | Brede ordre-/serviceplattformer med ulike målgrupper | Differensier gjennom lokale interoperabilitetsbehov, produktstyring og leveranse |

**Kilder sjekket 2026-10-09:**
- https://support.smartdok.no/knowledge/kom-i-gang-med-tripletex-integrasjon
- https://hjelp.holte.no/tripletex-integrasjon/
- https://learn.microsoft.com/en-us/dynamics365/field-service/copilot-overview
- https://help.servicetitan.com/docs/atlas
- https://www.simprogroup.com/blog/best-field-service-management-software
- https://www.nomadia.com/en/resources/blog/what-are-the-european-alternatives-to-american-fsm-solutions/

### Konkurransehypoteser som MÅ valideres
- Finnes det arbeidsflyter som går mellom minst to systemer og fremdeles håndteres manuelt?
- Vil kunden betale Nexorait, eller opplever de at eksisterende lisens dekker behovet?
- Hvilken leverandør har åpent API og stabil datatilgang?
- Kan kunden sette opp det samme selv med en standard AI-agent på under én time?
- Er det dokumenterbare økonomiske fordeler, ikke bare at funksjonen virker?

Om svaret er «ingen betalende vil betale» må vi endre produktet før vi utvider.

## 3. Produktarkitektur for stadig smartere AI

1. **Normalisert operasjonsmodell:** business/tenant, customer, inquiry, job, quote, technician, task, time, material, invoice, payment, source-id, audit-event. Kundedata separeres per tenant.
2. **Adapterlag:** bygg versjonerte integrasjonsadaptere (Microsoft 365, Google Workspace, utvalgt norsk fagsystem, kalender, økonomi), med idempotens, rate limits, retries, feilkø, backfill og tilgangsbegrensning.
3. **Policy-/godkjenningsmotor:** AI foreslår, deterministisk kode avgjør tillatelser, beløpsgrenser, utsendelser, kontraktendringer og når menneske må godkjenne.
4. **Uavhengig modellruter:** velg modell etter oppgave, kvalitet, pris og personvern, ikke én hardkodet API-leverandør. Kun migrer etter automatiske evals på reelle (anonymiserte/tillatte) oppgaver.
5. **Audit / tilsyn:** spor utførte handlinger, datakilder, feil, kostnader og faktisk menneskelig godkjenning; bruk ikke rå persondata i offentlige logger.
6. **Sikker drift:** EU/EØS datalagring der nødvendig, robust rolle- og tenant-isolasjon, hemmelighetshåndtering, kryptering, backup, restore-test, dataeksport, sletting og hendelsesrespons.
7. **Målbar økonomiverdi:** responstid, gjennomføring, tid spart, feilrate, utestående oppfølgingsoppgaver, fakturerbare timer, ordre uten faktura, bruttofortjeneste per jobb når kvaliteten på data tillater det.

**Differensiering:** Tverrsystemiske arbeidsflyter, domeneprosessene, sikker gjennomføring, pålitelig integrasjon og dokumentert effekt. Ikke «hemmelige prompter», modellnavn eller generisk AI-telefon.

## 4. Vekstfaser og harde porter

### Fase 0 – Norge: betalingsbevis (nå til første 3 kunder)
- Selg bare konkret dokumenterbare, avgrensede LeadFlow-piloter.
- 3 betalende kunder som ikke er nærstående; minst 2 aksepterte leveranser.
- Registrer ledetid, timeforbruk, modellkost, salgsarbeid, integrasjonsfeil, refunderinger og effekt.
- Ingen publiserte oppdiktede effekttall; arbeid med syntetiske testdata inntil avtale/GDPR og sikkerhet er klar.
- Hvis ingen betaler etter 30–50 kvalifiserte samtaler, endre posisjonering/tilbud, ikke bare sende mer e-post.

### Fase 1 – Norge: gjentakbart produkt (mål innen 6–12 måneder, betinget)
- 10 betalende organisasjoner; minst 5 på månedlig avtale, minst 90 dager tilfredsstillende stabil drift.
- Minst én integrasjon gjenbrukt av 3+ kunder, og >60 % av pilotoppsett kan gjenbrukes uten ny skreddersøm.
- Dekningsbidrag etter variable leveransekostnader >65 % som internt planleggingsmål, ikke markedsgaranti.
- Churn og kundetilfredshet måles fra faktisk fakturering og bruk, ikke antatt.
- AS vurderes med regnskapsfører når risiko, kontraktsstørrelse, ansatte og investeringer tilsier dette; ikke automatisk etter tilfeldig inntektsgrense.

### Fase 2 – Norden: 1 utenlandsk land om gangen (tidligst når Fase 1 er bestått)
- Start med Sverige som testhypotese, deretter Danmark; vurder Finland senere.
- Intervju minst 15 lokale bedrifter og betalende 2–3 pilotkunder i mållandet før bred lokalisering.
- Verifiser språk, lokale bransje- og fakturasystemer, GDPR, markedsføringsrett, språkstøtte, tidszoner, e-faktura, avgift og lokale kontraktsvilkår.
- Velg lokale distribusjonspartnere/byråer dersom salgskostnaden er lavere enn direkte salg.

### Fase 3 – Europeisk ekspansjon
- Velg Storbritannia eller Tyskland som separat, ny hypotese etter nordisk validering; de er ikke en automatisk fortsettelse.
- Utvid gjennom partnere, vertikale integrasjoner, dokumenterte sikkerhetskontroller og selvbetjent onboarding først når supportkost kan skaleres.
- Støtt multi-currency, lokalisering, felles operasjonsmodell og kundeisolasjon. Lokale krav/avgift verifiseres per marked.
- Flere land samtidig kun når lokal support, compliance og Unit Economics er dokumentert.

### Stoppkriterier
- Ingen dokumentert betalingsvilje.
- Høyere onboarding/supportkost enn realistisk fortjeneste.
- Store plattformer har allerede funksjonen til lav/ingen merkostnad.
- Uavklart lovlighet / uakseptabel informasjonssikkerhetsrisiko.
- Ett eksternt system står for all verdien og kan stenge API-tilgangen.

## 5. AI-overvåking og beslutningsregler

Hver uke:
- Sjekk faktisk lanserte funksjoner/priser hos Microsoft, ServiceTitan, norske fagsystemer, Jobber, Simpro, relevante AI-agentleverandører og store modelltilbydere.
- Skill nyhet/pressemelding fra faktisk tilgjengelighet i Norge/EØS.
- Logg trusler: direkte overlapp, prisendring, API-endring, nye konkurransefortrinn, bedre modeller og nye regler.
- Klassifiser: OBSERVER, TILPASS INTEGRASJON, ENDRE PRIS/PAKKE, PIVOT, AVSLUTT EKSPERIMENT.
- Krev kilde, dato, faktisk effekt, neste lille test og eiergodkjenning før større strategisk endring.

**Påtvunget stresstest hvert kvartal:**
1. Hva om modellkost faller 90 %?
2. Hva om Microsoft/Tripletex gir bort vår nøkkelfunksjon gratis?
3. Hva om en LLM-agent kan utføre vår demo på 5 minutter?
4. Hva om vår største integrasjon stenges eller endrer pris?
5. Hvorfor betaler kunden fortsatt for Nexorait dagen etter?

Hvis svarene bare er «vi har bedre prompt» / «vår AI er smartere», må vi pivote.

## 6. EU-regulatorisk grunnmur

- GDPR gjelder ved behandling av relevante EU/EØS persondata; avklar databehandlerroller, kontrakter, underleverandører, sikkerhet, sletting, overføring og lagringssted per kunde. https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en
- AI Act artikkel 50-transparens gjelder i EU fra 2. august 2026: relevante AI-assistenter skal gjøre det klart når brukeren kommuniserer med AI. Risikoklassifisering må gjøres per brukstilfelle. https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- Norge vedtar/innfører eget regelverk i EØS-prosess: per 4. august 2026 var forslag til norsk KI-lov varslet ny høring høsten 2026; ikke anta identisk norsk ikrafttredelse med EU-dato. https://www.regjeringen.no/no/aktuelt/tung-vil-sende-ki-loven-med-endringer-pa-horing/id3169693/
- B2B vs B2C og omsetning fra norsk selskap til EU har ulike VAT/MVA-regler; spør regnskapsfører før salg og automatisk fakturering til annet land. https://europa.eu/youreurope/business/finance-and-tax/vat/cross-border-vat/index_en.htm
- Lokal markedsføringslovgivning må kontrolleres før automatisert prospektering i hvert land.

## 7. Prioriteter neste 30 dager

1. Få første kvalifiserte B2B samtaler lovlig uten massekontakt, og verifiser kundens faktiske manuelle problem.
2. Lag ett kundesikkert pilotoppsett med tenant-isolasjon, dataeksport, logging, backup og akseptanseprosedyre. LeadFlow demo er kun salgseksempel.
3. Få én betalende pilot med klart tilbud og eiergodkjenning.
4. Lag konkurrentlogg med 5–8 aktører og «ny funksjon versus vårt produkt»-sjekk.
5. Kartlegg API-tilgang og faktisk betalingsvilje før mer omfattende plattformbygging.
6. Før risikoregister og ukentlig måltall for omsetning, churn, gross margin, salgsarbeid og faktisk leveransekostnad.

## 8. Eier- og driftssperrer

ChatGPT kan utføre oppgaver i planlagte kjøringer og med tilgjengelige verktøy, men ikke kontinuerlig autonom drift eller ubegrensede avtaler. Juridiske signaturer, finansielle belastninger, selskapsetablering, løfter om kundeleveranse uten test, nye dataoverføringer og vesentlig strategisk risiko krever eiergodkjenning.

**Selskapets prinsipp:** Den neste AI-modellen skal gjøre Nexorait bedre eller billigere å drifte, ikke automatisk gjøre forretningsmodellen verdiløs. Dette kan ikke garanteres, men kan prøves og forbedres kontinuerlig.
