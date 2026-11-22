import {
  DeficitEntry,
  DiningRequest,
  DiningTiming,
  FoodReview,
  GraceExtension,
  MenuItem,
  MessSettings,
  PaymentSlip,
  Student
} from '@/types';

/**
 * Demo data, used only while no Supabase keys are set. It is tuned for a "today" around
 * 20 November 2026, but everything is calculated from it, so any date works.
 */

export const INITIAL_SETTINGS: MessSettings = {
  session: '2026-2027',
  diet_rate: 1400 / 30,
  fixed_charges: 0,
  establishment_charges: 0,
  provost_name: 'Prof. Zameeruddin Khan',
  munshi_name: 'Janab Ashfaq Ahmad (Sr. Munshi)',
  hall_name: 'Sir Shah Sulaiman Hall',
  min_rebate_days: 0
};

const START = '2026-08-01';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's-ayaz',
    enrollment_no: 'GL8373',
    name: 'AYAZ IRFAN',
    house: 'HM',
    room_no: '21',
    course: 'B.TECH.',
    email: 'gl8373@myamu.ac.in',
    previous_room: 'H.M. A08',
    previous_house: 'HM',
    phone: '+91 9876543200',
    session: '2025-2026',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-1',
    enrollment_no: 'GJ1021',
    name: 'Tariq Anwar',
    house: 'HM',
    room_no: '14',
    course: 'B.Tech (Computer Engg)',
    email: 'tariq.anwar@myamu.ac.in',
    previous_room: '08',
    previous_house: 'HM',
    phone: '+91 9876543210',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-2',
    enrollment_no: 'GJ1045',
    name: 'Zaid Farooqui',
    house: 'BH',
    room_no: '22',
    course: 'MCA',
    email: 'zaid.farooqui@myamu.ac.in',
    previous_room: '15',
    previous_house: 'BH',
    phone: '+91 9876543211',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-3',
    enrollment_no: 'GK2219',
    name: 'Saad Qureshi',
    house: 'QH',
    room_no: '05',
    course: 'M.Sc (Physics)',
    email: 'saad.qureshi@myamu.ac.in',
    previous_room: 'New Allotment',
    phone: '+91 9876543212',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-4',
    enrollment_no: 'GL3412',
    name: 'Hamza Rizvi',
    house: 'KH',
    room_no: '31',
    course: 'MBBS',
    email: 'hamza.rizvi@myamu.ac.in',
    previous_room: '19',
    previous_house: 'KH',
    phone: '+91 9876543213',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-5',
    enrollment_no: 'GM5501',
    name: 'Arham Siddiqui',
    house: 'AK',
    room_no: '12',
    course: 'B.A. (English Hons)',
    email: 'arham.siddiqui@myamu.ac.in',
    previous_room: '03',
    previous_house: 'AK',
    phone: '+91 9876543214',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-6',
    enrollment_no: 'GN6782',
    name: 'Bilal Masood',
    house: 'MB',
    room_no: '40',
    course: 'B.Com (Hons)',
    email: 'bilal.masood@myamu.ac.in',
    previous_room: '33',
    previous_house: 'JK',
    phone: '+91 9876543215',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-7',
    enrollment_no: 'GJ1088',
    name: 'Owais Khan',
    house: 'JK',
    room_no: '18',
    course: 'B.Tech (Mechanical)',
    email: 'owais.khan@myamu.ac.in',
    previous_room: '04',
    previous_house: 'HM',
    phone: '+91 9876543216',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-8',
    enrollment_no: 'GK2254',
    name: 'Danish Ali',
    house: 'BH',
    room_no: '29',
    course: 'Diploma Engg',
    email: 'danish.ali@myamu.ac.in',
    previous_room: 'New Allotment',
    phone: '+91 9876543217',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  },
  {
    id: 's-aarif',
    enrollment_no: 'GQ0103',
    name: 'Aarif Khan',
    house: 'HM',
    room_no: '17',
    course: 'B.Tech',
    email: 'iamaakoji@gmail.com',
    previous_room: 'New Allotment',
    previous_house: 'JK',
    remarks: 'Demo student',
    session: '2026-2027',
    status: 'active',
    dining_from: START
  }
];

/* ------------------------------ deposits (food charges slips) ------------------------------ */

