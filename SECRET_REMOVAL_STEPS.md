# Remove secret from Git history so push succeeds

GitHub is blocking the push because **commit b93950ac** (and possibly others) still contains the OpenAI API key in history. Your current files are already clean; the problem is past commits.

Use **one** of the options below.

---

## Option 1: New history with one clean commit (simplest)

This replaces `main` with a single commit containing your current code. **You will lose previous commit history** (but keep all current files).

Run these in your repo (AEGIS DESK folder):

```powershell
# 1. Backup current main (optional)
git branch backup-main main

# 2. Create a new branch with no history
git checkout --orphan temp-main

# 3. Stage all current files (already secret-free)
git add -A

# 4. Create one clean commit
git commit -m "AegisDesk: secrets removed, use env / localStorage for OpenAI"

# 5. Replace main with this history
git branch -D main
git branch -m main

# 6. Force push (overwrites remote main)
git push -f origin main
```

After this, only one commit will be on `main` and GitHub should accept the push.

---

## Option 2: Rewrite history and keep commits (advanced)

If you want to keep commit history but remove the secret from every commit, use BFG or git filter-repo.

**Using BFG (after installing https://rtyley.github.io/bfg-repo-cleaner/):**

1. Create a file `replacements.txt` with one line (replace THE_SECRET with the actual key you had, or skip if you don’t want to paste it):
   ```
   THE_SECRET==>OPENAI_API_KEY_PLACEHOLDER
   ```
2. Run: `java -jar bfg.jar --replace-text replacements.txt .`
3. Run: `git reflog expire --expire=now --all && git gc --prune=now --aggressive`
4. Force push: `git push -f origin main`

---

## After pushing

1. **Rotate your OpenAI API key** in the OpenAI dashboard (the one that was in the repo is compromised).
2. On Render, set **OPENAI_API_KEY** in Environment. Your app already reads the key from `localStorage`; if you add a small backend later, it can use `process.env.OPENAI_API_KEY` and never expose it to the browser.
