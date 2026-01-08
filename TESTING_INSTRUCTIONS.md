# Filter Preview Testing Instructions

## What We Fixed

We added:
1. **Checksum validation** - Verifies that pixel data actually changes after each filter
2. **Memory management** - Explicitly frees PhotonImage objects after use to prevent memory corruption
3. **Extensive logging** - Tracks each filter application with before/after checksums

## How to Test

1. **Start the dev server:**
   ```bash
   bun run dev
   ```

2. **Open the app in browser:**
   - Navigate to http://localhost:4200
   - Open Developer Console (F12)

3. **Upload an image:**
   - Click "Choose File" or drag-and-drop an image
   - Watch the console for logs

4. **Open the Filters tool:**
   - Click the "Filters" button in the toolbar
   - The submenu should appear with 30 filter preview buttons

5. **Check the Console Output:**

   Look for these patterns for EACH filter:

   ```
   [FilterService] Processing Grayscale (grayscale)...
   [PhotonService] Applying filter: grayscale, args: []
   [PhotonService] Input checksum (first 100px): 123456
   [PhotonService] Output checksum (first 100px): 654321
   [PhotonService] Checksum changed: ✓ YES
   [PhotonService] ✓ PhotonImage memory freed
   [FilterService]   → Filter applied in 15ms
   [FilterService] ✓ Grayscale complete! (1/30 done)
   ```

   **IF YOU SEE:** `Checksum changed: ✗ NO (PROBLEM!)` - The filter is NOT working!

6. **Visual Verification:**
   - All 30 filter buttons should show DIFFERENT thumbnail images
   - Each thumbnail should be visually distinct (grayscale, sepia, vintage, etc.)
   - NOT all the same original image

7. **Click a Filter:**
   - Click any filter preview button
   - The main canvas should update with that filter applied

## Expected Results

✅ **SUCCESS:** 
- 30 different thumbnail previews
- Console shows `✓ YES` for checksum changes
- Clicking filters applies them correctly

❌ **FAILURE:**
- All thumbnails look the same
- Console shows `✗ NO (PROBLEM!)` for checksum changes
- Need to investigate why filters aren't mutating the PhotonImage

## Next Steps if Still Broken

If checksum shows `✗ NO (PROBLEM!)`:
1. The Photon filter functions are being called
2. But they're NOT mutating the PhotonImage in WASM memory
3. Possible causes:
   - Wrong filter name/signature
   - Photon library version mismatch
   - WASM initialization issue
   - Need to check Photon documentation for correct API usage
