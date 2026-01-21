# Railway UTF-8 Encoding Fix

## Problem
Railway build was failing with error:
```
Error: Error reading js/apps/files-v2.js
Caused by: stream did not contain valid UTF-8
```

## Solution
Replaced Unicode characters with ASCII-safe alternatives in:
- `js/apps/files-v2.js`
- `dist/js/apps/files-v2.js`

### Character Replacements
- `×` (multiplication sign) → `x`
- `›` (right-pointing quotation) → `>`
- `•` (bullet) → `-`

## Files Fixed
1. ✅ `js/apps/files-v2.js` - All Unicode characters removed
2. ✅ `dist/js/apps/files-v2.js` - All Unicode characters removed
3. ✅ `.railwayignore` - Created to exclude dist folder

## Next Steps

### IMPORTANT: Commit and Push Changes
Railway reads from your Git repository, so you must:

1. **Commit the changes:**
   ```bash
   git add js/apps/files-v2.js dist/js/apps/files-v2.js .railwayignore
   git commit -m "Fix UTF-8 encoding issues for Railway build"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Railway will automatically rebuild** once you push

### Verify
- Both files now contain only ASCII characters
- No non-ASCII characters found in either file
- Railway should now build successfully

## If Still Failing
1. Check Railway build logs for any other files with encoding issues
2. Ensure you've committed and pushed ALL changes
3. Try redeploying manually in Railway dashboard
