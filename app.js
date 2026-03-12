/* ══════════════════════════════════════════════════════════
   BATCH WATERMARK PRO — app.js
   All logic: upload, validation, canvas preview,
   drag-to-position, sliders, batch apply, ZIP download
   ══════════════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ─────────────────────────────────────────────── */
const state = {
  images: [],           // Array of { file, img } — all uploaded images
  watermarks: [],       // Array of { file, img } — 1-2 watermarks
  activeWmIdx: 0,       // Which watermark is selected

  // Watermark transforms - one for each uploaded watermark
  wms: [],

  // Drag state
  drag: {
    active: false,
    startX: 0, startY: 0,
    startWmX: 0, startWmY: 0,
  },
  batchCount: 0,
};

/* Constants */
const MAX_IMAGES = 300;
const MAX_WATERMARKS = 2;

/* ─── DOM SHORTCUTS ─────────────────────────────────────── */
const $ = id => document.getElementById(id);

const stageUpload = $('stage-upload');
const stagePreview = $('stage-preview');
const dropImages = $('drop-images');
const dropWatermark = $('drop-watermark');
const inputImages = $('input-images');
const inputWm = $('input-watermark');
const badgeImages = $('badge-images');
const badgeWm = $('badge-watermark');
const btnProceed = $('btn-proceed');
const btnResetUpload = $('btn-reset-upload');
const btnBack = $('btn-back');
const btnReset = $('btn-reset');
const btnDownload = $('btn-download');
const canvas = $('preview-canvas');
const ctx = canvas.getContext('2d');
const posDisplay = $('position-display');
const sliderSize = $('slider-size');
const sliderRot = $('slider-rotation');
const sliderOpacity = $('slider-opacity');
const labelSize = $('label-size');
const labelRot = $('label-rotation');
const labelOpacity = $('label-opacity');
const wmThumb = $('wm-thumb');
const imgThumb = $('img-thumb');
const badgeWmCount = $('badge-wm-count');
const badgeImgCount = $('badge-img-count');
const wmToggle = $('wm-toggle');
const downloadCount = $('download-count');
const progressOverlay = $('progress-overlay');
const progressText = $('progress-text');
const progressFill = $('progress-bar-fill');
const progressSub = $('progress-sub');
const stepPills = document.querySelectorAll('.step-pill');
const toastEl = $('toast');
const toastMsg = $('toast-msg');
const wmHistoryContainer = $('wm-history-container');
const wmHistoryList = $('wm-history-list');
const btnClearHistory = $('btn-clear-history');

/* ─── TOAST ─────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = 'error') {
  toastEl.className = 'toast ' + type;
  toastMsg.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4000);
}

/* ─── WATERMARK HISTORY ─────────────────────────────────── */
function loadWmHistory() {
  const history = JSON.parse(localStorage.getItem('wmHistory') || '[]');
  if (history.length === 0) {
    wmHistoryContainer.style.display = 'none';
    return;
  }
  wmHistoryContainer.style.display = 'block';
  wmHistoryList.innerHTML = '';
  history.forEach(dataUrl => {
    const item = document.createElement('div');
    item.className = 'wm-history-item';
    const img = document.createElement('img');
    img.src = dataUrl;
    item.appendChild(img);
    item.addEventListener('click', async () => {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "history_wm.png", { type: blob.type });
        handleWatermarkFiles([file]);
      } catch (e) {
        showToast("Could not load history item.");
      }
    });
    wmHistoryList.appendChild(item);
  });
}

function saveToWmHistory(file) {
  const reader = new FileReader();
  reader.onload = e => {
    let history = JSON.parse(localStorage.getItem('wmHistory') || '[]');
    const dataUrl = e.target.result;
    history = history.filter(url => url !== dataUrl);
    history.unshift(dataUrl);
    history = history.slice(0, 5); // Keep last 5
    localStorage.setItem('wmHistory', JSON.stringify(history));
    loadWmHistory();
  };
  reader.readAsDataURL(file);
}

if (btnClearHistory) {
  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem('wmHistory');
    loadWmHistory();
  });
}

// Initial load
loadWmHistory();

/* ─── IMAGE LOADER ──────────────────────────────────────── */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ file, img, url });
    img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
    img.src = url;
  });
}

