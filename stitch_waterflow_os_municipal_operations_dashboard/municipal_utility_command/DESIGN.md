---
name: Municipal Utility Command
colors:
  surface: '#f5faff'
  surface-dim: '#d3dbe2'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf5fc'
  surface-container: '#e7eff6'
  surface-container-high: '#e1e9f0'
  surface-container-highest: '#dbe4ea'
  on-surface: '#151d22'
  on-surface-variant: '#424752'
  inverse-surface: '#293137'
  inverse-on-surface: '#eaf2f9'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#115cb9'
  primary: '#003f87'
  on-primary: '#ffffff'
  primary-container: '#0056b3'
  on-primary-container: '#bbd0ff'
  inverse-primary: '#acc7ff'
  secondary: '#0060ab'
  on-secondary: '#ffffff'
  secondary-container: '#3298fe'
  on-secondary-container: '#002f59'
  tertiary: '#324900'
  on-tertiary: '#ffffff'
  tertiary-container: '#456200'
  on-tertiary-container: '#b6de6a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004491'
  secondary-fixed: '#d3e3ff'
  secondary-fixed-dim: '#a3c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004882'
  tertiary-fixed: '#c8f17a'
  tertiary-fixed-dim: '#add461'
  on-tertiary-fixed: '#131f00'
  on-tertiary-fixed-variant: '#364e00'
  background: '#f5faff'
  on-background: '#151d22'
  surface-variant: '#dbe4ea'
typography:
  headline-xl:
    fontFamily: Public Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
  label-md:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Public Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies the rigor, composure, and clarity required in municipal infrastructure governance. Built for civil engineers, SCADA monitors, dispatchers, and city administrators, the aesthetic aligns with a refined Corporate/Mission-Critical standard: razor-sharp visual hierarchy, high cognitive scanability, and zero decorative excess.

The system projects civic stewardship, industrial reliability, and rapid incident response capability. Visual weight is strictly calibrated to distinguish routine automated flow from anomalies, leaks, and critical pressure drops across regional networks.

## Colors
The color architecture enforces operational legibility across dense telemetry surfaces, maps, and event logs.

- **Background Canvas:** Alice Blue (`#F0F8FF`) establishes a calm, glare-resistant operational backdrop for multi-monitor command rooms.
- **Surfaces & Containers:** Pure White (`#FFFFFF`) isolates cards, toolbars, and operational blocks against the canvas.
- **Primary / Brand Action:** Deep Blue (`#0056B3`) commands high-priority navigation bars, main action triggers, and active system switches.
- **Accent / Interactive:** Vibrant Blue (`#3399FF`) indicates active selection states, telemetry chart focus lines, live stream indicators, and secondary actionable controls.
- **Telemetry & Safety States:**
  - **Positive Status / High Equity:** Olive Green (`#6B8E23`) indicates nominal flow, compliant pressure zones, and regular facility operation.
  - **Warning / Vulnerability / Urgency:** Warm Amber (`#C27A29`) designates threshold deviations, planned valve maintenance, and moderate pressure variances.
  - **Critical Incident:** Deep Red (`#D32F2F`) is reserved strictly for high-severity anomalies, main line breaks, backflow risks, and system failovers.
- **Typography & Structure:**
  - **Heading Text:** `#1A1A1A` delivers maximum contrast for operational headings and status callouts.
  - **Secondary / Metadata Text:** `#4A4A4A` provides legible balance for labels, timestamps, and sensor hardware IDs.
  - **Borders & Dividers:** Subtle cool-grey/blue borders (`#DDE7F0` and `#E2EDF7`) define boundaries without visual clutter.

## Typography
Typographic discipline prioritizes readability at distance and instant identification of numeric values.

- **Primary Interface Typography:** Public Sans provides an authoritative, neutral geometric presence with open counters and distinct glyphs, preventing confusion between `0`, `O`, `1`, `l`, and `I` under high-stress operating environments.
- **Telemetry, Metrics & Identifiers:** JetBrains Mono is strictly enforced for all flow rates (GPM, PSI), geographic coordinates, pipe diameters, telemetry readouts, and timestamps. Tabular lining numbers (`font-variant-numeric: tabular-nums`) must remain enabled globally across all numeric presentations to prevent table row shifts during real-time data streaming.

## Layout & Spacing
The layout follows a fluid-density grid tailored for panoramic desktop command consoles, dispatch workstations, and field tablets.

- **Screen Layout Structure:** The primary command console uses a fixed, high-contrast left navigation panel (64px collapsed, 240px expanded), an application toolbar at 56px height, and a multi-panel fluid workspace capable of splitting between GIS mapping surfaces and live SCADA feed drawers.
- **Grid Calibration:**
  - **Desktop / Control Room (1280px and above):** 12-column layout with `1.5rem` margins and `1rem` gutters. High data density panels use sub-grids with `space-sm` (0.5rem) component gaps.
  - **Field Tablet (768px - 1279px):** 8-column layout with `1rem` margins and `1rem` gutters. Slide-over telemetry drawers replace persistent split panes.
  - **Mobile Dispatch (under 768px):** 4-column layout with `1rem` margins and `0.75rem` gutters. Complex multi-node tables collapse into stacked cards with direct emergency callouts.

