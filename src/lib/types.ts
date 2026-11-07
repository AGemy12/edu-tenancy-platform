export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "TEACHER" | "STUDENT";
/** ACTIVE, SUSPENDED (signs in, read-only) or BLOCKED (can't sign in). */
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED";

export type TenantLite = { id: string; name: string; slug: string };

/** One of the centers an account belongs to, and what it is there. */
export type Membership = {
  id: string;
  role: Role;
  status: AccountStatus;
  tenant: TenantLite;
  /** Can be signed into right now (not blocked there, center not suspended). */
  usable: boolean;
};

/**
 * The signed-in person and the center their session is in. `role`, `status`, `tenant` describe
 * that center; `memberships` lists every center they can switch to.
 */
export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  /** Missing on sessions stored before the API returned it, until /auth/me refreshes the user. */
  phone?: string | null;
  role: Role;
  status?: AccountStatus;
  statusReason?: string | null;
  tenantId: string | null;
  tenant?: TenantLite | null;
  membershipId?: string | null;
  isPlatformAdmin?: boolean;
  memberships?: Membership[];
  /** Support mode: a platform admin is working as this member. */
  support?: SupportInfo | null;
};

/** The open support session behind the current sign-in (see SupportBanner). */
export type SupportInfo = { sessionId: string; reason: string; expiresAt: string; actor: { fullName: string; email: string } };

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  rememberMe?: boolean;
};

export type RegisterTenantInput = {
  tenantName: string;
  tenantSlug: string;
  fullName: string;
  email: string;
  password: string;
};

export type UserLite = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

/** A member's place in this center (see the API's Membership). */
export type MembershipLite = {
  id: string;
  role: Role;
  status: AccountStatus;
  statusReason: string | null;
};

export type Teacher = {
  id: string;
  bio: string | null;
  subjects: string[];
  user: UserLite;
  /** Its role is TENANT_ADMIN when the center admin teaches from their own account. */
  membership: MembershipLite;
  _count?: { courses: number; students: number; sessions: number; exams: number; schedules: number; billingRates: number };
  /** Admins only: the meeting accounts this teacher linked (their Zoom and Meet sessions run on them). */
  meetingAccounts?: { zoom: boolean; google: boolean };
  /** Admins only: what the center pays this teacher per session; null = not set. */
  pay?: TeacherPay | null;
  /** Why this center can't change the sign-in email and password here, or null when it can. */
  accountLock: AccountLock | null;
};

/** See backend auth/member-account.ts. */
export type AccountLock = "support" | "self" | "admin" | "shared";

export type Student = {
  id: string;
  grade: string | null;
  parentPhone: string | null;
  notes: string | null;
  user: UserLite;
  membership: MembershipLite;
  teachers: { teacher: { id: string; user: { fullName: string } } }[];
  _count?: { enrollments: number; attendances: number; examResults: number; schedules: number; billingRates: number };
  accountLock: AccountLock | null;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  level: string | null;
  /** Admins and teachers: what a student pays per session of this course; null = the center's default. */
  sessionPrice?: number | null;
  isActive: boolean;
  teacher: { id: string; user: { fullName: string } };
  _count?: { enrollments: number; sessions: number; exams: number; schedules: number };
};

export type SessionProvider = "ZOOM" | "GOOGLE_MEET" | "MANUAL";
export type SessionStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELED" | "MISSED";

export type LiveSession = {
  id: string;
  title: string;
  provider: SessionProvider;
  status: SessionStatus;
  startAt: string;
  endAt: string;
  description: string | null;
  notes: string | null;
  /** Hidden from students: they get it from POST /sessions/:id/join, which records attendance. */
  meetingUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  teacher: { id: string; userId: string; user: { fullName: string } };
  course: { id: string; title: string } | null;
  /** Set when the session was booked from a student's monthly schedule. */
  scheduleId: string | null;
  /** Staff: every student in it; a student: only themselves. */
  attendees?: { studentId: string }[];
  _count?: { attendees: number };
};

/** The live session calling a student (GET /sessions/ringing): it rings for `ringMs`, then shows as a banner. */
export type RingingSession = {
  id: string;
  title: string;
  teacherName: string;
  startedAt: string;
  ringMs: number;
};

export type ScheduleSlot = { weekday: number; startTime: string };

