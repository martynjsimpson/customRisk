# Tweaks Logs
This file lists a number of tweaks/ changes that have been identified. Each item is listed below.

# Tasks
## T-01
Area: Frontend

Description: I feel like the "Settings" tab should probably live as a sub-tab of Configuration. i.e. along side Fields and Scoring. The sub-tabs should be in the following order 1. Settings, 2. Fields 3. Scoring.

Status: Done

## T-02
Area: Frontend

Description: The left nav-bar should be collapsible/ shrinkable to allow for more screen real estate. Each nav item should be given an icon that makes sense and add a button to allow the nav to be switched between full mode (showing icon and label) and minimal (just icon + tooltip).

Status: Done

Icons assigned:
- Home → IconHome
- My Risks → IconShield
- Registers → IconBook
- Audit → IconHistory
- Users → IconUsers
- Toggle → IconLayoutSidebarLeftCollapse / IconLayoutSidebarLeftExpand

Full mode: 240px wide, icon + label. Collapsed mode: 60px wide, icon only with right-side Tooltip. Toggle button sits at the bottom of the sidebar with its own tooltip.