/* ─── UPLOAD — IMAGES ───────────────────────────────────── */
async function handleImageFiles(files) {
  const arr = Array.from(files);
  if (!arr.length) return;

  // Enforce max 300 total
  const room = MAX_IMAGES - state.images.length;
  if (room <= 0) {
    showToast(`Already at maximum ${MAX_IMAGES} images.`);
    return;
  }
  const toAdd = arr.slice(0, room);
  if (arr.length > room) {
    showToast(`Only ${room} more image(s) can be added (max ${MAX_IMAGES}).`);
  }

  // Load images
  let loaded;
  try {
    loaded = await Promise.all(toAdd.filter(f => f.type.startsWith('image/')).map(loadImage));
  } catch (e) {
    showToast('Some images could not be loaded.');
    return;
  }

  // Dimension validation — all must be landscape format (W > H)
  for (const entry of loaded) {
    const w = entry.img.naturalWidth;
    const h = entry.img.naturalHeight;

    if (h >= w) {
      // Revoke blob URLs for rejected images
      loaded.forEach(e => URL.revokeObjectURL(e.url));
      showToast(
        `All images must be landscape format.\nPortrait or square image detected: "${entry.file.name}".`
      );
      return;
    }
  }

  state.images.push(...loaded);
  updateImageUI();
}

function updateImageUI() {
  const count = state.images.length;
  badgeImages.textContent = `[${count}]`;
  badgeImages.classList.toggle('show', count > 0);
  dropImages.classList.toggle('has-files', count > 0);
  checkProceed();
}

/* ─── UPLOAD — WATERMARKS ───────────────────────────────── */
async function handleWatermarkFiles(files) {
  const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, MAX_WATERMARKS);
  if (!arr.length) return;

  let loaded;
  try {
    loaded = await Promise.all(arr.map(loadImage));
  } catch (e) {
    showToast('Watermark image could not be loaded.');
    return;
  }

  // Rather than resetting, we append to the existing array up to MAX_WATERMARKS
  const remainingSlots = MAX_WATERMARKS - state.watermarks.length;
  if (remainingSlots <= 0) {
    showToast(`You can only upload up to ${MAX_WATERMARKS} watermarks.`);
    return;
  }

  const toAdd = loaded.slice(0, remainingSlots);
  state.watermarks.push(...toAdd);
  toAdd.forEach((entry) => {
    state.wms.push({ xRatio: null, yRatio: null, sizeRatio: 0.20, opacity: 0.80, rotation: 0 });
    saveToWmHistory(entry.file);
  });
  state.activeWmIdx = state.watermarks.length - 1; // set newly added as active
  updateWatermarkUI();
}

function updateWatermarkUI() {
  const count = state.watermarks.length;
  badgeWm.textContent = `[${count}]`;
  badgeWm.classList.toggle('show', count > 0);
  dropWatermark.classList.toggle('has-files', count > 0);
  checkProceed();
}

/* ─── PROCEED CHECK ─────────────────────────────────────── */
function checkProceed() {
  const hasImages = state.images.length > 0;
  const hasWm = state.watermarks.length > 0;

  btnProceed.disabled = !(hasImages && hasWm);

  if (hasImages || hasWm) {
    btnResetUpload.style.display = 'flex';
  } else {
    btnResetUpload.style.display = 'none';
  }
}

/* ─── GO TO PREVIEW ─────────────────────────────────────── */
function goToPreview() {
  stageUpload.classList.add('hidden');
  stagePreview.classList.remove('hidden');

  // Step pills
  stepPills.forEach((p, i) => p.classList.toggle('active', i === 1 || i === 2));

  // Populate info cards
  badgeImgCount.textContent = `[${state.images.length}]`;
  badgeWmCount.textContent = `[${state.watermarks.length}]`;
  imgThumb.src = state.images[0].url;
  wmThumb.src = state.watermarks[0].url;
  downloadCount.textContent = `${state.images.length}`;

  // Watermark toggle buttons
  wmToggle.innerHTML = '';
  if (state.watermarks.length > 1) {
    state.watermarks.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'wm-toggle-btn' + (i === 0 ? ' active' : '');
      btn.textContent = `Watermark ${i + 1}`;
      btn.dataset.idx = i;
      btn.addEventListener('click', () => {
        state.activeWmIdx = +btn.dataset.idx;
        wmThumb.src = state.watermarks[state.activeWmIdx].url;
        document.querySelectorAll('.wm-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        syncSliders();
        redraw();
      });
      wmToggle.appendChild(btn);
    });
  }

  initCanvas();
  syncSliders();
  redraw();
}

