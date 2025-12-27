# Contributing to Turbo Trading Bot

## 🚨 ABSOLUTE RULES - NO EXCEPTIONS

**This project follows ZERO TOLERANCE policy for chaos and simplifications.**

Per `.github/copilot-instructions.md`:
> **"ABSOLUTNY ZAKAZ UPRASZCZEŃ"** - NO SIMPLIFICATIONS EVER

All contributions must be:
- ✅ Enterprise-grade quality
- ✅ Fully complete implementations
- ✅ Properly tested
- ✅ Well documented

## 📋 Table of Contents

- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Git Workflow](#git-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [File Organization](#file-organization)
- [What NOT to Do](#what-not-to-do)

## 🏗️ Project Structure

```
turbo-bot/
├── .github/              # GitHub workflows and instructions
├── core/                 # Core trading logic
├── src/                  # Source code
├── trading-bot/          # Main bot implementation
│   ├── core/            # Trading core
│   ├── ml/              # Machine learning
│   ├── infrastructure/  # Infrastructure
│   └── automation/      # Automation
├── dashboard/            # Dashboard UI
├── docs/                 # Documentation
├── tests/                # All tests (ONLY location for tests)
├── scripts/              # Utility scripts
├── tools/                # Development tools
└── archive/              # Historical backups

# Essential files in root (ONLY these allowed)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── README.md
├── QUICK_START.md
├── CONTRIBUTING.md
└── main_enterprise.ts
```

## 🔄 Development Workflow

### 1. Before Starting

```bash
# Pull latest changes
git pull origin master

# Check project status
git status

# Ensure clean state
./restore_clean_state.sh  # If needed
```

### 2. Create Feature Branch

```bash
# Create branch with descriptive name
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Changes

- ✅ Follow project structure
- ✅ Keep files in correct directories
- ✅ Write tests in `tests/` directory
- ✅ Update documentation

### 4. Test Your Changes

```bash
# Run tests
npm test

# Check TypeScript compilation
npm run build

# Run linting
npm run lint
```

## 📝 Git Workflow

### Pre-commit Hook Checks

Our pre-commit hook automatically checks for:

1. ❌ Test files in root directory
2. ❌ `.bak` backup files
3. ❌ Excessive markdown files in root
4. ❌ Old-style shell scripts
5. ❌ Standalone class directories
6. ❌ `.env` files with secrets
7. ⚠️  Large files (>10MB)
8. ⚠️  TypeScript compilation errors

**If pre-commit fails, fix the issues!** Don't use `--no-verify`.

### Commit Message Format

Use the template automatically loaded when you commit:

```
<type>: <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code formatting
- `refactor`: Code refactoring
- `perf`: Performance
- `test`: Tests
- `chore`: Maintenance
- `ci`: CI/CD
- `build`: Build system

**Examples:**

```bash
git commit -m "feat: add ML prediction caching system"
git commit -m "fix: resolve memory leak in trading loop"
git commit -m "chore: update dependencies to latest versions"
```

**Good commit:**
```
feat: implement real-time risk monitoring

- Add VaR calculation module
- Integrate with trading engine
- Add Prometheus metrics
- Include comprehensive tests

Closes #123
```

**Bad commit:**
```
update stuff
```

## 💻 Code Standards

### TypeScript/JavaScript

```typescript
// ✅ GOOD - Enterprise style
/**
 * Calculates Value at Risk using historical simulation method
 * @param returns Historical returns array
 * @param confidence Confidence level (e.g., 0.95 for 95%)
 * @returns VaR value
 */
export function calculateVaR(
  returns: number[],
  confidence: number = 0.95
): number {
  // Implementation
}

// ❌ BAD - No documentation, unclear
export function calc(r: number[], c: number = 0.95): number {
  // Implementation
}
```

### File Naming

```
✅ GOOD:
  enterprise_ml_adapter.ts
  production_trading_engine.ts
  real_time_var_monitor.ts

❌ BAD:
  mlAdapter.ts
  engine.ts
  monitor.ts
```

### Directory Structure

```
✅ GOOD - Organized in proper directories:
  tests/unit/risk_manager.test.ts
  src/core/strategies/advanced_adaptive.ts
  trading-bot/ml/production_ml_integrator.ts

❌ BAD - Files in root:
  test_risk_manager.ts
  advanced_adaptive.ts
  ml_integrator.ts
```

## 🧪 Testing Requirements

### Test File Location

**CRITICAL:** All test files MUST be in `tests/` directory:

```
✅ CORRECT:
  tests/unit/portfolio_manager.test.ts
  tests/integration/trading_flow.test.ts
  tests/e2e/full_trading_cycle.test.ts

❌ WRONG:
  test_portfolio.ts                    # Root
  trading-bot/test_trading.ts          # In source
  src/core/strategies/strategy.test.ts # Mixed with source
```

### Test Coverage

- Minimum 80% code coverage
- All critical paths tested
- Edge cases covered
- Integration tests for workflows

```typescript
// Example test structure
describe('RiskManager', () => {
  describe('calculatePositionSize', () => {
    it('should limit position to 2% of portfolio', () => {
      // Test implementation
    });

    it('should handle zero portfolio value', () => {
      // Edge case
    });

    it('should respect maximum position limits', () => {
      // Risk limit test
    });
  });
});
```

## 📁 File Organization

### What Goes Where

| File Type | Location | Example |
|-----------|----------|---------|
| Source code | `src/`, `trading-bot/src/` | `portfolio_manager.ts` |
| Tests | `tests/` | `portfolio_manager.test.ts` |
| Documentation | `docs/` | `API.md` |
| Scripts | `scripts/` | `deploy.sh` |
| Configuration | `config/` | `production.json` |
| Dashboard | `dashboard/` | `Dashboard.tsx` |

### Markdown Documentation

```
✅ ALLOWED in root:
  README.md
  QUICK_START.md
  CONTRIBUTING.md
  CHANGELOG.md
  LICENSE.md
  CLEAN_STATE_BACKUP.md

✅ All other .md files go in:
  docs/
  trading-bot/docs/
```

## 🚫 What NOT to Do

### ❌ NEVER Commit These

1. **Test files in root**
   ```bash
   # BAD
   git add test_something.ts
   git add trading-bot/test_something.ts
   ```

2. **Backup files**
   ```bash
   # BAD
   git add file.ts.bak
   git add old_version.ts.old
   ```

3. **Environment files with secrets**
   ```bash
   # BAD
   git add .env
   git add .env.production
   ```

4. **Standalone class directories**
   ```bash
   # BAD
   mkdir CacheService
   git add CacheService/
   ```

5. **Old-style scripts**
   ```bash
   # BAD
   git add analyze_bot.sh
   git add check_ml.sh
   git add fix_errors.sh
   ```

6. **Excessive documentation in root**
   ```bash
   # BAD
   git add ML_SYSTEM_ANALYSIS.md
   git add PERFORMANCE_REPORT.md
   git add IMPLEMENTATION_GUIDE.md
   ```

### ❌ NEVER Simplify

```typescript
// ❌ BAD - Simplified version
class SimpleRiskManager {
  checkRisk() {
    return true; // TODO: Implement later
  }
}

// ✅ GOOD - Complete implementation
class EnterpriseRiskManager {
  private readonly maxDrawdown: number;
  private readonly maxPositionSize: number;
  
  constructor(config: RiskConfig) {
    this.maxDrawdown = config.maxDrawdown;
    this.maxPositionSize = config.maxPositionSize;
  }
  
  checkRisk(portfolio: Portfolio, trade: Trade): RiskAssessment {
    // Full implementation
    const positionRisk = this.calculatePositionRisk(trade);
    const portfolioRisk = this.calculatePortfolioRisk(portfolio);
    const drawdownRisk = this.calculateDrawdownRisk(portfolio);
    
    return {
      approved: this.isRiskAcceptable(positionRisk, portfolioRisk, drawdownRisk),
      positionRisk,
      portfolioRisk,
      drawdownRisk,
      recommendations: this.generateRecommendations()
    };
  }
}
```

## ✅ Good Practices

### 1. Descriptive Commits

```bash
# ✅ GOOD
git commit -m "feat: implement Black-Litterman portfolio optimization

- Add covariance matrix calculation
- Implement view integration
- Add Bayesian updating
- Include comprehensive tests with 95% coverage"

# ❌ BAD
git commit -m "update code"
git commit -m "fixes"
```

### 2. Small, Focused Changes

```bash
# ✅ GOOD - One feature per commit
git commit -m "feat: add VaR calculation module"
git commit -m "feat: integrate VaR with risk manager"
git commit -m "test: add VaR calculation tests"

# ❌ BAD - Everything in one commit
git commit -m "add VaR, fix bugs, update docs, refactor code"
```

### 3. Test Before Committing

```bash
# Always run before commit
npm test
npm run build
npm run lint

# If everything passes
git commit
```

### 4. Keep Root Clean

```bash
# Regular cleanup check
ls -1 | grep -v -E "^(node_modules|archive|backups|core|dashboard|data|docs|logs|monitoring|reports|scripts|src|tests|trading-bot|tools)$"

# Should show only ~10 essential files
```

## 🔧 Tools & Commands

### Restore Clean State

```bash
# If project becomes messy
./restore_clean_state.sh

# Or use git tag
git checkout clean-project-v1.0
```

### Check What Will Be Committed

```bash
# See staged changes
git diff --cached

# See file status
git status
```

### Bypass Pre-commit (NOT RECOMMENDED)

```bash
# Only use in emergency
git commit --no-verify -m "emergency fix"
```

## 📞 Getting Help

1. Check `.github/copilot-instructions.md`
2. Review `CLEAN_STATE_BACKUP.md`
3. Examine `QUICK_START.md`
4. Ask team lead

## 🎯 Quality Checklist

Before submitting changes:

- [ ] Code follows TypeScript best practices
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Tests in `tests/` directory only
- [ ] No files in root except essentials
- [ ] Commit message follows template
- [ ] Pre-commit hook passes
- [ ] Documentation updated
- [ ] No simplifications or shortcuts

## 🚀 Ready to Contribute?

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Test thoroughly
5. Commit with proper message
6. Push to your fork
7. Create Pull Request

---

**Remember**: This is a production trading bot. Quality and completeness are non-negotiable.

**🚨 ZERO TOLERANCE for shortcuts or simplifications! 🚨**
