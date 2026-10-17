# Vrijdagpreek · live Arabisch → Nederlands

Een eenvoudige lokale proefversie: kies een microfoon, start de vertaling en toon Nederlandse ondertitels op een apart publiekscherm. Geen demo, tekstvoorbereiding of automatische herstart in deze bediening.

Bron: `Mowster92/alhor-mosq`, `apps/vrijdagpreek`. De bestaande Azure Speech-koppeling wordt gebruikt; geen nieuwe provider of bouwstap.

## Starten op Windows

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

1. Klik **Microfoon kiezen**, sta toegang toe en kies de bedoelde ingang.
2. Klik **Test microfoon** en spreek. De niveaumeter moet bewegen. Dit blijft lokaal en stuurt niets naar Azure. Stop de test.
3. Kies de gesproken variant. **Standaard Arabisch** gebruikt `ar-SA`; Marokkaans en Egyptisch gebruiken `ar-MA` en `ar-EG`.
4. Klik **Open publiekscherm** en plaats dit op het tweede scherm.
5. Vink toestemming voor audio naar Azure aan en klik **Start vertaling**.
6. Controleer de blijvende status boven de ondertitels. **Luistert naar Arabische spraak** betekent dat de spraaksessie is geopend. Tijdens herkenning worden voorlopige Nederlandse woorden aangevuld; een ontvangen zin vervangt die voorlopige tekst. De Arabische herkenning helpt fouten in de ingang te onderscheiden van vertaalfouten.
7. Klik **Stop**. De microfoon gaat uit en de laatste ondertitel blijft zichtbaar. **Tekst wissen** wist ook het publiekscherm. Opnieuw starten maakt een nieuwe sessie, ook na wachten of een eerdere fout.

De app speelt geen geluid terug en slaat geen audio of live transcript op. Ondertitels staan alleen in geheugen. Na een serverherstart zijn ze weg. Stop de vertaling vóór je het bedieningsvenster sluit. De lokale server mag blijven draaien; de expliciete stopactie hierboven sluit hem af zonder opgeslagen werk of Azure-instelling te verwijderen.

## Als het niet lukt

De fout blijft in beeld, met een korte foutcode onder **Foutcode**. Deel alleen die code en de zichtbare melding; geen sleutels, tokens of browserheaders.

- Geen niveau: controleer Windows-invoer, browsertoestemming en de gekozen microfoon.
- `AZURE_AUTH_FAILED`: controleer sleutel en bijbehorende regio via de lokale launcher.
- `AZURE_QUOTA`: controleer je Speech-gebruikslimiet; de app schakelt niet naar een betaald alternatief.
- Verbroken lokale/cloudverbinding: audio stopt. Herstel de oorzaak en klik zelf opnieuw op Start.
- Een andere bediening actief: stop die eerst. Eén operator kan tegelijk uitzenden; meerdere publieksvensters kunnen meekijken.

## Wat deze POC bewijst

Een korte [openbare menselijke Arabische opname van Artikel 1](https://commons.wikimedia.org/wiki/File:Universal_Declaration_of_Human_Rights_-_arz_-_ef_-_Art1.ogg) is via de ingestelde Azure-resource vertaald naar onder meer: “Alle mensen worden vrij en gelijk geboren in waardigheid en rechten.” Dit bewijst echte spraakherkenning en vertaling op dat fragment. Het is geen kwaliteitsbewijs voor een volledige preek, religieuze termen, de microfoon van de imam of de moskee-installatie. Laat een Arabisch/Nederlands-spreker die kwaliteit tijdens een afzonderlijke proef beoordelen.

Het publiekscherm werkt op deze pc, bijvoorbeeld via HDMI. Netwerkdistributie naar andere schermen en een specifieke mixer/audio-interface vallen buiten deze verbouwing.

## Gegevens en onderhoud

De oude voorbereiding- en demobediening is verwijderd. Bestaande bestanden in `data/` blijven ongewijzigd op schijf en worden door deze liveversie niet geladen. Bewaar deze map als je oude teksten later wilt terughalen. De oorspronkelijke bron blijft in Git terug te vinden.

Azure-audio gaat rechtstreeks vanuit de browser naar Microsoft. De lokale server geeft uitsluitend een kortlevend token uit; de abonnementssleutel blijft server-side. Er is geen login: dit is een lokale app op `127.0.0.1`, niet bedoeld om op internet te publiceren. De bestaande Host/Origin-, operator- en Portal-controles blijven gelden.

```text
npm ci --ignore-scripts
npm test
npm run check
```

De tests gebruiken tijdelijke gegevens en een gesimuleerde provider; ze starten geen echte microfoon of Azure-audio. Na bronwijzigingen voert de normale starter `npm test` en `npm run check` uit, legt een herkenbare `dev-…` identiteit voor de exacte gecontroleerde werkbestanden vast en herstart de eigen inactieve server. Die ontwikkelidentiteit is geen gecommitteerde of gepubliceerde oplevering. Een mislukte controle laat de draaiende app en kandidaat ongemoeid. `candidate.json` blijft gegenereerde metadata; maak daarvoor geen handmatige hashes of verplichte tussentijdse commits.