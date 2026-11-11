---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Stykačové ovládání]]"
pořadí: 4
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - stykače
  - motor
---
> [!kostka] V kostce
> - Rozběh **do hvězdy**, po rozběhu přepnutí **do trojúhelníku**
> - Záběrný proud i moment klesnou na **1/3**
> - Motor musí být na **400 V v trojúhelníku** (štítek 400/690 V Δ/Y)

## Proč

Velký motor by při přímém rozběhu vzal ze sítě 5–8× In a způsobil úbytky napětí (blikání světel, vybavování jističů). Ve hvězdě je na vinutí jen $400/\sqrt{3} = 230$ V.

> [!vzorec] Hvězda proti trojúhelníku
> $$I_{Y} = \frac{1}{3} I_{\Delta} \qquad M_{Y} = \frac{1}{3} M_{\Delta}$$

> [!warning] Nevýhoda
> Ve hvězdě má motor jen třetinový moment – hodí se pro rozběh **naprázdno nebo s malou zátěží** (ventilátory, čerpadla, pily). S plnou zátěží by se nerozběhl.

## Stykače

| Stykač | Úkol |
| --- | --- |
| **KM1** – síťový | přivádí fáze na začátky vinutí U1 V1 W1 |
| **KM2** – hvězda | spojí konce vinutí U2 V2 W2 do uzlu |
| **KM3** – trojúhelník | připojí konce vinutí na fáze (U1–W2, V1–U2, W1–V2) |
| **KT** – časové relé | odměří dobu rozběhu (typicky 3–10 s) |

## Průběh

1. **S1** → sepne **KM1**, **KT** a přes KT 15–16 i **KM2** → rozběh do **hvězdy**
2. po uplynutí času rozepne **KT 15–16** → **KM2 odpadne**
3. kontakt **KM2 21–22** se vrátí a přes **KT 17–18** sepne **KM3** → chod do **trojúhelníku**

> [!danger] KM2 a KM3 nikdy současně
> Spojily by se fáze přes uzel hvězdy = zkrat. Proto vzájemné blokování 21–22 a krátká **prodleva** při přepnutí (aby zhasl oblouk na kontaktech KM2).

> [!pamatuj] Nastavení tepelného relé
> Tepelné relé ve větvi vinutí (za KM1) měří **fázový** proud vinutí → nastavuje se na $I_n / \sqrt{3} \approx 0{,}58 \cdot I_n$.

→ [Interaktivní schéma: hvězda–trojúhelník](/schemata/hvezda-trojuhelnik) · [Simulátor](/simulator) (způsob spouštění Y–Δ)

## 🧠 Otestuj se

> [!question]- Kolikrát se sníží záběrný proud při spouštění Y–Δ?
> **Třikrát** (stejně tak moment).

> [!question]- Motor má štítek 230/400 V Δ/Y. Můžeš ho na síti 3×400 V spouštět hvězda–trojúhelník?
> **Ne.** V trojúhelníku by měl na vinutí 400 V místo 230 V. Pro Y–Δ potřebuješ motor 400/690 V Δ/Y.

> [!question]- Na kolik nastavíš tepelné relé motoru s In = 20 A spouštěného Y–Δ (relé ve větvi vinutí)?
> $0{,}58 \cdot 20 \approx 11{,}6$ A.

> [!question]- Proč se KM2 a KM3 blokují?
> Současné sepnutí by spojilo fáze přes uzel hvězdy – mezifázový zkrat.
