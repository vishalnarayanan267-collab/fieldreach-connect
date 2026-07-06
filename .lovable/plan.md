## Field CRM & Expense Tracker — Database Schema Plan

Backend: Lovable Cloud (Supabase/PostgreSQL). Auth: Supabase Auth (email/password by default). All tables live in `public` with RLS enabled and explicit `GRANT`s to `authenticated` + `service_role`.

### Entity Relationship Overview

```text
                    ┌────────────────────┐
                    │   auth.users       │  (Supabase Auth)
                    └─────────┬──────────┘
                              │ 1:1 (id)
                              ▼
                    ┌────────────────────┐
                    │  staff_profiles    │
                    │  id (PK = auth.uid)│
                    │  staff_name        │
                    │  role              │
                    └─────────┬──────────┘
                              │ 1:N (staff_id)
                              ▼
┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
│    h_master      │◄──┤ daily_visit_logs   │──►│   h_contacts     │
│  id (PK)         │   │  id (PK)           │   │  id (PK)         │
│  h_name          │   │  date              │   │  h_id (FK)       │
│  branch_area     │   │  staff_id (FK)     │   │  contact_name    │
│  city            │   │  h_id (FK)         │   │  designation     │
│  UNIQUE(name,    │   │  contact_met_id(FK)│   │  phone_number    │
│    area, city)   │   │  purpose           │   └────────┬─────────┘
└────────┬─────────┘   │  outcome_notes     │            │
         │ 1:N         │  travel_expense    │            │
         └────────────►│  food_expense      │            │
                       │  lodge_expense     │            │
                       │  expense_remarks   │            │
                       └────────────────────┘            │
         ▲                                               │
         └───────────────── 1:N (h_id, cascade) ─────────┘
```

### Tables

**1. `h_master` — Hospital Locations**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| h_name | text NOT NULL | |
| branch_area | text NOT NULL | e.g. Goripalayam |
| city | text NOT NULL | e.g. Madurai |
| created_at | timestamptz | default now() |
- **UNIQUE INDEX** on `(lower(h_name), lower(branch_area), lower(city))` — case-insensitive dedupe of branch profiles.

**2. `h_contacts` — Personnel Directory**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| h_id | uuid NOT NULL | FK → `h_master(id)` ON DELETE CASCADE |
| contact_name | text NOT NULL | |
| posting_designation | text NOT NULL | Chief Doctor / Assistant Doctor / Chief Technician / Personal Secretary / Purchase Manager |
| phone_number | text | |
| created_at | timestamptz | default now() |
- Index on `h_id`.

**3. `staff_profiles` — App Access**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| staff_name | text NOT NULL | |
| role | app_role enum | default `'worker'` (values: `admin`, `worker`) |
| created_at | timestamptz | default now() |
- Role stored as a Postgres enum `app_role` in a dedicated column (per project security rules, role checks use a `has_role(uid, role)` SECURITY DEFINER function to prevent recursive RLS and privilege escalation).
- Auto-created on signup via a `handle_new_user()` trigger on `auth.users`.

**4. `daily_visit_logs` — Activity & Expense Records**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| date | date NOT NULL | default `current_date` |
| staff_id | uuid NOT NULL | FK → `staff_profiles(id)` ON DELETE RESTRICT |
| h_id | uuid NOT NULL | FK → `h_master(id)` ON DELETE RESTRICT |
| contact_met_id | uuid | FK → `h_contacts(id)` ON DELETE SET NULL |
| purpose | text NOT NULL | CHECK in (Product Demo, New Order Taking, Payment Collection, Relationship Building) |
| outcome_notes | text NOT NULL | |
| travel_expense | numeric(10,2) | default 0, CHECK ≥ 0 |
| food_expense | numeric(10,2) | default 0, CHECK ≥ 0 |
| lodge_expense | numeric(10,2) | default 0, CHECK ≥ 0 |
| expense_remarks | text | |
| created_at | timestamptz | default now() |
- Indexes on `staff_id`, `h_id`, `date`.

### RLS Policy Model (proposed)
- `h_master`, `h_contacts`: any authenticated user can SELECT; INSERT/UPDATE by authenticated (workers add hospitals during field visits); DELETE admin-only.
- `staff_profiles`: user can SELECT/UPDATE own row; admin can SELECT/UPDATE all. Role changes admin-only.
- `daily_visit_logs`: worker can SELECT/INSERT/UPDATE own rows (`staff_id = auth.uid()`); admin can SELECT/UPDATE all.

### Open Questions
1. Should workers be able to **edit/delete their own past visit logs**, or is a log immutable once submitted (admin-only edits)?
2. Should **only admins add new hospitals/contacts**, or can workers create them on the fly during a visit?
3. Signup flow: **open signup** (anyone signs up as worker, admin promotes later) or **admin-invite only**?

Confirm the schema and answer the three questions above, then I'll switch to build mode and start with the migration + auth + UI.
