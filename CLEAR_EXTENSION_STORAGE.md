# Clear Extension Storage to Fix Errors

## Problem
You're getting `TypeError: s.find is not a function` and `a.map is not a function`.

This is because the extension cached **old data** with the wrong structure before we updated the store schema.

---

## Solution: Clear Extension Storage

### Method 1: Use DevTools (Easiest)

1. **Right-click** on the Vibechekk extension icon
2. Click **"Inspect popup"** (this opens DevTools)
3. Go to the **Console** tab
4. Paste this code and press Enter:

```javascript
chrome.storage.local.clear().then(() => {
  console.log('✅ Storage cleared');
  location.reload();
});
```

The popup will reload with fresh state!

---

### Method 2: Reinstall Extension (Nuclear option)

If Method 1 doesn't work:

1. Go to `chrome://extensions`
2. Click **Remove** on Vibechekk
3. Click **Load unpacked**
4. Select `/Users/Timi/Desktop/vibechekk/dist`

This guarantees completely fresh state.

---

## Why This Happened

When we updated the store schema (added `checklistForm.languages`, etc.), the extension was still loading old cached data that had different fields. The old data structure:

```javascript
// OLD (cached in storage)
checklistForm: {
  title: '',
  technologies: [],
  minExperience: 0,
  signals: []
}
```

New code expects:
```javascript
// NEW (current code)
checklistForm: {
  jobTitle: '',
  jd: '',
  experience: '',
  languages: [],  // ← code tries to call .map() on this
  location: '',
  archetypes: [],
  tiers: [],
  reachability: []
}
```

Clearing storage forces the store to use the new default state.

---

## After Clearing

1. Extension should load without errors
2. Try analyzing a profile
3. All features should work

If you still see errors, let me know the exact error message!
