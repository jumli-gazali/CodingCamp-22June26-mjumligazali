# Requirements Document

## Introduction

The Expense Budget Visualizer is a client-side web application that allows users to track personal expenses by adding transactions with a name, amount, and category. It displays a running total balance, a scrollable transaction list with delete capability, and a live-updating pie chart that visualizes spending by category. All data is persisted in the browser's LocalStorage. The application is built with HTML, CSS, and Vanilla JS — no backend, no frameworks.

---

## Glossary

- **App**: The Expense Budget Visualizer web application running in the user's browser.
- **Transaction**: A single expense entry composed of an Item Name, Amount, and Category.
- **Item_Name**: A non-empty text label describing what was spent on.
- **Amount**: A positive numeric value representing the cost of a transaction in the user's local currency.
- **Category**: One of the three predefined spending categories: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI region that displays all saved transactions.
- **Balance_Display**: The UI element at the top of the App that shows the total sum of all transaction amounts.
- **Pie_Chart**: The visual chart that displays the proportional breakdown of spending across all Categories.
- **LocalStorage**: The browser's built-in key-value storage API used for client-side data persistence.
- **Input_Form**: The UI form containing the Item_Name field, Amount field, Category selector, and submit button.
- **Validator**: The client-side logic that checks Input_Form field values before a Transaction is created.

---

## Requirements

### Requirement 1: Add Transaction via Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain an Item_Name text field, an Amount numeric field, a Category selector with options Food, Transport, and Fun, and a submit button.
2. WHEN the user submits the Input_Form, THE Validator SHALL check that the Item_Name field is non-empty, the Amount field contains a positive number, and a Category has been selected.
3. IF the Validator detects that any required field is empty or invalid, THEN THE App SHALL display an inline validation error message identifying which field is missing or invalid, and SHALL NOT create a Transaction.
4. WHEN all fields pass validation, THE App SHALL create a new Transaction and add it to the Transaction_List.
5. WHEN a new Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Persist Transactions in LocalStorage

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is not lost when I close or refresh the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL serialize the current Transaction_List and write it to LocalStorage.
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated Transaction_List and write it to LocalStorage.
3. WHEN the App initializes, THE App SHALL read the Transaction_List from LocalStorage and render all previously saved Transactions.
4. IF LocalStorage contains no saved data at initialization, THEN THE App SHALL render an empty Transaction_List with a zero Balance_Display.

---

### Requirement 3: Display and Update Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review and manage my expenses.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction's Item_Name, Amount, and Category.
2. WHILE the number of Transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL be scrollable without affecting the layout of the rest of the App.
3. THE Transaction_List SHALL display Transactions in reverse-chronological order, with the most recently added Transaction appearing at the top.
4. WHEN the user clicks the delete button on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and update LocalStorage.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see a total balance at the top of the app, so that I know my cumulative spending at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the Amount values of all Transactions currently in the Transaction_List.
2. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total within the same render cycle, requiring no page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total within the same render cycle, requiring no page reload.
4. WHILE the Transaction_List is empty, THE Balance_Display SHALL show a value of 0.

---

### Requirement 5: Visualize Spending with Pie Chart

**User Story:** As a user, I want to see a pie chart that shows my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per Category that has at least one Transaction, sized proportionally to that Category's total Amount relative to the overall total.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update to reflect the new category breakdown within the same render cycle, requiring no page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the revised category breakdown within the same render cycle, requiring no page reload.
4. WHILE the Transaction_List is empty, THE Pie_Chart SHALL display a neutral placeholder state indicating no data is available.
5. THE Pie_Chart SHALL render using Chart.js loaded via CDN, with no server-side dependencies.

---

### Requirement 6: Responsive and Accessible UI

**User Story:** As a user, I want the app to be readable and usable on different screen sizes, so that I can use it on a desktop or a smaller window.

#### Acceptance Criteria

1. THE App SHALL render correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without polyfills.
2. THE App SHALL use a single CSS file located at `css/style.css` and a single JS file located at `js/app.js`.
3. WHEN the viewport width is reduced below 600px, THE App SHALL reflow its layout so that the Input_Form, Transaction_List, and Pie_Chart each occupy the full available width without horizontal scrolling.
4. THE Input_Form submit button and Transaction delete buttons SHALL have a minimum touch target size of 44×44 CSS pixels to meet usability standards.
5. WHEN the App loads, THE App SHALL complete initial render and display saved Transactions within 1 second on a standard broadband connection.
