---
typ: podtéma
předmět: Odborný výcvik
nadřazené: "[[Stykačové ovládání]]"
pořadí: 3
cssclasses:
  - ov
tags:
  - odborný-výcvik
  - stykače
  - motor
---
> [!kostka] V kostce
> - Smysl otáčení změníš **prohozením dvou fází**
> - Dva stykače: **KM1 vpravo**, **KM2 vlevo**
> - Stykače se musí **navzájem blokovat** – jinak vznikne **mezifázový zkrat**

## Princip

Prohozením libovolných dvou fází se otočí sled fází, tím i smysl točivého magnetického pole a motor se roztočí na druhou stranu. Ve schématu KM1 připojuje fáze rovně (L1 L2 L3), KM2 prohozeně (L3 L2 L1).

## Blokování

| Blokování | Jak |
| --- | --- |
| **elektrické** (kontaktové) | rozpínací kontakt **KM2 21–22** v obvodu cívky KM1 a **KM1 21–22** v obvodu KM2 |
| **mechanické** | blokovací díl mezi stykači – oba nejdou přitáhnout současně |
| **tlačítkové** | kombinovaná tlačítka: S1 má spínací kontakt pro KM1 a rozpínací v obvodu KM2 |

> [!danger] Bez blokování
> Když sepnou oba stykače, spojí se L1 a L3 přes hlavní kontakty → **zkrat**. Vyzkoušej si [reverzaci bez blokování](/schemata/reverzace-bez-blokovani) – bezpečně, jen na obrazovce.

## Reverzace přes Stop × za chodu

- **přes Stop**: z jednoho směru do druhého se přepíná až po stisku S0 – běžné zapojení, šetří motor i stykače
- **za chodu**: stisk opačného tlačítka rovnou přepne směr (kombinovaná tlačítka) – velký proudový náraz, stykače kategorie **AC-4**

→ [Interaktivní schéma: reverzace s blokováním](/schemata/reverzace-s-blokovanim)

## 🧠 Otestuj se

> [!question]- Kolik fází musíš prohodit, aby se motor točil opačně?
> **Dvě** (libovolné). Prohození všech tří by sled fází nezměnilo.

> [!question]- Který kontakt KM2 zapojíš do obvodu cívky KM1 a proč?
> Rozpínací **21–22**. Když je KM2 sepnutý, kontakt je rozepnutý a KM1 nejde zapnout.

> [!question]- Co by se stalo, kdyby oba stykače sepnuly současně?
> Mezifázový **zkrat** (např. L1–L3) přes hlavní kontakty – vybaví jistič/pojistky, hrozí svaření kontaktů.
