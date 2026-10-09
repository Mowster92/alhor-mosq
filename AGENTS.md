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

## Huidige grens

De eerste opdracht betreft repository- en Codex-inrichting tot circa 90%.
Een werkende applicatie, hosting, juridische licentiekeuze en definitieve
gebruikersrollen vallen onder de volgende productbeslissingen.
