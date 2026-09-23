# Development Rules & Constraints

> **THE EXISTING APPLICATION IS THE SOURCE OF TRUTH.**
>
> Future changes must be strictly additive and targeted. Existing UI and functionality must NOT be changed unless explicitly requested by the user.

---

## Core Rules

### 1. Preserve Existing UI
- Do NOT redesign existing screens, cards, headers, sidebars, or controls.
- Do NOT change existing layouts, visual styling, or colors without explicit instruction.
- **Rule**: If a requested feature can be implemented without changing an existing UI element, do NOT change that UI element.

### 2. Preserve Existing Functionality
- Do NOT alter or break existing workflows, data operations, export formats, or live session tracking.
- Do NOT modify working functionality while implementing another feature.

### 3. Conflict Resolution
- **Rule**: If an existing implementation conflicts with a new requirement, STOP and clearly identify the conflict to the user before making broad changes.

### 4. Non-Destructive Development
- No deleting existing code.
- No unnecessary refactoring.
- No unnecessary dependency changes.
- No unnecessary file movement or renaming.
- Keep new functionality isolated in modular files where possible.

### 5. Scope Enforcement
- Do NOT invent requirements or unrequested capabilities.
- Do NOT make unrelated "improvements" or opinionated code rewrites.
- Inspect the codebase thoroughly before making any modifications.
- Always make the SMALLEST possible change required to achieve the explicit objective.

### 6. Security & Governance
- Never expose API keys, credentials, or secrets in code or commits.
- Keep documentation updated as features evolve.
