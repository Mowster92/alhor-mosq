# Vrijdagpreek · live Arabisch → Nederlands

Een eenvoudige lokale proefversie: kies een beschikbare audio-ingang, start de vertaling en toon Nederlandse ondertitels op een apart publiekscherm. Geen demo, tekstvoorbereiding of automatische herstart in deze bediening.

Bron: `Mowster92/alhor-mosq`, `apps/vrijdagpreek`. De bestaande Azure Speech-koppeling wordt gebruikt; geen nieuwe provider of bouwstap.

## Starten op Windows

### Mosque home: de ingang voor maandag

Open via ALHOR **Mosque**: `http://127.0.0.1:8080/mosque?portal=local`
(Portal 18180) of `?portal=docker` (Portal 18080). Canoniek pad: **GET `/mosque`**.
Home opent zonder microfoon, audio of Azure-configuratie. Alleen Vrijdagpreek is
beschikbaar; **Open Vrijdagpreek** gaat naar `/` met dezelfde vaste context.
De operator biedt **Mosque home** terug; klik eerst **Stop** als er vertaald wordt.
`/`, `/index.html` en `/display.html` blijven compatibel. `/mosque.html` is geen route.

De Portal-controller gebruikt hiervoor vanaf de repository-root:

```powershell
pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action ensure-home
```

Dit bereidt en controleert de bron en hergebruikt/start uitsluitend de eigen
lokale service, zonder configuratievenster als de Azure-instelling ontbreekt.
Een bestaande versleutelde instelling wordt normaal gebruikt; een onleesbare
instelling geeft een melding en wordt niet vervangen. De shell is gereed bij
exacte huidige bronidentiteit, ook met `configured=false`. De gewone
`ensure`/`open`/`restart`-spraakroute blijft Azure vereisen. Geen actieve vertaling
of onbekend proces wordt gestopt. Home is geen bewijs dat live vertalen klaar is.

Maandag: Windows-pc met Node.js 22+ en PowerShell 7. Gebruik het bestaande
audio- en schermsysteem; controleer met de beheerder of het browserpublieksvenster
via de bestaande schermen getoond kan worden. De exacte aansluiting is nog onbekend.
Verander de werkende audioroutering niet.
Controleer lokaal de gereedheid met de beheerder. Zonder Azure kun je de app
bekijken maar niet live vertalen. Microfoontest en echte vertaalproef vragen
bewuste bediening/toestemming; beoordeel de kwaliteit met een
Arabisch/Nederlands-spreker. Geen ledengegevens of sleutels invoeren in meldingen.

### Bestaande spraakingang

Node.js 22 of nieuwer en PowerShell 7 zijn nodig. Dubbelklik **START-VRIJDAGPREEK.cmd** in de repository-root, of gebruik de expliciete **Windows speech app**-ingang in lokale Portal; de Windows Portal op 18080 heeft zijn eigen bewaakte Open-route. De rootstarter en de bewaakte Open-route op 18080 gebruiken dezelfde Windows-controller; de alternatieve link op 18180 opent alleen een al gestarte app: juiste instantie hergebruiken, gewijzigde bron controleren en activeren, gereedheid bevestigen en pas dan openen. De bridge wordt door Portal automatisch gestart.

Alleen bij de eerste start verschijnt een apart venster voor regio (hier `northeurope`) en verborgen sleutel. Windows bewaart die versleuteld voor jouw gebruikersaccount op deze pc, buiten Git en de agent-sandbox. Daarna gaat de starter zelf verder. De vensters van de starter mogen sluiten; de app blijft draaien. Gebruik deze ene Windows-ingang; verwijderde dubbele launchers zijn via Git terug te vinden. Voor de afzonderlijke Docker-proef op 18182 gebruik je `MOSQUE-LOCAL.cmd` in de repository-root; die configureert geen Azure en start geen audio.

De app staat op **http://127.0.0.1:8080/**. **ALHOR home** keert terug naar Docker Portal op 18080. Opnieuw openen hergebruikt een juiste lopende instantie. Een actieve vertaling wordt niet voor nieuwe code onderbroken: klik eerst **Stop** en open daarna opnieuw. Een onbekend proces op poort 8080 wordt niet gestopt.

