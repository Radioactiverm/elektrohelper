---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Stykačové ovládání]]"
pořadí: 2
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - stykače
---
> [!kostka] V kostce
> - **S1 Start** = spínací (zelené), **S0 Stop** = rozpínací (červené)
> - **Samodržení**: pomocný kontakt stykače **13–14 paralelně k S1**
> - Více míst: **Stop do série, Start paralelně**

## Impulsní chod

Tlačítko přímo napájí cívku – motor běží, **jen dokud tlačítko držíš**. Používá se pro seřizování, jeřáby, kladkostroje.

→ [Interaktivní schéma: impulsní ovládání](/schemata/impulsni-ovladani)

## Samodržení (přídržný kontakt)

Paralelně k tlačítku **S1** se zapojí spínací pomocný kontakt stykače **KM1 13–14**. Po stisku S1 stykač sepne, jeho kontakt 13–14 „přemostí“ tlačítko a cívka zůstane pod napětím i po puštění.

Vypnutí: **S0** (rozpínací, v sérii před S1) přeruší obvod cívky → stykač odpadne → rozepne se i 13–14.

> [!definice] Pořadí v ovládacím obvodu
> L → pojistka F3 → **F2 95–96** → **S0** → (**S1** ∥ **KM1 13–14**) → cívka **KM1 A1–A2** → N

→ [Interaktivní schéma: přímé spouštění se samodržením](/schemata/prime-spousteni-samodrzeni)

> [!pamatuj] Stop má přednost
> Když držíš současně S0 i S1, motor neběží – rozpínací S0 je v sérii a přeruší obvod vždy.

## Ovládání z více míst

- všechna tlačítka **Stop** → **do série**
- všechna tlačítka **Start** → **paralelně** (i s přídržným kontaktem)

→ [Interaktivní schéma: ovládání ze dvou míst](/schemata/ovladani-ze-dvou-mist)

## Barvy ovládacích prvků

| Prvek | Barva |
| --- | --- |
| Stop / vypnout | **červená** (nebo černá) |
| Start / zapnout | **zelená** (nebo bílá) |
| Nouzové zastavení | červený hřib na **žlutém** podkladu |
| Signálka chodu | zelená / bílá |
| Signálka poruchy | **červená** nebo žlutá |

## 🧠 Otestuj se

> [!question]- Který kontakt stykače se zapojuje paralelně k tlačítku Start?
> Spínací pomocný kontakt **13–14** (přídržný kontakt).

> [!question]- Jak zapojíš dvě tlačítka Stop pro ovládání ze dvou míst?
> **Do série** – kterékoliv z nich přeruší obvod.

> [!question]- Motor se rozběhne, ale po puštění S1 se zastaví. Kde je chyba?
> Nefunguje **samodržení** – chybí nebo je špatně zapojený kontakt 13–14 (např. zapojený rozpínací kontakt nebo vynechaný vodič).

> [!question]- Proč je tepelné relé 95–96 zapojeno v ovládacím obvodu a ne v silovém?
> Kontakt tepelného relé je malý pomocný kontakt – nevypíná proud motoru. Rozepne obvod cívky a motor vypne **stykač**.
