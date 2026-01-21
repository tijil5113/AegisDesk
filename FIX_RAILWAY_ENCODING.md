# 🚨 CRITICAL: Railway Build Encoding Fix

## Problem
Railway is failing with:
```
Error: Error reading js/apps/files-v2.js
Caused by: stream did not contain valid UTF-8
```

## Root Cause
Even though we fixed Unicode characters, Railway might be reading from Git cache or there's still an encoding issue.

## IMMEDIATE FIX - Try This:

### Option 1: Remove and Re-add File (Force Clean UTF-8)
1. Delete the file from Git:
   ```bash
   git rm js/apps/files-v2.js
   git commit -m "Remove files-v2.js temporarily"
   git push
   ```
   
2. Recreate the file with clean UTF-8:
   ```bash
   git checkout HEAD -- js/apps/files-v2.js
   ```
   (We've already fixed it - just need to force Railway to see the new version)

### Option 2: Force Push to Railway
1. Commit ALL changes:
   ```bash
   git add -A
   git commit -m "Fix UTF-8 encoding in files-v2.js"
   git push --force
   ```

### Option 3: Delete and Recreate File Completely
If Railway is still seeing the old encoding:

1. **Backup the file content** (copy it somewhere safe)
2. Delete the file:
   ```bash
   git rm js/apps/files-v2.js
   git rm dist/js/apps/files-v2.js
   ```
3. Recreate it from our fixed version (we already fixed both)
4. Commit and push

## What We Fixed
✅ Replaced `×` → `x`
✅ Replaced `›` → `>`
✅ Replaced `•` → `-`
✅ Added `.gitignore` entry for `dist/`
✅ Added `.railwayignore` 
✅ Added `.nixpacksignore`

## Files Modified
- `js/apps/files-v2.js` - Cleaned all Unicode
- `dist/js/apps/files-v2.js` - Cleaned all Unicode  
- `.gitignore` - Added dist/
- `.railwayignore` - Created
- `.nixpacksignore` - Created

## Verify After Push
Check Railway build logs - should no longer see UTF-8 error.

If STILL failing, the file might have a BOM (Byte Order Mark). Try:
1. Open file in VS Code
2. Click encoding in bottom right
3. Select "Save with Encoding" → "UTF-8" (NOT UTF-8 with BOM)
