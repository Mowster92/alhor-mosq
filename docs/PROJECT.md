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
