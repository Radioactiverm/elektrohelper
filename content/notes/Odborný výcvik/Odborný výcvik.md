---
typ: předmět
pořadí: 0
cssclasses:
  - ov
tags:
  - odborný-výcvik
---
> [!ov] Odborný výcvik
> Praktické zapojování v dílně: stykačové ovládání motorů, ochrana motorů a domovní elektroinstalace.

## 🌳 Strom témat

```mermaid
flowchart LR
    OV((Odborný výcvik)) --> M[Asynchronní motor]
    OV --> S[Stykačové ovládání]
    OV --> D[Domovní instalace]
    M --> M1[Štítek a svorkovnice motoru]
    M --> M2[Ochrana motorů]
    S --> S1[Stykač a pomocné kontakty]
    S --> S2[Tlačítka a samodržení]
    S --> S3[Reverzace motoru]
    S --> S4[Spouštění hvězda–trojúhelník]
    D --> D1[Řazení vypínačů]
    class M,S,D,M1,M2,S1,S2,S3,S4,D1 internal-link
```

## 📚 Co se učit (v tomhle pořadí)

> [!karty]
> > [!ov] 1 · [[Asynchronní motor]]
> > Štítek a svorkovnice → Ochrana motorů
>
> > [!ov] 2 · [[Stykačové ovládání]]
> > Stykač → Tlačítka a samodržení → Reverzace → Hvězda–trojúhelník
>
> > [!ov] 3 · [[Domovní instalace]]
> > Řazení vypínačů 1, 5, 6, 7

## 🔧 Vyzkoušej si to

- [Interaktivní schémata](/schemata) – mačkej tlačítka a sleduj, kudy teče proud
- [Simulátor 3F motoru](/simulator) – rozběh, přetížení, výpadek fáze a vybavení ochran v grafech

> [!pamatuj] Bezpečnost v dílně
> Zapojuje se **vždy bez napětí**. Před zapnutím zkontroluje zapojení **učitel / mistr**. Pět pravidel pro práci bez napětí: **vypnout – zajistit proti zapnutí – ověřit, že není napětí – uzemnit a zkratovat – zakrýt sousední živé části**.
