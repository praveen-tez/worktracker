# Design System & UI Documentation

This document describes the **CURRENT** design system and visual UI structure of the Monthly Time Tracker application.

---

## Design Tokens & System

### Typography
- **Font Family**: `'Poppins', sans-serif` (loaded via `@nuxtjs/google-fonts`)
- **Font Sizes**:
  - Eyebrow: `10px` (uppercase, letter-spacing: 1px)
  - Small / Badges: `9px` – `11px`
  - Body: `13px` (base text)
  - Subheaders / Table titles: `12px` – `14px` (font-weight: 600)
  - Section Headers: `18px` – `20px` (font-weight: 700)
  - Hero Page Titles: `28px` (letter-spacing: -0.7px)
- **Font Weights**: `400` (Regular), `500` (Medium), `600` (Semi-bold), `700` (Bold)

### Color Palette

#### Light Mode Tokens
- `--paper`: `#f6f8fb` (Main application background)
- `--ink`: `#15243b` (Primary text color)
- `--muted`: `#7b899c` / `#64748b` (Secondary / descriptive text)
- `--line`: `#e4eaf2` (Card and container borders)
- `--blue`: `#3569df` (Primary action blue)
- `--navy`: `#17243b` (Sidebar & timer container dark background)
- `--green`: `#11a981` (Completed status & positive metrics)
- `--amber`: `#ef9b27` (In Progress status & warnings)
- `--purple`: `#a45be8` (Special tags & categories)

#### Dark Mode Tokens (`.dark` class root)
- `--paper`: `#111a2b`
- `--ink`: `#eaf0f8`
- `--muted`: `#9aaac0`
- `--line`: `#2a3952`
- `--navy`: `#0a1221`

---

## UI Components & Patterns

### 1. Header & Navigation
- **Sidebar**: Fixed width (`236px` default, collapsible to `72px`), dark navy background (`--navy`). Features workspace brand logo, navigation menu buttons, and local persistence indicator.
- **Topbar**: Fixed height (`68px`), background `#ffffff`, border-bottom `1px solid --line`. Contains sidebar toggle `☰`, workspace search input `⌕`, `＋ Add new ▾` primary blue dropdown button, notifications bell popover, theme toggle `◐`, and user profile avatar `TEZ`.

### 2. Action Controls & Buttons
- **Standard Action Buttons (`.button`)**: Height `38px`, padding `0 15px`, border-radius `8px`, font-size `13px`, font-weight `600`, display `inline-flex align-items center`.
- **Primary Buttons (`.button.primary`)**: Background `#3569df`, border-color `#3569df`, text `#ffffff`, box-shadow `0 3px 10px rgba(53, 105, 223, 0.25)`.
- **Month Selector Control (`.month-select`)**: Border-radius `8px`, height `38px`, background `#ffffff`, border `1px solid --line`. Contains `<` and `>` arrow navigation buttons, month label `b`, and calendar quick-picker button `📅`.

### 3. Tables & Timesheet Log Cards
- **Date-Grouped Cards (`.date-log-group-card`)**: White background container with rounded top date header banner showing relative date label (`Today · 23 Sep, 2026`), entry counter, and total day duration.
- **Day Table (`.day-table-panel table`)**: Columns for Checkbox selection (`38px`), Project Name (`20%`), Task Name (`34%`), Time / Hours (`17%`), Assign Team / Sync (`17%`), Actions (`12%`).
- **Interactive Time Toggle Pill (`.time-toggle-pill`)**: Rounded pill toggle between time range (e.g. `10:00 - 11:00`) and duration (e.g. `1h 0m`).
- **Subtle Project Tags (`.tag-badge-item`)**: Soft light grey background (`#f1f5f9`), border `#e2e8f0`, text `#64748b`, font-size `10px`, padding `2px 7px`.

### 4. Modals & Popovers
- Modal backdrop with overlay blur (`rgba(16, 33, 61, 0.4)`).
- Centered modal dialog (`460px` width limit, `13px` border-radius).
- Quick Popovers for Notifications, Month Grid Picker, Add New Dropdown, Profile Menu, and Table Header 3-Dots Actions Menu.

---

## Major Application Screens

1. **Dashboard Overview (`screen === 'dashboard'`)**: Welcome greeting, current focus card, key metric stat cards, work analytics graph (Day / Week / Month views), and To-do delivery donut chart.
2. **My Timesheets / Logs (`screen === 'logs'`)**: Live timer ribbon bar (Project select, Task input, Counter, Start/Stop), Date-grouped work log tables with checkbox selection, interactive time range toggle, and multi-user sync avatars.
3. **To-dos (`screen === 'todos'`)**: Monthly task metrics bar, 3-column Kanban board (Pending, In Progress, Completed), drag-and-drop card reordering, file attachments, and expandable detail accordion.
4. **Calendar (`screen === 'calendar'`)**: Full month interactive schedule grid.
5. **Meetings (`screen === 'meetings'`)**: Meeting timeline and notes.
6. **Feedback (`screen === 'feedback'`)**: Action item feedback notes.
7. **Reports (`screen === 'reports'`)**: Work category breakdown and stats.
8. **Integrations (`screen === 'integrations'`)**: External integration status.