/** A student's monthly hours with a teacher; its sessions are generated from the weekly slots. */
export type StudentSchedule = {
  id: string;
  title: string;
  provider: SessionProvider;
  meetingUrl: string | null;
  monthlyMinutes: number;
  weeklyMinutes: number;
  /** YYYY-MM-DD, in the center's calendar; endDate is exclusive. */
  startDate: string;
  endDate: string;
  teacher: { id: string; user: { fullName: string } };
  student: { id: string; user: { fullName: string } };
  course: { id: string; title: string } | null;
  slots: ScheduleSlot[];
  stats: { sessions: number; scheduledMinutes: number; completedMinutes: number; upcoming: number };
};

export type SchedulePreview = {
  startDate: string;
  endDate: string;
  timeZone: string;
  monthlyMinutes: number;
  weeklyMinutes: number;
  sessionMinutes: number;
  totalMinutes: number;
  occurrences: { startAt: string; endAt: string; conflict: boolean }[];
};

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type Exam = {
  id: string;
  title: string;
  description: string | null;
  month: string;
  totalMarks: number;
  status: ExamStatus;
  course: { id: string; title: string };
  teacher: { id: string; user: { fullName: string } };
  _count?: { results: number };
  /** Students only: their own mark, once graded. */
  results?: { score: string | number; feedback: string | null }[];
};

/** GET /exams/:id/roster: one row per enrolled student. */
export type ExamRosterRow = { studentId: string; name: string; score: number | null; feedback: string | null };

/* ───────── Reports (GET /reports/…) ───────── */

/** What one student's seat on one session counts as (see backend reports/report-rules.ts). */
export type Outcome = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | "UNRECORDED" | "UPCOMING" | "CANCELED" | "MISSED";
export type OutcomeCounts = Record<Outcome, number>;
export type RiskFlag = "LOW_ATTENDANCE" | "ABSENCE_STREAK" | "LOW_SCORES" | "LOW_RATING";

/** A period of days in the center's time zone, both days included. */
export type ReportPeriod = { from: string; to: string; days: number; timezone: string };

export type ReportHead = {
  generatedAt: string;
  period: ReportPeriod;
  center: { name: string; currency: string };
  filters: { teacher: { id: string; name: string } | null; course: { id: string; title: string } | null };
};

export type SeatStats = {
  counts: OutcomeCounts;
  held: number;
  /** 0..1; null until something counts. */
  attendanceRate: number | null;
  punctualityRate: number | null;
  heldMinutes: number;
  attendedMinutes: number;
  averageRating: number | null;
};

export type TrendPoint = { from: string; to: string; sessions: number; minutes: number; counts: OutcomeCounts; attendanceRate: number | null };
export type Trend = { unit: "day" | "week" | "month"; points: TrendPoint[] };

/** A teacher's (or course's) sessions over the period. */
export type SessionStats = {
  sessions: number;
  held: number;
  upcoming: number;
  live: number;
  completed: number;
  canceled: number;
  missed: number;
  heldMinutes: number;
  actualMinutes: number | null;
  startsRecorded: number;
  onTime: number;
  onTimeRate: number | null;
  averageDelay: number | null;
  evaluationsDue: number;
  evaluated: number;
  evaluationRate: number | null;
  students: number;
  counts: OutcomeCounts;
  attendanceRate: number | null;
  averageRating: number | null;
};

export type ExamStats = {
  id: string;
  title: string;
  /** "YYYY-MM" */
  month: string;
  status: string;
  course: { id: string; title: string };
  totalMarks: number;
  results: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  /** Scores per band: <50, 50–64, 65–74, 75–84, 85+. */
  distribution: number[];
};

export type StudentRow = SeatStats & {
  id: string;
  name: string;
  grade: string | null;
  status: AccountStatus;
  examAverage: number | null;
  exams: number;
  flags: RiskFlag[];
  streak: number;
};

type EnrollmentState = "ACTIVE" | "COMPLETED" | "DROPPED";

