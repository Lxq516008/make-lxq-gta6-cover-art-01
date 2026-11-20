// Vice Cover Studio: a GTA 6-style multi-panel cover maker.
// Every photo is read on the user's own machine and drawn on a canvas;
// nothing is uploaded. The cover is drawn by drawCover, which the live
// preview and every PNG export share, so what you see is what you get.

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const SAMPLES = ['pier', 'boulevard'];
const PANEL_NAMES = { hero: ['Hero', 'Top side', 'Bottom side'], strip: ['Left', 'Middle', 'Right'], grid: ['Top left', 'Top right', 'Bottom left', 'Bottom right'], solo: ['Full cover'] };

// One panel's framing: which photo it shows, how far it is zoomed, and
// how far its centre is panned from the panel centre (fractions of panel size).
function freshPanel(photo) { return { photo, zoom: 1.15, dx: 0, dy: 0 }; }

const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: 'Sunset Heist',
  tagline: 'One last job under the neon sky',
  titleSize: 104,
  size: { w: 1920, h: 1080 },
  photos: [],          // { id, name, img }
  panels: {},          // layout -> panel[] ; kept per layout so switching keeps framing
  selected: 0,
};
for (const name of ['hero', 'strip', 'grid', 'solo']) state.panels[name] = [freshPanel(null)];
state.panels.hero = [freshPanel(null), freshPanel(null), freshPanel(null)];
state.panels.strip = [freshPanel(null), freshPanel(null), freshPanel(null)];
state.panels.grid = [freshPanel(null), freshPanel(null), freshPanel(null), freshPanel(null)];

function currentPanels() { return state.panels[state.layout]; }
function selectedPanel() { return currentPanels()[state.selected] || currentPanels()[0]; }

