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
};

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
};

export type Student = {
  id: string;
  grade: string | null;
  parentPhone: string | null;
  notes: string | null;
  user: UserLite;
  membership: MembershipLite;
  teachers: { teacher: { id: string; user: { fullName: string } } }[];
  _count?: { enrollments: number; attendances: number; examResults: number; schedules: number; billingRates: number };
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  level: string | null;
  price: string | number | null;
  isActive: boolean;
  teacher: { id: string; user: { fullName: string } };
  _count?: { enrollments: number; sessions: number; exams: number };
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
  _count?: { attendees: number };
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

export type MonthlyReport = {
  studentId: string;
  studentName: string;
  month: string;
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsLate: number;
  attendanceRate: number;
  examsCount: number;
  averageScore: number | null;
  /** Mean session rating (1–10) from the teachers' evaluations. */
  averageRating: number | null;
};

/* ───────── Session billing ───────── */

export type RateKind = "STUDENT_FEE" | "TEACHER_PAY";
export type RateBasis = "PER_HOUR" | "PERCENT";
/** Which tier of the rate card priced a line: a student's own rate, the course's, or the teacher's default. */
export type RateSource = "STUDENT" | "COURSE" | "TEACHER";

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
  net?: number;
  missingRates: number;
  unconfirmed: number;
};

export type BillingStudentLine = {
  id: string;
  name: string;
  attended: boolean;
  joinedAt: string | null;
  minutes: number;
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
  net?: number;
};

export type BillingSessionsPage = {
  currency: string;
  totals: BillingTotals;
  page: number;
  pageSize: number;
  total: number;
  rows: BillingSessionRow[];
};

export type BillingGroupBy = "teacher" | "student" | "course" | "month";

export type BillingSummary = {
  currency: string;
  groupBy: BillingGroupBy;
  totals: BillingTotals;
  groups: { key: string; label: string | null; sessions: number; minutes: number; fees: number; teacherPay?: number; net?: number }[];
};

export type BillingOptions = {
  currency: string;
  teachers: { id: string; name: string }[];
  students: { id: string; name: string }[];
  courses: { id: string; title: string; teacherId: string }[];
};

export type BillingRate = {
  id: string;
  kind: RateKind;
  basis: RateBasis;
  amount: number;
  effectiveFrom: string;
  note: string | null;
  source: RateSource;
  state?: "ACTIVE" | "SCHEDULED" | "SUPERSEDED";
  teacher: { id: string; name: string };
  course: { id: string; title: string } | null;
  student: { id: string; name: string } | null;
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

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

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
export type SessionDetail = LiveSession & { attendees: SessionAttendee[] };

/** Super admin: GET /tenants */
export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
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
