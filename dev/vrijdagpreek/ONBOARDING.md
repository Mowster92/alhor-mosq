# Vrijdagpreek: huidige opdracht en hervatten

## Doel en eigenaarschap

Mo wil bruikbare apps ontwikkelen met minder afstemming en omgevingsbeheer. ALHOR is het portfolio; Portal is de ingang. Said/Mo's Vrijdagpreek is een POC voor Arabische imamspraak naar leesbare Nederlandse ondertitels op moskeeschermen. De oude moskeebeheerplannen zijn geen opdracht voor deze ronde.

Deze sandboxagent voert de volgende UX-opdracht uit. De Windows/Codex-chat heeft de liveverbouwing gemaakt; dat was geen eerdere opdracht aan deze agent. Meld zichtbaar wat je aanpakt en lever een concrete, beoordeelbare verbetering.

## Bevestigde basis — 15 oktober 2026

- Echte bron: dit repository, `apps/vrijdagpreek`. Baseline commit `771fd08`, kandidaat `vrijdagpreek-live-20261015-01`.
- Node, Azure Speech SDK 1.51.0, live Arabisch naar `nl`; geen demo/voorbereidingsbediening meer.
- 26 tests en syntaxcontrole geslaagd. Echte openbare menselijke Arabische opname leverde via Azure en Chromium de volledige Nederlandse zin op: “Alle mensen worden vrij en gelijk geboren in waardigheid en rechten.”
- Mo heeft daarna in Windows Firefox zelf de Arabische herkenning en Nederlandse tekst op beide schermen bevestigd, plus Stop → twintig seconden wachten → opnieuw starten.
- Windows app is al herstart op `http://127.0.0.1:8080/`, met Azure ingesteld in `northeurope`. Portal op `http://127.0.0.1:18080/` opent deze app via de bestaande Windows-bridge op 19819. Refresh en ALHOR home terug naar 18080 zijn gecontroleerd.
- Dit bewijst de korte proef, niet de kwaliteit van een volledige preek, religieuze termen of de echte moskee-installatie.

## Eerste opdracht: herkenbaar ALHOR, bruikbaar als livevertaler

Mo vindt dat de app visueel nog niet bij ALHOR hoort. Geef de operator en het publiekscherm een samenhangende ALHOR-uitstraling, met behoud van de net geaccepteerde livewerking. Gebruik de echte bestaande ALHOR-assets als referentie; de zelfgemaakte groene maansikkel is geen vastgesteld ALHOR-logo.

De bestaande Portal `portal/static/portal` map is als aparte alleen-lezen referentie gekoppeld. Daar staan `alhor-p1.svg`, `InterVariable.woff2`, de fontlicentie en `ruimte.css`/`family.css`/`operating.css`. De logo-kleuren zijn blauw #0153f7 en paars #381d45; de huidige Portal gebruikt Inter, rustige lichte vlakken en blauwe hoofdacties. Hergebruik geschikte publieke assets met licentie; verzin geen vervangend merk of apart designsysteem. Je hoeft niet alle Portal-chrome op het publiekscherm te zetten.

Operator: compacte herkenbare ALHOR-kop met Vrijdagpreek als appnaam en bestaande teruglink; Start/Stop, microfoon en de actuele toestand direct zichtbaar op Mo's normale venster rond 1000×800. Laat de vertaling het grootste werkvlak zijn. Maak ook lege toestand, luisteren, voorlopige/finale tekst en blijvende foutmelding verzorgd.

Publiek: ondertitels staan voorop. Bescheiden ALHOR-herkenning, groot leesbaar Nederlands, ruimte voor langere zinnen en een rustige zichtbare status. Maak er geen dashboard of marketingpagina van. Behoud de huidige flow en DOM-contracten waar mogelijk.

Toegestane bronwijzigingen: de Vrijdagpreek HTML/CSS en eventuele lokale merkassets. Alleen als assets dat nodig maken mag de vaste static-allowlist/MIME-afhandeling in `server.mjs` aangepast worden, met passende test. Herontwerp de lease, Azure-, microfoon-, privacy- en Start/Stop-keten niet voor deze visuele opdracht.

Portal heeft al een Vrijdagpreek-kaart en werkende Open-route. Nieuwe registratie of een integratieplatform is niet nodig. Als de kaarttekst nog voorbereidingen beschrijft, meld de concrete tekstcorrectie voor de Windows-chat; deze sandbox wijzigt de Portal-bron niet. Family en Care volgen later en blijven nu onaangeraakt.

## UX-kennis die Mo expliciet meegaf

Bron: chat `codex://threads/01a10f0b-64fc-7da1-bd98-70b9bd517675`, titel **UX-1-APP**, en de daaruit gemaakte kennisoverdracht `results/ux-kennis-care-fit-20261013/PLAN.txt` in Werkbank. Dit zijn bruikbare ontwerpafwegingen, geen nieuwe engineeringopdrachten of universele huisstijl.

1. Ontwerp de complete handeling en de terugweg. Voor Vrijdagpreek: kiezen → controleren → starten → lezen → stoppen/herstarten → terug naar Portal.
2. Orden op beslismoment. Bediening en zichtbare toestand hebben voorrang; technische versie-informatie blijft op verzoek bereikbaar.
3. Kleur heeft steun van tekst/vorm. Azure ingesteld is niet hetzelfde als luisteren; voorlopige en ontvangen tekst blijven herkenbaar.
4. Context en invoerbehoud zijn onderdeel van UX. Behoud gekozen microfoon/taal en maak stoppen voorspelbaar.
5. Merk mag de taak niet verdringen, vooral bij een laag Windows-venster of mobiel. Een groot merkhoofd of titel kan de echte bediening uit beeld drukken.
6. Beoordeel daadwerkelijk gerenderde screenshots, ook lange tekst, open details, lege toestand, fouten en focus. Tests alleen bewijzen geen compositie.
7. De Vivendem paars/groen/roze-uitwerking uit die chat is productgebonden. Neem de afwegingen over, niet automatisch de kleuren of Care-rollen.

