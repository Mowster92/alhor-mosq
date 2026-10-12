# Alhor Mosq

Werkrepository voor een moskeebeheer-app van Said Alhor.

De eerste werkende toepassing is **Vrijdagpreek**, onder `apps/vrijdagpreek`:
een lokale operator en publieksweergave voor Arabisch/Nederlandse ondertitels.
Start `START-VRIJDAGPREEK.cmd`. Je kunt tekstparen voorbereiden, op deze pc
opslaan, corrigeren en handmatig tonen. Vaste voorbeelden blijven beschikbaar.
Dit is geen bewijs van live spraakvertaling of een productievoorziening.

Mo koos deze bronintegratie op 12 oktober2026. Said Alhor's werk en de
moskeebeheer-basis blijven behouden. De overige modules hieronder zijn nog
voorstellen. De bronintegratie is lokaal gecommit, niet gepusht of gepubliceerd.

## Lokale bron en startstatus

Volgens de inspectie van 12 oktober 2026:

- **App en werkmap:** Vrijdagpreek onder `apps\vrijdagpreek` in
  `C:\Users\alhor\Documents\alhor\apps\mosque`, repository
  `Mowster92/alhor-mosq`.
- **Gekozen lokale bron:** branch
  `feature/vrijdagpreek-prepared-local-20261012`, bron-HEAD
  `f7565cd650010529d47ab649d1c33f8001167d3f`; geen upstream en
  niet gepubliceerd.
- **Geaccepteerde remote basis:** `main` op
  `eecbc6c7f529079ca4262f9ee436aab3d7a76e78`, waarvan de lokale bron
  afstamt. De remote bood bij de inspectie alleen `main` aan; de gekozen
  lokale bron is niet de gepubliceerde remote versie.
- **Startpad vanaf de repositoryroot:** `START-VRIJDAGPREEK.cmd`
  → `apps\vrijdagpreek\START-WINDOWS.cmd` → `node server.mjs` in de
  appmap. Lokale Windows/Node-omgeving, Node.js 22 of nieuwer;
  operatorroute `http://127.0.0.1:8080` en aparte publieksweergave.
- **Laatste gedocumenteerde kandidaat:**
  `vrijdagpreek-mosque-library-20261012-03`. Rond 17:16 was geen
  listener op poort 8080 waargenomen. Dit bewijst geen momenteel draaiende
  versie: de huidige runtime en geladen versie zijn onbekend.
- **Nog open en grenzen:** scope en open keuzes staan in `docs/PROJECT.md`.
  Deze lokale bronstatus geeft geen mandaat voor Git-publicatie,
  live/providergebruik, microfoongebruik of ledengegevens.

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