// Panel rectangles for a layout, as fractions of the cover (gap included).
function panelRects(layout) {
  const g = 0.012;
  if (layout === 'strip') return [
    { x: 0, y: 0, w: 1 / 3 - g, h: 1 },
    { x: 1 / 3 + g / 2, y: 0, w: 1 / 3 - g, h: 1 },
    { x: 2 / 3 + g, y: 0, w: 1 / 3 - g, h: 1 },
  ];
  if (layout === 'grid') return [
    { x: 0, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
    { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
    { x: 0, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
    { x: 0.5 + g / 2, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
  ];
  if (layout === 'solo') return [{ x: 0, y: 0, w: 1, h: 1 }];
  return [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.632, y: 0, w: 0.368, h: 0.485 },
    { x: 0.632, y: 0.515, w: 0.368, h: 0.485 },
  ];
}

const GRADE_FILTER = {
  sunset: 'saturate(1.32) contrast(1.07) sepia(0.16)',
  neon: 'saturate(1.7) contrast(1.12) hue-rotate(-14deg)',
  noir: 'grayscale(1) contrast(1.28) brightness(0.94)',
  clean: 'saturate(1.05) contrast(1.02)',
};

function drawPanelPhoto(c, rect, panel, W, H) {
  const px = rect.x * W, py = rect.y * H, pw = rect.w * W, ph = rect.h * H;
  c.save();
  c.beginPath(); c.rect(px, py, pw, ph); c.clip();
  const photo = state.photos[panel.photo];
  if (photo && photo.img && photo.img.naturalWidth) {
    const img = photo.img;
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const dw = img.naturalWidth * base * panel.zoom;
    const dh = img.naturalHeight * base * panel.zoom;
    c.filter = GRADE_FILTER[state.grade] || 'none';
    c.drawImage(img, px + pw / 2 - dw / 2 + panel.dx * pw, py + ph / 2 - dh / 2 + panel.dy * ph, dw, dh);
    c.filter = 'none';
  } else {
    const grad = c.createLinearGradient(px, py, px + pw, py + ph);
    grad.addColorStop(0, '#3b1550'); grad.addColorStop(1, '#160a24');
    c.fillStyle = grad; c.fillRect(px, py, pw, ph);
    c.fillStyle = 'rgba(245,239,230,0.55)';
    c.font = `600 ${Math.round(ph * 0.045)}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Add a photo', px + pw / 2, py + ph / 2);
  }
  c.restore();
  // Thin bright frame so the panels read as a poster grid.
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = Math.max(2, W * 0.002);
  c.strokeRect(px + c.lineWidth / 2, py + c.lineWidth / 2, pw - c.lineWidth, ph - c.lineWidth);
  c.restore();
}

function paintGradeWash(c, W, H) {
  c.save();
  if (state.grade === 'sunset') {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,122,24,0.10)');
    g.addColorStop(0.6, 'rgba(255,46,136,0.10)');
    g.addColorStop(1, 'rgba(255,46,136,0.26)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else if (state.grade === 'neon') {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(34,211,238,0.16)');
    g.addColorStop(1, 'rgba(255,46,136,0.22)');
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  } else if (state.grade === 'noir') {
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  c.restore();
}

function paintCaption(c, W, H) {
  const bandH = H * 0.24;
  const g = c.createLinearGradient(0, H - bandH * 1.5, 0, H);
  g.addColorStop(0, 'rgba(10,4,20,0)'); g.addColorStop(1, 'rgba(10,4,20,0.88)');
  c.fillStyle = g; c.fillRect(0, H - bandH * 1.5, W, bandH * 1.5);

  const pad = W * 0.035;
  const title = (state.caption || 'Untitled').toUpperCase();
  const size = Math.min(state.titleSize * (W / 1920), H * 0.16);
  c.save();
  c.textBaseline = 'alphabetic';
  c.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  try { c.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter spacing */ }
  const ty = H - H * 0.055;
  const grad = c.createLinearGradient(0, ty - size, 0, ty);
  grad.addColorStop(0, '#ffe9a8'); grad.addColorStop(0.45, '#ff7a18'); grad.addColorStop(1, '#ff2e88');
  c.lineJoin = 'round';
  c.strokeStyle = '#14081f'; c.lineWidth = size * 0.14;
  c.strokeText(title, pad, ty);
  c.fillStyle = grad; c.fillText(title, pad, ty);
  // Tagline under the title, in a clean sans with a pink rule.
  const tagSize = Math.max(16, size * 0.22);
  c.font = `700 ${tagSize}px system-ui, sans-serif`;
  c.fillStyle = '#f5efe6';
  c.fillText(state.tagline || '', pad, H - H * 0.018);
  // Small studio pill, top left — our own mark, not a game logo.
  const pill = 'VICE COVER STUDIO';
  c.font = `700 ${Math.max(14, W * 0.011)}px system-ui, sans-serif`;
  const tw = c.measureText(pill).width;
  c.fillStyle = 'rgba(10,4,20,0.72)';
  c.beginPath(); c.roundRect(pad, H * 0.03, tw + 28, Math.max(26, W * 0.02), 999); c.fill();
  c.fillStyle = '#ffd166'; c.textBaseline = 'middle';
  c.fillText(pill, pad + 14, H * 0.03 + Math.max(26, W * 0.02) / 2);
  c.restore();
}

// The one drawing routine: preview and exports all call it.
function drawCover(c, W, H) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#12081d'; c.fillRect(0, 0, W, H);
  const rects = panelRects(state.layout);
  currentPanels().forEach((panel, i) => { if (rects[i]) drawPanelPhoto(c, rects[i], panel, W, H); });
  paintGradeWash(c, W, H);
  paintCaption(c, W, H);
  // Selected-panel outline, preview only: never in an export, and never in
  // a cover-only screenshot scene (the cover must look like a finished poster).
  if (c === ctx && !document.body.classList.contains('shot-cover') && rects[state.selected]) {
    const r = rects[state.selected];
    c.save();
    c.strokeStyle = '#22d3ee'; c.lineWidth = 4; c.setLineDash([14, 8]);
    c.strokeRect(r.x * W + 2, r.y * H + 2, r.w * W - 4, r.h * H - 4);
    c.restore();
  }
}

function renderPreview() {
  canvas.width = state.size.w; canvas.height = state.size.h;
  drawCover(ctx, state.size.w, state.size.h);
  $('sizeLabel').textContent = `${state.size.w} × ${state.size.h}`;
  const names = PANEL_NAMES[state.layout];
  $('selectedLabel').textContent = names[state.selected] || names[0];
}

function addPhoto(img, name) {
  const id = state.photos.length;
  state.photos.push({ id, name, img });
  // Fill the first empty panel, then the selected one.
  let placed = false;
  for (const layout of Object.keys(state.panels)) {
    for (const p of state.panels[layout]) if (p.photo === null) { p.photo = id; placed = true; break; }
    if (placed) break;
  }
  if (!placed) selectedPanel().photo = id;
  renderThumbs(); renderPreview();
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadSamplePhoto(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `samples/${name}.jpg`;
  });
}

function renderThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  state.photos.forEach((p) => {
    const el = document.createElement('img');
    el.src = p.img.src; el.alt = p.name; el.title = p.name;
    if (selectedPanel().photo === p.id) el.classList.add('assigned');
    el.addEventListener('click', () => { assignPhotoToPanel(p.id); });
    box.appendChild(el);
  });
  $('photoCount').textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — click one to put it in the selected panel.`
    : 'No photo loaded yet — pick a sample to start.';
}

function assignPhotoToPanel(id) {
  selectedPanel().photo = id;
  renderThumbs(); renderPreview();
}

async function exportCoverPng(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const c = off.getContext('2d');
  await document.fonts.ready;
  drawCover(c, w, h);
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  if (!blob) throw new Error('export failed');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `vice-cover-${w}x${h}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  $('status').textContent = `Exported ${w} × ${h} PNG (${Math.round(blob.size / 1024)} KiB).`;
  return blob.size;
}

// ---- wiring: controls -------------------------------------------------
$('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files || []) {
    try { addPhoto(await loadImageFile(file), file.name); } catch { $('status').textContent = `Could not read ${file.name}.`; }
  }
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try { addPhoto(await loadSamplePhoto(btn.dataset.sample), `${btn.dataset.sample}.jpg`); }
    catch { $('status').textContent = `Sample ${btn.dataset.sample} failed to load.`; }
  });
});

function bindRow(id, key, onPick) {
  $(id).querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      $(id).querySelectorAll('button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      state[key] = btn.dataset[key];
      if (key === 'layout') state.selected = 0;
      onPick && onPick();
      renderPreview();
    });
  });
}
bindRow('layoutRow', 'layout');
bindRow('gradeRow', 'grade');

$('caption').addEventListener('input', (e) => { state.caption = e.target.value; renderPreview(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; renderPreview(); });
$('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); renderPreview(); });
$('zoom').addEventListener('input', (e) => { selectedPanel().zoom = Number(e.target.value); renderPreview(); });
$('resetPanel').addEventListener('click', () => {
  Object.assign(selectedPanel(), freshPanel(selectedPanel().photo));
  $('zoom').value = '1.15'; renderPreview();
});
$('sizeSelect').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  state.size = { w, h }; renderPreview();
});
$('exportWide').addEventListener('click', () => exportCoverPng(1920, 1080).catch((e) => { $('status').textContent = e.message; }));
$('exportPortrait').addEventListener('click', () => exportCoverPng(1080, 1350).catch((e) => { $('status').textContent = e.message; }));
$('exportSquare').addEventListener('click', () => exportCoverPng(1080, 1080).catch((e) => { $('status').textContent = e.message; }));

// ---- wiring: canvas pan / zoom / panel picking ------------------------
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const fx = (clientX - r.left) / r.width, fy = (clientY - r.top) / r.height;
  const rects = panelRects(state.layout);
  for (let i = 0; i < rects.length; i++) {
    const q = rects[i];
    if (fx >= q.x && fx <= q.x + q.w && fy >= q.y && fy <= q.y + q.h) return i;
  }
  return 0;
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  state.selected = panelAt(e.clientX, e.clientY);
  $('zoom').value = String(selectedPanel().zoom);
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  renderThumbs(); renderPreview();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const p = selectedPanel();
  p.dx += (e.clientX - drag.x) / r.width;
  p.dy += (e.clientY - drag.y) / r.height;
  p.dx = Math.max(-0.6, Math.min(0.6, p.dx));
  p.dy = Math.max(-0.6, Math.min(0.6, p.dy));
  drag = { x: e.clientX, y: e.clientY };
  renderPreview();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = selectedPanel();
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  $('zoom').value = String(p.zoom);
  renderPreview();
}, { passive: false });

const dropZone = $('dropZone');
['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => e.preventDefault()));
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  for (const file of e.dataTransfer.files || []) {
    if (!file.type.startsWith('image/')) continue;
    try { addPhoto(await loadImageFile(file), file.name); } catch { /* skip unreadable file */ }
  }
});

// ---- deterministic screenshot scenes ----------------------------------
async function runShotScene(shot, query) {
  const photo = SAMPLES.includes(query.get('photo')) ? query.get('photo') : 'pier';
  const caption = query.get('caption') || 'Sunset Heist';
  const size = query.get('size') || '1920x1080';
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  state.caption = caption;
  state.tagline = query.get('tagline') || state.tagline;
  if (['hero', 'strip', 'grid', 'solo'].includes(layout)) state.layout = layout;
  if (['sunset', 'neon', 'noir', 'clean'].includes(grade)) state.grade = grade;
  const [w, h] = size.split('x').map(Number);
  if (w && h) { state.size = { w, h }; $('sizeSelect').value = `${w}x${h}`; }
  $('caption').value = state.caption;
  document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  // Load the same sample into every panel so each layout reads as a full cover.
  const img = await loadSamplePhoto(photo);
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  const img2 = await loadSamplePhoto(other);
  state.photos = [{ id: 0, name: `${photo}.jpg`, img }, { id: 1, name: `${other}.jpg`, img: img2 }];
  for (const key of Object.keys(state.panels)) {
    state.panels[key] = state.panels[key].map((p, i) => ({ ...p, photo: i % 2 === 0 ? 0 : 1 }));
  }
  state.selected = 0;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await document.fonts.ready;
  renderThumbs(); renderPreview();
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  window.__shotReady = true;
}

// ---- boot ---------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot === 'cover' || shot === 'editor') {
  runShotScene(shot, params).catch(() => { window.__shotReady = true; });
} else {
  renderPreview();
  loadSamplePhoto('pier').then((img) => addPhoto(img, 'pier.jpg')).catch(() => {});
}
