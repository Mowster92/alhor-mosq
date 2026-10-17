# Vrijdagpreek

De actuele toepassing biedt een operator en een apart publiekscherm voor Arabisch
naar Nederlandse livevertaling. De bestaande lease-, Start/Stop-, privacy- en
Azure-keten blijft behouden. Oude demo-/voorbereidingsplannen zijn Git-historie.

## Ingangen

- `MOSQUE-LOCAL.cmd` in de repository-root: afzonderlijke Docker-proef op 18182,
  terug naar lokale Portal op 18180. Geen Azure-configuratie of automatische audio.
- `START-VRIJDAGPREEK.cmd` in de repository-root: bestaande Windows-spraakapp op
  8080, met beschermde lokale configuratie. Terug naar Windows Portal op 18080.
- `VRIJDAGPREEK-DEV.cmd`: afzonderlijke ontwikkelwerkplek en vastgehouden agentsessie.

Bediening, grenzen en onderhoud staan in [README.md](README.md). De Windows-controller
`dev/vrijdagpreek/windows-app.ps1` is de enige eigenaar van proces/configuratie;
oude dubbele appstarters zijn via Git terug te vinden. Bronpublicatie bewijst
geen microfoon-, Azure- of volledige moskeeproef.
