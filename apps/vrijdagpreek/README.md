# Vrijdagpreek — ALHOR Mosque

Current source home: `Mowster92/alhor-mosq`, `apps/vrijdagpreek`. Said Alhor's existing application work is retained; Mo owns this local integration. The original source/candidates remain recoverable outside this checkout.

## Prepared presentation

Keep up to 20 local preparations, each with a title and up to10 Arabic/Dutch text pairs. Choose a saved preparation, start a blank one, or load the existing four example pairs as an unsaved new preparation. **Voorbereiding opslaan** creates or updates only the selected preparation in `data/preparations.json`, outside Git. The previous single preparation in `data/preparation.json` appears as the first saved entry and its original file remains untouched after the library is created. Invalid input or storage failure retains the previous saved bytes and current editor input. Changing preparations asks before discarding unsaved edits. There is no automatic translation in this mode.

**Opslaan en presenteren** saves first, then shows the selected pair. Use Previous/Next or choose a pair and **Toon dit tekstpaar**. Editing does not silently change the audience; explicitly show a correction. Stop keeps the last caption; Clear removes the audience caption without deleting preparation. Reopening reloads saved text but never starts the presentation or microphone automatically. Server restart clears audience state, while the saved preparation remains.

The normal launcher stays `START-WINDOWS.cmd` (or repository-root `START-VRIJDAGPREEK.cmd`). Same8080 loopback runtime, single operator and guarded API; no new provider/access. Improve this app pauses examples/prepared presentation and transfers only a fixed purpose identifier to ALHOR, never the prepared text.

Backup the `data` folder with all preparations before replacing or reinstalling this app. There is no delete action in this local library. Node and browser writing checks use isolated temporary directories. Microphone/provider/hardware activation still requires separate approval and proof.

## Retained audio/hardware documentation

# Vrijdagpreek · lokale operator en HDMI-ondertitels

**Status:** demo + lokale microfoonmeting + geïmplementeerde Azure Speech Translation-koppeling. Lokaal getest met mocks; **niet live bewezen met Azure, Windows, echte microfoon, Qu-24 of HDMI-tv**. Geen kant-en-klare hardwaregarantie. De vier demovertalingen zijn vaste fixtures, geen herkende spraak.

## 1. Windows: uitpakken en demo starten

### Exacte lokale versie in ALHOR

De bestaande `START-WINDOWS.cmd` blijft de normale ingang. Een voorbereide `candidate.json` bevat de exacte bronhashes en versie. De operator toont die versie; ALHOR leest uitsluitend versie en digest via de afgeschermde, alleen-lezen route `/api/identity`. De server herkent alleen de bij zijn start gecontroleerde bron. Bij gewijzigde bestanden, vervangen metadata of ontbrekend bewijs blijft de identiteit onbekend; een nieuwe bronversie vereist een gecontroleerde herstart. Microfoon, Azure-toestemming en operatorbeveiliging veranderen hierdoor niet. Het bewijs zegt niets over echte spraakherkenning of hardware.

1. Pak `vrijdagpreek-vertaler-windows.zip` volledig uit, bijvoorbeeld in `C:\Vrijdagpreek`. Start niet vanuit de zip.
2. Installeer zelf **Node.js 22 LTS of 24 LTS**, inclusief npm, van https://nodejs.org/ (geen administrator nodig voor deze app zelf). Gebruik een actuele Edge of Chrome. Deze handleiding installeert niets automatisch op je pc behalve de appafhankelijkheden na je eigen start.
3. Dubbelklik **START-WINDOWS.cmd**. Eerste keer haalt `npm ci --ignore-scripts` de vastgelegde Speech SDK en afhankelijkheden op via internet. Dit is geen Azure-aanroep en verstuurt geen microfoonaudio. Latere starts werken voor demo/test zonder internet.
4. Laat het zwarte venster open en wacht op `Open http://127.0.0.1:8080`. Open **precies http://127.0.0.1:8080** in de browser (niet localhost, file://, netwerk-IP of een oude Alhor/static-server-link).
5. Klik **Start demo**. Je ziet vier vaste Arabische en Nederlandse regels. Optioneel: vink lokale demo-stem aan; alleen een geïnstalleerde lokale Arabische stem wordt gebruikt. Anders blijft de demo stil.
6. Klik **Open publiekscherm**. Stop bewaart de laatste regel; **Wis ondertitel** wist apart. Demo opnieuw start bij regel 1.
7. Afsluiten: Stop in de operator, sluit de browservensters en druk Ctrl+C in het zwarte venster.

