# Vrijdagpreek · live Arabisch → Nederlands

Een eenvoudige lokale proefversie: kies een microfoon, start de vertaling en toon Nederlandse ondertitels op een apart publiekscherm. Geen demo, tekstvoorbereiding of automatische herstart in deze bediening.

Bron: `Mowster92/alhor-mosq`, `apps/vrijdagpreek`. De bestaande Azure Speech-koppeling wordt gebruikt; geen nieuwe provider of bouwstap.

## Starten op Windows

Node.js 22 of nieuwer is nodig. `START-WINDOWS.cmd` installeert bij de eerste start de vastgelegde afhankelijkheden. Zonder Azure-instelling kun je alleen de microfoon lokaal testen.

Voor livevertaling, open PowerShell in deze map:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\START-LIVE.ps1
```

Voer de regio van je Speech-resource in, bijvoorbeeld `northeurope`, en daarna de sleutel in het verborgen invoerveld. De sleutel blijft in het serverproces; hij wordt niet in een bestand opgeslagen. Laat dit venster open.

Open **http://127.0.0.1:8080/**. Vanuit Docker Portal blijft **Open Vrijdagpreek** de ingang; de bestaande Windows-bridge moet daarvoor draaien. Een via Docker Portal geopend bedieningsscherm keert met **ALHOR home** terug naar poort 18080.

## Een korte echte proef

1. Klik **Microfoon kiezen**, sta toegang toe en kies de bedoelde ingang.
2. Klik **Test microfoon** en spreek. De niveaumeter moet bewegen. Dit blijft lokaal en stuurt niets naar Azure. Stop de test.
3. Kies de gesproken variant. **Standaard Arabisch** gebruikt `ar-SA`; Marokkaans en Egyptisch gebruiken `ar-MA` en `ar-EG`.
4. Klik **Open publiekscherm** en plaats dit op het tweede scherm.
5. Vink toestemming voor audio naar Azure aan en klik **Start vertaling**.
6. Controleer de blijvende status boven de ondertitels. **Luistert naar Arabische spraak** betekent dat de spraaksessie is geopend. Tijdens herkenning worden voorlopige Nederlandse woorden aangevuld; een ontvangen zin vervangt die voorlopige tekst. De Arabische herkenning helpt fouten in de ingang te onderscheiden van vertaalfouten.
7. Klik **Stop**. De microfoon gaat uit en de laatste ondertitel blijft zichtbaar. **Tekst wissen** wist ook het publiekscherm. Opnieuw starten maakt een nieuwe sessie, ook na wachten of een eerdere fout.

De app speelt geen geluid terug en slaat geen audio of live transcript op. Ondertitels staan alleen in geheugen. Na een serverherstart zijn ze weg. Sluit af met Stop en daarna Ctrl+C in het servervenster.

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

De tests gebruiken tijdelijke gegevens en een gesimuleerde provider; ze starten geen echte microfoon of Azure-audio. Een bronwijziging maakt de bestaande `candidate.json` onbekend totdat de exacte nieuwe bron is vastgelegd en de server gecontroleerd opnieuw gestart. Dat voorkomt dat Portal oude bronmetadata voor een nieuwe app aanziet.
