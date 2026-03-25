# 📘 Batch Watermark — User Guide
### Naga Church Media Team

---

## Overview

Batch Watermark lets you apply a watermark (logo) to up to **300 landscape images** at once, then download them all as a single ZIP file. The entire process runs in your browser — no server uploads, no accounts needed.

---

## Quick Start (3 Steps)

| Step | What to do |
|------|------------|
| **1. Upload** | Add your images and watermark logo |
| **2. Customize** | Position, resize, rotate, and set opacity of the watermark |
| **3. Download** | Download all watermarked images as a ZIP |

The header progress bar (Upload → Customize → Download) tracks which step you're on.

---

## Step 1 — Upload

### Upload Images

You have **three ways** to add images:

1. **Upload Images button** — Click to browse and select individual image files.
2. **Upload Folder button** — Click to browse and select an entire folder. All images inside (including subfolders) will be added.
3. **Drag & Drop** — Drag image files or a folder directly onto the upload zone.

> **Requirements**
> - All images **must be landscape** (width > height). Portrait or square images will be rejected.
> - Maximum **300 images** total.

A badge (e.g. `[24]`) appears on the card showing how many images have been loaded.

### Upload Watermark

- Click the watermark upload zone or drag & drop your logo onto it.
- You can upload **1 or 2 watermark** images.
- **PNG with transparency** is recommended for best results.

### Recent Watermarks

Previously used watermarks are saved in your browser's local storage. They appear in the **Recent Watermarks** panel below the watermark upload zone. Click a thumbnail to re-use it. Use the trash icon to clear the history.

### Proceed

Once both images and a watermark are uploaded:
- The **"Preview & Customize Watermark"** button becomes active.
- A trash button also appears to clear all uploads if you want to start over.

Click **"Preview & Customize Watermark"** to continue.

---

## Step 2 — Customize

### Preview Canvas

The first uploaded image is displayed on a canvas with the watermark overlaid. This is your live preview — all adjustments are reflected here in real-time.

### Positioning the Watermark

- **Drag** the watermark on the preview canvas to reposition it.
- The cursor changes to a grab hand when hovering over the watermark.
- The current position is shown as **X%** and **Y%** coordinates below the canvas.
- By default, the watermark is placed at the **bottom-right corner**.

### Watermark Controls

| Control | Range | Description |
|---------|-------|-------------|
| **Size** | 5% – 80% | Scales the watermark relative to the image width |
| **Rotation** | 0° – 360° | Rotates the watermark around its center |
| **Opacity** | 5% – 100% | Controls watermark transparency (lower = more transparent) |

### Multiple Watermarks

If you uploaded 2 watermark images, toggle buttons (**Watermark 1** / **Watermark 2**) appear in the sidebar. Select which watermark to adjust — each one has its own independent position, size, rotation, and opacity. The active watermark shows a subtle glow highlight on the canvas. Both watermarks are applied to every image during download.

### Sidebar Info Cards

The left sidebar shows:
- **Watermark** thumbnail and count
- **Images** thumbnail and count

### Navigation

- **Back** button — returns to the Upload step (your uploads are preserved).
- **Reset** button (trash icon) — clears everything and returns to Upload.

---

## Step 3 — Download

1. Click **"Download All Images"** — the button shows the total image count.
2. A progress overlay appears showing:
   - Current image being processed (e.g. "Processing 12 of 50…")
   - A progress bar
   - ZIP creation percentage
3. When complete, a ZIP file automatically downloads named **`[WM] Images [1].zip`**.
   - Each subsequent download in the same session increments the number: `[WM] Images [2].zip`, etc.
4. Inside the ZIP, individual images are named **`[WM] Images 1.png`**, **`[WM] Images 2.png`**, etc.
5. A success toast notification confirms the download.

> **Tip:** All output images are saved as **PNG** format regardless of the original format.

---

## Tips & Best Practices

- **Use transparent PNGs** for your watermark logo so it blends naturally with photos.
- **Start with a lower opacity** (40–60%) for a subtle watermark, or keep it high (80–100%) for visibility.
- **Rotate to 45°** for a diagonal watermark style commonly used for proofing.
- **Batch size**: processing 300 images may take a minute or two depending on your device. The browser stays responsive during processing.
- **Browser storage**: watermark history is stored in your browser's local storage. Clearing browser data will remove it.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload rejected with portrait/square error | Ensure all images are landscape (width > height). Remove any portrait or square images from your batch. |
| "Already at maximum 300 images" | Remove some images by resetting, then re-upload with fewer files. |
| Watermark not visible on preview | Check that opacity is above 5% and size is large enough. Also ensure the watermark isn't positioned off-canvas. |
| ZIP download doesn't start | Make sure pop-ups/downloads aren't blocked by your browser. |
| Recent watermarks not showing | Your browser's local storage may be cleared or disabled. |

---

## Browser Compatibility

This app works best in modern browsers:
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Mozilla Firefox
- ✅ Safari

> **Note:** The "Upload Folder" feature uses `webkitdirectory` which is supported in Chrome, Edge, and Firefox. Safari support may vary.

---

*Naga Church Media Team — Batch Watermark App*
