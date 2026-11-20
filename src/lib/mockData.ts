import { Student, DiningDailyRecord, MonthlyBill, PaymentSlip, RebateRequest, MessSettings, FoodReview } from '@/types';

export const INITIAL_SETTINGS: MessSettings = {
  session: '2026-2027',
  diet_rate: 65,
  fixed_charges: 500,
  establishment_charges: 350,
  provost_name: 'Prof. Zameeruddin Khan',
  munshi_name: 'Janab Ashfaq Ahmad (Sr. Munshi)',
  hall_name: 'Sir Syed Hall (South) Dining Hall',
  min_rebate_days: 3
};

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
    phone: '+91 9876543200',
    session: '2025-2026',
    status: 'active'
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
    phone: '+91 9876543210',
    session: '2026-2027',
    status: 'active'
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
    phone: '+91 9876543211',
    session: '2026-2027',
    status: 'active'
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
    status: 'active'
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
    phone: '+91 9876543213',
    session: '2026-2027',
    status: 'active'
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
    phone: '+91 9876543214',
    session: '2026-2027',
    status: 'active'
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
    phone: '+91 9876543215',
    session: '2026-2027',
    status: 'active'
  },
  {
    id: 's-7',
    enrollment_no: 'GJ1088',
    name: 'Owais Khan',
    house: 'HM',
    room_no: '18',
    course: 'B.Tech (Mechanical)',
    email: 'owais.khan@myamu.ac.in',
    previous_room: '04',
    phone: '+91 9876543216',
    session: '2026-2027',
    status: 'active'
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
    status: 'active'
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
    session: '2026-2027',
    status: 'active'
  }
];

const pad2 = (n: number) => String(n).padStart(2, '0');

