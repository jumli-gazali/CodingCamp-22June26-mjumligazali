# Implementation Plan: Expense Budget Visualizer

## Overview

Implement a single-page, client-side expense tracker using HTML5, CSS3, and Vanilla JS (ES6+). The app records transactions, displays a running balance, renders a scrollable transaction list with delete support, and shows a live-updating pie chart powered by Chart.js (CDN). All data is persisted to `window.localStorage`. Tests are written with Vitest + jsdom and property-based tests use fast-check.

---

## Tasks

- [x] 1. Set up project structure and HTML shell
  - Create `index.html` with semantic HTML5 structure: `<header>` (title + balance display), `<main>` with three `<section>` elements (`.form-section`, `.list-section`, `.chart-section`)
  - Add Chart.js CDN `<script>` tag in `<head>`
  - Add `<link>` to `css/style.css` and `<script type="module">` for `js/app.js`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: 6.2, 6.1_

- [x] 2. Implement State Module and Persistence Module
  - [x] 2.1 Define the `transactions` array and `Transaction` typedef in `js/app.js`
    - Declare `let transactions = []` as the single source of truth
    - Add JSDoc typedef for `Transaction` (`id`, `itemName`, `amount`, `category`, `timestamp`)
    - Define `STORAGE_KEY = 'expense_transactions'`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Implement `saveToLocalStorage` and `loadFromLocalStorage`
    - `saveToLocalStorage(transactions)`: serialize with `JSON.stringify`, write to `STORAGE_KEY`
    - `loadFromLocalStorage()`: read, parse JSON; return `[]` and clear storage if key absent or `JSON.parse` throws
    - Implement `crypto.randomUUID` fallback for UUID generation using `Math.random()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement Validator Module
  - [x] 3.1 Implement `validateForm(itemName, amount, category)` in `js/app.js`
    - Return `{ valid: boolean, errors: { itemName?, amount?, category? } }`
    - `itemName`: reject if empty or whitespace-only after trim
    - `amount`: reject if not a finite positive number (`> 0`)
    - `category`: reject if not exactly one of `"Food"`, `"Transport"`, `"Fun"`
    - _Requirements: 1.2, 1.3_

- [x] 4. Implement Render Module
  - [x] 4.1 Implement `renderBalance(transactions)` in `js/app.js`
    - Sum all `amount` fields; set Balance_Display `textContent` to the total (show `0` when array is empty)
    - _Requirements: 4.1, 4.4_

  - [x] 4.3 Implement `renderTransactionList(transactions)` in `js/app.js`
    - Clear the list container and rebuild in reverse-chronological order (last-added → first in DOM)
    - Each row must show `itemName`, `amount`, and `category`
    - Each row has a delete button with `data-id` attribute bound to `handleDelete(id)`
    - Apply `overflow-y: auto` (or equivalent) to make the list scrollable
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.6 Implement `renderPieChart(transactions)` in `js/app.js`
    - Compute per-category totals from `transactions`
    - Create or update a Chart.js pie/doughnut chart with one segment per category that has ≥ 1 transaction
    - When `transactions` is empty: destroy the chart instance (if any) and show a placeholder message; hide the canvas
    - Wrap Chart.js calls in a guard for CDN load failure — if Chart is unavailable, hide the chart section gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.9 Implement `render()` entry point in `js/app.js`
    - Call `renderTransactionList(transactions)`, `renderBalance(transactions)`, `renderPieChart(transactions)` in sequence
    - _Requirements: 4.2, 4.3, 5.2, 5.3_

- [ ] 5. Checkpoint — Core render pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Event Handlers and App Initialization
  - [x] 6.1 Implement `handleFormSubmit(event)` in `js/app.js`
    - Prevent default form submission
    - Read `itemName`, `amount`, `category` from form fields
    - Call `validateForm`; display inline error messages under the relevant fields if invalid (do not create a transaction)
    - On valid: create a `Transaction` object with `crypto.randomUUID()` (with fallback), `Date.now()` timestamp; push to `transactions`; call `saveToLocalStorage(transactions)`; call `render()`; reset the form
    - Clear previous inline errors before each submit attempt
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 6.4 Implement `handleDelete(id)` in `js/app.js`
    - Filter `transactions` to exclude the entry matching `id`
    - Call `saveToLocalStorage(transactions)` then `render()`
    - _Requirements: 3.4, 2.2_

  - [x] 6.7 Initialize app on `DOMContentLoaded`
    - Call `loadFromLocalStorage()` and assign result to `transactions`
    - Call `render()` to populate UI from saved state
    - Attach `handleFormSubmit` to the form's `submit` event
    - _Requirements: 2.3, 2.4_

- [ ] 7. Checkpoint — Full data flow wired
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Style and Responsive Layout
  - [x] 8.1 Write `css/style.css` — base layout and typography
    - Style `<header>` with Balance_Display prominently visible
    - Style `.form-section` with labeled fields, inline error message slots (hidden by default, shown via a CSS class)
    - Style `.list-section` with `overflow-y: auto` and a max-height to enable scrolling
    - Style `.chart-section` with the chart canvas and placeholder text
    - Set minimum touch target of `44px × 44px` on the submit button and all delete buttons
    - _Requirements: 3.2, 6.4_

  - [x] 8.2 Add responsive breakpoint in `css/style.css`
    - At `max-width: 600px`, switch layout so `.form-section`, `.list-section`, and `.chart-section` each occupy `100%` width with no horizontal scrollbar
    - _Requirements: 6.3_

- [ ] 9. Set up Vitest + fast-check test environment
  - Initialize `package.json` (if absent) and install `vitest`, `jsdom`, and `fast-check` as dev dependencies (pinned versions)
  - Add `vitest.config.js` configuring `environment: 'jsdom'`
  - Create `tests/` directory with a `helpers.js` file exporting the `transactionArbitrary` fast-check arbitrary used across property tests
  - Add `"test": "vitest --run"` script to `package.json`
  - _Requirements: (testing infrastructure for all requirements)_

- [ ] 10. Final checkpoint — Full test suite green
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints validate incremental progress after major milestones.
- Property tests use fast-check and validate universal correctness properties (Properties 1–8 from the design document).
- Unit tests validate specific examples and edge cases.
- The test environment (task 9) can be set up early or deferred until before writing the first test — the dependency graph reflects both orderings.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "9"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.1", "4.3"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "4.2", "4.4", "4.5", "4.6"] },
    { "id": 3, "tasks": ["4.7", "4.8", "4.9", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["6.5", "6.6", "6.7"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
