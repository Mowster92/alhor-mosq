# Alhor Mosq

Werkrepository voor een moskeebeheer-app van Said Alhor.

De eerste werkende toepassing is **Vrijdagpreek**, onder `apps/vrijdagpreek`:
een lokale operator en publieksweergave voor Arabisch/Nederlandse ondertitels.
Start `START-VRIJDAGPREEK.cmd`. Je kunt tekstparen voorbereiden, op deze pc
opslaan, corrigeren en handmatig tonen. Vaste voorbeelden blijven beschikbaar.
Dit is geen bewijs van live spraakvertaling of een productievoorziening.

Mo koos deze bronintegratie op 12 oktober 2026. Said Alhor's werk en de
moskeebeheer-basis blijven behouden. De overige modules hieronder zijn nog
voorstellen. Bronpublicatie of een merge start geen dienst en bewijst geen live
spraakvertaling; provider-, microfoon- en ledengegevensgebruik blijven aparte
grenzen.

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
