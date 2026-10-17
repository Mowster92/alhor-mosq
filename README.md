# Alhor Mosq

Local consolidated route: `MOSQUE-LOCAL.cmd` opens **http://127.0.0.1:18182/** from this repository, with return to Portal on 18180. `up`, `status` and `stop` act only on Mosque. `MOSQUE-DEV.cmd` is a compatibility alias; `VRIJDAGPREEK-DEV.cmd` remains the coding workspace. This local Docker route does not configure Azure or start audio; the existing Windows speech route remains separate.

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
