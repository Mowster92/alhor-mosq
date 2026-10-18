# Vrijdagpreek: gebruiken en ontwikkelen

## Actuele ingangen

- `MOSQUE-LOCAL.cmd`: lokale Docker-app op 18182, terug naar Portal op 18180.
  `up`, `status` en `stop` werken zonder agent. Deze proef configureert geen Azure.
- `START-VRIJDAGPREEK.cmd`: Windows-spraakapp op 8080 met de bestaande beschermde
  configuratie. Deze route hoort bij Portal 18080 en de vaste bridge op 19819.
- `VRIJDAGPREEK-DEV.cmd`: aparte sandbox en vastgehouden agentsessie. Esc onderbreekt;
  Ctrl+C verbreekt de terminal. Heropen om dezelfde sessie te hervatten.

De Windows-controller `windows-app.ps1` blijft eigenaar van hergebruik, broncontrole,
gereedheid en configuratie. Acties: `ensure`, `open`, `restart`, `stop`, `status`,
`configure`. Bijvoorbeeld `pwsh -File dev/vrijdagpreek/windows-app.ps1 -Action status`.
De twee oude appmap-wrappers zijn verwijderd; alle acties blijven rechtstreeks
beschikbaar. Lees `apps/vrijdagpreek/README.md` voor bediening en privacy.

## Bron en controles

Werk in dit repository, appmap `apps/vrijdagpreek`; geen losse runtime-bronkopieën.
Controleer actuele branch/status en geserveerde `/api/identity` bij hervatten.
Historische kandidaatlabels zijn geen actuele versieclaim.

Vanuit de appmap: `npm test`, `npm run check`. De bestaande
`node scripts/activate-development.mjs` voert die controles uit en identificeert
exacte gewijzigde werkbestanden; `candidate.json` is gegenereerd. Activeer daarna
de gekozen lokale runtime. De Windows-controller onderbreekt geen actieve vertaling.
Repositorycontrole vanaf root: `python scripts/check_repository.py`.

Bij UI-wijzigingen: operator en publiek controleren, ook lange tekst, foutstatus
en klein venster. Bestaande geïsoleerde browserroute:
`docker compose -f dev/vrijdagpreek/compose.yaml run --build --rm browser`.
Die gebruikt fictieve tekst en gesimuleerde spraak; inspecteer de screenshots in
`results/vrijdagpreek-agent/screenshots`. Geen echte Azure/microfoon nodig voor cleanup.

## Bewaarde werking en historie

De ALHOR-vormgeving, operator/publiek, taalkeuze, toestemming, lease, Start/Stop,
foutafhandeling en privacylijnen blijven behouden. Azure ingesteld betekent niet
dat spraak actief is. Publicatie of bronidentiteit bewijst geen vertaalkwaliteit.
Eerdere UI- en spraakproeven zijn gedateerd bewijs in `results/vrijdagpreek-agent/`
en Git-historie; die opdrachten worden niet automatisch opnieuw uitgevoerd.

Geen gegevens, sleutels, opnamen of transcripties kopiëren. De lokale
productmelding bewaart alleen expliciet getypte tekst in de Windows-state-map
of het aparte Docker-volume; de oude `apps/vrijdagpreek/data`-voorbereiding
wordt door de liveversie niet geladen. Providergebruik, microfoon, hosting en
toegang vragen een afzonderlijke opdracht. Care en andere appwerkplekken
blijven buiten dit werk.