export type StudentReport = ReportHead & {
  kind: "student";
  student: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    grade: string | null;
    parentPhone: string | null;
    status: AccountStatus;
    memberSince: string;
    teachers: string[];
    courses: { id: string; title: string; teacher: string; status: EnrollmentState; enrolledAt: string }[];
  };
  summary: SeatStats & {
    seats: number;
    counted: number;
    streak: number;
    longestStreak: number;
    sessions: number;
    homework: number;
    exams: { count: number; average: number | null };
  };
  previous: { from: string; to: string; attendanceRate: number | null; averageRating: number | null; examAverage: number | null };
  flags: RiskFlag[];
  days: { date: string; outcomes: Outcome[] }[];
  trend: Trend;
  sessions: {
    id: string;
    title: string;
    status: SessionStatus;
    startAt: string;
    endAt: string;
    minutes: number;
    outcome: Outcome;
    joinedAt: string | null;
    teacher: { id: string; name: string };
    course: { id: string; title: string } | null;
    rating: number | null;
    progress: string | null;
    homework: string | null;
    comment: string | null;
  }[];
  courses: (SeatStats & { id: string | null; title: string | null; teacher: string; examAverage: number | null })[];
  exams: {
    id: string;
    title: string;
    month: string;
    course: { id: string; title: string };
    teacher: string;
    score: number;
    totalMarks: number;
    percent: number;
    groupAverage: number | null;
    groupSize: number;
    feedback: string | null;
    gradedAt: string;
  }[];
  finance: {
    currency: string;
    sessions: number;
    minutes: number;
    fees: number;
    missingRates: number;
    courses: { id: string | null; title: string | null; sessions: number; minutes: number; fees: number }[];
  } | null;
};

export type StudentsReport = ReportHead & {
  kind: "students";
  summary: SeatStats & { students: number; active: number; flagged: number; examAverage: number | null };
  students: StudentRow[];
};

export type AlertsReport = ReportHead & {
  kind: "alerts";
  students: StudentRow[];
  unevaluated: {
    id: string;
    title: string;
    startAt: string;
    teacher: { id: string; name: string };
    course: { id: string; title: string } | null;
    students: number;
    pending: number;
  }[];
};

export type RegisterReport = ReportHead & {
  kind: "register";
  summary: SeatStats & { sessions: number; students: number };
  sessions: {
    id: string;
    title: string;
    status: SessionStatus;
    startAt: string;
    day: string;
    teacher: { id: string; name: string };
    course: { id: string; title: string } | null;
    counts: OutcomeCounts;
    attendanceRate: number | null;
  }[];
  students: (SeatStats & { id: string; name: string; cells: (Outcome | null)[] })[];
};

export type TeachersReport = ReportHead & {
  kind: "teachers";
  summary: SessionStats;
  teachers: (SessionStats & { id: string; name: string; linkedStudents: number })[];
};

export type TeacherReport = ReportHead & {
  kind: "teacher";
  teacher: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subjects: string[];
    status: AccountStatus;
    memberSince: string;
    linkedStudents: number;
    courses: number;
  };
  summary: SessionStats;
  trend: Trend;
  students: (SeatStats & { id: string; name: string })[];
  courses: (SessionStats & { id: string | null; title: string | null })[];
  exams: ExamStats[];
  sessions: {
    id: string;
    title: string;
    status: SessionStatus;
    startAt: string;
    endAt: string;
    minutes: number;
    actualMinutes: number | null;
    delay: number | null;
    course: { id: string; title: string } | null;
    students: number;
    counts: OutcomeCounts;
    evaluated: boolean | null;
  }[];
  pay: { currency: string; sessions: number; minutes: number; teacherPay: number; fees?: number } | null;
};

export type CoursesReport = ReportHead & {
  kind: "courses";
  courses: (SessionStats & {
    id: string;
    title: string;
    subject: string | null;
    isActive: boolean;
    teacher: { id: string; name: string };
    enrollments: { active: number; completed: number; dropped: number };
    examAverage: number | null;
    examResults: number;
  })[];
};

export type CourseReport = ReportHead & {
  kind: "course";
  course: {
    id: string;
    title: string;
    subject: string | null;
    level: string | null;
    isActive: boolean;
    teacher: { id: string; name: string };
    enrollments: { active: number; completed: number; dropped: number };
  };
  summary: SessionStats & { examAverage: number | null; examResults: number };
  trend: Trend;
  sessions: {
    id: string;
    title: string;
    status: SessionStatus;
    startAt: string;
    minutes: number;
    students: number;
    counts: OutcomeCounts;
    attendanceRate: number | null;
  }[];
  exams: ExamStats[];
  students: (SeatStats & { id: string; name: string; enrollment: EnrollmentState | null; examAverage: number | null; flags: RiskFlag[] })[];
};

export type CenterKpis = SessionStats & {
  students: number;
  newStudents: number;
  activeStudents: number;
  teachers: number;
  activeTeachers: number;
  examAverage: number | null;
  examResults: number;
};

