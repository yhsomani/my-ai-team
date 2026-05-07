# Lessons Learned: Secret Removal from Git History

## Observation
A GCP API Key was accidentally committed to `opencode.json` and pushed (or attempted to be pushed) to GitHub. GitHub's Push Protection correctly blocked the push.

## Resolution Pattern
1. **Identify the offending commit**: Use `git log` and the error message from the push failure.
2. **Remove the secret from the current state**: Replace with a placeholder or move to an environment variable.
3. **Rewrite history**:
   - If only a few commits, use a temporary branch and `cherry-pick -n` to redo the bad commit without the secret.
   - Use `git checkout <old-commit> -- <files>` to quickly resolve conflicts during merges if the previous merge state was already correct for those files.
   - Replace the main branch with the fixed branch using `git reset --hard`.
4. **Stash and Pop**: Ensure uncommitted work is preserved throughout the process.

## Prevention
- Use `.env` files for secrets and ensure they are in `.gitignore`.
- Run a local secret scanner (like `gitleaks` or `trufflehog`) before committing.
- Review `opencode.json` structure to ensure environment variables are used for sensitive fields.
