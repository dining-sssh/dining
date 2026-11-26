-- =============================================================================
-- Sulaiman Hall Dining System: Supabase schema (per-day dining model)
-- Run this whole file in  Supabase Dashboard > SQL Editor > New query.
-- Then run supabase/seed.sql (your people: provost, munshi, students).
--
-- Safe to run again, and it upgrades an older copy of this schema in place:
-- every statement is "if not exists" / "or replace", and new columns are added
-- with "add column if not exists". Old tables the app no longer uses
-- (dining_daily_records, monthly_bills) are left alone, not deleted.
--
-- Money rule used by the app: 1 day of dining = 1400 / 30 = Rs 46.67
-- =============================================================================

-- ---- RESET (optional, deletes all data!) ------------------------------------
-- drop table if exists public.food_reviews, public.payment_slips, public.rebate_requests,
--   public.deficit_entries, public.grace_extensions, public.dining_menu, public.dining_timings,
--   public.monthly_bills, public.dining_daily_records, public.mess_settings,
--   public.staff_users, public.students, public.profiles cascade;
-- drop type if exists user_role, hostel_house;
-- -----------------------------------------------------------------------------

-- The app creates some ids itself, so ids are TEXT (not uuid).

-- 1. STAFF (who is Provost / Munshi). Everyone else must be a student below.
create table if not exists public.staff_users (
  email      text primary key check (email = lower(email)),
  role       text not null check (role in ('provost', 'munshi')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- 2. STUDENTS (login for students is matched on `email`)
create table if not exists public.students (
  id             text primary key default gen_random_uuid()::text,
  enrollment_no  text not null unique check (enrollment_no = upper(enrollment_no)),
  name           text not null,
  house          text not null,
  room_no        text not null,
  course         text not null,
  email          text not null unique check (email = lower(email)),
  previous_room  text,
  previous_house text,
  remarks        text,
  phone          text,
  session        text not null default '2026-2027',
  status         text not null default 'active' check (status in ('active', 'suspended', 'passed_out')),
  dining_from    date not null default current_date,
  created_at     timestamptz not null default now()
);
alter table public.students add column if not exists previous_house text;
alter table public.students add column if not exists remarks text;
alter table public.students add column if not exists dining_from date not null default current_date;

-- The seven hostels
alter table public.students drop constraint if exists students_house_check;
alter table public.students add constraint students_house_check
  check (house in ('HM', 'JK', 'MB', 'KH', 'BH', 'QH', 'AK'));
create index if not exists idx_students_house on public.students (house);

-- 3. DINING ON / OFF REQUESTS (table name kept from the first version)
--    kind 'off': dining is closed from start_date until an approved 'on' request.
--    kind 'on' : dining starts again from start_date.
create table if not exists public.rebate_requests (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  student_name  text not null,
  kind          text not null default 'off' check (kind in ('off', 'on')),
  start_date    date not null,
  end_date      date,
  reason        text not null default '',
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.rebate_requests add column if not exists kind text not null default 'off';
alter table public.rebate_requests alter column end_date drop not null;
alter table public.rebate_requests alter column reason set default '';
alter table public.rebate_requests drop constraint if exists rebate_requests_check;
alter table public.rebate_requests drop constraint if exists rebate_requests_kind_check;
alter table public.rebate_requests add constraint rebate_requests_kind_check check (kind in ('off', 'on'));
create index if not exists idx_requests_student on public.rebate_requests (student_id);
create index if not exists idx_requests_start_date on public.rebate_requests (start_date);

-- 4. FOOD CHARGES SLIPS (every deposit the Munshi receives)
create table if not exists public.payment_slips (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  book_no       text not null,
  slip_no       text not null unique,            -- printed as "R. No."
  amount        numeric(10, 2) not null check (amount > 0),
  breakup       int[],                           -- {1600,1400} is written as 1600 + 1400 = 3000/-
  settled_months text[],                         -- carried deficit months this slip clears, e.g. {2026-09}
  paid_on       date not null,
  cashier       text,
  created_at    timestamptz not null default now()
);
alter table public.payment_slips add column if not exists settled_months text[];
-- A payment is a printed slip, an online payment, or an old balance moved over ('adjustment').
alter table public.payment_slips add column if not exists mode text not null default 'slip';
alter table public.payment_slips add column if not exists note text;
alter table public.payment_slips drop constraint if exists payment_slips_mode_check;
alter table public.payment_slips add constraint payment_slips_mode_check check (mode in ('slip', 'online', 'adjustment'));
alter table public.payment_slips alter column book_no set default '1';
-- The old registers repeat a slip number for two students, so a number is unique per student.
-- The app still refuses a new slip whose number is already used by anyone.
alter table public.payment_slips drop constraint if exists payment_slips_slip_no_key;
create unique index if not exists payment_slips_slip_student_key on public.payment_slips (slip_no, enrollment_no);
create index if not exists idx_slips_enrollment on public.payment_slips (enrollment_no);
create index if not exists idx_slips_paid_on on public.payment_slips (paid_on);
create index if not exists idx_slips_student on public.payment_slips (student_id);

-- 5. CARRIED DEFICITS (money still owed from the old register, month by month)
create table if not exists public.deficit_entries (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  month_key     text not null check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount        numeric(10, 2) not null check (amount > 0),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_entries_student on public.deficit_entries (student_id);
create index if not exists idx_extensions_student on public.grace_extensions (student_id);
create index if not exists idx_extensions_applied_at on public.grace_extensions (applied_at);

-- 6. GRACE EXTENSIONS: the Provost allows more than -3 days, the Munshi applies it
create table if not exists public.grace_extensions (
  id            text primary key default gen_random_uuid()::text,
  student_id    text not null references public.students (id) on delete cascade,
  enrollment_no text not null,
  student_name  text not null,
  extra_days    int not null check (extra_days between 1 and 30),
  note          text,
  status        text not null default 'awaiting_munshi' check (status in ('awaiting_munshi', 'applied', 'cancelled')),
  approved_by   text,
  applied_at    date,
  created_at    timestamptz not null default now()
);
create index if not exists idx_extensions_student on public.grace_extensions (student_id);

-- 7. MENU AND TIMINGS (written by the Munshi, shown to every student)
create table if not exists public.dining_menu (
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  items      text not null default '',
  updated_at timestamptz not null default now(),
  primary key (weekday, meal)
);

create table if not exists public.dining_timings (
  meal       text primary key check (meal in ('breakfast', 'lunch', 'dinner')),
  start_time time not null,
  end_time   time not null,
  updated_at timestamptz not null default now()
);

-- 7b. HALL CLOSED DAYS (CLOSE, Sir Syed Day...): nobody is charged for these dates
create table if not exists public.hall_closed_days (
  day    date primary key,
  reason text not null default 'Hall closed'
);

-- 8. NAMES (the daily rate is fixed in the app at 1400 / 30)
create table if not exists public.mess_settings (
  session               text primary key,
  diet_rate             numeric(10, 2) not null default 46.67,
  fixed_charges         numeric(10, 2) not null default 0,
  establishment_charges numeric(10, 2) not null default 0,
  provost_name          text not null default 'Provost',
  munshi_name           text not null default 'Munshi',
  hall_name             text not null default 'Sir Shah Sulaiman Hall',
  min_rebate_days       int not null default 0,
  updated_at            timestamptz not null default now()
);

-- 9. FOOD AND CLEANLINESS REVIEWS
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
  cleanliness_house  text not null,
  overall_rating     numeric(2, 1) not null,
  comments           text,
  created_at         timestamptz not null default now()
);
alter table public.food_reviews drop constraint if exists food_reviews_cleanliness_house_check;
alter table public.food_reviews add constraint food_reviews_cleanliness_house_check
  check (cleanliness_house in ('HM', 'JK', 'MB', 'KH', 'BH', 'QH', 'AK'));
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

grant select                         on public.staff_users     to authenticated;
grant select, insert, update, delete on public.students        to authenticated;
grant select, insert, update, delete on public.rebate_requests to authenticated;
grant select, insert, update, delete on public.payment_slips   to authenticated;
grant select, insert, update, delete on public.deficit_entries to authenticated;
grant select, insert, update, delete on public.grace_extensions to authenticated;
grant select, insert, update, delete on public.dining_menu     to authenticated;
grant select, insert, update, delete on public.dining_timings  to authenticated;
grant select, insert, update, delete on public.hall_closed_days to authenticated;
grant select, insert, update, delete on public.mess_settings   to authenticated;
grant select, insert, update, delete on public.food_reviews    to authenticated;

grant execute on function public.jwt_email()     to authenticated;
grant execute on function public.staff_role()    to authenticated;
grant execute on function public.is_staff()      to authenticated;
grant execute on function public.is_provost()    to authenticated;
grant execute on function public.my_student_id() to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- Nobody without a login can read or write anything. A student sees only their
-- own rows. Provost and Munshi (rows in staff_users) can manage the records,
-- with these exceptions:
--   * only the Provost can approve a grace extension (the Munshi then applies it)
--   * only the Provost can delete reviews
-- =============================================================================
alter table public.staff_users      enable row level security;
alter table public.students         enable row level security;
alter table public.rebate_requests  enable row level security;
alter table public.payment_slips    enable row level security;
alter table public.deficit_entries  enable row level security;
alter table public.grace_extensions enable row level security;
alter table public.dining_menu      enable row level security;
alter table public.dining_timings   enable row level security;
alter table public.hall_closed_days enable row level security;
alter table public.mess_settings    enable row level security;
alter table public.food_reviews     enable row level security;

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

-- dining on / off requests: a student can only ask for themselves, staff decide
drop policy if exists rebates_read on public.rebate_requests;
create policy rebates_read on public.rebate_requests for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists rebates_insert on public.rebate_requests;
create policy rebates_insert on public.rebate_requests for insert to authenticated
  with check (public.is_staff() or (student_id = public.my_student_id() and status = 'pending'));
drop policy if exists rebates_update on public.rebate_requests;
create policy rebates_update on public.rebate_requests for update to authenticated
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
  using (public.is_staff());

-- carried deficits
drop policy if exists entries_read on public.deficit_entries;
create policy entries_read on public.deficit_entries for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists entries_write on public.deficit_entries;
create policy entries_write on public.deficit_entries for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- grace extensions: Provost approves (insert), staff apply or cancel (update)
drop policy if exists extensions_read on public.grace_extensions;
create policy extensions_read on public.grace_extensions for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
drop policy if exists extensions_insert on public.grace_extensions;
create policy extensions_insert on public.grace_extensions for insert to authenticated
  with check (public.is_provost());
drop policy if exists extensions_update on public.grace_extensions;
create policy extensions_update on public.grace_extensions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists extensions_delete on public.grace_extensions;
create policy extensions_delete on public.grace_extensions for delete to authenticated
  using (public.is_provost());

-- menu and timings: every logged-in user reads, staff write
drop policy if exists menu_read on public.dining_menu;
create policy menu_read on public.dining_menu for select to authenticated using (true);
drop policy if exists menu_write on public.dining_menu;
create policy menu_write on public.dining_menu for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists timings_read on public.dining_timings;
create policy timings_read on public.dining_timings for select to authenticated using (true);
drop policy if exists timings_write on public.dining_timings;
create policy timings_write on public.dining_timings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- hall closed days: everyone logged in reads (they change the balance), staff write
drop policy if exists closed_read on public.hall_closed_days;
create policy closed_read on public.hall_closed_days for select to authenticated using (true);
drop policy if exists closed_write on public.hall_closed_days;
create policy closed_write on public.hall_closed_days for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- settings (names): everyone logged in can read, Provost changes
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
-- STARTING DATA
-- =============================================================================
insert into public.mess_settings (session, diet_rate, fixed_charges, establishment_charges)
values ('2026-2027', 46.67, 0, 0)
on conflict (session) do nothing;

insert into public.dining_timings (meal, start_time, end_time) values
  ('breakfast', '07:30', '09:00'),
  ('lunch',     '12:30', '14:30'),
  ('dinner',    '19:30', '21:30')
on conflict (meal) do nothing;

-- Make the API pick up the new tables and permissions right away.
notify pgrst, 'reload schema';