Fout `Node ontbreekt`: installeer Node en open een nieuw venster. Installatiefout: controleer internet, npm en schrijfrechten. Poort 8080 bezet: sluit een eerder appvenster/server; wijzig geen firewall/router. De server is alleen op deze pc bereikbaar. `npm test` en `npm run check` kunnen vanuit deze map in Terminal worden uitgevoerd. Geen bundel/buildstap nodig.

**Windows 10 Pro:** reguliere ondersteuning eindigde op **14 oktober 2025**. Gebruik passende, geldige ESU-dekking en beveiligingsupdates, of migreer naar een ondersteund OS. Browser/Node/vendor-ondersteuning en drivercompatibiliteit moeten voor jouw pc apart worden gecontroleerd. De app maakt Windows 10 niet veilig.

## 2. Eerst een gewone USB-microfoon

1. Sluit een eenvoudige USB-microfoon aan. Gebruik geen PA-luidspreker als testbron.
2. Windows **Instellingen → Systeem → Geluid → Invoer**: kies de microfoon, spreek en controleer de invoermeter. Sluit apps die het apparaat exclusief gebruiken.
3. **Instellingen → Privacy → Microfoon**: toestaan voor dit apparaat/apps en **bureaublad-apps toegang geven tot microfoon**. Edge/Chrome valt onder bureaublad-apps.
4. Operator: klik **Toestemming vragen / lijst vernieuwen** en sta microfoon toe in de browser. Dit opent de standaardmicrofoon kort voor apparaatnamen en sluit hem direct; geen cloud. Kies daarna expliciet het juiste apparaat.
5. Klik **Start lokale niveautest**, spreek normaal en controleer beweging van de meter. De schaal is indicatief, geen gekalibreerde dB-meter. Geen geluid terug naar speakers, geen opnamebestand.
6. Klik **Stop / pauze alle audio**. Het browser-microfoonlampje moet uitgaan. Doe dit voordat je demo of live start.

Weigering? Controleer Windows én site-microfoontoestemming via het pictogram bij de adresbalk. Ontbrekend/losgekoppeld apparaat? Stop, herstel verbinding, vernieuw de lijst en selecteer opnieuw. Geen niveau? Controleer bron, gain en driver; de app kan ontbrekende Windows-ingangen niet herstellen.

## 3. Allen & Heath klassieke Qu-24 → Windows via USB-B

Dit gaat over de **klassieke Qu-24**, niet Qu-24D of een andere mixer. Deze webapp heeft **geen ASIO-driver, ASIO-kanaalkiezer of directe multitrack-kanaalpatching**. `getUserMedia` kan alleen opnemen van een Windows-audio-ingang die Edge/Chrome werkelijk aanbiedt.

1. Laat de bevoegde geluidstechnicus eerst de bestaande mixerinstellingen/scène veilig vastleggen. Verander geen zaalrouting tijdens een dienst.
2. Verbind de **USB-B-audiopoort achterop** met de pc met een geschikte USB-datakabel; de USB-A Qu-Drive-poort is niet dezelfde verbinding.
3. Raadpleeg de officiële Qu-documentatie en Windows USB-audiodriver/downloads voor exact jouw mixer, firmware en Windows-versie: https://www.allen-heath.com/ en zoek Qu-24 support/downloads. Hier wordt geen driverversie of vast USB-kanaalnummer voorgeschreven.
4. Laat de technicus een verstaanbare, niet-overstuurde feed van de preek naar de gewenste USB-uitgang routeren, volgens de bijbehorende mixerhandleiding. Controleer dat de Windows/browser-ingang daadwerkelijk juist die feed ontvangt. Een zichtbaar Qu-apparaat betekent niet dat alle USB-kanalen in de browser kiesbaar zijn.
5. Controleer de Windows-invoermeter en herhaal de lokale microfoontest. Als Qu alleen via ASIO zichtbaar is, of de juiste feed niet als browseringang beschikbaar komt: **dit is een blokkade; niet live starten**. Laat een technicus een geschikte Windows/browser-compatibele audio-interface met veilige lijnverbinding kiezen, of gebruik voorlopig de gewone USB-microfoon. Geen willekeurige driver- of patchingexperimenten in de zaal.
6. **48V phantom niet blind inschakelen.** Alleen volgens microfoon/interface-specificaties en door de technicus; het is geen oplossing voor USB-detectie. Verbind geen versterkte luidsprekeruitgang met een microfoon/USB-interface-ingang. Houd afluistering en computergeluid uit de zaalfeed om feedback te voorkomen.