export type CenterFinance = { currency: string; fees: number; teacherPay: number; platformFee: number | null; net: number | null; missingRates: number };

export type CenterReport = ReportHead & {
  kind: "center";
  previous: { from: string; to: string };
  kpis: CenterKpis & { flaggedStudents: number };
  previousKpis: CenterKpis;
  finance: CenterFinance | null;
  previousFinance: CenterFinance | null;
  trend: Trend;
  teachers: (SessionStats & { id: string; name: string })[];
  courses: (SessionStats & { id: string; title: string; teacher: string })[];
  atRisk: { id: string; name: string; flags: RiskFlag[]; attendanceRate: number | null; streak: number; examAverage: number | null }[];
};

/* ───────── Session billing ───────── */

/** Prices are per session: a fixed amount, or (teacher pay only) a % of what the session's students paid. */
export type RateBasis = "PER_SESSION" | "PERCENT";
/** Where a price came from: a student's special price, the course's, the center's default, or the teacher's pay. */
export type RateSource = "STUDENT" | "COURSE" | "TEACHER" | "CENTER";
export type TeacherPay = { basis: RateBasis; amount: number };

/** GET /billing/prices — the center's prices as it sees them. */
export type CenterPrices = {
  currency: string;
  /** Whether a student absent without an excuse still pays. */
  chargeAbsent: boolean;
  /** Admins only: the platform's % of every session (the center's own, else its package's); null = none. */
  platformFeePercent?: number | null;
  /** Sessions with no course, or whose course has no price. */
  defaultPrice: number | null;
  courses: { id: string; title: string; isActive: boolean; teacher: { id: string; name: string }; students: number; price: number | null }[];
  special: { course: { id: string; title: string }; student: { id: string; name: string }; price: number }[];
  teachers: { id: string; name: string; pay: TeacherPay | null }[];
};

/** Totals over every session matching the filters (not only the current page). */
export type BillingTotals = {
  sessions: number;
  chargedSessions: number;
  /** Teaching time: each session once. */
  minutes: number;
  /** Charged student time: each student on each session. */
  studentMinutes: number;
  fees: number;
  /** Admins and teachers only. */
  teacherPay?: number;
  /** Admins only, and only when every student of the sessions is included. */
  platformFee?: number;
  net?: number;
  missingRates: number;
  /** Students on charged sessions who paid nothing (excused, or absent when absences are free). */
  freeSeats: number;
  unconfirmed: number;
};

export type BillingStudentLine = {
  id: string;
  name: string;
  attended: boolean;
  joinedAt: string | null;
  /** The teacher's evaluation; null until evaluated. */
  status: AttendanceStatus | null;
  /** Whether the student pays for this session; `free` says why not. */
  charged: boolean;
  free: "EXCUSED" | "ABSENT" | null;
  minutes: number;
  /** The price per session that applies to this student. */
  rate: number | null;
  rateSource: RateSource | null;
  fee: number;
};

export type BillingSessionRow = {
  id: string;
  title: string;
  status: SessionStatus;
  provider: SessionProvider;
  startAt: string;
  endAt: string;
  startedAt: string | null;
  endedAt: string | null;
  billable: boolean;
  /** The teacher's entry was recorded; otherwise the session was assumed held. */
  confirmed: boolean;
  minutes: number;
  actualMinutes: number | null;
  teacher: { id: string; name: string };
  course: { id: string; title: string } | null;
  students: BillingStudentLine[];
  fees: number;
  teacherPay?: { amount: number; basis: RateBasis; rate: number; source: RateSource } | null;
  platformFee?: number;
  net?: number;
};

export type BillingSessionsPage = {
  currency: string;
  /** Admins only: the platform's commission on this center, null when none. */
  platformFeePercent?: number | null;
  totals: BillingTotals;
  page: number;
  pageSize: number;
  total: number;
  rows: BillingSessionRow[];
};

export type BillingGroupBy = "teacher" | "student" | "course" | "month";

export type BillingSummary = {
  currency: string;
  platformFeePercent?: number | null;
  groupBy: BillingGroupBy;
  totals: BillingTotals;
  groups: { key: string; label: string | null; sessions: number; minutes: number; fees: number; teacherPay?: number; platformFee?: number; net?: number }[];
};

