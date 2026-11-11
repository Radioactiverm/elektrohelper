---
typ: téma
předmět: Odborný výcvik
nadřazené: "[[Odborný výcvik]]"
pořadí: 1
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - motor
---
> [!kostka] V kostce
> - Nejpoužívanější motor v průmyslu: **třífázový asynchronní motor s kotvou nakrátko**
> - Točivé magnetické pole statoru „táhne“ rotor – rotor se točí **o trochu pomaleji** než pole (skluz)
> - Při přímém rozběhu bere **5–8× jmenovitý proud**

## Jak funguje

Tři vinutí statoru posunutá o 120° napájená třífázovým proudem vytvoří **točivé magnetické pole**. To indukuje v tyčích rotoru (klec nakrátko) proud a ten s polem vytvoří moment. Rotor se nikdy nedotočí na rychlost pole – jinak by se nic neindukovalo. Proto **asynchronní**.

> [!vzorec] Synchronní otáčky a skluz
> $$n_s = \frac{60 \cdot f}{p} \qquad s = \frac{n_s - n}{n_s}$$
> $f$ … kmitočet (50 Hz), $p$ … počet pólových dvojic, $n$ … skutečné otáčky rotoru

| Pólové dvojice $p$ | 1 | 2 | 3 | 4 |
| --- | :-: | :-: | :-: | :-: |
| $n_s$ při 50 Hz [min⁻¹] | 3000 | 1500 | 1000 | 750 |
| typicky na štítku [min⁻¹] | ≈ 2900 | ≈ 1440 | ≈ 960 | ≈ 720 |

## Podtémata

1. [[Štítek a svorkovnice motoru]] – co znamenají údaje na štítku, zapojení do hvězdy a trojúhelníku
2. [[Ochrana motorů]] – tepelné relé, motorový spouštěč, pojistky

> [!tip] Simulátor
> V [simulátoru](/simulator) si můžeš motor rozběhnout, přetížit, zablokovat nebo mu odpojit fázi a sledovat proud, otáčky a reakci ochrany.

## 🧠 Otestuj se

> [!question]- Proč se asynchronní motor jmenuje asynchronní?
> Rotor se točí pomaleji než magnetické pole statoru (o skluz). Kdyby se točil stejně rychle, neindukoval by se v něm proud a nevznikl by moment.

> [!question]- Jaké jsou synchronní otáčky čtyřpólového motoru při 50 Hz?
> Čtyři póly = 2 pólové dvojice → $n_s = 60 \cdot 50 / 2 = 1500$ min⁻¹.

> [!question]- Kolikrát větší proud bere motor při přímém rozběhu?
> Zhruba **5× až 8×** jmenovitý proud.
