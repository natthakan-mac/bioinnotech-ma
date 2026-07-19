# BioInnotech MA — Design System & UI Guide

This document defines the core visual guidelines, tokens, typography, colors, and component styles used in the **BioInnotech MA** system. 

---

## 1. Design Philosophy
The interface uses a **Premium Glassmorphic / Minimalist** aesthetic:
* **Glassmorphism**: Soft background blurs (`backdrop-filter`), thin translucent borders (`rgba(0, 0, 0, 0.1)`), and light background transparency (`rgba(255, 255, 255, 0.85)`).
* **High Contrast Elements**: Accent lines, bold titles, and structural buttons use deep black (`#111111`) for a modern, state-of-the-art contrast.
* **Responsive Layouts**: Designed mobile-first, using sticky headers, bottom navigation bubbles, and collapsible segments.

---

## 2. Core Style Tokens (CSS Variables)

Defined under the `:root` pseudo-class:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `--bg-color` | `#f5f5f5` | Default page background |
| `--text-color` | `#111111` | Primary text and headers |
| `--text-muted` | `#666666` | Secondary labels and metadata |
| `--primary-color` | `#111111` | Core theme branding color |
| `--primary-hover` | `#333333` | Buttons and links active state |
| `--secondary-color` | `#e0e0e0` | Secondary backgrounds & inactive tabs |
| `--success-color` | `#1a7a3a` | Active stats & success alerts |
| `--danger-color` | `#c0392b` | Destructive buttons and errors |
| `--glass-bg` | `rgba(255, 255, 255, 0.85)` | Modal and panel overlays |
| `--glass-border` | `rgba(0, 0, 0, 0.1)` | Fine border separators |
| `--card-bg` | `rgba(255, 255, 255, 0.9)` | Dashboard cards base |
| `--radius-lg` | `16px` | Container and modal rounding |
| `--radius-md` | `8px` | Small elements (inputs, items) |
| `--font-main` | `'Outfit', 'Prompt', sans-serif` | App-wide typeface |

---

## 3. Typography Hierarchy

* **Primary Font Family**: `'Outfit', 'Prompt', sans-serif`
  * `Outfit`: Used for English terms, numbers, dates, codes, and counts.
  * `Prompt`: Soft Sans-serif typeface customized for clear Thai language reading.
* **Global Base Size**: `14px` for optimal data density and mobile responsiveness.

---

## 4. Maintenance & Case Theme Colors

Different types of maintenance logs use specific badge patterns (colors and icons) for quick scanning:

### Category Theme Map

| Category (Thai) | Category (Eng) | Color Code | Background (Hex) | Icon Class |
| :--- | :--- | :--- | :--- | :--- |
| **ซ่อม** | Repair | `#dc2626` | `#fee2e2` | `fa-hammer` |
| **ติดตั้ง** | Installation | `#15803d` | `#dcfce7` | `fa-plus-square` |
| **รื้อถอน** | Uninstall | `#b45309` | `#fef3c7` | `fa-truck-ramp-box` |
| **ตามสัญญาจ้าง** | PM / Contract | `#7c3aed` | `#ede9fe` | `fa-screwdriver-wrench` |
| **ตามใบสั่งซื้อ** | Purchase Order | `#0891b2` | `#cffafe` | `fa-triangle-exclamation` |
| **อื่นๆ** | Other | `#64748b` | `rgba(100,116,139,0.12)`| `fa-wrench` |

### Case Status Theme Map

| Status (English) | Status (Thai) | Accent Color | Text/Badge Bg |
| :--- | :--- | :--- | :--- |
| **Open** | เปิดงาน | `#ca8a04` | `rgba(234, 179, 8, 0.15)` |
| **On Process** | กำลังดำเนินการ | `#f97316` | `rgba(249, 115, 22, 0.15)` |
| **Done** / **Completed** | เสร็จสิ้น | `#a855f7` | `rgba(168, 85, 247, 0.15)` |
| **Case Closed** | ปิดเคส | `#22c55e` | `rgba(34, 197, 94, 0.15)` |
| **Cancel** | ยกเลิก | `#ef4444` | `rgba(239, 68, 68, 0.15)` |

---

## 5. Modal Z-Index Layer Standards

To avoid overlay collision and ensure alerts show correctly over inputs, the overlay z-indices are standardized:

```css
.modal-layer-base    { z-index: 2000 !important; }  /* Detail logs views */
.modal-layer-form    { z-index: 2100 !important; }  /* Create / Edit Form modals */
.modal-layer-action  { z-index: 2200 !important; }  /* Action modals (signature/image crop) */
.modal-layer-confirm { z-index: 2300 !important; }  /* Confirmation & alert popups */
.modal-layer-top     { z-index: 10050 !important; } /* Heavy system dialogs */
```

---

## 6. Components Guidelines

### Glass Panels (`.glass-panel`)
Containers (such as dashboard cards and modals) use soft background blurs to layer over background elements:
```css
background: var(--glass-bg);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid var(--glass-border);
border-radius: var(--radius-lg);
```

### Action Buttons
* **Primary Button (`.btn-primary` / `.glass-btn-primary`)**: Black background with sharp white contrast on hover.
* **Secondary Button (`.btn-secondary` / `.glass-btn-secondary`)**: Clean white card border with soft gray fill on hover.
* **Danger Button (`.btn-danger` / `.glass-btn-danger`)**: Light red fill or white border changing to red text/background on hover.