/** Super admin: GET /billing/platform — what the platform earns from each center over a period. */
export type PlatformBilling = {
  from: string;
  to: string;
  totals: { currency: string; centers: number; withFee: number; sessions: number; fees: number; platformFee: number }[];
  tenants: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "SUSPENDED";
    currency: string;
    platformFeePercent: number | null;
    /** The fee comes from the package (the center has no percentage of its own). */
    platformFeeFromPlan: boolean;
    sessions: number;
    fees: number;
    platformFee: number;
    subscription: { status: SubscriptionStatus; expired: boolean; plan: { nameAr: string; nameEn: string; priceMonthly: number | null; currency: string } } | null;
  }[];
};

/** One month of recurring revenue in one currency: start + new + expansion − contraction − churned = mrr. */
export type MrrMonth = { month: string; start: number; mrr: number; new: number; expansion: number; contraction: number; churned: number; paying: number };

/** Super admin: GET /platform/metrics */
export type PlatformMetrics = {
  asOf: string;
  currencies: { currency: string; mrr: number; arr: number; paying: number; arpa: number; revenueChurn: number | null; months: MrrMonth[] }[];
  logos: { paying: number; churn: number | null; months: { month: string; start: number; paying: number; gained: number; lost: number }[] };
  trials: { windowDays: number; started: number; converted: number; lost: number; open: number; rate: number | null };
};

export type HealthRiskCode = "PAST_DUE" | "NEVER_ACTIVE" | "INACTIVE" | "TRIAL_STALLED" | "NO_SESSIONS" | "SESSIONS_DROP" | "ENDING_SOON";
export type HealthGrowthCode = "TEACHERS_LIMIT" | "STUDENTS_LIMIT" | "STORAGE_LIMIT" | "TRIAL_ENGAGED";
type Usage = { used: number; max: number };

export type CenterHealth = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: { nameAr: string; nameEn: string };
  subscription: { status: SubscriptionStatus; currentPeriodEnd: string | null };
  mrr: { amount: number; currency: string } | null;
  lastActiveAt: string | null;
  sessions30: number;
  sessionsPrev30: number;
  usage: { teachers: Usage; students: Usage; storage: Usage };
  risk: { code: HealthRiskCode; value?: number }[];
  severity: "high" | "medium" | null;
  growth: { code: HealthGrowthCode; value?: number }[];
};

/** Super admin: GET /platform/health */
export type PlatformHealth = {
  asOf: string;
  assessed: number;
  atRisk: CenterHealth[];
  growth: CenterHealth[];
  thresholds: { inactiveDays: number; graceDays: number; trialStalledDays: number; dropRatio: number; dropMinPrevious: number; endingDays: number; limitRatio: number; engagedTrialSessions: number };
};

export type BillingOptions = {
  currency: string;
  teachers: { id: string; name: string }[];
  students: { id: string; name: string }[];
  courses: { id: string; title: string; teacherId: string }[];
};

export type TenantStats = {
  teachers: number;
  students: number;
  courses: number;
  upcomingSessions: number;
  openExams: number;
};

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

/** GET /tenants/me — the center and its subscription (plan names come in both languages). */
export type TenantMe = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  timezone: string;
  currency: string;
  /** Signed link (relative to the API) to the logo printed on reports; null when there is none. */
  logoUrl: string | null;
  /** Canceled or past its period: the API only allows reads. */
  subscriptionExpired: boolean;
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
    plan: { code: string; nameAr: string; nameEn: string } | null;
  } | null;
};

type IntegrationAccount = { email: string | null; connectedAt: string } | null;

export type IntegrationStatus = {
  /** Only a member who teaches here links an account (sessions run on their teacher's); anyone may disconnect one. */
  canLink: boolean;
  google: { configured: boolean; account: IntegrationAccount };
  zoom: { configured: boolean; account: IntegrationAccount };
};

/* ───────── Library ───────── */

export type FileKind =
  | "IMAGE"
  | "PDF"
  | "DOCUMENT"
  | "PRESENTATION"
  | "SPREADSHEET"
  | "EBOOK"
  | "VIDEO"
  | "AUDIO"
  | "ARCHIVE"
  | "OTHER";

export type FileCategory = "BOOK" | "EXPLANATION" | "WORKSHEET" | "SUMMARY" | "EXAM" | "OTHER";

export type FolderColor = "teal" | "coral" | "amber" | "sky" | "violet" | "rose" | "slate";

