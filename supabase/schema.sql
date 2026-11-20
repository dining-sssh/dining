-- =============================================================================
-- Sulaiman Hall Dining System: Supabase schema
-- Run this whole file once in  Supabase Dashboard > SQL Editor > New query.
-- Then run supabase/seed.sql (your people: provost, munshi, students).
--
-- Safe to run again: every statement is "if not exists" / "or replace".
-- If you ran the OLD schema.sql before, uncomment the RESET block first.
-- =============================================================================

-- ---- RESET (optional, deletes all data!) ------------------------------------
-- drop table if exists public.food_reviews, public.payment_slips, public.rebate_requests,
--   public.monthly_bills, public.dining_daily_records, public.mess_settings,
--   public.staff_users, public.students, public.profiles cascade;
-- drop type if exists user_role, hostel_house;
-- -----------------------------------------------------------------------------

-- The app creates ids like 'rec-<student>-<date>' itself, so ids are TEXT (not uuid).

-- 1. STAFF (who is Provost / Munshi). Everyone else must be a student below.
create table if not exists public.staff_users (
  email      text primary key check (email = lower(email)),
  role       text not null check (role in ('provost', 'munshi')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- 2. STUDENTS (login for students is matched on `email`)
create table if not exists public.students (
  id            text primary key default gen_random_uuid()::text,
  enrollment_no text not null unique check (enrollment_no = upper(enrollment_no)),
  name          text not null,
  house         text not null check (house in ('HM', 'BH', 'QH', 'KH', 'AK', 'MB')),
  room_no       text not null,
  course        text not null,
  email         text not null unique check (email = lower(email)),
  previous_room text,
  phone         text,
  session       text not null default '2026-2027',
  status        text not null default 'active' check (status in ('active', 'suspended', 'passed_out')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_students_house on public.students (house);

-- 3. DAY-WISE DINING REGISTER (one row per student per day)
create table if not exists public.dining_daily_records (
  id            text primary key,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  date          date not null,
  eaten         boolean not null default false,
  lunch         boolean default false,
  dinner        boolean default false,
  is_rebate     boolean not null default false,
  rebate_reason text,
  guest_diets   int not null default 0 check (guest_diets >= 0),
  marked_by     text,
  updated_at    timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists idx_records_date on public.dining_daily_records (date);

-- 4. MONTHLY BILLS (made by generate_monthly_bills() below)
create table if not exists public.monthly_bills (
  id                    text primary key,
  student_id            text not null references public.students (id) on delete cascade,
  enrollment_no         text not null,
  session               text not null,
  month_name            text not null,           -- 'November 2026'
  month_key             text not null,           -- '2026-11'
  total_diets           int not null default 0,
  rebate_days           int not null default 0,
  diet_rate             numeric(10, 2) not null,
  diet_amount           numeric(10, 2) not null,
  fixed_charges         numeric(10, 2) not null,
  establishment_charges numeric(10, 2) not null,
  extras                numeric(10, 2) not null default 0,
  total_amount          numeric(10, 2) not null,
  status                text not null default 'pending' check (status in ('paid', 'pending', 'overdue')),
  payment_date          date,
  receipt_no            text,
  created_at            timestamptz not null default now(),
  unique (student_id, month_key)
);
create index if not exists idx_bills_enrollment on public.monthly_bills (enrollment_no);

-- 5. FOOD CHARGES SLIPS (every deposit the Munshi receives)
create table if not exists public.payment_slips (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  book_no       text not null,
  slip_no       text not null unique,            -- printed as "R. No."
  amount        numeric(10, 2) not null check (amount > 0),
  breakup       int[],                           -- {1600,1400} is written as 1600 + 1400 = 3000/-
  paid_on       date not null,
  cashier       text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_slips_enrollment on public.payment_slips (enrollment_no);

-- 6. REBATE / MESS OFF REQUESTS
create table if not exists public.rebate_requests (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  student_name  text not null,
  start_date    date not null,
  end_date      date not null,
  reason        text not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

-- 7. RATES AND POLICIES (edited by the Provost)
create table if not exists public.mess_settings (
  session               text primary key,
  diet_rate             numeric(10, 2) not null default 65,
  fixed_charges         numeric(10, 2) not null default 500,
  establishment_charges numeric(10, 2) not null default 350,
  provost_name          text not null default 'Provost',
  munshi_name           text not null default 'Munshi',
  hall_name             text not null default 'Sir Shah Sulaiman Hall',
  min_rebate_days       int not null default 3,
  updated_at            timestamptz not null default now()
);

-- 8. FOOD AND CLEANLINESS REVIEWS
create table if not exists public.food_reviews (
  id                 text primary key default gen_random_uuid()::text,
  student_id         text not null references public.students (id) on delete cascade,
  student_name       text not null,
  enrollment_no      text not null,
  date               date not null,
  meal_type          text not null check (meal_type in ('lunch', 'dinner', 'all_day')),
  quality_rating     smallint not null check (quality_rating between 1 and 5),
  quantity_rating    smallint not null check (quantity_rating between 1 and 5),
  taste_rating       smallint not null check (taste_rating between 1 and 5),
  cleanliness_rating smallint not null check (cleanliness_rating between 1 and 5),
  cleanliness_house  text not null check (cleanliness_house in ('HM', 'BH', 'QH', 'KH', 'AK', 'MB')),
  overall_rating     numeric(2, 1) not null,
  comments           text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_reviews_date on public.food_reviews (date);

-- =============================================================================
-- WHO IS LOGGED IN (read from the Google login token)
-- =============================================================================
create or replace function public.jwt_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff_users where email = public.jwt_email() limit 1
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where email = public.jwt_email())
$$;

create or replace function public.is_provost() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where email = public.jwt_email() and role = 'provost')
$$;

create or replace function public.my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.students where email = public.jwt_email() limit 1
$$;

-- =============================================================================
-- GRANTS
-- Since 30 Oct 2026 Supabase no longer gives new tables to the API roles on its own.
-- Without these lines every request fails with "42501 permission denied for table".
-- Only logged-in users (role "authenticated") get access; Row Level Security below
-- then decides which rows each person can see. Nothing is granted to "anon".
-- =============================================================================
grant usage on schema public to authenticated;

grant select                         on public.staff_users          to authenticated;
grant select, insert, update, delete on public.students             to authenticated;
grant select, insert, update, delete on public.dining_daily_records to authenticated;
grant select, insert, update, delete on public.monthly_bills        to authenticated;
grant select, insert, update, delete on public.payment_slips        to authenticated;
grant select, insert, update, delete on public.rebate_requests      to authenticated;
grant select, insert, update, delete on public.mess_settings        to authenticated;
grant select, insert, update, delete on public.food_reviews         to authenticated;

grant execute on function public.jwt_email()    to authenticated;
grant execute on function public.staff_role()   to authenticated;
grant execute on function public.is_staff()     to authenticated;
grant execute on function public.is_provost()   to authenticated;
grant execute on function public.my_student_id() to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- Nobody without a login can read or write anything. A student sees only their
-- own rows. Provost and Munshi (rows in staff_users) can manage everything,
-- except that only the Provost can change rates and delete slips or reviews.
-- =============================================================================
alter table public.staff_users          enable row level security;
alter table public.students             enable row level security;
alter table public.dining_daily_records enable row level security;
alter table public.monthly_bills        enable row level security;
alter table public.payment_slips        enable row level security;
alter table public.rebate_requests      enable row level security;
alter table public.mess_settings        enable row level security;
alter table public.food_reviews         enable row level security;

drop policy if exists staff_read_self on public.staff_users;
create policy staff_read_self on public.staff_users for select to authenticated
  using (email = public.jwt_email() or public.is_provost());

-- students
drop policy if exists students_read on public.students;
create policy students_read on public.students for select to authenticated
  using (public.is_staff() or email = public.jwt_email());
drop policy if exists students_write on public.students;
create policy students_write on public.students for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- dining register
drop policy if exists records_read on public.dining_daily_records;
create policy records_read on public.dining_daily_records for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists records_write on public.dining_daily_records;
create policy records_write on public.dining_daily_records for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- bills
drop policy if exists bills_read on public.monthly_bills;
create policy bills_read on public.monthly_bills for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists bills_write on public.monthly_bills;
create policy bills_write on public.monthly_bills for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- slips
drop policy if exists slips_read on public.payment_slips;
create policy slips_read on public.payment_slips for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists slips_insert on public.payment_slips;
create policy slips_insert on public.payment_slips for insert to authenticated
  with check (public.is_staff());
drop policy if exists slips_modify on public.payment_slips;
create policy slips_modify on public.payment_slips for update to authenticated
  using (public.is_provost()) with check (public.is_provost());
drop policy if exists slips_delete on public.payment_slips;
create policy slips_delete on public.payment_slips for delete to authenticated
  using (public.is_provost());

-- rebate requests: a student can only ask for themselves, staff decide
drop policy if exists rebates_read on public.rebate_requests;
create policy rebates_read on public.rebate_requests for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists rebates_insert on public.rebate_requests;
create policy rebates_insert on public.rebate_requests for insert to authenticated
  with check (public.is_staff() or (student_id = public.my_student_id() and status = 'pending'));
drop policy if exists rebates_update on public.rebate_requests;
create policy rebates_update on public.rebate_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- settings: everyone logged in can read, Provost changes
drop policy if exists settings_read on public.mess_settings;
create policy settings_read on public.mess_settings for select to authenticated using (true);
drop policy if exists settings_write on public.mess_settings;
create policy settings_write on public.mess_settings for all to authenticated
  using (public.is_provost()) with check (public.is_provost());

-- reviews: every student sees the overall ratings, but can only post as themselves
drop policy if exists reviews_read on public.food_reviews;
create policy reviews_read on public.food_reviews for select to authenticated using (true);
drop policy if exists reviews_insert on public.food_reviews;
create policy reviews_insert on public.food_reviews for insert to authenticated
  with check (public.is_staff() or student_id = public.my_student_id());
drop policy if exists reviews_modify on public.food_reviews;
create policy reviews_modify on public.food_reviews for update to authenticated
  using (public.is_provost()) with check (public.is_provost());
drop policy if exists reviews_delete on public.food_reviews;
create policy reviews_delete on public.food_reviews for delete to authenticated
  using (public.is_provost());

-- =============================================================================
-- MONTHLY BILLS
-- select public.generate_monthly_bills('2026-11');
-- Makes (or refreshes) the bill of every active student for that month from the
-- day-wise register and the current rates. Payment status is never touched.
-- Also available as the "Generate bills" button on the Provost > Billing page.
-- =============================================================================
create or replace function public.generate_monthly_bills(p_month text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_start   date;
  v_end     date;
  v_session text;
  v_rate    numeric;
  v_fixed   numeric;
  v_estb    numeric;
  v_count   integer;
begin
  if not public.is_staff() then
    raise exception 'Only the Provost or Munshi can generate bills';
  end if;
  if p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Month must look like 2026-11';
  end if;

  v_start := to_date(p_month || '-01', 'YYYY-MM-DD');
  v_end   := (v_start + interval '1 month')::date;

  -- The dining year runs August to July.
  v_session := case
    when extract(month from v_start) >= 8
      then extract(year from v_start)::int || '-' || (extract(year from v_start)::int + 1)
    else (extract(year from v_start)::int - 1) || '-' || extract(year from v_start)::int
  end;

  select diet_rate, fixed_charges, establishment_charges
    into v_rate, v_fixed, v_estb
  from public.mess_settings
  order by (session = v_session) desc, updated_at desc
  limit 1;

  if v_rate is null then
    raise exception 'No row in mess_settings. Run the schema file again.';
  end if;

  insert into public.monthly_bills as b
    (id, student_id, enrollment_no, session, month_name, month_key,
     total_diets, rebate_days, diet_rate, diet_amount,
     fixed_charges, establishment_charges, extras, total_amount)
  select
    'bill-' || s.id || '-' || p_month,
    s.id, s.enrollment_no, v_session, to_char(v_start, 'FMMonth YYYY'), p_month,
    x.diets, x.rebate_days, v_rate, x.diets * v_rate,
    v_fixed, v_estb, 0, x.diets * v_rate + v_fixed + v_estb
  from public.students s
  cross join lateral (
    select
      coalesce(count(*) filter (where r.eaten and not r.is_rebate), 0)::int
        + coalesce(sum(r.guest_diets), 0)::int          as diets,
      coalesce(count(*) filter (where r.is_rebate), 0)::int as rebate_days
    from public.dining_daily_records r
    where r.student_id = s.id and r.date >= v_start and r.date < v_end
  ) x
  where s.status = 'active'
  on conflict (student_id, month_key) do update set
    total_diets           = excluded.total_diets,
    rebate_days           = excluded.rebate_days,
    diet_rate             = excluded.diet_rate,
    diet_amount           = excluded.diet_amount,
    fixed_charges         = excluded.fixed_charges,
    establishment_charges = excluded.establishment_charges,
    total_amount          = excluded.total_amount;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.generate_monthly_bills(text) to authenticated;

-- =============================================================================
-- DEFAULT RATES (change later from Provost > Rates & policies)
-- =============================================================================
insert into public.mess_settings (session, diet_rate, fixed_charges, establishment_charges)
values ('2026-2027', 65, 500, 350)
on conflict (session) do nothing;

-- Make the API pick up the new tables and permissions right away.
notify pgrst, 'reload schema';
