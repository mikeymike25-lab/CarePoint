<div align="center">

# CarePoint 💊
**Modern Hybrid Cross-Platform OTC Medicine Discovery & Pharmacy Management Ecosystem**

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Ionic](https://img.shields.io/badge/Ionic-8.x-3880FF?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

*Connecting community pharmacies with customers for seamless over-the-counter (OTC) medicine ordering, inventory control, and real-time order dispatch across Web, Android, and iOS.*

</div>

---

## 📌 Table of Contents
- [Overview](#-overview)
- [Key Features by Role](#-key-features-by-role)
  - [1. Customer Experience](#1-customer-experience)
  - [2. Pharmacy Staff Portal](#2-pharmacy-staff-portal)
  - [3. Platform Admin Console](#3-platform-admin-console)
- [Architecture & Security](#-architecture--security)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Running Locally](#running-locally)
  - [Mobile Builds (Android)](#mobile-builds-android)
- [Directory Structure](#-directory-structure)
- [Regulatory & Healthcare Compliance](#-regulatory--healthcare-compliance)
- [Contributing & License](#-license)

---

## 🌟 Overview

**CarePoint** solves the everyday challenge of finding and securing essential OTC medications quickly. Instead of calling or physically visiting multiple drugstores to check stock, customers can:
1. Search an authentic Philippine master medicine catalog with real-time branch stock.
2. Order for pickup or direct door-to-door delivery.
3. Track their order status in real time with live pharmacist chat.
4. Consult an AI-powered health assistant for safe, non-prescription symptom guidance.

Simultaneously, local community pharmacies gain a full digital storefront, live dispatch board, and inventory management tool, while platform administrators govern branch licensing, regulatory catalog guardrails, and audit trails.

---

## 🚀 Key Features by Role

### 1. Customer Experience (`src/customer/`)
- **Fast Medicine Discovery**: Live fuzzy search by generic name, brand name, and therapeutic category with rich dosages and indications.
- **Geolocation & Interactive Maps**: Integrated Leaflet & OpenStreetMap locator showing nearby partner pharmacies, operational status (Open/Closed), and calculated delivery fees.
- **Smart Cart & Checkout**: Multi-branch support with validation against branch operating hours, order types (**Store Pickup** or **Delivery**), and sandbox payment options (Cash on Delivery, GCash/Maya sandbox, Card test).
- **Live Order Progress Tracker**: Real-time status pipeline (`Pending` → `Confirmed` → `Ready for Pickup / Out for Delivery` → `Completed`) driven by Supabase Realtime without manual refreshing.
- **Two-Way Pharmacist Messaging**: Direct in-app chat with assigned pharmacy staff for order updates and customer assistance.
- **CarePoint AI Health Assistant**: Integrated symptom advisor powered by Google Gemini with strict non-prescription guardrails and automatic offline fallback to verified OTC catalog guidelines.
- **Account & Address Book**: Saved delivery addresses with GPS coordinates, profile settings, and full historical order receipts.

### 2. Pharmacy Staff Portal (`src/staff/`)
- **Live Order Dispatch Board**: Real-time incoming order queue featuring sound chime alerts, itemized order breakdown, delivery details, and one-click fulfillment progression (`Accept` → `Ready` → `Complete`).
- **Shelf & Inventory Management**: Custom retail pricing (`₱`), stock increment/decrement (`-1`, `+1`, `+10`, `+25`), low-stock indicators, and catalog availability toggles.
- **Inquiry & Prescription Inbox**: Split-screen messaging panel to answer customer stock queries and prescription advice securely.
- **Storefront Governance**: Toggle store open/closed status instantly, update business hours, and submit branch onboarding requests.
- **Sales Analytics & Reports**: Live revenue (GMV), average basket size, fulfillment split, top-selling medicines, and one-click CSV report exports.

### 3. Platform Admin Console (`src/admin/`)
- **Pharmacy Registry & Approvals**: Regulatory verification of submitted pharmacy branches and FDA license numbers, with automated decision emails dispatched via webhook/EmailJS.
- **Master OTC Gatekeeper**: Governance over 40+ Philippine OTC and Rx medicines, CSV import/export, and strict prescription gatekeeping.
- **Cross-Branch Order Monitor**: Real-time, read-only supervision of all active orders across all registered pharmacies.
- **User & Staff Governance**: Role administration (Customer, Staff, Pharmacy Owner, Admin) and branch assignment management.
- **Content Management System (CMS)**: Live homepage carousel banner editor with color pickers, theme presets, announcements, and FAQ controls.
- **Audit Logging & Analytics**: Tamper-proof platform audit trail (`admin_audit_log`) and financial performance metrics.

---

## 🔒 Architecture & Security

- **Strict Surface Isolation**: Customer, Staff, and Admin codebases live in distinct directories (`src/customer/`, `src/staff/`, `src/admin/`) with zero cross-surface client imports. Coordination occurs strictly through the shared Supabase backend.
- **Database-Level Row Level Security (RLS)**: Authorization is enforced directly in PostgreSQL. Users, pharmacy staff, and administrators can only query and mutate data permitted by cryptographic RLS policies.
- **OTC Regulatory Enforcement**: Prescription medications (`requires_prescription = true`) are structurally blocked at both the database trigger level and application level from being listed for online checkout.
- **Realtime Push Architecture**: Supabase Realtime websocket channels synchronize order status changes, live chat messages, and stock levels across clients instantly without polling.
- **Sandbox Financial Transactions**: Checkout flows simulate payments strictly in test/sandbox mode with zero production financial credentials.

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Ionic Framework 8 |
| **Styling & Icons** | Tailwind CSS 4, Ionicons |
| **Routing & State** | React Router 6, React Context & Hooks |
| **Mapping & Location** | Leaflet, React Leaflet, OpenStreetMap & Nominatim API |
| **AI Assistant** | Google Gemini API (`@google/genai`) with offline rule-based fallback |
| **Backend & Database** | Supabase (PostgreSQL 15, Auth, Row Level Security, Realtime) |
| **Mobile Runtime** | Capacitor 8 (Android & iOS) |
| **Build Tooling** | Vite 8, Oxlint |

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or higher recommended)
- [npm](https://www.npmjs.com/) (v10.x or higher)
- A free [Supabase](https://supabase.com/) project
- *(Optional)* [Android Studio](https://developer.android.com/studio) for native Android builds

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mikeymike25-lab/CarePoint.git
   cd CarePoint
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # Optional: Google Gemini API key for AI Chatbot
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional: Webhook for automated admin email notifications
   VITE_GMAIL_RELAY_URL=https://script.google.com/macros/s/your_deployment_id/exec
   ```

### Database Setup

1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor**.
3. Execute the migration scripts in sequential order from `supabase/migrations/`:
   - `20260904000000_initial_schema.sql`
   - `20260904000001_rls_policies.sql`
   - `20260904000002_realtime_setup.sql`
   - `20261007000015_staff_portal_rls_and_realtime.sql`
   - `20261008000019_pharmacy_inquiry_onboarding_and_email.sql`
   - `20261014000020_security_audit_and_hardening.sql`
   - `20261014000021_harden_order_items_and_inventory.sql`
   - `20261020000022_add_pharmacy_owner_role.sql`
   - `20261020000023_harden_pharmacy_owner_rls.sql`
4. *(Optional)* Seed the authentic 40-medicine catalog using `supabase/seed_master_catalog.sql` or mock data via `supabase/seed.sql`.

### Running Locally

Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:8081` (or the port specified in terminal).

### Mobile Builds (Android)

1. Build the web production assets:
   ```bash
   npm run build
   ```

2. Sync the Capacitor native Android project:
   ```bash
   npx cap sync android
   ```

3. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
   From Android Studio, you can run the app on an Android emulator or connected physical device.

---

## 📂 Directory Structure

```text
CarePoint/
├── android/                    # Capacitor Android native project & Gradle configs
├── public/                     # Static assets, SVG medicine icons, banners
├── scripts/                    # Utility scripts (catalog generators, asset helpers)
├── src/
│   ├── admin/                  # Surface 3: Admin Console (approvals, CMS, audit log)
│   │   ├── AdminApp.tsx
│   │   ├── admin.css
│   │   └── services/
│   ├── customer/               # Surface 1: Customer Portal (catalog, cart, orders)
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── staff/                  # Surface 2: Pharmacy Staff Portal (dispatch, inventory)
│   │   ├── StaffApp.tsx
│   │   ├── staff.css
│   │   └── services/
│   └── shared/                 # Shared utilities, Supabase client, Gemini AI service
│       ├── components/
│       ├── lib/
│       └── services/
├── supabase/
│   ├── migrations/             # Versioned PostgreSQL schemas, RLS, triggers
│   ├── seed.sql                # Development seed accounts
│   └── seed_master_catalog.sql # 40 authentic Philippine OTC medicines
├── .env.example                # Sanitized environment variable template
├── capacitor.config.ts         # Capacitor cross-platform configuration
├── package.json
└── vite.config.ts
```

---

## ⚖️ Regulatory & Healthcare Compliance

- **OTC Only**: CarePoint complies with pharmacy regulations by strictly restricting online checkout to over-the-counter (OTC) medicines.
- **Prescription Informational Gate**: Prescription (Rx) medicines are cataloged strictly for availability reference and pharmacist inquiries. They cannot be placed in a digital cart or checked out online.
- **Safety Fallback**: The AI assistant includes medical disclaimers and emergency hotline guidance, never diagnosing serious conditions or prescribing Rx medication.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