Voor ontwikkeling gebruik je **VRIJDAGPREEK-DEV.cmd** in de repository-root. Dat toont project, sandbox en de exacte hervatte agentsessie. Daar geef je opdrachten; de gewone appstarter opent geen agent. Esc onderbreekt, Ctrl+C sluit de agent. Dezelfde ontwikkelstarter hervat de vastgehouden sessie. Een ontbrekende of dubbelzinnige sessie wordt gemeld; bewust kiezen kan met `-SessionId`, bewust opnieuw beginnen met `-NewSession` op `dev/vrijdagpreek/vrijdagpreek-dev.ps1`.

Expliciete acties, indien nodig, vanaf de repository-root:

```powershell
pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action restart
pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action stop
pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action status
pwsh -NoProfile -File dev/vrijdagpreek/windows-app.ps1 -Action configure
```

`configure` vervangt de bewaarde Azure-instelling; herstart daarna om die toe te passen. De normale start voert nooit automatisch audio naar Azure.

## Een korte echte proef

1. Klik **Audio-ingang kiezen**, sta toegang toe en kies de bedoelde browseringang. Dit kan een microfoon, USB-interface of virtueel apparaat van de bestaande geluidsapp zijn. De browser kan niet automatisch het geluid van een andere app overnemen. Controleer Windows-microfoonprivacy (ook desktop-apps), browsertoestemming en invoerapparaat met de beheerder. Laat de werkende audioroutering intact.
2. Klik **Test audio-ingang** en spreek. De niveaumeter moet bewegen. Dit blijft lokaal en stuurt niets naar Azure. Stop de test.
3. Kies de gesproken variant. **Standaard Arabisch** gebruikt `ar-SA`; Marokkaans en Egyptisch gebruiken `ar-MA` en `ar-EG`.
4. Klik **Open publiekscherm** en controleer weergave via het bestaande schermsysteem. Gebruik daar **Volledig scherm** (ook bereikbaar met Tab en Enter); Esc keert terug. Bij ontbrekende browserondersteuning of weigering verschijnt een melding, geen succesclaim.
5. Vink toestemming voor audio naar Azure aan en klik **Start vertaling**.
6. Controleer de blijvende status boven de ondertitels. **Luistert naar Arabische spraak** betekent dat de spraaksessie is geopend. Tijdens herkenning worden voorlopige Nederlandse woorden aangevuld; een ontvangen zin vervangt die voorlopige tekst. De Arabische herkenning helpt fouten in de ingang te onderscheiden van vertaalfouten.
7. Klik **Stop**. De microfoon gaat uit en de laatste ondertitel blijft zichtbaar. **Tekst wissen** wist ook het publiekscherm. Opnieuw starten maakt een nieuwe sessie, ook na wachten of een eerdere fout.

De app speelt geen geluid terug en slaat geen audio of live transcript op. Ondertitels staan alleen in geheugen. Na een serverherstart zijn ze weg. Stop de vertaling vóór je het bedieningsvenster sluit. De lokale server mag blijven draaien; de expliciete stopactie hierboven sluit hem af zonder opgeslagen werk of Azure-instelling te verwijderen.

## Leesbaarheid zonder audio

**Leesbaarheid publiek** biedt drie begrensde tekstgroottes en licht/donker hoog
contrast. Klik **Weergave toepassen**; alle publieksvensters krijgen dezelfde
instelling via de bestaande SSE-verbinding, ook na herladen. Dit vraagt geen
microfoon, Azure-toestemming, token of nieuwe operatorlease en verandert geen
ondertitels, spraakstatus of audio. Tijdens een lease kan alleen die operator
wijzigen; een andere bediening krijgt een weigering zonder de sessie over te nemen.

Instellingen staan uitsluitend in het geheugen van deze lokale server, niet op
schijf en niet in browseropslag. Stop en herladen bewaren ze; serverherstart
herstelt Standaard/Licht. Volledig scherm geldt alleen voor het gekozen
publieksvenster en vereist een expliciete klik/toets daar. Grote/lange teksten
worden afgebroken zonder horizontale overloop; uitzonderlijk lange tekst kan
verticaal scrollen in plaats van onleesbaar klein te worden of te verdwijnen.
Controleer leesbaarheid op de echte schermen vanaf publieksafstand.

## Als het niet lukt

De fout blijft in beeld, met een korte foutcode onder **Foutcode**. Deel alleen die code en de zichtbare melding; geen sleutels, tokens of browserheaders.

