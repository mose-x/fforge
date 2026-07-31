# AGENTS.md

## Hook Repository

code-hooks: <https://github.com/mose-x/code-hooks>

## Commit Workflow

1. **Feature branch**: Create a feature branch for development. **Never push directly to main.**
2. **Push & PR**: Push the feature branch to remote, then open a Pull Request.
3. **Wait for CI**: All CI checks (lint / test / commit-lint) must pass and be fully green.
4. **Merge to main**: Once CI is green, squash merge the PR into main.