// Different payment habits, so the demo shows every state: on time, prepaid, stopped, late, short payment.
const PATTERNS: Array<Array<[string, number]>> = [
  [['2026-08-01', 1400], ['2026-09-01', 1400], ['2026-10-01', 1400], ['2026-11-01', 1400]],
  [['2026-08-01', 2800], ['2026-10-01', 1400], ['2026-11-01', 1400]],
  [['2026-08-01', 1400], ['2026-09-01', 1400], ['2026-10-01', 1400]], // missed November: dining stops
  [['2026-08-01', 1400], ['2026-09-01', 1400], ['2026-10-01', 1400], ['2026-11-15', 1400]],
  [['2026-08-01', 700], ['2026-08-15', 700], ['2026-09-01', 1400], ['2026-10-01', 1400], ['2026-11-01', 1000]]
];

export function generateInitialSlips(students: Student[]): PaymentSlip[] {
  const slips: PaymentSlip[] = [];
  let counter = 0;
  students.forEach((student, index) => {
    PATTERNS[index % PATTERNS.length].forEach(([date, amount]) => {
      counter += 1;
      const first = Math.round((amount * 0.55) / 100) * 100;
      slips.push({
        id: `slip-${student.id}-${date}`,
        student_id: student.id,
        enrollment_no: student.enrollment_no,
        book_no: String(100 + Math.floor(counter / 50)),
        slip_no: String(15000 + counter),
        amount,
        breakup: index % 2 === 0 && amount >= 1400 && first > 0 && first < amount ? [first, amount - first] : undefined,
        paid_on: date,
        cashier: 'Ashfaq Ahmad'
      });
    });
  });
  return slips;
}

/* ------------------------- requests, carried deficits, extensions ------------------------- */

const request = (
  id: string,
  student: Student,
  kind: DiningRequest['kind'],
  start: string,
  status: DiningRequest['status'],
  reason: string,
  created: string
): DiningRequest => ({
  id,
  student_id: student.id,
  enrollment_no: student.enrollment_no,
  student_name: student.name,
  kind,
  start_date: start,
  reason,
  status,
  created_at: created
});

export function generateInitialRequests(students: Student[]): DiningRequest[] {
  const byId = (id: string) => students.find((s) => s.id === id);
  const list: DiningRequest[] = [];
  const add = (r: DiningRequest | null) => r && list.push(r);
  const s = (id: string) => byId(id) ?? null;

  const hamza = s('s-4');
  const arham = s('s-5');
  const saad = s('s-3');
  const tariq = s('s-1');
  const zaid = s('s-2');

  add(hamza && request('req-1', hamza, 'off', '2026-11-10', 'approved', 'Medical conference at AIIMS New Delhi', '2026-11-08'));
  add(hamza && request('req-2', hamza, 'on', '2026-11-14', 'approved', 'Back at the hostel', '2026-11-13'));
  add(arham && request('req-3', arham, 'off', '2026-11-05', 'approved', 'Home visit', '2026-11-03'));
  add(arham && request('req-4', arham, 'on', '2026-11-09', 'approved', 'Back from home', '2026-11-08'));
  add(saad && request('req-5', saad, 'off', '2026-11-16', 'approved', 'Family function at native place', '2026-11-15'));
  add(saad && request('req-6', saad, 'on', '2026-11-22', 'pending', 'Returning on 22 November', '2026-11-20'));
  add(tariq && request('req-7', tariq, 'off', '2026-11-26', 'pending', 'Family wedding leave', '2026-11-19'));
  add(zaid && request('req-8', zaid, 'off', '2026-12-01', 'pending', 'Campus placement round in Gurgaon', '2026-11-20'));
  return list;
}

export function generateInitialEntries(students: Student[]): DeficitEntry[] {
  const make = (id: string, studentId: string, month: string, amount: number, note: string): DeficitEntry | null => {
    const st = students.find((x) => x.id === studentId);
    return st
      ? { id, student_id: st.id, enrollment_no: st.enrollment_no, month_key: month, amount, note, created_at: `${month}-28` }
      : null;
  };
  return [
    make('def-1', 's-aarif', '2026-09', 540, 'Carried from the old register'),
    make('def-2', 's-aarif', '2026-10', 300, 'Carried from the old register'),
    make('def-3', 's-1', '2026-09', 330, 'Carried from the old register')
  ].filter((e): e is DeficitEntry => Boolean(e));
}

