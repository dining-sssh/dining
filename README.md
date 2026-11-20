# AMU Dining Hall Management System (Next.js + Supabase)

An enterprise-grade Dining Hall Management Web Application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)** for university residence halls (e.g. Aligarh Muslim University - AMU).

---

## 🌟 Key Features

### 0. Role-Based Entrance Gateway (`/`)
* **Dedicated Entrance Page**: When opening the web application, users arrive at an official entrance portal that branches between:
  * **Student Gateway**: Requires the resident's university Enrollment Number (e.g., `GJ1021`, `GJ1045`). **Strict Access Control**: Students are restricted solely to their own room, house, billing, and day-wise attendance data; they cannot view other students or access admin panels.
  * **Administrative Gateway**: Accessible to Provost (Admin L1) and Munshi (Admin L2). **Dual Access**: Administrators can manage hall operations and inspect any resident's records across all 6 hostel houses.
  * One-click **Log Out** button to return to the entrance gateway anytime.

### 1. Two-Level Administrative Hierarchy
* **Level 1 — Provost (Head Administrator)**:
  * Executive dashboard with hall KPIs: total registered diners, active meals, monthly revenue, pending dues.
  * Hostel House distribution breakdown across all 6 houses (`HM`, `BH`, `QH`, `KH`, `AK`, `MB`).
  * Student directory with search, filter, individual add, and CSV bulk import.
  * Dining rate settings: Diet Rate (₹/diet), Monthly Fixed Charges, Establishment Fees, and Provost sign-off.
  * Audit ledger and rebate (mess-off) leave approval system.
* **Level 2 — Munshi (Dining Manager / Register In-charge)**:
  * **Interactive Day-Wise Panel**: Select any date, toggle Lunch / Dinner per student, log guest diets, mark rebates.
  * **Quick Bulk Actions**: Mark All Present, Mark All Lunch, Mark All Dinner, Reset Day.
  * **30-Day Matrix Register**: Full 1–31 grid view of each resident's daily diet status (`2` = Full Diet, `1` = Single Diet, `R` = Rebate, `0` = Absent) with automatic monthly sum.
  * Print / CSV export for physical mess registers.

### 2. Student Add Option [CSV Bulk Import]
* Upload CSV files with the exact requested student schema:
  * **Enrollment Number** (`string`, e.g. `GJ1021`)
  * **House** (`string`):
    * `HM` – Hasrat Mohani hostel
    * `BH` – Bhopal house
    * `QH` – Qidwai hostel
    * `KH` – Kashmir house
    * `AK` – Agha khan house
    * `MB` – Mahamoodabad house
  * **Room Number** (`string`, e.g. `14`)
  * **Course** (`string`, e.g. `B.Tech Computer Engg`)
  * **Email** (`string`, e.g. `tariq.anwar@myamu.ac.in`)
  * **Previous Room** (`string`, e.g. `08` or `New Allotment`)
  * **Name** (`string`)
* In-app CSV parser with row-by-row validation, duplicate checks, error reporting, and a one-click **"Sample CSV Template"** download.

### 3. Student Portal (3-Tier View)
* **Per-Year Session View (e.g. 2026–2027)**:
  * Annual statistics: total diets consumed, total rebate days, total billed, amount paid, balance due.
  * Month-by-month session breakdown table (July to June).
* **Per-Month View**:
  * Detailed invoice breakdown: Diets × Rate + Fixed charges + Establishment charges - Rebates.
  * Payment receipt status (`PAID` / `PENDING`) with receipt reference.
* **Per-Day Panel**:
  * Interactive day-by-day calendar cards showing lunch status (✅ / ❌), dinner status, rebate status, and daily meal cost.
* **Rebate Request Modal**:
  * Apply for official mess-off leave with start/end dates and reason.

---

## 🚀 Quick Start Guide

### 1. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Zero Setup Demo Mode**: If Supabase credentials are not yet added, the app automatically runs in **Sync Demo Mode** using browser LocalStorage and pre-seeded student records for all 6 hostel houses.

---

## 🗄️ Supabase Database Setup

To connect your live Supabase database:

1. Create a project at [https://supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy its content, and execute it in Supabase.
4. Copy your **Project URL** and **anon public key** from `Project Settings -> API`.
5. Open `.env.local` and paste your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Restart the server (`npm run dev`). The header badge will switch to **🟢 Supabase Live**.

---

## 📁 Repository Structure

```
├── public/
│   └── sample_students.csv     # Sample CSV template for student import
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind & print styles
│   │   ├── layout.tsx          # Root layout & page metadata
│   │   └── page.tsx            # Main application shell & role router
│   ├── components/
│   │   ├── Header.tsx          # Branding & role switcher
│   │   ├── csv/
│   │   │   └── CsvUploadModal.tsx # CSV parser & validator
│   │   ├── provost/
│   │   │   ├── AddStudentModal.tsx # Single student form
│   │   │   └── ProvostDashboard.tsx # Provost administrative oversight
│   │   ├── munshi/
│   │   │   └── MunshiDashboard.tsx # Day-wise register & 30-day matrix
│   │   └── student/
│   │       └── StudentPortal.tsx   # Per-year, Per-month, Per-day views
│   ├── lib/
│   │   ├── dataService.ts      # Unified data access layer (Supabase + Local)
│   │   ├── mockData.ts         # Pre-seeded university hall records
│   │   └── supabaseClient.ts   # Supabase client initializer
│   └── types/
│       └── index.ts            # Type definitions (HostelHouseCode, Student, etc.)
├── supabase/
│   └── schema.sql              # Production SQL schema & RLS policies
└── package.json
```
