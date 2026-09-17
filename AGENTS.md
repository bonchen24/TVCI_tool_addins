# Project Guidelines & Superpowers Protocol

This project (`TVCI_word_addins`) uses the **Superpowers Engineering Discipline**. Any AI assistant operating in this codebase MUST follow these workflows and guidelines.

---

## 1. Superpowers Core Workflow

All non-trivial tasks must adhere to the Superpowers lifecycle:

```
[Brainstorming] -> [Planning] -> [TDD: Red-Green-Refactor] -> [Systematic Debugging] -> [Verification]
```

### Mandatory Rules:
1. **Brainstorming Before Implementation (`superpowers:brainstorming`)**:
   - Before designing features, modifying behavior, or writing plans, clarify intent and explore architectural options with the user.
2. **Planning (`superpowers:writing-plans` & `superpowers:executing-plans`)**:
   - Break tasks down into bite-sized, testable units with clear verification criteria.
   - For multi-step tasks, maintain persistent plan artifacts (`implementation_plan.md` or task checklists).
3. **Test-Driven Development (`superpowers:test-driven-development`)**:
   - **Write tests FIRST**: Add or update failing tests in `tests/` before writing production code in `src/`.
   - Run tests to confirm failure (RED).
   - Implement minimal code to pass (GREEN).
   - Refactor cleanly while maintaining passing tests.
4. **Systematic Debugging (`superpowers:systematic-debugging`)**:
   - When encountering a bug or test failure, **never guess or apply random fixes**.
   - Formulate a hypothesis, locate the exact root cause, create a reproduction test, and verify the fix.
5. **Verification Before Completion (`superpowers:verification-before-completion`)**:
   - Never claim a task or bugfix is complete without executing the verification commands and confirming successful output.

---

## 2. Project Tech Stack & Verification Commands

- **Language & Runtime**: TypeScript (`tsconfig.json`), Node.js
- **UI Framework**: React 18
- **Platform API**: Office.js (`@types/office-js`, Microsoft Word JavaScript API)
- **Bundler**: Webpack 5
- **Testing Framework**: Jest (`ts-jest`, `jest.config.cjs`)

### Verification Commands:
Always run these before declaring work complete:
- **Type Checking**:
  ```bash
  npm run typecheck
  ```
- **Unit & Integration Tests**:
  ```bash
  npm test
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Office Manifest Validation**:
  ```bash
  npm run validate-manifest
  ```

---

## 3. Office.js Development Conventions

1. **Context Management**:
   - Wrap Word API operations in `Word.run(async (context) => { ... })`.
   - Call `await context.sync()` after modifying or queueing document operations before accessing properties.
   - Always load required properties explicitly (e.g., `range.load("text")` followed by `await context.sync()`).
2. **Defensive Programming**:
   - Check for null/undefined content controls, selections, and templates.
   - Handle Office runtime errors gracefully with informative error messages.
