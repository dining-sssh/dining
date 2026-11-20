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
insert into public.students
  (enrollment_no, name, house, room_no, course, email, previous_room, session, status)
values
  ('GQ0103', 'Aarif Khan', 'HM', '17', 'B.Tech', 'iamaakoji@gmail.com', 'New Allotment', '2026-2027', 'active')
on conflict (enrollment_no) do update set
  name = excluded.name, house = excluded.house, room_no = excluded.room_no,
  course = excluded.course, email = excluded.email;

-- More students can be added from the Provost or Munshi panel (Add student / Import CSV).
