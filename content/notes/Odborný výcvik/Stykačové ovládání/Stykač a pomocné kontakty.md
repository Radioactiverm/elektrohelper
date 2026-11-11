---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Stykačové ovládání]]"
pořadí: 1
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - stykače
---
> [!kostka] V kostce
> - Stykač = **elektromagnetický spínač** ovládaný cívkou
> - Cívka **A1–A2**, hlavní kontakty **1–2, 3–4, 5–6**
> - Pomocné kontakty: končí na **3–4 = spínací**, na **1–2 = rozpínací**

## Jak funguje

Po přivedení napětí na **cívku** (A1–A2) vznikne magnetické pole, které přitáhne **kotvu**. Kotva sebou vezme všechny kontakty najednou – hlavní sepnou, rozpínací pomocné rozepnou. Po odpojení napětí kotvu vrátí **pružina**.

> [!pamatuj] Výhody stykače
> - spínání velkých proudů **malým ovládacím proudem**
> - ovládání **na dálku** a z více míst
> - po výpadku napětí **odpadne** – stroj se po návratu napětí sám nerozběhne

## Značení svorek

| Kontakt | Svorky | Druh |
| --- | :-: | --- |
| cívka | A1 – A2 | – |
| hlavní kontakty | 1–2, 3–4, 5–6 (L1–T1, L2–T2, L3–T3) | spínací |
| pomocný spínací (NO) | 13–14, 43–44 | končí na **3–4** |
| pomocný rozpínací (NC) | 21–22, 31–32 | končí na **1–2** |
| tepelné relé | 95–96 / 97–98 | rozpínací / spínací |

První číslice pomocného kontaktu je **pořadové číslo** (1., 2., 3. … kontakt), druhá říká **druh** kontaktu.

## Kategorie užití

| Kategorie | Použití |
| --- | --- |
| **AC-1** | odporová zátěž (topení) |
| **AC-3** | spouštění motorů s kotvou nakrátko a vypínání za chodu |
| **AC-4** | reverzace za chodu, protiproudé brzdění, impulsní chod |

> [!warning] Pozor
> Stykač vybíráme podle **kategorie AC-3** a výkonu motoru, ne jen podle proudu. Pro AC-4 musí být stykač výrazně předimenzovaný.

## 🧠 Otestuj se

> [!question]- Kontakt má svorky 43–44. Je spínací, nebo rozpínací?
> **Spínací** – končí na 3–4. Je to čtvrtý pomocný kontakt.

> [!question]- Na které svorky přivedeš napětí cívky?
> **A1 a A2**.

> [!question]- Proč se stroj se stykačovým ovládáním po výpadku napětí sám nerozběhne?
> Cívka ztratí napětí, stykač odpadne a rozepne i přídržný kontakt. Po návratu napětí je potřeba znovu stisknout Start.

> [!question]- Jaká kategorie užití platí pro běžné spouštění motorů?
> **AC-3**.