/* ─── CANVAS SETUP ──────────────────────────────────────── */
function initCanvas() {
  const baseImg = state.images[0].img;
  const maxW = canvas.parentElement.clientWidth;
  const scale = Math.min(1, maxW / baseImg.naturalWidth);
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  canvas.style.width = Math.round(baseImg.naturalWidth * scale) + 'px';
  canvas.style.height = Math.round(baseImg.naturalHeight * scale) + 'px';
}

/* ─── CANVAS REDRAW ─────────────────────────────────────── */
function redraw() {
  if (!state.images.length || !state.watermarks.length) return;

  const base = state.images[0].img;
  const wm = state.watermarks[state.activeWmIdx].img;
  const cw = canvas.width;
  const ch = canvas.height;

  // ── Draw base image ──
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(base, 0, 0, cw, ch);

  // ── Draw all watermarks ──
  state.watermarks.forEach((wmImgObj, i) => {
    const wm = wmImgObj.img;
    const wmState = state.wms[i];

    // Default position: bottom-right, no inset (if null)
    if (wmState.xRatio === null) {
      const wmW = cw * wmState.sizeRatio;
      const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);
      wmState.xRatio = 1 - (wmW / cw);  // flush to the right edge
      wmState.yRatio = 1 - (wmH / ch);  // flush to the bottom edge
    }

    const wmW = cw * wmState.sizeRatio;
    const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);
    const cx = wmState.xRatio * cw + wmW / 2;
    const cy = wmState.yRatio * ch + wmH / 2;

    ctx.save();
    ctx.globalAlpha = wmState.opacity;
    ctx.translate(cx, cy);
    ctx.rotate((wmState.rotation * Math.PI) / 180);
    // Highlight the active watermark slightly if multiple exist
    if (state.watermarks.length > 1 && i === state.activeWmIdx) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 10;
    }
    ctx.drawImage(wm, -wmW / 2, -wmH / 2, wmW, wmH);
    ctx.restore();
  });

  // Update position label for active watermark
  const activeWmState = state.wms[state.activeWmIdx];
  if (activeWmState && activeWmState.xRatio !== null) {
    posDisplay.textContent = `X: ${Math.round(activeWmState.xRatio * 100)}%  Y: ${Math.round(activeWmState.yRatio * 100)}%`;
    posDisplay.classList.add('has-pos');
  }
}

/* ─── CANVAS → SCREEN COORDS ────────────────────────────── */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

/* ─── WATERMARK HIT TEST ────────────────────────────────── */
function isInsideWatermark(px, py) {
  if (!state.watermarks.length) return false;
  const wm = state.watermarks[state.activeWmIdx].img;
  const wmState = state.wms[state.activeWmIdx];
  const cw = canvas.width;
  const ch = canvas.height;
  const wmW = cw * wmState.sizeRatio;
  const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);
  const cx = wmState.xRatio * cw + wmW / 2;
  const cy = wmState.yRatio * ch + wmH / 2;

  // Rotate point back relative to watermark center
  const angle = -(wmState.rotation * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

  return rx >= -wmW / 2 && rx <= wmW / 2 && ry >= -wmH / 2 && ry <= wmH / 2;
}

/* ─── DRAG HANDLERS ─────────────────────────────────────── */
function onPointerDown(e) {
  const pt = canvasPoint(e);
  if (!isInsideWatermark(pt.x, pt.y)) return;
  e.preventDefault();

  state.drag.active = true;
  state.drag.startX = pt.x;
  state.drag.startY = pt.y;

  const wm = state.watermarks[state.activeWmIdx].img;
  const wmState = state.wms[state.activeWmIdx];
  const cw = canvas.width;
  const ch = canvas.height;
  const wmW = cw * wmState.sizeRatio;
  const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);
  state.drag.startWmX = wmState.xRatio * cw + wmW / 2;
  state.drag.startWmY = wmState.yRatio * ch + wmH / 2;

  canvas.style.cursor = 'grabbing';
}