/** PERSONAL = a user's own library; SHARED = the center library every teacher can browse. */
export type LibraryScope = "PERSONAL" | "SHARED";

export type LibraryFolder = {
  scope: LibraryScope;
  id: string;
  name: string;
  parentId: string | null;
  studentId: string | null;
  studentName: string | null;
  /** The student's top folder: named after the student, can't be renamed or moved. */
  isStudentRoot: boolean;
  color: FolderColor | null;
  owner: { id: string; fullName: string };
  files: number;
  folders: number;
  createdAt: string;
  updatedAt: string;
};

export type LibraryFile = {
  scope: LibraryScope;
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  kind: FileKind;
  category: FileCategory;
  description: string | null;
  starred: boolean;
  folderId: string | null;
  folder: { id: string; name: string; studentId: string | null; studentName: string | null } | null;
  owner: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
  /** Signed, short-lived links (relative to the API unless absolute). */
  previewUrl: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string;
};

export type LibraryFilesPage = {
  data: LibraryFile[];
  total: number;
  page: number;
  pageSize: number;
  facets: Partial<Record<FileKind, number>>;
};

export type StudentFolder = {
  studentId: string;
  fullName: string;
  grade: string | null;
  status: AccountStatus;
  folderId: string | null;
  color: FolderColor | null;
  files: number;
};

export type StorageBucket = { usedBytes: number; quotaBytes: number };

/** Package limits that matter to the library (name is localized by the API). */
export type PlanSummary = {
  code: string;
  name: string;
  storagePerTeacherMb: number;
  sharedStorageMb: number;
  maxFileMb: number;
};

/** GET /library/usage — the caller's personal quota and the center library quota. */
export type LibraryUsage = {
  plan: PlanSummary;
  /** Per-file limit of the current package. */
  maxFileBytes: number;
  personal: StorageBucket & { files: number };
  shared: StorageBucket & { files: number; canManage: boolean };
};

/** GET /plans — the package catalog (for the upgrade screen). */
export type Plan = PlanSummary & {
  id: string;
  description: string | null;
  priceMonthly: string | null;
  currency: string;
  /** The platform's % of every session on this package; null = none. */
  platformFeePercent: number | null;
  maxTeachers: number;
  maxStudents: number;
  isCurrent: boolean;
};

/** A teacher (or the center admin) in the storage monitor. */
export type StorageMember = {
  userId: string;
  teacherId: string | null;
  fullName: string;
  email: string;
  role: "TENANT_ADMIN" | "TEACHER";
  status: AccountStatus;
  usedBytes: number;
  /** Effective quota = base allocation + add-ons. */
  quotaBytes: number;
  /** Base allocation in MB (package default unless the admin changed it). */
  baseQuotaMb: number;
  customQuota: boolean;
  /** Extra space from upgrades/grants, in MB. */
  addOnMb: number;
  /** Files stored (charged) to this member. */
  files: number;
  lastUploadAt: string | null;
  /** Can upload to / manage the center library (always true for the admin). */
  canManageShared: boolean;
};

/** GET /library/admin/overview */
export type StorageOverview = {
  plan: PlanSummary;
  /** The admin can redistribute per-teacher space but not exceed storagePerTeacherMb × members. */
  pool: { totalMb: number; allocatedMb: number };
  shared: StorageBucket & { files: number; addOnMb: number };
  totals: { usedBytes: number; files: number };
  members: StorageMember[];
};

/** One stored file (shared by all its copies) in the admin's "largest files" list. Metadata only. */
export type StoredBlobRow = {
  id: string;
  name: string;
  extension: string;
  kind: FileKind;
  size: number;
  createdAt: string;
  /** Whose quota pays for it; null = center library. */
  chargedTo: { id: string; fullName: string } | null;
  /** Rows pointing at this blob (original + copies). */
  references: number;
  /** How many of those copies sit in student folders. */
  studentCopies: number;
};

/** GET /courses/:id */
export type CourseDetail = Course & {
  enrollments: { studentId: string; status: string; student: { id: string; user: { fullName: string; email: string } } }[];
};

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

/** A student in a session, with the teacher's evaluation once it's recorded. */
export type SessionAttendee = {
  studentId: string;
  attended: boolean;
  joinedAt: string | null;
  status: AttendanceStatus | null;
  rating: number | null;
  homework: string | null;
  progress: string | null;
  comment: string | null;
  evaluatedAt: string | null;
  student: { id: string; user: { fullName: string } };
};

