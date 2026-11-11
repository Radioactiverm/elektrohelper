// Nahrávání souborů přetažením nebo výběrem.
import { snackbar } from '/js/app.js';
import { csrf } from './admin.js';

const zone = document.querySelector('[data-upload]');
const picker = document.querySelector('[data-upload-input]');
const status = document.querySelector('[data-upload-status]');

async function upload(files) {
  let ok = 0;
  for (const file of files) {
    const row = document.createElement('div');
    row.className = 'upload-row';
    row.textContent = `${file.name} – nahrávám…`;
    status.append(row);
    if (file.size > 5 * 1024 * 1024) {
      row.textContent = `${file.name} – příliš velký (max. 5 MB)`;
      row.classList.add('error');
      continue;
    }
    try {
      const res = await fetch('/admin/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(file.name),
          'x-csrf-token': csrf,
        },
        body: file,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      row.textContent = `${json.name} – hotovo, vložíš ho jako ${json.embed}`;
      row.classList.add('done');
      ok++;
    } catch (err) {
      row.textContent = `${file.name} – chyba: ${err.message}`;
      row.classList.add('error');
    }
  }
  if (ok) {
    snackbar(`Nahráno ${ok} ${ok === 1 ? 'soubor' : ok < 5 ? 'soubory' : 'souborů'}`, 'cloud_done');
    setTimeout(() => location.reload(), 1200);
  }
}

if (zone) {
  ['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => {
    e.preventDefault();
    zone.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
  }));
  zone.addEventListener('drop', (e) => upload([...e.dataTransfer.files]));
  picker?.addEventListener('change', () => { upload([...picker.files]); picker.value = ''; });
}
