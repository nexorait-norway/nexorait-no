# Nexorait

Nettside for Nexorait, AI-automatisering for små servicebedrifter.

## Publisering
Produksjonsdomenet bruker GitHub Pages fra `gh-pages`. `main` har også en separat Cloudflare Workers-publisering av `public/`. Hold nettsidefilene samkjørt uten å endre DNS eller e-postruting ved vanlige innholdsendringer.

## Kontakt
- E-post: kontakt@nexorait.no
- Telefon: +47 21 98 88 69, besvart av Nexoraits AI-assistent.
- Kontaktskjema: `#kontakt`, `contact.js` sender til Nexoraits innkommende tjeneste.

Skjemaet bekrefter mottak først etter vellykket persistent lagring. Samme innsendingsreferanse behandles én gang ved nettverksretry. Salg og andre henvendelser får mottaksreferanse; support får også et saksnummer fra den felles persistente telleren. Skjemafelt valideres både i nettleseren og på serveren.

## Operativ oppfølging
Den separate innkommende tjenesten på Railway har et autentisert grensesnitt for å lese telefon- og nettsidehenvendelser og oppdatere status. Kundeinnhold skal behandles som ubetrodd data. Verken dette grensesnittet eller nettsiden utgjør en selvstendig utførende agent.

Automatisk e-postbekreftelse fra nettskjemaet er ikke aktivert. Ingen booking, kontrakt eller leveringstid bekreftes av skjemaet. Oppfølging gjøres med tilgjengelige tilganger; fremtidig Dot-integrasjon er planlagt.

## Filer
- `index.html`, `styles.css`, `contact.js`: nettsiden.
- `public/`: samme nettsted for Cloudflare.
- `assets/`: logo og fonter.

## Kontroll ved endringer
Valider HTML, kontaktlenker og JavaScript. Test serverens lagring, retries, tilgangskontroll og statusoppdatering før et nytt skjema publiseres. Kontroller deploy-resultatet for den relevante hostingen.