/** GET /sessions/:id (students get only their own attendee row). */
export type SessionDetail = Omit<LiveSession, "attendees"> & { attendees: SessionAttendee[] };

/** Super admin: GET /tenants */
export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  currency: string;
  /** The platform's % of the center's sessions that applies (its own, else its package's); null = none. */
  platformFeePercent: number | null;
  /** The center's own percentage; null = it follows its package. */
  platformFeeOverride: number | null;
  createdAt: string;
  subscriptionExpired: boolean;
  subscription: {
    status: SubscriptionStatus;
    /** null = no end (granted for good). */
    currentPeriodEnd: string | null;
    plan: { id: string; code: string; nameAr: string; nameEn: string; maxTeachers: number; maxStudents: number };
  } | null;
  /** The center's first admin. */
  owner: { fullName: string; email: string; lastLoginAt: string | null } | null;
  storageBytes: number;
  _count: { memberships: number; teachers: number; students: number; courses: number; sessions: number };
};

/** Super admin: POST /tenants */
export type CreateTenantInput = {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  planId: string;
  status: "TRIALING" | "ACTIVE";
  currentPeriodEnd: string | null;
};

/** Super admin: GET /support/sessions */
export type SupportSessionRow = {
  id: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  active: boolean;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  actor: { fullName: string; email: string };
  tenant: { id: string; name: string; slug: string };
  actions: number;
};

export type SupportAction = { id: string; method: string; path: string; status: number; createdAt: string };

/** Where a support request stands (EXPIRED: unanswered in time, or past its approved window). */
export type SupportRequestState = "PENDING" | "APPROVED" | "DENIED" | "CANCELED" | "REVOKED" | "EXPIRED";

/** The platform asks a center to let support in; the center's admin decides. */
export type SupportRequest = {
  id: string;
  tenantId: string;
  membershipId: string | null;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  reason: string;
  minutes: number;
  state: SupportRequestState;
  createdAt: string;
  decidedAt: string | null;
  accessUntil: string | null;
  requestedBy: { fullName: string; email: string };
  decidedBy: { fullName: string } | null;
};

/** Super admin: GET /support/requests */
export type PlatformSupportRequest = SupportRequest & { sessions: number };

/** Center admin: GET /support/access, each request with the sessions support opened under it. */
export type CenterSupportRequest = SupportRequest & {
  sessions: { id: string; startedAt: string; expiresAt: string; endedAt: string | null; active: boolean; actions: number; actor: { fullName: string } }[];
};

/** Super admin: GET /tenants/overview */
export type PlatformOverview = {
  tenants: { total: number; active: number; suspended: number; newThisMonth: number };
  subscriptions: { trialing: number; active: number; pastDue: number; canceled: number; expired: number };
  members: { users: number; admins: number; teachers: number; students: number };
  sessions: { last30Days: number; upcoming: number };
  storageBytes: number;
  expiringSoon: { id: string; name: string; slug: string; status: SubscriptionStatus; currentPeriodEnd: string; plan: { nameAr: string; nameEn: string } }[];
  recent: { id: string; name: string; slug: string; createdAt: string; owner: { fullName: string; email: string; lastLoginAt: string | null } | null }[];
};

/** Super admin: GET /tenants/:id */
export type PlatformTenantDetail = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  timezone: string;
  currency: string;
  platformFeePercent: number | null;
  platformFeeOverride: number | null;
  createdAt: string;
  subscriptionExpired: boolean;
  subscription: {
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      code: string;
      nameAr: string;
      nameEn: string;
      maxTeachers: number;
      maxStudents: number;
      storagePerTeacherMb: number;
      sharedStorageMb: number;
      maxFileMb: number;
      priceMonthly: string | null;
      currency: string;
      platformFeePercent: number | null;
    };
  } | null;
  members: {
    id: string;
    role: Role;
    status: AccountStatus;
    statusReason: string | null;
    joinedAt: string;
    user: { id: string; fullName: string; email: string; lastLoginAt: string | null };
  }[];
  integrations: { provider: "ZOOM" | "GOOGLE_MEET"; user: string }[];
  counts: { teachers: number; students: number; courses: number; exams: number; sessions: number };
  sessions: { last30Days: number; byStatus: Partial<Record<SessionStatus, number>> };
  storageBytes: number;
  lastLoginAt: string | null;
};

