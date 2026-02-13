# Git Quick Reference - Turbo Trading Bot

## 🚀 Daily Workflow

### Starting Work

```bash
# Pull latest changes
git pull origin master

# Check status
git status

# See what changed
git diff
```

### Making Changes

```bash
# Stage specific files
git add src/core/strategy.ts

# Stage all changes
git add .

# Stage only certain type
git add *.ts

# See what's staged
git diff --cached
```

### Committing

```bash
# Commit with template (opens editor)
git commit

# Quick commit
git commit -m "feat: add new feature"

# Amend last commit
git commit --amend
```

## 📋 Commit Message Types

Use these types in commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes
- `build:` - Build system changes

**Examples:**

```bash
git commit -m "feat: implement real-time VaR monitoring"
git commit -m "fix: resolve memory leak in trading loop"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify portfolio manager logic"
git commit -m "test: add unit tests for risk calculator"
git commit -m "chore: update dependencies"
```

## 🛡️ Pre-commit Checks

Our pre-commit hook checks for:

1. ❌ Test files in root (`test*.js`, `test*.ts`)
2. ❌ Backup files (`*.bak`, `*.old`)
3. ❌ Environment files (`.env`, `.env.*`)
4. ⚠️  Excessive .md files in root
5. ⚠️  Old-style shell scripts
6. ⚠️  Standalone class directories
7. ⚠️  Large files (>10MB)
8. ⚠️  TypeScript errors

**If checks fail:**

```bash
# DON'T bypass with --no-verify!
# Instead, fix the issues:

# Remove test files from root
mv test_something.ts tests/

# Remove .bak files
find . -name "*.bak" -delete

# Fix TypeScript errors
npm run build

# Then commit again
git commit
```

## 🌿 Branches

### Create Branch

```bash
# Create and switch to new branch
git checkout -b feat/your-feature

# Or
git checkout -b fix/issue-description
```

### Switch Branches

```bash
# Switch to master
git checkout master

# Switch to feature branch
git checkout feat/your-feature

# See all branches
git branch -a
```

### Merge Branch

```bash
# Switch to master
git checkout master

# Merge feature
git merge feat/your-feature

# Push to remote
git push origin master
```

## 📤 Push/Pull

```bash
# Push to remote
git push origin master

# Pull from remote
git pull origin master

# Force push (CAREFUL!)
git push origin master --force-with-lease
```

## 🔄 Restore Clean State

```bash
# Using script
./restore_clean_state.sh

# Using git tag
git checkout clean-project-v1.0

# Return to master
git checkout master
```

## 📜 View History

```bash
# View commit log
git log

# View compact log
git log --oneline

# View last 5 commits
git log -5

# View with graph
git log --graph --oneline

# View specific file history
git log -- path/to/file.ts
```

## ↩️ Undo Changes

### Unstage Files

```bash
# Unstage all
git reset

# Unstage specific file
git reset path/to/file.ts
```

### Discard Changes

```bash
# Discard all uncommitted changes (CAREFUL!)
git reset --hard

# Discard specific file
git checkout -- path/to/file.ts

# Discard all unstaged changes
git checkout .
```

### Revert Commit

```bash
# Revert last commit (creates new commit)
git revert HEAD

# Revert specific commit
git revert <commit-hash>
```

### Reset to Previous Commit

```bash
# Soft reset (keeps changes staged)
git reset --soft HEAD~1

# Mixed reset (keeps changes unstaged)
git reset --mixed HEAD~1

# Hard reset (DELETES changes!)
git reset --hard HEAD~1
```

## 🏷️ Tags

```bash
# List tags
git tag

# Create tag
git tag -a v1.0.0 -m "Version 1.0.0"

# Push tag
git push origin v1.0.0

# Push all tags
git push origin --tags

# Delete tag locally
git tag -d v1.0.0

# Delete tag remotely
git push origin --delete v1.0.0

# Checkout tag
git checkout v1.0.0
```

## 🔍 Status & Info

```bash
# Check status
git status

# Short status
git status -s

# See changes
git diff

# See staged changes
git diff --cached

# See changes for specific file
git diff path/to/file.ts

# Show commit details
git show <commit-hash>

# Show current branch
git branch --show-current
```

## 🚨 Emergency Commands

### Stash Changes

```bash
# Save changes temporarily
git stash

# Save with message
git stash save "work in progress"

# List stashes
git stash list

# Apply last stash
git stash apply

# Apply specific stash
git stash apply stash@{0}

# Pop stash (apply and remove)
git stash pop

# Drop stash
git stash drop
```

### Clean Untracked Files

```bash
# See what would be deleted
git clean -n

# Delete untracked files
git clean -f

# Delete untracked files and directories
git clean -fd

# Delete including ignored files
git clean -fdx
```

## 📁 .gitignore

Our `.gitignore` blocks:

- `node_modules/`
- `*.log`
- `test*.js`, `test*.ts` in root
- `*.bak`, `*.old`, `*.backup`
- `.env`, `.env.*`
- Build outputs (`dist/`, `build/`)
- Test results
- Large files (ML models, archives)
- Standalone class directories

**Check what's ignored:**

```bash
# Check if file is ignored
git check-ignore -v path/to/file

# List all ignored files
git ls-files --ignored --exclude-standard
```

## 🔧 Configuration

### View Config

```bash
# View all config
git config --list

# View specific config
git config user.name
git config user.email
```

### Set Config

```bash
# Set user name
git config user.name "Your Name"

# Set user email
git config user.email "your.email@example.com"

# Set editor
git config core.editor "code --wait"
```

## 🆘 Help

```bash
# Get help for command
git help commit
git help push
git help log

# Short help
git commit -h
git push -h
```

## 📚 Common Scenarios

### Scenario: I committed to wrong branch

```bash
# 1. Copy commit hash
git log -1

# 2. Switch to correct branch
git checkout correct-branch

# 3. Cherry-pick commit
git cherry-pick <commit-hash>

# 4. Go back to wrong branch
git checkout wrong-branch

# 5. Remove last commit
git reset --hard HEAD~1
```

### Scenario: I need to update my branch with master

```bash
# On your feature branch
git checkout feat/your-feature

# Pull latest master
git pull origin master

# Or rebase
git rebase master
```

### Scenario: I want to see what changed in last commit

```bash
# Show last commit
git show HEAD

# Show specific commit
git show <commit-hash>

# Show files changed
git diff HEAD~1 HEAD
```

### Scenario: I want to compare branches

```bash
# Compare current branch with master
git diff master

# Compare two branches
git diff branch1..branch2

# Show commits in branch1 not in branch2
git log branch2..branch1
```

## 🎯 Best Practices

1. **Commit often** - Small, focused commits
2. **Write clear messages** - Use conventional format
3. **Test before commit** - Run `npm test` and `npm run build`
4. **Pull before push** - Avoid conflicts
5. **Use branches** - For features and fixes
6. **Don't commit secrets** - Use `.env.example`
7. **Keep commits atomic** - One change per commit
8. **Review before commit** - Use `git diff --cached`

## 🔗 Resources

- [CONTRIBUTING.md](CONTRIBUTING.md) - Full contribution guide
- [CLEAN_STATE_BACKUP.md](CLEAN_STATE_BACKUP.md) - Backup/restore
- `.github/copilot-instructions.md` - Project rules

---

**Need more help?** Check `git help <command>` or ask team lead!