## 4. Azure live instellen — sleutel blijft op de pc

Demo en niveautest hebben geen account nodig. Live heeft internet en een Azure Speech-resource nodig. **Stuur nooit een sleutel in chat, screenshot, URL, broncode of deze README.** De app configureert geen account voor je.

1. Laat de verantwoordelijke beheerder een Azure-abonnement en Speech-resource maken in een ondersteunde regio. Controleer Speech Translation-beschikbaarheid, tarieven, quota, budgetwaarschuwingen en organisatorische goedkeuring. F0/gratis tegoed is niet gegarandeerd voldoende voor een dienst; budgetmeldingen zijn geen harde kostenstop.
2. Deze app gebruikt de standaard regionale Speech SDK TranslationRecognizer, bron `ar-SA`, `ar-MA` of `ar-EG`, doel **nl**, geen TTS. Kies de best passende bron en test met de werkelijke spreker. MSA, dialecten, recitatie, namen en religieuze termen kunnen verkeerd worden herkend/vertaald.
3. Regio moet overeenkomen met je resource. Toegestaan: `westeurope`, `northeurope`, `eastus`, `westus`, `eastus2`, `westus2`, `uksouth`, `francecentral`, `germanywestcentral`, `swedencentral`. Niet elke account/feature is in elke regio beschikbaar. Eigen endpoints, sovereign clouds en private endpoints zijn niet geïmplementeerd.
4. Sluit de demo-server. Open PowerShell in de uitgepakte map en voer **`.\START-LIVE.ps1`** uit. Het vraagt regio en een **verborgen sleutel**. Het zet alleen proces-omgevingsvariabelen `AZURE_SPEECH_REGION` en `AZURE_SPEECH_KEY`, start dezelfde .cmd en ruimt die variabelen daarna op. Geen .env nodig. Wijzig geen organisatie-uitvoeringsbeleid; wordt het script geblokkeerd, laat je beheerder het beoordelen of de twee procesvariabelen via zijn goedgekeurde geheimenworkflow aanbieden aan `node server.mjs`.
5. Open de operator opnieuw. Controleer **Azure ingesteld**, kies de eerder geteste microfoon en herkenningstaal.
6. Informeer spreker en aanwezigen en verkrijg passende toestemming/rechtsgrond. Vink pas daarna toestemming voor Azure en kosten aan en klik **Start live met cloud**. Dit is het eerste moment waarop de app een Azure-token aanvraagt en audio kan versturen.
7. Controleer Arabische herkenning en Nederlandse tekst, ook met een menselijke Arabisch/Nederlands-deskundige. Voorlopige tekst kan veranderen. Bij onjuiste vertaling: Stop en eventueel Wis ondertitel. Geen latentiebelofte; netwerk, stiltes en service bepalen de vertraging.
8. Stop/pauze sluit microfoon en recognizer. Hervatten is een nieuwe expliciete live-start. Netwerk-, autorisatie-, quota-, device- of tokenvernieuwingsfouten stoppen de sessie; herstel oorzaak en start handmatig opnieuw. Automatisch opnieuw uitzenden gebeurt niet.

### Privacy en beveiligingsgrenzen

- In live gaat microfoonaudio rechtstreeks vanuit de browser via TLS naar Microsoft Speech; de server vraagt alleen een kortlevend Speech-token aan. De abonnementssleutel blijft server-side in procesgeheugen. Het tijdelijke token is in browsergeheugen nodig, verloopt normaal na ongeveer 10 minuten en wordt elke 8 minuten vernieuwd. Het is **geen fijnmazig alleen-vertalen-token**; behandel toegang tot de operator/devtools als gevoelig.
- Geen sleutel, token, audio of transcript naar localStorage of logbestand. De app bewaart alleen de laatste ondertitel in servergeheugen; Wis en serverstop verwijderen die daar. De app maakt geen opnamebestand. Dit zegt niets over Microsoft-serviceverwerking: beoordeel contract, regio, dataretentie, privacy en eventuele service-logging met de beheerder. SDK-telemetrie is uitgeschakeld.
- Alleen 127.0.0.1, strikte Host/Origin-checks, lokale operator-CSRF-token en geen CORS-wildcard. Publieks-SSE bevat uitsluitend ondertitel/status, geen cloudtoken. Normaal en InPrivate werken via dezelfde server, niet via gedeelde browseropslag.
- De pc is een vertrouwensgrens: andere lokale processen/personen kunnen de lokale operator openen. Geen aparte login/rollen; publiek krijgt alleen de tv-weergave en geen toegang tot toetsenbord/devtools. Geen netwerk-publicatie/reverse proxy gebruiken.
- Eén operator tegelijk. Sluit je operator onverwacht, dan markeert de server na circa 15 seconden de sessie inactief. De client stopt bij mislukte heartbeat. Browser-/OS-slaap kan timers uitstellen: druk altijd Stop vóór sluiten/slaap, controleer het microfoonlampje en zet pc-slaap uit tijdens een beheerde proef indien je dat zelf besluit.