/** Super admin: GET /plans/all, and what POST /plans and PATCH /plans/:id return. */
export type AdminPlan = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  priceMonthly: string | null;
  currency: string;
  /** The platform's % of every session of a center on this package; null = none. */
  platformFeePercent: number | null;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  maxTeachers: number;
  maxStudents: number;
  storagePerTeacherMb: number;
  sharedStorageMb: number;
  maxFileMb: number;
  /** Centers on this package. */
  tenants: number;
};

/* ── Notifications ── */

export type NotificationCategory = "SESSIONS" | "EXAMS" | "LIBRARY" | "PEOPLE" | "ACCOUNT" | "SUBSCRIPTION" | "SUPPORT" | "PLATFORM" | "ANNOUNCEMENTS" | "ACTIVITY";

export type NotificationType =
  | "SESSION_SCHEDULED"
  | "SESSION_RESCHEDULED"
  | "SESSION_CANCELED"
  | "SESSION_LIVE"
  | "SESSION_REMINDER"
  | "SESSION_EVALUATED"
  | "SCHEDULE_CREATED"
  | "EXAM_PUBLISHED"
  | "EXAM_GRADED"
  | "FILES_SHARED"
  | "TEACHER_ASSIGNED"
  | "STUDENT_ASSIGNED"
  | "ACCOUNT_STATUS"
  | "SUBSCRIPTION_CHANGED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "SUPPORT_REQUESTED"
  | "SUPPORT_DECIDED"
  | "TENANT_REGISTERED"
  | "ANNOUNCEMENT"
  | "MEMBER_ADDED"
  | "MEETING_ACCOUNT_NEEDED";

/** Stored as a type plus values; the text is rendered here, in the page's language. */
export type AppNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  params: Record<string, string | number>;
  link: string | null;
  /** A center admin's copy of something that happened to others (category ACTIVITY), told in the third person. */
  oversight: boolean;
  readAt: string | null;
  createdAt: string;
  actor: { fullName: string } | null;
};

export type NotificationPage = { items: AppNotification[]; nextCursor: string | null; unread: number };

export type NotificationPreference = {
  category: NotificationCategory;
  inApp: boolean;
  email: boolean;
  /** In-app can't be turned off. */
  locked: boolean;
  /** Nothing in this category is ever emailed. */
  emailAvailable: boolean;
};

export type AnnouncementAudience = "EVERYONE" | "ADMINS" | "TEACHERS" | "STUDENTS";

export type Announcement = {
  id: string;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  recipients: number;
  createdAt: string;
  author: { fullName: string } | null;
};

/* ── Messages ── */

export type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "MISSED";

/** A call placed from a teacher–student chat during their session (never carries its link). */
export type ChatCall = {
  id: string;
  sessionId: string;
  callerId: string;
  status: CallStatus;
  answeredAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

/** GET /conversations/:id/call: the session a call would join now (null: calling is closed), and the call to rejoin. */
export type CallState = {
  session: { id: string; title: string; startAt: string; endAt: string; status: SessionStatus } | null;
  call: ChatCall | null;
  earlyMinutes: number;
  graceMinutes: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  kind: "TEXT" | "SYSTEM" | "CALL";
  body: string;
  /** SYSTEM messages: { event, actor, title?, member?, members? }. */
  params: Record<string, unknown> | null;
  senderId: string | null;
  sender: { fullName: string; role: Role } | null;
  clientId: string | null;
  replyTo: { id: string; body: string; deleted: boolean; senderName: string | null } | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  /** CALL messages: the call the card shows. */
  call?: ChatCall | null;
  /** Client only: still on its way, or failed to send. */
  pending?: "sending" | "failed";
};

export type ChatPeer = {
  membershipId: string;
  fullName: string;
  role: Role;
  blocked: boolean;
  lastReadAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

export type Conversation = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string | null;
  course: { id: string; title: string } | null;
  adminsOnly: boolean;
  memberCount: number;
  lastMessageAt: string;
  isAdmin: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  muted: boolean;
  archived: boolean;
  peer: ChatPeer | null;
  lastMessage: ChatMessage | null;
};

export type ChatParticipant = {
  membershipId: string;
  fullName: string;
  role: Role;
  isAdmin: boolean;
  lastReadAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

export type ConversationDetail = Conversation & { participants: ChatParticipant[] };

export type ChatContact = { membershipId: string; fullName: string; role: Role; online: boolean };
