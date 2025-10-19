// Normalize folder and file names before upload
function normalizePathSegment(name, { isFolder = false } = {}) {
  // 1) Decode any existing encoding
  try { name = decodeURIComponent(name); } catch (_) {}

  // 2) Trim invisible characters
  name = name.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // 3) Prevent directory traversal and control chars
  name = name.replace(/[\r\n\t\0]/g, '');

  // 4) Replace path separators in file names (but allow for folders built by UI)
  if (!isFolder) {
    name = name.replace(/[\\/]+/g, '_');
  } else {
    // For folders, collapse multiple slashes
    name = name.replace(/[\\/]+/g, '/');
  }

  // 5) Disallow reserved characters that break URLs
  name = name.replace(/[?#%]/g, '_');

  // 6) Optional: trim very long segments
  if (name.length > 180) name = name.slice(0, 180);

  return name;
}

// Wrap existing upload calls
async function safeUploadFile(targetFolder, file) {
  const cleanFolder = normalizePathSegment(targetFolder || '', { isFolder: true }).replace(/^\/+|\/+$/g, '');
  const cleanName = normalizePathSegment(file.name, { isFolder: false });

  // Compose final key
  const finalPath = cleanFolder ? `${cleanFolder}/${cleanName}` : cleanName;

  // Use encodeURIComponent on each segment only when composing URL
  const url = `${WORKER_URL}/api/upload/${encodeURIComponent(cleanFolder)}/${encodeURIComponent(cleanName)}`.replace(/\/+$|^.*\/undefined\//g, (m)=>'');

  await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  return finalPath;
}

// Integrate into existing handlers
(function patchUploadHandlers(){
  const fileInput = document.getElementById('fileInput');
  if (!fileInput) return;

  // Replace change handler if present
  const orig = fileInput.onchange;
  fileInput.addEventListener('change', async function(e){
    const files = Array.from(this.files || []);
    if (!files.length) return;
    if (!currentFolder) { showToast('Please select a folder first', 'error'); return; }

    const bar = document.getElementById('uploadProgressBar');
    const fill = document.getElementById('uploadProgressFill');
    const text = document.getElementById('uploadProgressText');
    bar.classList.add('active'); text.classList.add('active');

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        text.textContent = `Uploading ${i+1} / ${files.length}: ${f.name}`;
        fill.style.width = `${(i / files.length) * 100}%`;
        await safeUploadFile(currentFolder, f);
      }
      fill.style.width = '100%';
      text.textContent = '✓ Upload complete!';
      setTimeout(()=>{ bar.classList.remove('active'); text.classList.remove('active'); fill.style.width = '0%'; }, 1500);
      showToast(`✓ Uploaded ${files.length} file(s)`, 'success');
      loadStorageStats();
      loadGallery(currentFolder);
      this.value = '';
    } catch(err) {
      console.error(err);
      bar.classList.remove('active'); text.classList.remove('active'); fill.style.width = '0%';
      showToast('Upload failed', 'error');
    }
  }, { capture: true });
})();