## Werkplek, testen en grenzen

- App gebruiken: dubbelklik repository-root `START-VRIJDAGPREEK.cmd`. Die hergebruikt de juiste ingestelde instantie of controleert en activeert de actuele bron, wacht op gereedheid en opent de browser. Alleen de eerste keer vraagt een apart venster regio en verborgen Azure-sleutel; deze worden voor jouw Windows-account op deze pc versleuteld buiten Git bewaard. Er wordt nooit automatisch audio gestart. Geavanceerde acties: `pwsh -File dev/vrijdagpreek/windows-app.ps1 -Action restart`, `stop`, `status` of `configure`. Een actieve vertaling wordt niet voor een bronwissel gestopt.
- Ontwikkeling hervatten: repository-root `VRIJDAGPREEK-DEV.cmd`. Daar geeft Mo opdrachten en ziet hij voortgang. De ingang toont project, sandbox en exact vastgehouden sessienummer; geen blinde `--last`. Esc onderbreekt; een correctie vervolgt. Ctrl+C sluit de agent; dezelfde launcher hervat die sessie. Ontbrekend/dubbelzinnig wordt gemeld; `-SessionId` kiest bewust een andere, `-NewSession` begint bewust opnieuw. De gewone appstarter opent geen agent.
- Deze sandbox is `vrijdagpreek-dev`, naast de behouden `portal-dev` omgeving. Windows runtime, Azure-sleutel en Portal-data blijven daarbuiten. Dit is een extra appwerkplek, geen vervanging/reset van Portal.
- Je werkt op de echte gedeelde bron. Geen losse kopie als oplevering. Eén schrijver; bewaar bestaande edits. Geen commit/push/merge zonder expliciete toestemming.
- `apps/vrijdagpreek/data` is alleen-lezen gekoppeld. Niet lezen, kopiëren of wijzigen. De live-app gebruikt deze oude voorbereidingen niet. Er komen geen echte opnamen, sleutels of transcripties in tests/Git.
- Geen Azure-aanroepen of fysieke microfoon voor deze stylingronde. De browsercheck gebruikt een gesimuleerde SDK, fictieve tekst en een browser-testmicrofoon. Dat is UI-regressiebewijs, geen nieuw live kwaliteitsbewijs.
- Vanuit repo-root: `docker compose -f dev/vrijdagpreek/compose.yaml run --build --rm checks`, daarna dezelfde opdracht met `browser`. Data voor die checks is RAM/tijdelijk; de bron is alleen-lezen gemount. Er zijn geen ontwikkelvolumes of gepubliceerde poorten.
- Screenshots en rapport komen onder `results/vrijdagpreek-agent/screenshots`. Inspecteer de PNG's echt en verbeter zichtbare problemen. Behoud betekenisvolle assertions.
- Draai daarnaast `python3 scripts/check_repository.py` als beschikbaar. Lees `apps/vrijdagpreek/README.md` voor de Windows-app.
- Nieuwe ontwikkelbron activeer je met de bestaande normale Windows-appstarter. Die laat `scripts/activate-development.mjs` eerst tests/syntax controleren en geeft de exacte werkbestanden een herkenbare `dev-…` identiteit, zonder commit. Daarna herstart hij alleen de eigen inactieve instantie. Maak geen eigen descriptor/hashes; een ontwikkelidentiteit is geen beoordeelde oplevering. Windows-regio/sleutel blijven buiten de sandbox. Als Windows-uitvoering niet bereikbaar is, meld dat één concrete resterende stap; claim geen activatie vanuit Linux.

Lever: wat concreet verbeterde, geraakte bestanden, testresultaat, screenshotpaden, huidige Git-status en de korte Windows-kijkroute. Geef eventuele kaarttekstcorrectie apart. Claim geen live Azure/Firefox-test die je niet uitvoerde.

## Eerste agentopdracht uitgevoerd

De eerste UI-opdracht is afgerond in de bewaarde agentsessie `01a13e18-fe66-7e20-8cdf-5ece2574d056`. Niet opnieuw uitvoeren zonder een nieuw verzoek van Mo. Bestaande ALHOR-assets zijn toegepast; langere testondertitels passen op 1280×720. 27 tests, syntaxcontrole, geïsoleerde Chromium-flow en repositorycontrole slagen. De Windows-chat heeft bronwijzigingen en screenshots onafhankelijk nagekeken. LiveSession, OperatorSession en de DOM-controller zijn ongewijzigd. Echte Azure/microfoonproeven zijn in deze stylingronde niet herhaald.

Mo heeft de lokale commit van vormgeving en agent-inrichting op 15 oktober goedgekeurd. De toenmalige opleverversie was `vrijdagpreek-alhor-20261015-01`. De huidige normale Windows-starter neemt broncontrole, herkenbare ontwikkelidentiteit en gecontroleerde activatie over; controleer bij hervatten de werkelijk geserveerde identiteit. Alleen `candidate.json` is gegenereerde metadata. Agentresultaat en PNG's staan onder `results/vrijdagpreek-agent/`, buiten Git.

Een verse afzonderlijke sandbox kan met `./dev/vrijdagpreek/vrijdagpreek-dev.ps1 up -SandboxName vrijdagpreek-repro` worden aangemaakt. De Portal-bron moet op de relatieve plek uit `sandbox.json` staan; Docker/OpenAI-aanmelding blijft een hostvoorwaarde. Bestaande data wordt niet gekopieerd of gereset. De testcontainer krijgt geen netwerk of ontwikkelvolume.
