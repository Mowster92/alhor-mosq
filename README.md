# Alhor Mosq

Local consolidated route: `MOSQUE-LOCAL.cmd` opens **http://127.0.0.1:18182/** from this repository, with return to Portal on 18180. `up`, `status` and `stop` act only on Mosque. `VRIJDAGPREEK-DEV.cmd` opens the separate coding workspace; `START-VRIJDAGPREEK.cmd` opens the Windows speech app on 8080. This local Docker route does not configure Azure or start audio; the existing Windows speech route remains separate.

Werkrepository voor een moskeebeheer-app van Said Alhor.

De eerste werkende toepassing is **Vrijdagpreek**, onder `apps/vrijdagpreek`:
een lokale operator en publieksweergave voor Arabisch/Nederlandse ondertitels.
Start `START-VRIJDAGPREEK.cmd`. De huidige toepassing vertaalt live Arabische
spraak naar Nederlandse ondertitels via Azure Speech, met een apart publiekscherm.
Zie `apps/vrijdagpreek/README.md` voor bediening en `dev/vrijdagpreek/ONBOARDING.md`
voor ontwikkeling. De oudere voorbereidingen zijn bewaard, maar worden door de
livevertaler niet gebruikt. Een volledige moskeerepetitie blijft nog te doen.

Mo koos deze bronintegratie op 12 oktober 2026. Said Alhor's werk en de
moskeebeheer-basis blijven behouden. De overige modules hieronder zijn nog
voorstellen. Bronpublicatie of een merge start geen dienst en bewijst geen live
spraakvertaling; provider-, microfoon- en ledengegevensgebruik blijven aparte
grenzen.

## Windows zonder Portal (portable)

**Dubbelklik `START-MOSQUE.cmd`** na volledig uitpakken. Deze ingang opent
`http://127.0.0.1:8080/mosque?portal=standalone`: zonder Portal-link,
configuratievenster, microfoon of vertaling. De bestaande Portal/Docker-ingangen
blijven apart beschikbaar in de ontwikkelrepository.

