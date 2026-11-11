---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Asynchronní motor]]"
pořadí: 2
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - motor
  - jištění
---
> [!kostka] V kostce
> - Motor potřebuje ochranu proti **zkratu** i proti **přetížení**
> - **Tepelné relé** (F2) a **motorový spouštěč** se nastavují na **jmenovitý proud motoru In**
> - Ochrana musí **vydržet rozběhový proud**, ale vypnout při trvalém přetížení nebo výpadku fáze

## Proti čemu chráníme

| Porucha | Proud | Kdo vypne |
| --- | --- | --- |
| zkrat | desítky × In, kA | pojistky, zkratová spoušť jističe / spouštěče |
| přetížení, zablokovaný rotor | 1,2 – 8 × In | tepelné relé, tepelná spoušť spouštěče |
| výpadek fáze | ≈ 1,7 – 2 × In ve zbylých fázích | tepelné relé s citlivostí na výpadek fáze |

## Možná řešení

> [!karty]
> > [!ov] Pojistky + stykač + tepelné relé
> > Pojistky (gG/aM) chrání proti zkratu, tepelné relé **F2** proti přetížení. Kontakt **95–96** rozepne obvod cívky stykače.
>
> > [!ov] Motorový spouštěč
> > Jeden přístroj s **tepelnou** i **zkratovou** spouští. Nastavuje se otočným knoflíkem na In. Lze jím motor i ručně zapnout a vypnout.
>
> > [!ov] Jistič C / D
> > Jistí hlavně **vedení**. Na ochranu motoru proti přetížení nestačí – jistič se nedá nastavit přesně na In motoru.

## Tepelné relé

- tři bimetaly ohřívané proudem motoru
- kontakty **95–96** (rozpínací – do obvodu cívky) a **97–98** (spínací – signalizace poruchy)
- nastavuje se na **In motoru** (u Y–Δ ve větvi vinutí na **0,58 × In**)
- **třída vypínání** (10A, 10, 20, 30) = za kolik sekund nejvýš vypne při 7,2 × Ir – volí se podle délky rozběhu
- po vybavení musí bimetal vychladnout, pak jde resetovat (ručně / automaticky)

> [!warning] Proč tepelné relé nevypne zkrat
> Bimetal je pomalý – při zkratu by se zničil dřív, než by stihl zareagovat. Proto vždy **pojistky nebo jistič před ním**.

> [!pamatuj] Vypínací charakteristika
> Čím větší proud, tím rychleji ochrana vypne (**závislá** charakteristika). Studený motor snese přetížení déle než zahřátý. Vyzkoušej si to v [simulátoru](/simulator) – graf t = f(I) ukazuje, kde se pracovní bod motoru protne s charakteristikou ochrany.

## Interaktivně

- [Přímé spouštění se samodržením](/schemata/prime-spousteni-samodrzeni) – klikni na F2 a simuluj přetížení
- [Simulátor 3F motoru](/simulator) – přetížení, zablokování rotoru, výpadek fáze

## 🧠 Otestuj se

> [!question]- Na jakou hodnotu nastavíš tepelné relé?
> Na **jmenovitý proud motoru** ze štítku (u zapojení Y–Δ s relé ve větvi vinutí na 0,58 × In).

> [!question]- Které kontakty tepelného relé zapojíš do obvodu cívky stykače?
> Rozpínací **95–96**. Spínací 97–98 se používá pro signálku poruchy.

> [!question]- Proč tepelné relé nevypíná při rozběhu motoru, když proud je 6× In?
> Rozběh trvá jen pár sekund a bimetal se nestihne zahřát. Třída vypínání se volí tak, aby rozběh vydržel.

> [!question]- Co se stane s proudem ve zbylých fázích při výpadku jedné fáze?
> Vzroste (zhruba 1,7–2× In) a motor se přehřívá. Stojící motor se s jednou chybějící fází vůbec nerozběhne – jen bručí.
