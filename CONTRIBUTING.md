# Contributing to Total Tab Exporter

Thank you for contributing to Total Tab Exporter! To maintain code quality and ensure a smooth review process, please adhere to the following workflow.

---

## 1. Ground Rules & Prerequisites

1. **Mandatory Rules Compliance**: Read and adhere to `.rules/RULES.md` before initiating research, code changes, or design work.
2. **Implementation Plan Required**: For non-trivial changes, open an issue and draft an implementation plan using `.rules/templates/IMPLEMENTATION_PLAN.md`.
3. **Design System**: All UI changes must comply with `.rules/design/DESIGN.md` (Material 3 Orange default and OKLCH color space).
4. **Testing Mandatory**: Every pull request must include corresponding unit/integration tests with $\ge 80\%$ statement and $\ge 70\%$ branch coverage.

---

## 2. Git Workflow & Branches

- **Branch Naming**:
  - `feat/feature-name` (New features)
  - `fix/bug-description` (Bug fixes)
  - `refactor/scope-name` (Refactoring without behavior change)
  - `docs/doc-update` (Documentation changes)
- **Commit Messages**: Follow Conventional Commits:
  - `feat: add opml export engine`
  - `fix: resolve blob url memory leak on file download`
  - `docs: update living developer reference table`

---

## 3. Pull Request Process

1. Fork the repo and create your branch from `main`.
2. Ensure all lint, test, and packaging commands pass locally:
   ```bash
   npm run lint
   npm test
   npm run package
   ```
3. Submit a PR describing:
   - What changed and why.
   - Associated issue numbers.
   - Screenshots or screencasts for UI updates.
4. Ensure all CI checks pass. Address feedback from automated review agents and maintainers.

