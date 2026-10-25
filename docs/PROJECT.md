## Lokale Mosque UX en modulebeheer · 25 oktober 2026

Mo hervatte expliciet verzoek `d9524e68-c52f-4508-9595-5684c840a0c4`
(`ux ui + raamwerk voor moskee app en beheer van subapps`, tekst `test`).
Dit vervangt alleen de eerdere pauze op home/frameworkwerk: geen extra
werkende modules, livegang of cliënt-/ledengegevens.

`/mosque` biedt aparte operator- en publieksingangen en lokaal modulebeheer:
Vrijdagpreek tonen/verbergen en als favoriet markeren. Alleen expliciet
**Keuzes opslaan** schrijft; annuleren en laden schrijven niets. Verbergen
is navigatieorganisatie, geen uitschakeling of toegangscontrole. De lege
startpagina biedt herstel via het blijvend bereikbare Modulebeheer. Er is
één werkende module; gebedstijden, leden en activiteiten blijven niet gebouwd.

De bestaande Node-app gebruikt `GET/POST /api/modules`, de exacte bestaande
Host/Origin/CSRF-grens en een strikt schema zonder vrije routes of modules.
Opslag: apart atomair vervangen `modules.json`; Windows-controller gebruikt
de bestaande app-eigen StateRoot via `ALHOR_MODULES_FILE`, anders app-eigen
`data/modules.json`. Tests gebruiken tijdelijke mappen. Beschadigde opslag
wordt niet stilzwijgend overschreven. Dit zijn gedeelde vertrouwde lokale
instellingen zonder login, geen gebruikers- of rollenadministratie.

Home laadt alleen voorkeuren; bootstrap gebeurt pas bij expliciet opslaan.
Geen speech-import, leaseclaim/verversing, microfoon, provider of audioactie.
Vaste local/docker/standalone-terugkeercontexten blijven intact. Nieuw bronwerk
wordt niet automatisch geactiveerd; runtime-activering blijft een aparte stap.
De onderstaande acceptatie en apparatuur-/taalproef blijven apart gelden.

Controle: `npm test`, `npm run check`, `python scripts/check_repository.py`,
de synthetische Windows-controllerproef en
`dev/vrijdagpreek/mosque-home-browser-check.cjs` (Playwright uit externe
toolomgeving via `PLAYWRIGHT_MODULE`, screenshots via `ARTIFACTS_DIR`).
De browserproef gebruikt uitsluitend een tijdelijke loopbackserver en tijdelijke
voorkeuren: desktop 1440px, mobiel 390/320px, annuleren, favoriet/herladen,
verbergen/herstellen, opslagfout/herproberen, alle drie terugkeercontexten en
publiekspopup. Geen canonieke runtime-herstart of echte spraakproef.

## Owner acceptance · 25 October 2026

Mo tried the local Portal → Mosque → Vrijdagpreek route: “looks pretty good”
and “works locally”. This accepts the local app experience, not live speech
quality or installation at the mosque.

Next: prepare a portable Windows handoff, rehearse the real microphone and
second-screen route, then use Monday to let the mosque request one small AI-built
change and test it. No extra mosque modules before that first use.
Open: installation on the mosque PC, its Azure configuration and sound setup,
and Arabic/Dutch assessment of live translation. No member data or public release.

## Mosque home — lokale hervatting voor maandag

Mo heeft de lokale Mosque-home → Vrijdagpreek-route hervat en goedgekeurd.
De bestaande Node-service krijgt **GET `/mosque`** als canonieke Mosque-ingang.
`/` en `/index.html` blijven de bestaande operator; `/display.html` blijft het
publiekscherm. Alleen Vrijdagpreek is beschikbaar. Gebedstijden, ledenbeheer,
activiteiten en andere voorgestelde modules zijn niet gebouwd.

Hergebruik: ALHOR-logo, lokaal Inter-lettertype, Node-server en bestaande
spraakbediening. Geen nieuw framework, database, login of provider. Home heeft
nu een klein lokaal voorkeurscript en opent geen microfoon. De navigatie bewaart
alleen de vaste context `?portal=local` (18180) of `?portal=docker` (18080),
nooit een opgegeven URL. Alleen `/mosque` is aan de exacte statische en
Portal-documentnavigatie-allowlists toegevoegd; Host/Origin/CSRF, toestemming,
operatorlease en privacylijnen blijven intact. Stop vóór terugkeer naar home.

Voor de ingang zonder Azure-configuratievenster gebruikt Portal de bestaande
Windows-controller met `-Action ensure-home`. Deze controleert/bereidt de bron,
gebruikt een eventueel bestaande beschermde Azure-instelling en start anders
alleen de lokale shell. Exacte actuele bronidentiteit en procesbezit zijn nodig;
`configured=true` is geen voorwaarde voor home. Gewone `ensure`/`open` blijven
de bestaande spraakingang met Azure-configuratie. Actieve vertaling wordt niet
onderbroken en onbekende processen worden niet vervangen. Runtime-activering,
apparatuur en echte vertaalproef worden apart gedaan; broncontrole bewijst
geen live gereedheid of vertaalkwaliteit.

## Vrijdagpreek — begrensde leesbaarheidspass

De operator kiest drie vaste publiekstekstgroottes en licht/donker hoog contrast.
De bestaande SSE-state deelt `presentation`; de aparte beschermde
`POST /api/presentation` wijzigt alleen die twee gevalideerde enums. Geen vrije
CSS, geen nieuwe lease, geen leaseverversing, audio, token, consent of spraakstatus.
Tijdens een bestaande lease zijn exacte owner/generation vereist; andere
operators worden geweigerd zonder de sessie te beïnvloeden. Captionwrites
bewaren presentatie. Alleen servergeheugen: Stop/herladen bewaren de keuzes,
serverherstart herstelt Standaard/Licht. Volledig scherm is een echte lokale
browseractie met toetsenbordbediening en zichtbare unsupported/foutmelding.

