---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Asynchronní motor]]"
pořadí: 1
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - motor
---
> [!kostka] V kostce
> - Výkon na štítku je **mechanický výkon na hřídeli**, ne příkon
> - **230/400 V Δ/Y** → do sítě 3×400 V zapojíme **do hvězdy**
> - **400/690 V Δ/Y** → do sítě 3×400 V zapojíme **do trojúhelníku** (jde spouštět Y–Δ)

## Údaje na štítku

| Údaj | Význam |
| --- | --- |
| $P_n$ [kW] | jmenovitý **mechanický** výkon na hřídeli |
| $U_n$ [V] | napětí pro zapojení Δ / Y |
| $I_n$ [A] | jmenovitý proud pro Δ / Y |
| $\cos\varphi$ | účiník při jmenovitém zatížení |
| $n$ [min⁻¹] | jmenovité otáčky |
| IP 55 | krytí (prach / voda) |
| Iso. Cl. F | třída izolace (max. teplota vinutí) |
| IE3 | třída účinnosti |
| S1 | druh zatížení (S1 = trvalý chod) |

> [!vzorec] Jmenovitý proud motoru
> $$I_n = \frac{P_n}{\sqrt{3} \cdot U \cdot \cos\varphi \cdot \eta}$$

> [!priklad] Příklad
> Motor 5,5 kW, 400 V, cos φ = 0,85, η = 0,88:
> $$I_n = \frac{5500}{1{,}732 \cdot 400 \cdot 0{,}85 \cdot 0{,}88} \approx 10{,}6\ \text{A}$$

## Svorkovnice

Začátky vinutí jsou **U1, V1, W1**, konce **U2, V2, W2**. Spodní řada svorek je proti horní **posunutá** (W2 U2 V2), aby šly propojky dělat rovně.

```
 hvězda (Y)            trojúhelník (Δ)
 U1   V1   W1          U1   V1   W1
                        |    |    |
 W2 ─ U2 ─ V2          W2   U2   V2
```

- **Hvězda:** jedna vodorovná propojka spojí W2–U2–V2 (konce vinutí) do **uzlu**.
- **Trojúhelník:** tři svislé propojky U1–W2, V1–U2, W1–V2.

> [!pamatuj] Napětí na vinutí
> Ve hvězdě je na každém vinutí **fázové napětí** $U_f = U / \sqrt{3}$ (230 V), v trojúhelníku **sdružené** napětí (400 V).

> [!warning] Pozor na záměnu
> Motor 230/400 V zapojený do trojúhelníku na síť 400 V dostane na vinutí 400 V místo 230 V – **shoří**.

## Změna smyslu otáčení

Stačí **prohodit dvě libovolné fáze** – viz [[Reverzace motoru]].

## 🧠 Otestuj se

> [!question]- Motor má na štítku 230/400 V Δ/Y. Jak ho zapojíš do sítě 3×400 V?
> **Do hvězdy** – na každém vinutí pak bude 230 V.

> [!question]- Je výkon na štítku motoru příkon, nebo výkon?
> Mechanický **výkon na hřídeli**. Příkon je větší o ztráty: $P_1 = P_n / \eta$.

> [!question]- Které svorky propojíš pro zapojení do trojúhelníku?
> U1–W2, V1–U2, W1–V2 (tři svislé propojky).

> [!question]- Spočítej In motoru 4 kW, 400 V, cos φ 0,82, η 0,86.
> $I_n = 4000 / (1{,}732 \cdot 400 \cdot 0{,}82 \cdot 0{,}86) \approx 8{,}2$ A.