## Elevation & Depth
Depth is created through crisp edge delineation and low-spread ambient drop shadows rather than heavy blurring, reinforcing an authoritative architectural feel.

- **Level 0 (Floor Canvas):** Flat `#F0F8FF` backdrop.
- **Level 1 (Panels, Grid Cards, Sidebars):** Background `#FFFFFF` with a 1px border of `#DDE7F0` and an ambient shadow: `0 1px 3px 0 rgba(0, 40, 80, 0.04), 0 1px 2px -1px rgba(0, 40, 80, 0.02)`.
- **Level 2 (Active Focus Cards, Selected Nodes, Dropdowns):** Background `#FFFFFF` with a 1px border of `#E2EDF7` and shadow: `0 4px 6px -1px rgba(0, 40, 80, 0.07), 0 2px 4px -2px rgba(0, 40, 80, 0.05)`.
- **Level 3 (Emergency Alert Modals, Incident Popovers, Floating GIS Palettes):** Background `#FFFFFF` with a 1px border of `#DDE7F0` and shadow: `0 12px 24px -4px rgba(0, 40, 80, 0.12), 0 4px 8px -2px rgba(0, 40, 80, 0.06)`.

## Shapes
The design system balances technical authority with modern ergonomic polish through controlled curvature:

- **Cards & Data Modules:** Configured to `rounded-xl` (1.5rem / 24px) for prominent system grouping cards, creating clear module separation on high-resolution screens. Internal data tiles and sub-sections scale back to `rounded-lg` (1rem / 16px).
- **Controls & Form Elements:** Buttons, text inputs, dropdown triggers, and filter chips use standard rounded corners (0.5rem / 8px) to preserve mechanical precision.
- **Badges & Node Indicators:** Live telemetry status indicators, valve condition pills, and emergency counters utilize fully rounded pill shapes to distinguish transient operational states from permanent structural elements.

## Components

### Command Buttons & Triggers
- **Primary Action (Dispatch / Execute / Confirm):** Solid `#0056B3` background, `#FFFFFF` text, 0.5rem radius, 10px 18px padding. Hover: `#004494`. Active/Pressed: `#003575`.
- **Secondary / Action Toolbars:** `#FFFFFF` background with 1px `#DDE7F0` border, `#0056B3` text. Hover: `#F0F8FF` background with `#3399FF` border.
- **Critical / Emergency Shutoff:** Solid `#D32F2F` background, `#FFFFFF` bold text. Focus ring: 3px solid rgba(211, 47, 47, 0.35).

### Status Badges & Operational Chips
- **Nominal / Optimal:** Background `rgba(107, 142, 35, 0.12)`, text `#6B8E23`, border `1px solid rgba(107, 142, 35, 0.25)`.
- **Advisory / Warning:** Background `rgba(194, 122, 41, 0.12)`, text `#C27A29`, border `1px solid rgba(194, 122, 41, 0.3)`.
- **Critical Alert / Breach:** Background `rgba(211, 47, 47, 0.12)`, text `#D32F2F`, border `1px solid rgba(211, 47, 47, 0.3)`. Includes a pulsating `6px` circular beacon.

### Cards & Telemetry Containers
- Cards feature a `#FFFFFF` fill, 1.5rem (`rounded-xl`) outer radius, `#DDE7F0` boundary border, and `1.25rem` internal padding.
- Card headers strictly segregate title (`#1A1A1A`, 14px uppercase bold) from tabular metric summaries (`JetBrains Mono`, `#4A4A4A`). Dividers use `#E2EDF7`.

### Inputs, Selects & SCADA Form Controls
- **Field Inputs:** `#FFFFFF` background, 1px `#DDE7F0` border, `#1A1A1A` value text, and `#4A4A4A` placeholder. Focus state transitions to 1.5px border in `#3399FF` with an ambient glow of `rgba(51, 153, 255, 0.15)`.
- **Checkboxes & Segmented Toggles:** Checked controls utilize `#0056B3` fill with white iconography. Toggle rails use `#E2EDF7` track and `#FFFFFF` thumb with subtle elevation.

### Data Tables & Stream Logs
- Headers are sticky, rendered in `#F0F8FF` with 11px uppercase `#4A4A4A` tracking.
- Row heights are calibrated to 40px (compact telemetry) or 52px (standard dispatch), with alternating hover states (`#F7FAFD`) and border separations using `#E2EDF7`.
- Numeric data columns align flush-right with monospace tabular alignment.

### GIS Command Overlay Modules
- Floating map controls feature `#FFFFFF` surface fills, 0.5rem corner radii, 1px `#DDE7F0` borders, and Level 2 elevation shadows. Interactive valve nodes utilize high-contrast icons set in `#0056B3` or `#D32F2F` depending on circuit state.