App en onboarding verwijzen naar de reeds werkende geluidsapp en schermen;
exacte audio/schermtopologie is onbekend. Browseringangen kunnen microfoon,
USB-interface of virtueel apparaat zijn; geen automatische app-audiocapture.
Geen voorbereide-tekstbediening heringevoerd. De browserregressie gebruikt
uitsluitend interne testcaptions. Portable setup en runtime-activering zitten
niet in deze bronpass. Herstelvergelijking met de oorspronkelijke OpenClaw-app
loopt apart bij de eigenaar vóór verdere releasekeuzes.

## Actuele Vrijdagpreek-stand — 15 oktober 2026

Mo heeft Vrijdagpreek laten vereenvoudigen tot live Arabisch → Nederlands.
De korte echte Azure-proef en de Firefox-test van beide schermen plus
Stop/wachten/herstart zijn door Mo geaccepteerd. Baseline: `771fd08`.
De voorbereiding/demo-beschrijvingen hieronder zijn historische resultaten;
oude lokale teksten blijven behouden, maar zitten niet meer in de livebediening.

De huidige vervolgstap is de app herkenbaar in ALHOR vormgeven, uitgevoerd
in de eigen sandboxwerkplek. Lees `dev/vrijdagpreek/ONBOARDING.md` voor de
begrensde opdracht, bronnen, tests en dagelijkse ingang `VRIJDAGPREEK-DEV.cmd`.
Family en Care worden hiermee niet gewijzigd.

De lokale ALHOR-feedbackroute is app-eigen: de Vrijdagpreek-operator schrijft
een korte productmelding en krijgt een blijvende referentie. De server bewaart
alleen die expliciete tekst in een atomair vervangen lokaal bestand. Windows
gebruikt de bestaande afgeschermde ALHOR-state-map; Docker een eigen volume.
De publieksweergave, audio en ondertitels blijven buiten deze opslag. Zonder
app-login is dit alleen geschikt voor de vertrouwde lokale operatoromgeving;
toegang vanaf andere gebruikers/apparaten vraagt later een echte rolgrens.

# Projectbasis

## Gekozen toepassing — 12 oktober2026

Mo, repositoryhouder Mowster92, heeft Vrijdagpreek als werkende toepassing
binnen ALHOR Mosque gekozen. Said Alhor's bestaande werk en productbijdrage
blijven herkenbaar. Bron: `apps/vrijdagpreek`; lokale ingang:
`START-VRIJDAGPREEK.cmd`, operator127.0.0.1:8080, aparte publieksweergave.

Hergebruik de bestaande Node-app, operatorbeveiliging, SDK-lockfile en
Start/Stop/publieksweergave. Deze stap voegt voorbereiding en handmatige
presentatie van maximaal10 Arabisch/Nederlandse tekstparen toe. Bewaarde
voorbereiding staat uitsluitend lokaal in `apps/vrijdagpreek/data/`, buiten
Git; eerdere bron/resultaten blijven herstelbaar. Er is geen ledenimport,
nieuwe cloudverbinding, betaalde dienst of publicatie. De voorstellen hieronder
worden hiermee niet gebouwd of alsnog goedgekeurd.

De lokale vervolgverbetering van 12 oktober maakt meerdere voorbereidingen
bruikbaar: maximaal20 bewaarde preken, elk met maximaal10 tekstparen. De eerdere
enkele voorbereiding wordt bij het lezen als eerste keuze getoond; het oude
`preparation.json` blijft ongewijzigd en nieuwe opslag gebeurt atomair in
`preparations.json`. Een nieuwe voorbeeldpreek begint onopgeslagen. Alleen de
gekozen preek wordt bij Opslaan bijgewerkt. Dit verandert geen publiekstoegang,
microfoon-/providerroute of moskeebeheer-module.

Controle: `python scripts/check_repository.py`, daarna in `apps/vrijdagpreek`:
`npm test` en `npm run check`. Live audio en echte apparatuur blijven apart
te bewijzen. De oude lokale translator-map is geen tweede actieve runtime.

## Bevestigd

- Eigenaar: Said Alhor; GitHub-account: Mowster92.
- Product: moskeebeheer-app.
- Repository: https://github.com/Mowster92/alhor-mosq.
- Eerste opdracht: basis inrichten voor GitHub en Codex, stoppen rond 90%.

## Voorstel voor de eerste versie

Te bevestigen scope:

1. Beheerdashboard met aankomende activiteiten en taken.
2. Ledenadministratie met zo weinig mogelijk persoonsgegevens.
3. Activiteiten en inschrijvingen.
4. Vrijwilligers en taakverdeling.
5. Gebruikersbeheer en rollen.

Donaties, betalingen, publieke website en gebedstijden zijn mogelijke latere
modules. Ze zijn nog niet gevraagd of gebouwd.

## Open beslissingen — laatste 10% van de inrichting

- Welke module moet als eerste werken?
- Wie gebruikt de app: bestuur, administratie, vrijwilligers of leden?
- Welke bestaande gegevens en systemen moeten worden gekoppeld?
- Hosting, database, authenticatie en technische stack.
- Licentie en regels voor bijdragen van anderen.
- Branchbescherming na de eerste succesvolle GitHub-controle.

## Acceptatie vóór livegang

Leg rechten per rol vast, controleer toegang aan serverzijde, test back-up en
herstel, en bepaal hoe gegevens worden verwijderd en geëxporteerd. Bouw eerst
met fictieve data. Een lokale demo is nog geen productieomgeving.
