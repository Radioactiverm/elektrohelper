// Předměty (nejvyšší úroveň znalostní báze). `key` odpovídá třídě barvy v CSS.
export const SUBJECTS = [
  {
    name: 'Odborný výcvik',
    key: 'ov',
    icon: 'construction',
    tagline: 'Praktické zapojování: stykače, motory, domovní instalace',
  },
];

export function subjectMeta(name) {
  return SUBJECTS.find((s) => s.name === name)
    || { name, key: 'other', icon: 'folder', tagline: '' };
}

export const KINDS = ['předmět', 'téma', 'podtéma', 'příklady'];
