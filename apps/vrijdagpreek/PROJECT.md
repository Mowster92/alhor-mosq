# Vrijdagpreek vertaler

## Doel en architectuur
Lokale Windows-startbare operator met Arabisch → Nederlandse ondertitels op HDMI-tv. Node 22+ HTTP-server bindt uitsluitend 127.0.0.1:8080; Microsoft Speech SDK 1.51.0 lokaal uit npm. Browser getUserMedia selecteert een OS-beschikbare microfoon, geen ASIO/Qu-kanaaldriver. Azure Speech TranslationRecognizer via tijdelijk token; abonnementssleutel alleen serverproces-env. SSE synchroniseert publiek ook InPrivate met snapshot bij iedere connectie. Eén operatorlease en generatiebewaking.

## Geïmplementeerd, lokaal met mocks getest
- De oorspronkelijke vier vaste Arabische/Nederlandse demo-fixtures, start/stop/herstart, optionele uitsluitend lokale demo-stem.
- Afzonderlijke lokale microfoonlijst/niveautest zonder cloud of luidsprekerterugvoer.
- Expliciete live-toestemming/start, bron ar-SA/ar-MA/ar-EG → nl; capture stop/cleanup, tokenrefresh, veilige foutmeldingen, late-resultaatguards.
- Apart wissen, SSE-publiekscherm, reconnect-status en operator-heartbeat.
- Loopback Host/Origin-controles, CSRF voor operatorroutes, vaste gevalideerde regiolijst; geen willekeurige proxy, publieke sleutel of opgeslagen opname.

## Onafhankelijke lokale review
SDK 1.51.0-bron gecontroleerd: MediaStream-input, externe lokale audio-worklet, authorizationToken-setter en close-pad komen overeen met de gebruikte API. Twee operatorfouten hersteld: mislukte statuspublicatie veroorzaakte een eindeloze nieuwe stop/publicatieketen; Stop tijdens een nog lopende claim kon achteraf een heartbeat installeren. Regressietests toetsen beide gevallen. `npm test`: 11 geslaagd; `npm run check`: geslaagd. Dit is broninspectie en lokale mock/HTTP-validatie, geen live SDK/browser- of Windows-bewijs.

## Bewijsgrenzen / open acceptatie
Geen echte Azure-aanmelding, microfoon, Qu-24, Windows .cmd/PowerShell, HDMI of browser-netwerkproef uitgevoerd. SDK-integratie is geïmplementeerd en met mocks getoetst, niet live bewezen. Qu-24 is alleen bruikbaar als de juiste audiofeed in Windows én de browser als ingang beschikbaar is. Azure-resource/quota/regio, toestemming, vertaaljuistheid, langdurige tokenrefresh en hardwareacceptatie zijn nog te verifiëren door Said/beheerder. Geen garantie op latentie of religieuze juistheid.

## Start en tests
Windows: zip uitpakken, Node 22/24 LTS installeren, START-WINDOWS.cmd, http://127.0.0.1:8080. Live optioneel START-LIVE.ps1 met verborgen lokale sleutelprompt. Zie README voor privacy, hardware en schermstappen.
`npm ci --ignore-scripts`; `npm test`; `npm run check`; `npm start`.
Oude py http.server/Alhor-static start is niet geschikt voor deze servergebaseerde versie.

## Bestanden
- server.mjs: loopback API, tokenuitgifte, SSE, operatorlease.
- app.js / live.js / index.html / styles.css: operator, fixtures, capture en SDK-lifecycle.
- display.html / display.js: publiek, server-SSE.
- test/*.test.mjs: API/security/SSE en mock UI/audio-lifecycle.
- START-WINDOWS.cmd / START-LIVE.ps1: gebruikersgestuurde Windows-start.
- README.md: Nederlandse installatie-, Qu-24-, Azure-, privacy- en HDMI-handleiding.
- package-lock.json: vastgelegde SDK-afhankelijkheden.

Geen accounts, services, systeeminstellingen, commit of push gewijzigd.
