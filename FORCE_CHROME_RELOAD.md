# Force Chrome to Load New Extension Files

## The Problem
Chrome is caching the old `index.html-DOA--s_Z.js` file at the HTTP/disk level, not just extension storage. Even after removing and reinstalling, it's loading the old cached JavaScript.

---

## Solution: Hard Reset Chrome's Cache

### Method 1: Clear Site Data (Recommended)

1. **Remove the extension** at `chrome://extensions`

2. **Clear Chrome's cache:**
   - Go to `chrome://settings/clearBrowserData`
   - Select **"Cached images and files"**
   - Time range: **All time**
   - Click **Clear data**

3. **Reinstall extension:**
   - `chrome://extensions`
   - **Load unpacked**
   - Select `/Users/Timi/Desktop/vibechekk/dist`

---

### Method 2: Force Reload with DevTools (Alternative)

1. Open DevTools on the extension popup (Right-click popup → Inspect)
2. With DevTools open, right-click the **reload button** in Chrome
3. Select **"Empty Cache and Hard Reload"**
4. Close and reopen the popup

---

### Method 3: Change the Build Hash (Nuclear Option)

If the above doesn't work, we can force Vite to generate a new hash:

```bash
# In terminal:
touch src/App.tsx && npm run build:ext
```

This will create a NEW file hash (not `DOA--s_Z`), forcing Chrome to download fresh code.

---

## About the LinkedIn Icon

The icon only appears when a profile has been **enriched with Apollo data**. It shows after you:

1. Analyze a profile
2. Click the email icon (🎯) to enrich
3. LinkedIn URL is found and displayed

If you haven't enriched any profiles yet, that's why the icon is missing. It's conditional, not a bug!

---

## Verification

After clearing cache and reinstalling, check DevTools console:
- Should NOT see `xa.includes is not a function`
- Should NOT see `a.map is not a function`
- Extension should load without error boundary
