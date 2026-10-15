# Eerste opdracht voor de Vrijdagpreek-agent

Mo vraagt deze app te onboarden en vervolgens visueel bruikbaar en herkenbaar in het ALHOR-portfolio te maken. Je mag nu uitvoeren. Lees AGENTS.md, docs/PROJECT.md en dev/vrijdagpreek/ONBOARDING.md. Die onboarding bevat de actuele geaccepteerde livewerking en de door Mo aangewezen UX-1-APP-kennis. Oudere demo/voorbereidingsplannen zijn historie.

Maak eerst kort zichtbaar wat je hebt begrepen, welke bestaande merkassets je gebruikt en wat je gaat veranderen. Voer daarna de afgebakende verbetering uit; gewone ontwerpkeuzes hoef je niet opnieuw aan Mo voor te leggen. Blijf één uitvoerende agent.

Bestaande baseline is gecontroleerd: alle 26 tests en syntaxcontrole slagen vanuit de netwerkloze checks-container. De nieuwe browsercheck werkt eveneens en faalt momenteel alleen op een echt zichtbaar UX-probleem: langere ondertitels maken het publiekscherm hoger dan 1280x720. Baselinebeelden/rapport staan in results/vrijdagpreek-agent/baseline-screenshots. Inspecteer ze en los dat probleem op zonder tekst weg te knippen of de ondertitels onleesbaar klein te maken. Houd ook het operatorvenster rond 1000x800 bruikbaar.

Gebruik de bestaande ALHOR-logo/font-assets uit de gekoppelde Portal-static-map. De zelfgetekende maansikkel mag vervangen worden. Geef de operator en het publiek een eigen passende compositie binnen dezelfde merkfamilie. Geen grote marketingkop of nieuwe dashboardlaag. De goed werkende liveketen, statusbetekenissen, veilige foutcodes en Portal-terugweg blijven behouden.

Schrijf alleen in apps/vrijdagpreek en waar nodig de bijbehorende browsercheck. Geen aanpassingen aan live.js/operator.js of de serverlease/cloudketen. Alleen vaste static-allowlist/MIME-uitbreidingen voor lokale assets in server.mjs zijn toegestaan met test. Bewaar de bestaande onboarding/launcherwijzigingen. Geen data, Azure-sleutels, fysieke microfoon, echte provider, commits, push of wijzigingen aan Portal/Family/Care. De test-SDK is expliciet gesimuleerd.

Voer de checks en browsercontrole uit zoals in ONBOARDING.md. Inspecteer zelf de screenshots. Herstel zichtbare problemen en controleer alleen het geraakte opnieuw. Behoud de relevante assertions; groen maken door het lange-tekstcriterium te verwijderen is geen oplossing.

Lever een beknopt resultaat met ontwerpkeuzes, exacte gewijzigde bestanden, testuitkomst, screenshotpaden en resterende grenzen. De Windows-chat handelt na beoordeling de bestaande bronidentiteit en herstart af; fabriceer geen candidate.json. Als de Portal-kaart nog voorbereiding/demotekst bevat, stel een concrete actuele korte omschrijving voor, maar wijzig Portal niet.
