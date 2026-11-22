-- =============================================================================
-- People who can log in. Edit the emails, then run this in the SQL Editor
-- AFTER schema.sql. Emails must be lowercase and are the Google accounts.
-- =============================================================================

-- Provost and Munshi
insert into public.staff_users (email, role, full_name) values
  ('omniverop@gmail.com',        'munshi',  'Munshi'),
  ('provost.amu@gmail.com',     'provost', 'Provost')   -- <- replace with the real provost Google email (lowercase)
on conflict (email) do update set role = excluded.role, full_name = excluded.full_name;

-- Students. A student logs in with the Google account that matches `email`.
-- dining_from is the first day dining counts for the student. Every dining day from then on uses
-- one paid day, so set it to the day the student really starts (it defaults to today).
insert into public.students
  (enrollment_no, name, house, room_no, course, email, previous_room, previous_house, remarks, session, status, dining_from)
values
  ('GQ0103', 'Aarif Khan', 'HM', '17', 'B.Tech', 'iamaakoji@gmail.com', 'New Allotment', null, null, '2026-2027', 'active', current_date)
on conflict (enrollment_no) do update set
  name = excluded.name, house = excluded.house, room_no = excluded.room_no,
  course = excluded.course, email = excluded.email;

-- More students can be added from the Provost or Munshi panel (Add student / Import CSV).