function onPointerMove(e) {
  if (!state.drag.active) {
    // Update cursor based on hover
    const pt = canvasPoint(e);
    canvas.style.cursor = isInsideWatermark(pt.x, pt.y) ? 'grab' : 'crosshair';
    return;
  }
  e.preventDefault();

  const pt = canvasPoint(e);
  const wm = state.watermarks[state.activeWmIdx].img;
  const wmState = state.wms[state.activeWmIdx];
  const cw = canvas.width;
  const ch = canvas.height;
  const wmW = cw * wmState.sizeRatio;
  const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);

  const newCx = state.drag.startWmX + (pt.x - state.drag.startX);
  const newCy = state.drag.startWmY + (pt.y - state.drag.startY);

  // Clamp so watermark's center stays inside canvas
  const halfW = wmW / 2;
  const halfH = wmH / 2;
  const clampedCx = Math.max(0, Math.min(cw, newCx));
  const clampedCy = Math.max(0, Math.min(ch, newCy));

  wmState.xRatio = (clampedCx - halfW) / cw;
  wmState.yRatio = (clampedCy - halfH) / ch;

  redraw();
}

function onPointerUp(e) {
  if (!state.drag.active) return;
  state.drag.active = false;
  canvas.style.cursor = 'crosshair';
}

/* ─── SLIDER SYNC ───────────────────────────────────────── */
function syncSliders() {
  if (!state.wms.length) return;
  const wmState = state.wms[state.activeWmIdx];
  sliderSize.value = Math.round(wmState.sizeRatio * 100);
  sliderRot.value = wmState.rotation;
  sliderOpacity.value = Math.round(wmState.opacity * 100);
  updateSliderLabels();
  updateSliderFills();
}

function updateSliderLabels() {
  labelSize.textContent = sliderSize.value + '%';
  labelRot.textContent = sliderRot.value + '°';
  labelOpacity.textContent = sliderOpacity.value + '%';
}

function updateSliderFills() {
  setSliderFill(sliderSize, sliderSize.min, sliderSize.max);
  setSliderFill(sliderRot, sliderRot.min, sliderRot.max);
  setSliderFill(sliderOpacity, sliderOpacity.min, sliderOpacity.max);
}

function setSliderFill(el, min, max) {
  const pct = ((el.value - min) / (max - min)) * 100;
  el.style.setProperty('--val', pct + '%');
}

/* ─── SLIDER EVENTS ─────────────────────────────────────── */
sliderSize.addEventListener('input', () => {
  if (!state.wms.length) return;
  const wmState = state.wms[state.activeWmIdx];
  wmState.sizeRatio = sliderSize.value / 100;
  // Reset position to avoid overflow when size grows
  wmState.xRatio = null;
  wmState.yRatio = null;
  updateSliderLabels(); updateSliderFills(); redraw();
});
sliderRot.addEventListener('input', () => {
  if (!state.wms.length) return;
  state.wms[state.activeWmIdx].rotation = +sliderRot.value;
  updateSliderLabels(); updateSliderFills(); redraw();
});
sliderOpacity.addEventListener('input', () => {
  if (!state.wms.length) return;
  state.wms[state.activeWmIdx].opacity = sliderOpacity.value / 100;
  updateSliderLabels(); updateSliderFills(); redraw();
});