export function generateInitialExtensions(students: Student[]): GraceExtension[] {
  const owais = students.find((s) => s.id === 's-7');
  return owais
    ? [
        {
          id: 'ext-1',
          student_id: owais.id,
          enrollment_no: owais.enrollment_no,
          student_name: owais.name,
          extra_days: 2,
          note: 'Waiting for the scholarship amount',
          status: 'awaiting_munshi',
          approved_by: 'Provost',
          created_at: '2026-11-19'
        }
      ]
    : [];
}

/* ------------------------------------ menu and timings ------------------------------------ */

const WEEK_BREAKFAST = [
  'Puri Sabzi, Halwa, Tea',
  'Aloo Paratha, Curd, Tea',
  'Puri Sabzi, Tea, Banana',
  'Paneer Paratha, Curd, Tea',
  'Bread Jam / Butter, Omelette / Boiled Egg, Tea',
  'Chana Masala, Roti, Tea',
  'Aloo Pyaaz Paratha, Curd, Tea'
];

const WEEK_LUNCH = [
  'Roti, Lauki Chana, Dal, Rice, Salad',
  'Roti, Chole Masala, Jeera Rice, Onion Salad',
  'Roti, Kadhi Pakoda, Steamed Rice, Papad',
  'Roti, Aloo Matar Gobhi, Dal Tadka, Rice',
  'Chicken Biryani / Veg Biryani, Boondi Raita, Salad',
  'Roti, Dal Makhani, Jeera Rice, Gulab Jamun',
  'Roti, Aloo Baingan, Mix Dal, Steamed Rice'
];

const WEEK_DINNER = [
  'Butter Chicken / Shahi Paneer, Rice, Dal, 4 Roti',
  'Chicken Qorma / Matar Paneer, Steamed Rice, Kheer, Roti',
  'Kadhai Paneer / Egg Curry, Dal Fry, Rice, Roti',
  'Chicken Changezi / Malai Kofta, Pulao, Dal, Roti',
  'Mutton Curry / Paneer Butter Masala, Rice, Roti, Sweet',
  'Chicken Kalimirch / Dal Tadka, Jeera Rice, 4 Roti',
  'Gosht / Channa Masala, Dal Makhani, Steamed Rice, Roti'
];

export const INITIAL_MENU: MenuItem[] = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, meal: 'breakfast', items: WEEK_BREAKFAST[weekday] },
  { weekday, meal: 'lunch', items: WEEK_LUNCH[weekday] },
  { weekday, meal: 'dinner', items: WEEK_DINNER[weekday] }
]);

export const INITIAL_TIMINGS: DiningTiming[] = [
  { meal: 'breakfast', start_time: '07:30', end_time: '09:00' },
  { meal: 'lunch', start_time: '12:30', end_time: '14:30' },
  { meal: 'dinner', start_time: '19:30', end_time: '21:30' }
];

/* ------------------------------------------ reviews ------------------------------------------ */

