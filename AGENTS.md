# Alhor Mosq — werkinstructies

Dit project wordt een moskeebeheer-app. Communiceer met Said in het Nederlands.
Lees `docs/PROJECT.md` voor de actuele scope en open keuzes.

## Werkwijze

- Neem initiatief bij gewone, omkeerbare implementatiekeuzes.
- Leg belangrijke architectuurkeuzes vast in `docs/PROJECT.md`.
- Bouw kleine, complete veranderingen met relevante controles.
- Gebruik featurebranches nadat de eerste repositorybasis op main staat.
- Vermeld wat veranderd is, hoe het gecontroleerd is en wat nog openstaat.
- Repositorycontrole: `python scripts/check_repository.py`.
- Voeg build-, lint- en testcommando's hier toe zodra de stack is gekozen.

## Gegevens en toegang

- Gebruik uitsluitend fictieve gegevens in voorbeelden, tests en demo's.
- Zet geen ledengegevens, donaties, wachtwoorden of exports in Git.
- Bewaar secrets buiten Git; geef alleen variabelenamen in `.env.example`.
- Ontwerp toegang per rol en controleer die op de server zodra er een backend is.
- Leg vóór livegang vast hoe bewaartermijnen, back-ups en herstel werken.

## Actuele toepassing — 12 oktober2026

Mo heeft de lokale Vrijdagpreek-integratie in dit bestaande repository
goedgekeurd; Said's bijdrage en de moskeebeheer-basis blijven behouden.
Actuele bron: `apps/vrijdagpreek`; start: `START-VRIJDAGPREEK.cmd`.
Controle in de appmap: `npm test` en `npm run check`, plus de repositorycontrole.
Gebruik de bestaande operator/publieksroute en lokale opslag. Planning blijft
in Codex; de ALHOR-feedbackroute draagt context, geen ondertitels of audio.
Git-bronpublicatie, live/providergebruik, microfoon en ledengegevens blijven
afzonderlijke grenzen; bronpublicatie of een merge activeert die niet. De
oudere inrichtingsopdracht is historie.

## Local checkpoint commits — 22 October 2026

For completion of currently authorised local work, make a scoped checkpoint commit after the relevant checks, following [the platform policy](../../projects/alhor/README.md#local-source-checkpoints). Preserve unrelated changes and exclude private data, secrets and recovery material. Push, merge, publication and deployment still require explicit authority. This is not permission to resume a paused product or change its delivery owner.
