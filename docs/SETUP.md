# Lokaal werken met Codex

Deze checkout staat op:

`C:\Users\SaidAlHor\.codex\Werkbank\alhor-mosq`

De map is bereikbaar vanuit het bestaande Codex-project ALHOR -- Werkbank.
Om de repository als zelfstandig sidebarproject te gebruiken, voeg je in
Codex deze bestaande map toe als project. De huidige chat blijft in Werkbank.

## Git

- Remote: `https://github.com/Mowster92/alhor-mosq.git`.
- Basisbranch: `main`.
- Aanmelding: Windows Git Credential Manager, account Mowster92.
- Commitidentiteit wordt uitsluitend voor deze repository ingesteld.
- Er worden geen tokens in projectbestanden opgeslagen.

Controleer de checkout met:

```powershell
git status
git remote -v
python scripts/check_repository.py
```

Nieuwe wijziging:

```powershell
git switch -c feature/korte-omschrijving
# Maak en controleer de wijziging.
git add .
git commit -m "Beschrijf de wijziging"
git push -u origin HEAD
```

## Wat nog nodig is

Kies de eerste module en stack met `docs/PROJECT.md` als uitgangspunt. Voeg
daarna installatie-, start-, build- en testcommando's en de bijbehorende CI
toe. Stel branchbescherming in zodra de repositorycontrole op GitHub draait.
Er is nog geen hosting of applicatie gekoppeld.