export const INITIAL_REVIEWS: FoodReview[] = [
  // Today's reviews (2026-11-20)
  {
    id: 'rev-20261120-1',
    student_id: 's-1',
    student_name: 'Tariq Anwar',
    enrollment_no: 'GJ1021',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 5,
    quantity_rating: 4,
    taste_rating: 5,
    cleanliness_rating: 5,
    cleanliness_house: 'HM',
    overall_rating: 4.8,
    comments: 'Lunch dal makhani and tandoori roti were fresh and very tasty. HM hostel dining tables were properly sanitized.',
    created_at: '2026-11-20T13:45:00.000Z'
  },
  {
    id: 'rev-20261120-2',
    student_id: 's-2',
    student_name: 'Zaid Farooqui',
    enrollment_no: 'GJ1045',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 4,
    quantity_rating: 4,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'BH',
    overall_rating: 4.0,
    comments: 'Good food quality today. Bhopal house water dispenser area was clean and well kept.',
    created_at: '2026-11-20T14:10:00.000Z'
  },
  {
    id: 'rev-20261120-3',
    student_id: 's-3',
    student_name: 'Saad Qureshi',
    enrollment_no: 'GK2219',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 4,
    quantity_rating: 5,
    taste_rating: 3,
    cleanliness_rating: 4,
    cleanliness_house: 'QH',
    overall_rating: 4.0,
    comments: 'Serving quantity was generous. Qidwai hostel dining corridor was tidy.',
    created_at: '2026-11-20T14:25:00.000Z'
  },
  {
    id: 'rev-20261120-4',
    student_id: 's-5',
    student_name: 'Arham Siddiqui',
    enrollment_no: 'GM5501',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 5,
    quantity_rating: 4,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'AK',
    overall_rating: 4.3,
    comments: 'Quality has improved significantly. Agha Khan wing tables were wiped down promptly.',
    created_at: '2026-11-20T14:30:00.000Z'
  },
  {
    id: 'rev-20261120-5',
    student_id: 's-6',
    student_name: 'Bilal Masood',
    enrollment_no: 'GN6782',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 3,
    quantity_rating: 4,
    taste_rating: 3,
    cleanliness_rating: 3,
    cleanliness_house: 'MB',
    overall_rating: 3.3,
    comments: 'Mahamoodabad wash basin area needs regular mopping after peak lunch hour.',
    created_at: '2026-11-20T14:40:00.000Z'
  },
  {
    id: 'rev-20261120-6',
    student_id: 's-7',
    student_name: 'Owais Khan',
    enrollment_no: 'GJ1088',
    date: '2026-11-20',
    meal_type: 'lunch',
    quality_rating: 5,
    quantity_rating: 5,
    taste_rating: 5,
    cleanliness_rating: 5,
    cleanliness_house: 'HM',
    overall_rating: 5.0,
    comments: 'Excellent food and HM hostel dining section is spotless.',
    created_at: '2026-11-20T15:00:00.000Z'
  },

  // Yesterday's reviews (2026-11-19)
  {
    id: 'rev-20261119-1',
    student_id: 's-1',
    student_name: 'Tariq Anwar',
    enrollment_no: 'GJ1021',
    date: '2026-11-19',
    meal_type: 'dinner',
    quality_rating: 4,
    quantity_rating: 4,
    taste_rating: 4,
    cleanliness_rating: 5,
    cleanliness_house: 'HM',
    overall_rating: 4.3,
    comments: 'Special Thursday dinner was well made. Clean cutlery and plates.',
    created_at: '2026-11-19T21:15:00.000Z'
  },
  {
    id: 'rev-20261119-2',
    student_id: 's-3',
    student_name: 'Saad Qureshi',
    enrollment_no: 'GK2219',
    date: '2026-11-19',
    meal_type: 'dinner',
    quality_rating: 5,
    quantity_rating: 5,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'QH',
    overall_rating: 4.5,
    comments: 'Dinner chicken qorma was delicious. QH hostel plates were very clean.',
    created_at: '2026-11-19T21:30:00.000Z'
  },
  {
    id: 'rev-20261119-3',
    student_id: 's-4',
    student_name: 'Hamza Rizvi',
    enrollment_no: 'GL3412',
    date: '2026-11-19',
    meal_type: 'dinner',
    quality_rating: 4,
    quantity_rating: 4,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'KH',
    overall_rating: 4.0,
    comments: 'Kashmir house dining table area clean, food served warm.',
    created_at: '2026-11-19T21:40:00.000Z'
  },
  {
    id: 'rev-20261119-4',
    student_id: 's-8',
    student_name: 'Danish Ali',
    enrollment_no: 'GK2254',
    date: '2026-11-19',
    meal_type: 'dinner',
    quality_rating: 4,
    quantity_rating: 3,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'BH',
    overall_rating: 3.8,
    comments: 'Good taste, please ensure roti stays hot during winter evenings.',
    created_at: '2026-11-19T22:00:00.000Z'
  },

  // 2026-11-18 reviews
  {
    id: 'rev-20261118-1',
    student_id: 's-2',
    student_name: 'Zaid Farooqui',
    enrollment_no: 'GJ1045',
    date: '2026-11-18',
    meal_type: 'dinner',
    quality_rating: 4,
    quantity_rating: 4,
    taste_rating: 4,
    cleanliness_rating: 4,
    cleanliness_house: 'BH',
    overall_rating: 4.0,
    comments: 'Clean environment and wholesome meal.',
    created_at: '2026-11-18T21:20:00.000Z'
  },
  {
    id: 'rev-20261118-2',
    student_id: 's-7',
    student_name: 'Owais Khan',
    enrollment_no: 'GJ1088',
    date: '2026-11-18',
    meal_type: 'dinner',
    quality_rating: 5,
    quantity_rating: 5,
    taste_rating: 4,
    cleanliness_rating: 5,
    cleanliness_house: 'HM',
    overall_rating: 4.8,
    comments: 'HM hostel cleaness maintained very well by the staff.',
    created_at: '2026-11-18T21:35:00.000Z'
  }
];
