# 💧 BIO Water Plant Maintenance System
> **A Professional Maintenance Management Solution for BIO Water Tank Infrastructure**

![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Mobile Friendly](https://img.shields.io/badge/Responsive-Yes-success?style=for-the-badge)

---

## 📋 Overview

**BIO Water Plant Maintenance** is a comprehensive, cloud-based platform designed to streamline the management of water plant maintenance operations. It bridges the gap between Field Engineers and Operations Managers, providing real-time data synchronization and robust auditing capabilities.

The system features a **Modern Glassmorphism Design Language**, ensuring high visual clarity and a premium user experience across both Desktop and Mobile devices.

---

## ✨ Key Features

### 🏭 Infrastructure Management
- **Site Catalog**: Centralized database for all BIO Water Tank installations.
- **Thai Address Intelligence**: Automated geolocation and address population using `thai_address_data`.
- **Warranty Tracking**: Real-time monitoring of insurance and protection period status.

### 🛠️ Maintenance & Logistics
- **Smart Logging**: Rapid data entry with autocomplete for common tasks and recurring maintenance types.
- **Infinite Scrolling**: High-performance log feed with automatic data loading for seamless browsing of large datasets.
- **Hybrid View**: Toggle between a **Detail List View** (with sticky headers) and a **Calendar View** for scheduling oversight.
- **Dynamic Costing**: Real-time financial summaries based on filtered maintenance logs.

### 🛡️ Security & Enterprise Audit
- **Activity Log & Diff Engine**: A terminal-style audit trail recording all CRUD operations with precise value comparisons (Old vs New).
- **Recycle Bin**: Fail-safe deletion system allowing for data restoration and prevention of accidental data loss.
- **Session Protection**: Automatic session termination after 30 minutes of inactivity with themed notification dialogs.

### 📲 Connectivity & Attachments
- **Advanced Attachments**: Support for images and all major document formats (.pdf, .doc, .xls, .ppt, etc.) with a **25MB per-file limit**.
- **LINE Integration**: Seamless account binding for rapid authentication via the LINE Internal Browser.
- **Full-Data Export**: Reliable Excel (`.xlsx`) generation that exports entire filtered datasets, bypassing pagination limits for complete reporting.

---

## 🛠️ Technology Stack

### **Frontend Architecture**
- **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **UI Library**: Custom Glassmorphism Framework.
- **Icons**: Font Awesome 6 Pro.
- **Components**: 
  - `Flatpickr` (Localized for Thai Date/Time).
  - `SheetJS` (Excel Processing).
  - `Google Fonts` (Outfit & Prompt).

### **Backend & DevOps (Firebase)**
- **Firestore**: Real-time NoSQL document database.
- **Authentication**: Multi-provider (Email/Password & LINE OIDC).
- **Storage**: Secure asset management for blueprints and field photos.
- **Hosting**: Global CDN via Firebase Hosting.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (for local server usage)
- Firebase Account (for database/auth services)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bioinnotech/water-plant-maintenance.git
   ```

2. **Configuration**
   Edit `app.js` and update the `firebaseConfig` object with your project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "ID",
     appId: "APP_ID"
   };
   ```

3. **Development Server**
   Run via any standard web server (e.g., Live Server in VS Code):
   ```bash
   # Or using basic python server
   python -m http.server 8000
   ```

---

## 📂 Database Architecture (Firestore)

| Collection | Description | Primary Fields |
| :--- | :--- | :--- |
| `users` | Identity management | `uid`, `displayName`, `role`, `photoURL` |
| `sites` | Physical locations | `name`, `province`, `insuranceEndDate`, `attachments` |
| `logs` | Maintenance history | `siteId`, `category`, `cost`, `timestamp` |
| `action_logs` | Audit trail | `performerId`, `actionType`, `metadata`, `diff` |
| `deleted_items` | Soft-delete store | `originalCollection`, `originalId`, `deletedAt` |

---

## 📞 Support & Contact

Developed by **BIO Innotech Co., Ltd.**

- **Technical Support**: [it@bioinnotech.co.th](mailto:it@bioinnotech.co.th)
- **Official Website**: [www.bioinnotech.co.th](https://www.bioinnotech.co.th)

---
*© 2026 BIO Thailand Group. All rights reserved. Intellectual Property of BIO Innotech Co., Ltd.*
