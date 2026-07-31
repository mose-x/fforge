# AGENTS.md

## Hook 仓库

code-hooks：<https://github.com/mose-x/code-hooks>

## 提交流程

1. **Feature 分支开发**：新建 feature 分支进行开发，**不要直接推 main**
2. **推送 feature 分支**：推送到远程后创建 PR
3. **等待 CI 全绿**：所有 CI check（lint / test / commit-lint）必须全部通过
4. **Merge 到 main**：CI 全绿后通过 PR Squash merge 合并
