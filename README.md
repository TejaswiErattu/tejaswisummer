# Cybersecurity Summer Study Plan Command Center

Welcome to your Cybersecurity Summer Study Plan dashboard and command center. This application is a fully client-side single-page app (SPA) built using pure HTML, Vanilla CSS, and JavaScript. It provides a visual calendar tracker, progress dashboard, resource reference list, dynamic project picker, settings controls, and a smart rollover scheduling engine.

## Features

1. **Hacker Theme Design**: Cyberpunk styling featuring custom dark navy/black background, neon cyan and green accents, glassmorphic card grids, monospace visual badges, subtle typing status quotes, and CRT scanline animations.
2. **Dynamic Rollover Engine**: Force rollover on any day by clicking **"I didn't finish today"** in the day detail drawer. Incomplete tasks dynamically roll over and cascade forward to future days, capping the scheduled hours per day to your maximum limit (default 8 hours).
3. **At-Risk System Alert**: Flashes a red warning banner if your accumulated rollovers overflow beyond your target completion date of September 1, 2025.
4. **Palana Project Toggle**: Easily include or exclude the 8 hours/week Palana Safety Project (Position Pending). Toggling it OFF automatically removes the weekly blocks and reflows your study hours, freeing up time or making space for overflow.
5. **Interactive Metrics**: Real-time computation of overall task completion percentage, current daily streak, LeetCode Blind 75 checklist counter, Professor Messer Security+ logged hours, and certification exam check-offs.
6. **Syllabus Lists**: Access chronological checklists of curriculum items for PortSwigger, AWS practitioner prep, Security+, and projects, all linked directly to the learning platforms.
7. **Retro Synthesized Sounds**: Uses the HTML5 Web Audio API to play offline click, success, warning, and reset retro synth chimes directly in your browser.

## File Structure

```
cybersecurity-study-plan/
├── index.html        # Main HTML layout, dashboards, modals, drawers
├── style.css         # Styling system, responsive grid, visual effects
├── app.js            # Scheduling rules, rollover algorithms, state engine
├── blind75.js        # Blind 75 questions database with URLs
├── export.js         # Excel (.xlsx) + CSV export engine (live snapshot)
└── README.md         # Documentation and instructions (this file)
```

## Excel / CSV Export

The **Reports // Data_Export** panel on the dashboard turns your *live* plan into a
polished, multi-sheet Excel workbook (or a simple CSV) — entirely in the browser,
with no server.

- **Download Excel** — generates `Cybersecurity_Summer_Study_Plan_<download-date>.xlsx`
  with 10 worksheets: Dashboard Summary, Full Schedule, Completed Tasks,
  Unfinished &amp; Rescheduled, Weekly Progress, Certifications, LeetCode 75,
  Projects, Resources, and Settings &amp; Availability.
- **Download CSV** — exports the Full Schedule sheet only, for quick/simple use.
- **Export Options…** — choose a scope (full / current week / custom date range /
  completed-only / unfinished-only / certifications-only / projects-only), toggle
  categories (AHF, Palana, INFO 310, LeetCode, optional, skipped, resource links,
  notes), and see a **live preview** of task count, date range, worksheets, and hours
  before downloading.

The workbook always reflects the current saved state — task edits, completion
updates, rescheduling, removed optional tasks, and settings. It includes bold/frozen
headers, autofilters, clickable hyperlinks, date/hour/percent number formats,
alternating row shading, in-cell progress bars, and **status-based conditional
colors** (Completed = green, In Progress = blue, Partial = yellow, Rescheduled =
orange, Overdue/High-Risk = red, Skipped = gray) with the written status always kept
for accessibility. A **"Last Excel export"** timestamp is shown on the dashboard.

> Excel generation uses [ExcelJS](https://github.com/exceljs/exceljs) and
> [FileSaver.js](https://github.com/eligrey/FileSaver.js), lazy-loaded from a CDN on
> first export. (Charts: because no reliable serverless library can embed native
> Excel charts, visuals are rendered as colored cells and in-cell bars; select any
> table and use Excel's *Insert ▸ Chart* for native charts.)

## Running the Dashboard

Simply open the `index.html` file in any modern web browser.

No installation, build steps, or dependencies are required. All assets are loaded locally or from Google Fonts. 

To run a lightweight development server locally, you can use:
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

## Verification & Testing

### Verification Checklist

- **Date Scope**: Ensure the study calendar displays days from June 13, 2025 to September 1, 2025.
- **Routines Integrity**:
  - AHF Tech Lead work (1h) scheduled on all 81 days.
  - LeetCode problem (0.5h) scheduled on all days (skipped on Sundays and doubled on Mondays).
  - INFO 310 class (1h) scheduled on weekdays between June 22 and August 21.
  - Palana Project (1.5h Mon-Thu, 2h Fri) scheduled when toggled ON.
- **India Trip (June 24 - July 8)**: Verify that scheduled study hours during this 15-day window are capped at 2.5h on weekdays and 1.5h on weekends. Only routines (AHF, LeetCode, INFO 310) are included; no PortSwigger or certifications are scheduled.
- **Rollover Cascade**:
  - Go to Day 1 (June 13), uncheck all tasks, and click "Force Rollover // I didn't finish today".
  - Verify that those tasks are moved to June 14.
  - Test cascading: Uncheck several heavy days in a row and click rollover. Verify that tasks shift forward and do not stack beyond 8 hours/day, pushing the schedule out.
  - Overflow the schedule past Sept 1st to verify the warning banner appears.
