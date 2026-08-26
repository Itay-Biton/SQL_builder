# How to Use — Visual SQL Builder

A step-by-step guide for new users. This app lets you build `SELECT` queries visually, preview the generated SQL, run queries against the connected database, and export results.

---

## 1. Sign in

When you open the app, you are asked to sign in with a **username** and **password**.

- Enter your credentials and click **Sign in**.
- Use **Clear** to reset the form.
- After login, your username appears in the top bar. Click **Logout** when you are done.

> Your session is stored in the browser. You stay signed in until you log out or clear site data.

---

## 2. Main layout

After login, the screen has four areas:

| Area             | Location     | Purpose                                                                 |
| ---------------- | ------------ | ----------------------------------------------------------------------- |
| **Top bar**      | Top          | App title, user info, New, Help, and admin actions                      |
| **Schema panel** | Left sidebar | Browse database tables                                                  |
| **Canvas**       | Center       | Build your query by placing and connecting tables                       |
| **Bottom panel** | Below canvas | **SQL Query** tab (live SQL preview) and **Results** tab (query output) |

You can resize the sidebar and bottom panel by dragging the thin dividers between them.

---

## 3. Add tables to the canvas

Tables come from the **Schema** list on the left.

**Two ways to add a table:**

1. **Double-click** a table in the schema list.
2. **Drag** a table from the schema list and **drop** it onto the canvas.

Each table appears as a card showing its name, alias, and column list.

**Rules:**

- The same physical table cannot be added twice.
- When you add a second table, the app tries to **auto-detect joins** from foreign-key-like column names (e.g. `user_id` → `users.id`).
- If no direct join exists, the app may add intermediate tables along a schema path. If no join path exists at all, the table is rejected — **cross joins are not allowed**.

---

## 4. Work on the canvas

### Move tables

Click and drag a table card by its header to reposition it.

### Pan and zoom

- **Pan:** Click and drag empty canvas space (or join lines).
- **Zoom:** Hold **Ctrl** (Windows/Linux) or **Cmd** (Mac) and scroll the mouse wheel.

### Remove a table

Click **Remove** on a table card. If other tables depend on it through joins, you are asked to confirm removal of those dependent tables as well.

---

## 5. Select columns

Each column has a **checkbox**. Check columns you want in the `SELECT` list; uncheck to remove them.

**Quick actions (right-click the table header):**

- **Tick All** — select every column on that table.
- **Untick All** — clear all selections on that table.
- **Count(\*)** — add a `COUNT(*)` aggregate for that table (only one `COUNT(*)` can be active at a time).
- **Limit** — set or disable the global `LIMIT` row cap (default is 1000).

---

## 6. Column options (right-click a column)

Right-click any column to open a context menu.

| Action                           | What it does                                              |
| -------------------------------- | --------------------------------------------------------- |
| **Set Column Alias**             | Rename the column in the query output                     |
| **Filter**                       | Add a `WHERE` condition on this column                    |
| **Manage Filters**               | View, remove, or add filters for this column              |
| **Aggregate**                    | Apply Min, Max, Count(distinct), Avg, or Sum              |
| **Order Ascending / Descending** | Add `ORDER BY`; click again to remove or switch direction |
| **Group By**                     | Add the column to `GROUP BY`                              |

A checkmark (✓) next to a menu item means it is already active.

---

## 7. Filters

Choose **Filter** from a column’s context menu to open the filter panel.

Filter options depend on column type:

**Text**

- Contains, Equals, Starts with, Ends with

**Numbers**

- `>`, `>=`, `<`, `<=`, `=`, `!=`, or Between

**Dates**

- On (exact date), or Between two dates

**Combine filters**

- **Combine with:** AND or OR
- **NOT:** negate the condition

Click **Apply** to add the filter. Use **Manage Filters** on the same column to remove individual filters or clear all filters.

---

## 8. Joins

Joins are created automatically when tables are added. A line connects joined tables, with a **join toggle** at the midpoint.

**Change join type:** Click the join toggle to cycle through:

`LEFT` → `RIGHT` → `INNER` → `FULL`

The toggle shows which side of the join is preserved (blue = left table, green = right table).

---

## 9. Preview and run your query

### SQL Query tab

The bottom panel’s **SQL Query** tab shows the generated SQL as you build. It updates live. You cannot edit SQL directly here — change the visual query instead.

### Execute Query

Click the blue **Execute Query** button at the bottom-left of the canvas.

- The button is disabled until at least one column is selected and valid SQL can be generated.
- After running, the app switches to the **Results** tab automatically.
- There is a short cooldown between runs to prevent accidental double-clicks.

### Results tab

- View returned rows in a scrollable table.
- **Save as XLSX** downloads the current results as an Excel file (`query_results.xlsx`).
- Errors from the server are shown in red.

---

## 10. Top bar actions

| Button             | Who can use it | What it does                                          |
| ------------------ | -------------- | ----------------------------------------------------- |
| **New**            | Everyone       | Clears the canvas and starts a fresh query            |
| **Help**           | Everyone       | Opens a quick in-app help dialog                      |
| **Refresh Schema** | Admins only    | Reloads table/column metadata from the server         |
| **Manage Users**   | Admins only    | Create, edit roles, change passwords, or delete users |
| **Logout**         | Everyone       | Signs you out                                         |

---

## 11. Admin: Manage Users

Admins can open **Manage Users** from the top bar.

- **Create** a user with username, password, and role (`user` or `admin`).
- Change a user’s **role** from the dropdown in the table.
- **Change Password** for any user.
- **Delete** a user (the built-in `admin` account cannot be deleted).

---

## 12. Admin: Refresh Schema

If the database structure changes, an admin can click **Refresh Schema**. This fetches the latest tables and columns from the server and replaces the current schema in the app. You are asked to confirm before it runs.

---

## 13. Tips and troubleshooting

**“Table already added to canvas”**  
You tried to add the same table twice. Each physical table can only appear once.

**“Cannot add table: no join detected…”**  
There is no foreign-key relationship path between the new table and tables already on the canvas. Add a connecting table first, or check that the schema metadata is up to date.

**“Execute Query” is disabled**  
Select at least one column. The generated SQL must not be empty or an error comment (e.g. missing joins between multiple tables).

**Multiple tables but no joins**  
The SQL generator refuses to produce a cross join. Make sure joins exist between all tables on the canvas.

**Aggregates and GROUP BY**  
When you use aggregates, non-aggregated selected columns are automatically included in `GROUP BY`. You can also add explicit **Group By** from the column menu.

**Default row limit**  
Queries include `LIMIT 1000` by default. Change it via the table header menu (**Limit**) or by typing `limit=NNN` in a table title.

**Removing tables with dependents**  
Removing a table that other tables connect through may remove those dependent tables too. The app warns you before doing this.

---

## Quick workflow summary

1. Sign in.
2. Add one or more tables from the schema (double-click or drag).
3. Check the columns you need.
4. Right-click columns to add filters, aggregates, sorting, or grouping.
5. Adjust join types if needed.
6. Review SQL in the **SQL Query** tab.
7. Click **Execute Query**.
8. View or export results from the **Results** tab.

That’s everything you need to get started.