- Geen niveau: controleer Windows-invoer, browsertoestemming en de gekozen microfoon.
- `AZURE_AUTH_FAILED`: controleer sleutel en bijbehorende regio via de lokale launcher.
- `AZURE_QUOTA`: controleer je Speech-gebruikslimiet; de app schakelt niet naar een betaald alternatief.
- Verbroken lokale/cloudverbinding: audio stopt. Herstel de oorzaak en klik zelf opnieuw op Start.
- Een andere bediening actief: stop die eerst. Eén operator kan tegelijk uitzenden; meerdere publieksvensters kunnen meekijken.

## Nog afzonderlijk te oefenen op de moskee-installatie

Gebruik bekende Arabische zinnen en een Arabisch/Nederlands-spreker voor
betekeniscontrole. Test minstens 10 minuten echte spraak om tokenverversing te
passeren, internetuitval gevolgd door handmatig herstarten, Stop tijdens een
browsertoestemmingsvraag, en Stop/wachten/opnieuw starten. De geïsoleerde tests
hieronder zijn geen bewijs voor die apparatuur of vertaalkwaliteit.

## Wat deze POC bewijst

Een korte [openbare menselijke Arabische opname van Artikel 1](https://commons.wikimedia.org/wiki/File:Universal_Declaration_of_Human_Rights_-_arz_-_ef_-_Art1.ogg) is via de ingestelde Azure-resource vertaald naar onder meer: “Alle mensen worden vrij en gelijk geboren in waardigheid en rechten.” Dit bewijst echte spraakherkenning en vertaling op dat fragment. Het is geen kwaliteitsbewijs voor een volledige preek, religieuze termen, de microfoon van de imam of de moskee-installatie. Laat een Arabisch/Nederlands-spreker die kwaliteit tijdens een afzonderlijke proef beoordelen.

Het browserpublieksvenster werkt op deze pc. De moskee heeft al een Windows-geluidsapp en werkende schermen; de exacte audio- en schermtopologie is niet bevestigd. HDMI, USB-B of een specifieke mixer zijn geen geteste vereisten. Aansluiting op die bestaande installatie blijft een afzonderlijke proef.

## Gegevens en onderhoud

De oude voorbereiding- en demobediening is verwijderd. Bestaande bestanden in `data/` blijven ongewijzigd op schijf en worden door deze liveversie niet geladen. Bewaar deze map als je oude teksten later wilt terughalen. De oorspronkelijke bron blijft in Git terug te vinden.

Azure-audio gaat rechtstreeks vanuit de browser naar Microsoft. De lokale server geeft uitsluitend een kortlevend token uit; de abonnementssleutel blijft server-side. Er is geen login: dit is een lokale app op `127.0.0.1`, niet bedoeld om op internet te publiceren. De bestaande Host/Origin-, operator- en Portal-controles blijven gelden.

```text
npm ci --ignore-scripts
npm test
npm run check
```

De tests gebruiken tijdelijke gegevens en een gesimuleerde provider; ze starten geen echte microfoon of Azure-audio. Na bronwijzigingen voert de normale starter `npm test` en `npm run check` uit, legt een herkenbare `dev-…` identiteit voor de exacte gecontroleerde werkbestanden vast en herstart de eigen inactieve server. Die ontwikkelidentiteit is geen gecommitteerde of gepubliceerde oplevering. Een mislukte controle laat de draaiende app en kandidaat ongemoeid. `candidate.json` blijft gegenereerde metadata; maak daarvoor geen handmatige hashes of verplichte tussentijdse commits.

De operator kan onder **Probleem met de app melden** zelf een korte melding
schrijven. Alleen die getypte tekst wordt lokaal bewaard; audio, ondertitels en
sessiegegevens worden niet meegestuurd. Een referentielink opent dezelfde
melding na herstart. Deze actie staat niet op het publiekscherm en start geen
ontwikkelwerk. De Windows-app bewaart meldingen in de afgeschermde map
`%LOCALAPPDATA%\ALHOR\Vrijdagpreek\feedback.json`; de Docker-app gebruikt een
eigen blijvend lokaal volume. Er is geen app-login: iedereen met toegang tot
dezelfde lokale operatoromgeving kan een bekende referentie daar terugzien.
Gebruik VRIJDAGPREEK-DEV.cmd wanneer je verder wilt ontwikkelen.