/* ─── BATCH PROCESS & DOWNLOAD ──────────────────────────── */
async function downloadAll() {
  if (!state.images.length || !state.watermarks.length) return;

  btnDownload.disabled = true;
  progressOverlay.classList.remove('hidden');
  progressText.textContent = 'Processing images…';

  state.batchCount++;
  const batchName = `[WM] Images [${state.batchCount}]`;

  const wm = state.watermarks[state.activeWmIdx].img;
  const total = state.images.length;
  const zip = new JSZip();
  const folder = zip.folder(batchName);

  // Use an off-screen canvas for batch processing
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');

  for (let i = 0; i < total; i++) {
    progressSub.textContent = `${i + 1} / ${total}`;
    progressFill.style.width = ((i / total) * 100) + '%';
    progressText.textContent = `Processing ${i + 1} of ${total}…`;

    const base = state.images[i].img;

    offCanvas.width = base.naturalWidth;
    offCanvas.height = base.naturalHeight;

    // Draw base image
    offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.drawImage(base, 0, 0, offCanvas.width, offCanvas.height);

    // Draw all watermarks onto the offCanvas
    state.watermarks.forEach((wmImgObj, wIdx) => {
      const wm = wmImgObj.img;
      const wmState = state.wms[wIdx];

      const cw = offCanvas.width;
      const ch = offCanvas.height;
      const wmW = cw * wmState.sizeRatio;
      const wmH = wmW * (wm.naturalHeight / wm.naturalWidth);
      const cx = wmState.xRatio * cw + wmW / 2;
      const cy = wmState.yRatio * ch + wmH / 2;

      offCtx.save();
      offCtx.globalAlpha = wmState.opacity;
      offCtx.translate(cx, cy);
      offCtx.rotate((wmState.rotation * Math.PI) / 180);
      offCtx.drawImage(wm, -wmW / 2, -wmH / 2, wmW, wmH);
      offCtx.restore();
    });

    // Convert to base64 and add to zip
    const dataUrl = offCanvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    const ext = 'png';
    const name = `[WM] Images ${i + 1}.${ext}`;
    folder.file(name, base64Data, { base64: true });

    // Yield to browser occasionally to keep UI responsive
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  progressText.textContent = 'Creating ZIP file…';
  progressFill.style.width = '95%';

  const zipBlob = await zip.generateAsync(
    { type: 'uint8array' },
    meta => { progressSub.textContent = `Zipping… ${meta.percent.toFixed(0)}%`; }
  );

  progressFill.style.width = '100%';
  const finalBlob = new Blob([zipBlob], { type: 'application/zip' });
  saveAs(finalBlob, `${batchName}.zip`);

  await new Promise(r => setTimeout(r, 600));
  progressOverlay.classList.add('hidden');
  btnDownload.disabled = false;
  showToast(`✅ ${total} images downloaded successfully!`, 'success');
}

/* ─── RESET ─────────────────────────────────────────────── */
function resetAll() {
  // Revoke all blob URLs
  state.images.forEach(e => URL.revokeObjectURL(e.url));
  state.watermarks.forEach(e => URL.revokeObjectURL(e.url));

  state.images = [];
  state.watermarks = [];
  state.wms = [];
  state.activeWmIdx = 0;

  // Reset file inputs
  inputImages.value = '';
  inputWm.value = '';

  // Reset badges & cards
  badgeImages.classList.remove('show');
  badgeWm.classList.remove('show');
  dropImages.classList.remove('has-files');
  dropWatermark.classList.remove('has-files');
  btnProceed.disabled = true;
  btnResetUpload.style.display = 'none';

  // Show upload stage
  stagePreview.classList.add('hidden');
  stageUpload.classList.remove('hidden');

  stepPills.forEach((p, i) => p.classList.toggle('active', i === 0));

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ─── DROPZONE HELPERS ──────────────────────────────────── */
function makeDrop(zone, input, handler) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handler(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handler(input.files));
}

/* ─── WIRE UP DROP ZONES ────────────────────────────────── */
makeDrop(dropImages, inputImages, handleImageFiles);
makeDrop(dropWatermark, inputWm, handleWatermarkFiles);

/* ─── WIRE UP BUTTONS ───────────────────────────────────── */
btnProceed.addEventListener('click', goToPreview);
if (btnResetUpload) {
  btnResetUpload.addEventListener('click', () => {
    if (confirm('Clear uploaded files and start over?')) resetAll();
  });
}
btnBack.addEventListener('click', () => {
  stagePreview.classList.add('hidden');
  stageUpload.classList.remove('hidden');
  stepPills.forEach((p, i) => p.classList.toggle('active', i === 0));
});
btnReset.addEventListener('click', () => {
  if (confirm('Reset everything? All uploaded images and settings will be cleared.')) resetAll();
});
btnDownload.addEventListener('click', downloadAll);

/* ─── CANVAS POINTER EVENTS ─────────────────────────────── */
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('mouseleave', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp);

/* ─── WINDOW RESIZE ─────────────────────────────────────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!stagePreview.classList.contains('hidden') && state.images.length) {
      initCanvas();
      state.wms.forEach(wmState => {
        wmState.xRatio = null;
        wmState.yRatio = null;
      });
      redraw();
    }
  }, 200);
});
