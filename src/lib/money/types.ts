export type Box = "treasury" | "monthly" | "emergency" | "daily";

export type ExpenseCategory =
  | "daily"
  | "subscription"
  | "medical"
  | "planned"
  | "other"
  | "rent"
  | "internet"
  | "electricity";

export type TxType = "expense" | "income" | "transfer" | "adjustment";

export interface Balances {
  treasury: number;
  monthly: number;
  emergency: number;
  daily: number;
}

export interface Settings {
  treasuryFloor: number;
  rent: number;
  internet: number;
  /** Total household electricity bill in cents, or null to use the default share. */
  electricityBill: number | null;
  electricityDefault: number;
  dailyFloor: number;
  dailyCeiling: number;
  expectedIncome: number;
  locale: "en" | "ar";
}

export interface Transaction {
  id: string;
  at: string;
  purchaseDate: string;
  type: TxType;
  category: ExpenseCategory | "income" | "transfer" | "adjustment";
  amount: number;
  merchant: string;
  box: Box | null;
  fromBox: Box | null;
  toBox: Box | null;
  note: string;
  /** Imported history calibrates the brain and does not move today's balances. */
  historical: boolean;
}

export interface DayPlan {
  date: string;
  target: number;
  safe: number;
  amount: number;
  reserve: number;
  alert: boolean;
  forecast: number;
  runwayDays: number;
  typical: number;
  mean28: number;
  mean14: number;
  blended: boolean;
  learning: boolean;
  carry: number;
  inputAllowance: number | null;
  inputCarryArmed: boolean;
  anomaly: "hot" | "new" | "both" | null;
  toppedUp: boolean;
  computedAt: string;
  emergencyTarget: number;
  purchaseFloor: number;
  treasuryRate: number;
  emergencyRate: number;
  learned: "learning" | "hotter" | "lighter" | "steady";
}

export interface Review {
  id: string;
  at: string;
  date: string;
  kind: "opening" | "weekly" | "month";
  health: number;
  learned: "learning" | "hotter" | "lighter" | "steady";
  target: number;
  emergencyTarget: number;
  treasuryRate: number;
  emergencyRate: number;
}

export interface Decision {
  id: string;
  at: string;
  date: string;
  targetMoved: boolean;
  emergencyMoved: boolean;
  rateMoved: boolean;
  learned: "learning" | "hotter" | "lighter" | "steady";
}

export interface Notice {
  id: string;
  at: string;
  date: string;
  kind: "topup" | "alert" | "anomaly" | "weekly" | "month" | "info";
  read: boolean;
}

export interface Proposal {
  id: string;
  at: string;
  date: string;
  kind: "income" | "month_close";
  status: "pending" | "applied" | "dismissed";
  title: string;
  lines: { label: string; amount: number }[];
  /** Cents movements applied on confirm. Positive adds to a box. */
  delta: Balances;
  /** Real money leaving RHB (bills), already reflected by not being in delta. */
  leavesBank: number;
  alert: boolean;
}

export interface PlannedBuy {
  id: string;
  at: string;
  readyAt: string;
  amount: number;
  merchant: string;
  status: "waiting" | "recorded" | "dropped";
}

export interface Snapshot {
  date: string;
  at: string;
  balances: Balances;
}

export interface Audit {
  id: string;
  at: string;
  summary: string;
  undone: boolean;
}

export interface UndoFrame {
  summary: string;
  at: string;
  balances: Balances;
  transactions: Transaction[];
  proposals: Proposal[];
  billsPaid: AppState["billsPaid"];
  plannedBuys: PlannedBuy[];
  plans: DayPlan[];
  smoothing: Smoothing;
}

export interface Smoothing {
  previousAllowance: number | null;
  carryArmed: boolean;
}

export interface AppState {
  version: 1;
  setupComplete: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  failedPinAttempts: number;
  pinLockedUntil: string | null;
  settings: Settings;
  balances: Balances;
  smoothing: Smoothing;
  transactions: Transaction[];
  plans: DayPlan[];
  reviews: Review[];
  decisions: Decision[];
  notices: Notice[];
  proposals: Proposal[];
  plannedBuys: PlannedBuy[];
  snapshots: Snapshot[];
  audits: Audit[];
  undo: UndoFrame[];
  billsPaid: Record<string, { rent: boolean; internet: boolean; electricity: boolean }>;
  lastMorningDate: string | null;
  lastEveningDate: string | null;
  lastWeeklyKey: string | null;
  lastMonthCloseKey: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}