// Day-wise attendance for the current session: 1 July 2026 to 20 November 2026.
export function generateInitialDailyRecords(students: Student[]): DiningDailyRecord[] {
  const records: DiningDailyRecord[] = [];
  const end = new Date(2026, 10, 20);

  for (let d = new Date(2026, 6, 1); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;

    students.forEach((student, index) => {
      // Simulate realistic pattern: some students have rebates, some missed a day
      const isRebate =
        (student.enrollment_no === 'GL3412' && month === 11 && day >= 10 && day <= 13) ||
        (student.enrollment_no === 'GM5501' && month === 11 && day >= 5 && day <= 8);

      const isEaten = isRebate ? false : !((day + month + index) % 11 === 0);
      const guestDiets = day === 15 && index === 0 ? 2 : 0;

      records.push({
        id: `rec-${student.id}-${dateStr}`,
        student_id: student.id,
        enrollment_no: student.enrollment_no,
        date: dateStr,
        eaten: isEaten,
        lunch: isEaten,
        dinner: isEaten,
        is_rebate: isRebate,
        rebate_reason: isRebate ? 'Home visit / Approved Leave' : undefined,
        guest_diets: guestDiets,
        marked_by: 'Munshi Ashfaq'
      });
    });
  }

  return records;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Monthly bills and the deposit slips that paid for them, generated together so the
 * numbers agree. Bills for 2026-27 are computed from the day-wise records above.
 * Students deposit round amounts, so a small deficit (or advance) carries forward.
 */
export function generateInitialLedger(students: Student[]): { bills: MonthlyBill[]; slips: PaymentSlip[] } {
  const records = generateInitialDailyRecords(students);
  const monthStats = new Map<string, { eaten: number; guests: number; rebate: number }>();
  records.forEach((r) => {
    const key = `${r.student_id}_${r.date.slice(0, 7)}`;
    const s = monthStats.get(key) ?? { eaten: 0, guests: 0, rebate: 0 };
    if (r.is_rebate) s.rebate += 1;
    else if (r.eaten) s.eaten += 1;
    s.guests += r.guest_diets || 0;
    monthStats.set(key, s);
  });

  // Every month from July 2024 to November 2026, oldest first.
  const months: Array<{ name: string; key: string; session: string; days: number }> = [];
  let y = 2024;
  let m = 7;
  while (y < 2026 || (y === 2026 && m <= 11)) {
    months.push({
      name: `${MONTH_NAMES[m - 1]} ${y}`,
      key: `${y}-${pad2(m)}`,
      session: m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`,
      days: new Date(y, m, 0).getDate()
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  const dietRate = INITIAL_SETTINGS.diet_rate;
  const fixedCharges = INITIAL_SETTINGS.fixed_charges;
  const establishmentCharges = INITIAL_SETTINGS.establishment_charges;
  const bills: MonthlyBill[] = [];
  const slips: PaymentSlip[] = [];
  let slipCounter = 0;

  students.forEach((student, sIdx) => {
    let balance = 0; // charged minus paid so far

    months.forEach((m) => {
      const stats = monthStats.get(`${student.id}_${m.key}`);
      const rebateDays = stats ? stats.rebate : sIdx % 2 === 0 ? 4 : 0;
      const totalDiets = stats
        ? stats.eaten + stats.guests
        : Math.max(10, m.days - rebateDays - ((sIdx + 3) % 4));
      const dietAmount = totalDiets * dietRate;
      const totalAmount = dietAmount + fixedCharges + establishmentCharges;

      const bill: MonthlyBill = {
        id: `bill-${student.id}-${m.key}`,
        student_id: student.id,
        enrollment_no: student.enrollment_no,
        session: m.session,
        month_name: m.name,
        month_key: m.key,
        total_diets: totalDiets,
        rebate_days: rebateDays,
        diet_rate: dietRate,
        diet_amount: dietAmount,
        fixed_charges: fixedCharges,
        establishment_charges: establishmentCharges,
        extras: 0,
        total_amount: totalAmount,
        status: 'pending'
      };

      balance += totalAmount;

      // The running month (November 2026) is not settled yet.
      if (m.key < '2026-11') {
        const pay = sIdx % 3 === 0 ? Math.floor(balance / 500) * 500 : Math.ceil(balance / 100) * 100;
        if (pay > 0) {
          slipCounter += 1;
          let breakup: number[] | undefined;
          if (sIdx % 2 === 0 && pay >= 2000) {
            const first = Math.round((pay * 0.55) / 100) * 100;
            if (first > 0 && first < pay) breakup = [first, pay - first];
          }
          const paidOn = `${m.key}-${pad2(Math.min(28, m.days))}`;
          const slip: PaymentSlip = {
            id: `slip-${student.id}-${m.key}`,
            student_id: student.id,
            enrollment_no: student.enrollment_no,
            book_no: String(100 + Math.floor(slipCounter / 50)),
            slip_no: String(15000 + slipCounter),
            amount: pay,
            breakup,
            paid_on: paidOn,
            cashier: 'Ashfaq Ahmad'
          };
          slips.push(slip);
          bill.payment_date = paidOn;
          bill.receipt_no = slip.slip_no;
          balance -= pay;
        }
        bill.status = balance > 0 && m.key === '2026-10' ? 'overdue' : 'paid';
      }

      bills.push(bill);
    });
  });

  return { bills, slips };
}

export function generateInitialBills(students: Student[]): MonthlyBill[] {
  return generateInitialLedger(students).bills;
}

export function generateInitialPayments(students: Student[]): PaymentSlip[] {
  return generateInitialLedger(students).slips;
}

export const INITIAL_REBATES: RebateRequest[] = [
  {
    id: 'reb-1',
    student_id: 's-4',
    enrollment_no: 'GL3412',
    student_name: 'Hamza Rizvi',
    start_date: '2026-11-24',
    end_date: '2026-11-28',
    reason: 'Attending National Medical Conference at AIIMS New Delhi',
    status: 'approved',
    created_at: '2026-11-18'
  },
  {
    id: 'reb-2',
    student_id: 's-1',
    enrollment_no: 'GJ1021',
    student_name: 'Tariq Anwar',
    start_date: '2026-11-26',
    end_date: '2026-11-30',
    reason: 'Family wedding leave at native place',
    status: 'pending',
    created_at: '2026-11-19'
  },
  {
    id: 'reb-3',
    student_id: 's-2',
    enrollment_no: 'GJ1045',
    student_name: 'Zaid Farooqui',
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    reason: 'Campus placement interview round in Gurgaon',
    status: 'pending',
    created_at: '2026-11-20'
  }
];

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