### Installeren op de moskee-pc
1. Laat de beheerder **Node.js LTS 22+ met npm** (https://nodejs.org/en/download)
   en **PowerShell 7** (https://aka.ms/powershell-release?tag=stable) beschikbaar
   maken voor de Windows-gebruiker. Geen Python, Git, Portal of Docker nodig.
   De starter installeert geen systeemsoftware, gebruikt geen winget en vraagt
   geen administratorrechten. Heropen de starter na installatie.
2. Controleer de ontvangen ZIP/herkomst met de afzender. Indien Windows het
   vertrouwde downloadbestand blokkeert: Eigenschappen → Blokkering opheffen
   op de ZIP **vóór** uitpakken. Omzeil geen organisatiebeleid; vraag de beheerder.
3. Pak alles uit in één vaste, schrijfbare map, bijvoorbeeld
   `Documenten\Moskee app` (spaties en een andere gebruikersnaam zijn toegestaan).
   Start niet vanuit de ZIP. Dubbelklik `START-MOSQUE.cmd`. Eerste start heeft
   internet nodig voor `npm ci --ignore-scripts` uit de meegeleverde lockfile.
4. Rondkijken kan zonder Azure. Spraak instellen is een bewuste aparte actie:
   open PowerShell 7 in deze map en voer uit:
   `pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action configure`.
   Vul alleen daar de eigen Azure Speech-regio/sleutel in; nooit in chat.
   Daarna opnieuw `START-MOSQUE.cmd`. Configuratie blijft via Windows DPAPI
   beschermd voor deze gebruiker op deze pc in `%LOCALAPPDATA%\ALHOR\Vrijdagpreek`.
   Kopieer geen credentialbestand van Mo of een andere pc/gebruiker.

### Bijwerken en herstel
- Klik eerst **Stop** in Vrijdagpreek. Open PowerShell 7 in de huidige map:
  `pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action stop`.
  Dit weigert een onbekend proces of niet-bevestigde actieve toestand.
- Bewaar de vorige ZIP. Pak de nieuwe ZIP volledig uit in **dezelfde vaste map**
  en vervang alleen de meegeleverde bestanden (niet over losse gewijzigde bron).
  Bij gewijzigde lockfile eerst in `apps/vrijdagpreek`:
  `npm ci --ignore-scripts`. Start daarna `START-MOSQUE.cmd` opnieuw.
  Lokale DPAPI-instelling en expliciete feedback staan buiten de uitpakmap;
  update/herstel verwijdert die niet. Een ander Windows-account moet zelf instellen.
- Herstel: stop op dezelfde manier, pak de vorige vertrouwde ZIP in diezelfde map
  uit, voer opnieuw `npm ci --ignore-scripts` uit en start. Geen data verwijderen.
- Bij broncontrolefout: pak de originele ZIP opnieuw uit. Bij installatie-/netwerkfout:
  controleer internet/proxy en herhaal. Bij poort 8080 in gebruik: controleer bewust
  welke app die gebruikt; de starter stopt/adopteert geen onbekende instantie.
  Status: `pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action status`.
  Verplaats een nog draaiende installatie niet; procesbezit is aan de bronmap gekoppeld.

### Repetitie: minstens 10 minuten, vóór een preek
- Laat de bestaande Windows-audio-app, bekabeling en schermverdeling intact.
  Controleer met de beheerder welke **browsercompatibele audio-ingang** beschikbaar
  is. Qu24, HDMI, Win+P of directe toegang tot de bestaande app-audio zijn geen
  bevestigde mogelijkheden. Geen automatische capture van andere apps.
- Open publiek via de bestaande schermvoorziening. Controleer achterin de ruimte
  de drie tekstgroottes, licht/donker contrast en volledig scherm (indien ondersteund).
- Vraag toestemming voor microfoon/cloud, kies de bevestigde ingang en start pas
  daarna expliciet live. Laat een Arabisch/Nederlands-spreker bekende zinnen en
  betekenis beoordelen. Test minimaal 10 minuten inclusief tokenverversing.
- Test Stop, opnieuw starten en een beheerste internetonderbreking/herstel; controleer
  ook stoppen tijdens toestemming. Als betekenis/audio/schermen onvoldoende zijn:
  geen livegebruik. Softwaretests bewijzen geen apparatuur of vertaalkwaliteit.

### Voor de beheerder: ZIP bouwen
Vanuit de canonieke Git-repository, na tests en een expliciete broncommit:
`node scripts/build-portable.mjs <volledige-commit> results/mosque-windows.zip`.
De Node/PowerShell-builder leest uitsluitend vaste toegestane bestanden uit dat
checkpoint (niet uit de werkmap), maakt nieuwe portable bronidentiteit en controleert
het uitgepakte archief byte voor byte. Geen `.git`, `.env`, sleutels, gebruikersdata,
node_modules, feedback, resultaten, herstelmateriaal of ontwikkel-candidate gekopieerd.
ZIP, `.source` en `.verified` zijn genegeerde release-uitvoer, geen tweede werkbron.
De hashes detecteren beschadiging/wijzigingen, geen digitale ondertekening; verspreid
alleen een door de eigenaar gecontroleerde ZIP. Canonieke ontwikkeling blijft hier.

## Beginnen

1. Open deze map als project in Codex.
2. Lees `AGENTS.md` en `docs/PROJECT.md`.
3. Voer `python scripts/check_repository.py` uit voor de repositorycontrole.
4. Werk aan een branch: `git switch -c feature/korte-omschrijving`.

## Structuur

- `AGENTS.md`: werkinstructies voor Codex.
- `docs/PROJECT.md`: scope, voorgestelde modules en open beslissingen.
- `docs/SETUP.md`: lokaal werken en de laatste stappen van de inrichting.
- `scripts/check_repository.py`: controle van basisbestanden en gevoelige bestanden.
- `.github/`: repositorycontrole, issueformulieren en pull request-template.

Er zijn geen API-sleutels of betaalde diensten nodig voor deze basis.