## 5. HDMI-tv: uitgebreid scherm, fullscreen of kiosk

1. Sluit HDMI aan. Windows **Win+P → Uitbreiden** (niet Dupliceren, anders ziet publiek ook bediening). Stel in Beeldscherminstellingen de positie/resolutie in.
2. Open publiekscherm en sleep dit browservenster naar de tv. Druk **F11** voor normaal fullscreen; F11 verlaat het weer. Houd operator op de pc.
3. Alternatief: open een apart **InPrivate**-venster op `http://127.0.0.1:8080/display.html`, verplaats naar tv en F11. Het krijgt direct de actuele server-snapshot, ook na herladen/reconnect.
4. Optioneel Edge-kiosk via Windows Uitvoeren/Terminal (Edge moet geïnstalleerd zijn):

   `msedge.exe --kiosk http://127.0.0.1:8080/display.html --edge-kiosk-type=fullscreen --no-first-run`

   Als `msedge.exe` niet wordt gevonden, gebruik de daadwerkelijke Edge-installatielocatie. De app kiest geen monitor: verplaats/plaats het venster zelf of gebruik normale fullscreen als kiosk op de verkeerde monitor start. Sluit kiosk met **Alt+F4**. Dit is een browser-kioskvenster, geen ingerichte Windows Assigned Access-kiosk of beveiligde pc-vergrendeling. We veranderen geen Windows-kioskbeleid.
5. Publiek ziet DEMO, LIVE of TEST plus status. Bij serveruitval staat **VERBINDING VERLOREN**, de laatste regel blijft mogelijk staan tot reconnect. Houd daarom een operator aanwezig. Wis is apart; volgende live-resultaten kunnen na wissen weer verschijnen. Stop + Wis geeft een leeg stil scherm.

## Testacceptatie vóór een bijeenkomst

- Demo vier regels; Stop; opnieuw; Wis. Publiek in normaal én InPrivate, herladen, kabel-tvbeeld.
- USB-microfoon lokale meter, toestemming geweigerd, uitpluggen, Stop terwijl toestemmingsvenster openstaat.
- Qu-route door technicus bewezen in Windows/browser, zonder feedback.
- Daarna pas een geautoriseerde korte cloudproef met bekende Arabische zinnen, kostencontrole en menselijke vertaalcontrole. Test ook minimaal 10 minuten voor tokenvernieuwing en herstel na internetuitval.
- Zonder deze praktijkchecks: **demo/prototype**, niet een bewezen dienstvoorziening. Gebruik een menselijke tolk of voorbereide tekst als fallback.

## Ontwikkeling en bronnen

`npm ci --ignore-scripts`, `npm test`, `npm run check`, `npm start`. Node native HTTP, lokale SDK 1.51.0, geen framework/build. Testen gebruiken mocks voor Azure/audio en echte loopback-HTTP voor API/SSE; geen echte cloudrequests.

Geraadpleegd 23 september 2026:
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-translation?pivots=programming-language-javascript
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=speech-translation
- https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short#authentication
- https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/

De SDK-pakketten worden via npm met hun eigen licenties geleverd. De Windows-zip bevat bron, lockfile, tests en handleiding, **geen node_modules of geheimen**.
# Current local app improvement — 12 October 2026

From fixed examples, **Verbeter deze app** pauses the example, leaves this tab/audience available and opens local ALHOR's existing improvement form in another tab. Only a fixed workflow-context identifier is transferred; no audio or caption content. The brief retains purpose, preservation/reuse and scope for manual continuation in WB; saving feedback does not execute it.

Return to Vrijdagpreek through the saved record. Only a paused, known fixture is shown from the same running app's existing state; returning does not start audio or a provider. A server restart clears this transient state. Normal Start/Stop/restart/audience behavior remains. Standalone entry without an ALHOR session uses one explicit click through the existing local-owner entrance; no account or authentication setting changes.

Exact portal/Node candidates and checks: `projects/alhor-portal/results/app-improvement-20261012/RESULT.md`. No publication or live-provider/microphone calls in this delivery.
