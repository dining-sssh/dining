-- ==============================================================================
-- AMU DINING HALL MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 14+ / Supabase
-- Two-Level Admin (Provost, Munshi) & Student Portal
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('provost', 'munshi', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE hostel_house AS ENUM ('HM', 'BH', 'QH', 'KH', 'AK', 'MB');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE (Admins and Students authentication records)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STUDENTS TABLE
-- Houses:
-- HM: Hasrat Mohani hostel
-- BH: Bhopal house
-- QH: Qidwai hostel
-- KH: Kashmir house
-- AK: Agha khan house
-- MB: Mahamoodabad house
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    house hostel_house NOT NULL,
    room_no TEXT NOT NULL,
    course TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    previous_room TEXT,
    phone TEXT,
    session TEXT NOT NULL DEFAULT '2026-2027',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'passed_out')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_enrollment ON public.students(enrollment_no);
CREATE INDEX IF NOT EXISTS idx_students_house ON public.students(house);
CREATE INDEX IF NOT EXISTS idx_students_session ON public.students(session);

-- 4. DINING DAILY RECORDS (Day-wise meal attendance register)
CREATE TABLE IF NOT EXISTS public.dining_daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_no TEXT NOT NULL,
    date DATE NOT NULL,
    eaten BOOLEAN DEFAULT true NOT NULL, -- Whole day dining status: Eaten (true) or Not Eaten (false)
    lunch BOOLEAN DEFAULT true,
    dinner BOOLEAN DEFAULT true,
    is_rebate BOOLEAN DEFAULT false NOT NULL,
    rebate_reason TEXT,
    guest_diets INT DEFAULT 0 CHECK (guest_diets >= 0),
    marked_by TEXT DEFAULT 'munshi',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_day UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dining_date ON public.dining_daily_records(date);
CREATE INDEX IF NOT EXISTS idx_dining_student_date ON public.dining_daily_records(student_id, date);

-- 5. MONTHLY BILLS
CREATE TABLE IF NOT EXISTS public.monthly_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_no TEXT NOT NULL,
    session TEXT NOT NULL DEFAULT '2026-2027',
    month_name TEXT NOT NULL, -- e.g. "November 2026"
    month_key TEXT NOT NULL,  -- e.g. "2026-11"
    total_diets INT NOT NULL DEFAULT 0,
    rebate_days INT NOT NULL DEFAULT 0,
    diet_rate NUMERIC(10, 2) NOT NULL DEFAULT 65.00,
    diet_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fixed_charges NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    establishment_charges NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    extras NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
    payment_date DATE,
    receipt_no TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_month UNIQUE(student_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_bills_student_month ON public.monthly_bills(student_id, month_key);
CREATE INDEX IF NOT EXISTS idx_bills_session ON public.monthly_bills(session);

-- 6. REBATE REQUESTS (Student mess off requests)
CREATE TABLE IF NOT EXISTS public.rebate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_no TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MESS SETTINGS (Controlled by Provost)
CREATE TABLE IF NOT EXISTS public.mess_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session TEXT NOT NULL UNIQUE DEFAULT '2026-2027',
    diet_rate NUMERIC(10, 2) NOT NULL DEFAULT 65.00,
    fixed_charges NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    establishment_charges NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    provost_name TEXT NOT NULL DEFAULT 'Prof. Zameeruddin Khan',
    munshi_name TEXT NOT NULL DEFAULT 'Janab Ashfaq Ahmad (Senior Munshi)',
    hall_name TEXT NOT NULL DEFAULT 'Sir Syed Hall (South)',
    min_rebate_days INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. INITIAL SEED DATA
INSERT INTO public.mess_settings (session, diet_rate, fixed_charges, establishment_charges, provost_name, munshi_name, hall_name, min_rebate_days)
VALUES ('2026-2027', 65.00, 500.00, 350.00, 'Prof. Zameeruddin Khan', 'Janab Ashfaq Ahmad (Senior Munshi)', 'Sir Syed Hall (South)', 3)
ON CONFLICT (session) DO NOTHING;

-- Seed Sample Students
INSERT INTO public.students (enrollment_no, name, house, room_no, course, email, previous_room, session, status)
VALUES 
('GJ1021', 'Tariq Anwar', 'HM', '14', 'B.Tech (Computer Engg)', 'tariq.anwar@myamu.ac.in', '08', '2026-2027', 'active'),
('GJ1045', 'Zaid Farooqui', 'BH', '22', 'MCA', 'zaid.farooqui@myamu.ac.in', '15', '2026-2027', 'active'),
('GK2219', 'Saad Qureshi', 'QH', '05', 'M.Sc (Physics)', 'saad.qureshi@myamu.ac.in', 'New Allotment', '2026-2027', 'active'),
('GL3412', 'Hamza Rizvi', 'KH', '31', 'MBBS', 'hamza.rizvi@myamu.ac.in', '19', '2026-2027', 'active'),
('GM5501', 'Arham Siddiqui', 'AK', '12', 'B.A. (English)', 'arham.siddiqui@myamu.ac.in', '03', '2026-2027', 'active'),
('GN6782', 'Bilal Masood', 'MB', '40', 'B.Com (Hons)', 'bilal.masood@myamu.ac.in', '33', '2026-2027', 'active'),
('GJ1088', 'Owais Khan', 'HM', '18', 'B.Tech (Mechanical)', 'owais.khan@myamu.ac.in', '04', '2026-2027', 'active'),
('GK2254', 'Danish Ali', 'BH', '29', 'Diploma Engg', 'danish.ali@myamu.ac.in', 'New Allotment', '2026-2027', 'active')
ON CONFLICT (enrollment_no) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_settings ENABLE ROW LEVEL SECURITY;

-- Public RLS Policies for Supabase anon/authenticated clients
CREATE POLICY "Allow public read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full students" ON public.students FOR ALL USING (true);

CREATE POLICY "Allow public read records" ON public.dining_daily_records FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full records" ON public.dining_daily_records FOR ALL USING (true);

CREATE POLICY "Allow public read bills" ON public.monthly_bills FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full bills" ON public.monthly_bills FOR ALL USING (true);

CREATE POLICY "Allow public read rebates" ON public.rebate_requests FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full rebates" ON public.rebate_requests FOR ALL USING (true);

CREATE POLICY "Allow public read settings" ON public.mess_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full settings" ON public.mess_settings FOR ALL USING (true);
