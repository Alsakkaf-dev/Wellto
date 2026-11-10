import type { ExpenseCategory } from "@/lib/money/types";

export type Locale = "en" | "ar";

const en = {
  appName: "Mahfaza",
  tagline: "Your money, already sorted.",
  home: "Home",
  add: "Add",
  history: "History",
  insights: "Insights",
  settings: "Settings",
  total: "Everything",
  inBank: "In RHB",
  inWallet: "In Touch 'n Go",
  treasury: "Treasury",
  monthly: "Monthly",
  emergency: "Emergency",
  daily: "Daily",
  treasuryHint: "Stays put",
  monthlyHint: "Bills and days",
  emergencyHint: "The cushion",
  dailyHint: "Touch 'n Go",
  todayTopup: "Today's top-up",
  toppedUp: "I topped up",
  tight: "A little tight today. Top up this, not more.",
  comfortable: "Today's amount is ready.",
  learning: "Still learning your rhythm. This uses the floor for now.",
  seeNumbers: "See the numbers",
  hideNumbers: "Hide the numbers",
  monthEnd: "Month-end, if today repeats",
  runway: "Days the month can carry",
  runwayUnit: "days",
  health: "System health",
  learnedTitle: "What the system learned",
  split: "How leftover money splits",
  emergencyTarget: "Emergency target",
  safe: "Safe amount",
  target: "Target",
  allowanceArrived: "Allowance arrived",
  apply: "Apply this",
  notNow: "Not now",
  incomeShort: "Income didn't cover the month. Bills come first.",
  undo: "Undo last change",
  nothingYet: "Nothing here yet.",
  historyEmpty: "Spending you add will land here.",
  imported: "From your file",
  setupTitle: "Let's open the wallet",
  setupBody: "Four numbers, a PIN, and the mornings take care of themselves.",
  pin: "Choose a 4-digit PIN",
  pinAgain: "Type it once more",
  pinMismatch: "Those two PINs don't match.",
  pinShort: "Use 4 digits.",
  openWallet: "Open Mahfaza",
  welcomeBack: "Welcome back",
  wrongPin: "That PIN isn't right.",
  locked: "Too many tries. Wait a minute.",
  signOut: "Lock",
  language: "Language",
  english: "English",
  arabic: "العربية",
  bills: "Bills",
  rent: "Rent",
  internet: "Internet",
  electricity: "Electricity",
  electricityHint: "Total bill, if you have it. Blank uses RM 170.",
  expectedIncome: "Expected allowance",
  save: "Save",
  importCsv: "Import a CSV",
  importHelp: "Your file stays in this wallet. It teaches the daily amount and is not saved in the code.",
  importAction: "Add this history",
  exportBackup: "Download a backup",
  notifications: "Reminders",
  enableNotifications: "Notify me about today's top-up",
  notificationsOn: "Notifications are on.",
  cronHelp: "The morning check also runs on its own when this app is deployed. Opening the app is enough until then.",
  move: "Move between boxes",
  from: "From",
  to: "To",
  moveAction: "Move",
  plannedWait: "Sleep on this until tomorrow.",
  recordNow: "I already paid",
  dailyLiving: "Daily",
  subscription: "Subscription",
  medical: "Treatment",
  planned: "Planned",
  other: "Other",
  recent: "Recent",
  addExpense: "Add expense",
  topUpThis: "Top up this",
  differentAmount: "Different amount",
  monthSweep: "Month-end sweep",
  confirmSweep: "Sweep monthly",
  balances: "Balances",
  correctBalances: "Correct balances",
  of100: "out of 100",
  purchaseFloor: "Planned buys wait until emergency is above",
  alertGlance: "Worth a glance",
  anomalyHot: "Spending ran past double a usual day.",
  anomalyNew: "A new merchant showed up.",
  anomalyBoth: "High spend, and a merchant that is new here.",
  learnedLearning: "Still learning — the daily amount sits on the floor until two weeks of spending are in.",
  learnedHotter: "Recent spending is higher than the 28-day window, so both estimates were blended.",
  learnedLighter: "Recent spending is lighter than the 28-day window, so both estimates were blended.",
  learnedSteady: "Spending is steady, so the 28-day estimate stands.",
  noticeTopup: "Today's top-up is ready.",
  noticeAlert: "A little tight today.",
  noticeWeekly: "Weekly review is in.",
  noticeMonth: "Leftover monthly is ready to split.",
  noticeInfo: "Noted.",
  decisionTarget: "Daily target moved.",
  decisionEmergency: "Emergency target moved.",
  decisionSplit: "The split moved.",
  proposals: "Waiting for you",
  toTreasury: "Treasury",
  toEmergency: "Emergency",
  fromMonthly: "From monthly",
  saved: "Saved.",
  merchant: "Place",
  optional: "Optional",
  pinPad: "PIN",
  settingsIntro: "The quiet knobs. The app still does the maths.",
  dangerTreasury: "Treasury stays at its floor unless you correct the balance itself.",
  backup: "Backup",
  restore: "Restore a backup",
  restoreAction: "Restore",
  category: "Category",
  today: "Today",
  noPlan: "The morning check has not run yet.",
  markRead: "Got it",
  waitingBuys: "Thinking it over",
  ready: "Ready to record",
  dropBuy: "Drop",
  electricityShare: "Your share",
  showMath: "The morning maths, only if you want it.",
  rhbNote: "RHB is the real account. These boxes live inside it.",
  signIn: "Unlock",
  setupBalances: "Starting balances",
  currencyNote: "Ringgit, Malaysia time.",
  errAmount: "Enter an amount.",
  errTreasury: "Treasury stays at RM 2,000 or more.",
  errFloorBuy: "Emergency is not ready for a planned buy yet.",
  errSame: "Pick two different boxes.",
  errWait: "Give it until tomorrow.",
  errGone: "That is no longer waiting.",
  errNothing: "Nothing to undo.",
  errSave: "Could not save. Try again.",
  errPin: "That PIN is not right.",
};

const ar: typeof en = {
  appName: "محفظة",
  tagline: "فلوسك مرتّبة قبل ما تفكر.",
  home: "الرئيسية",
  add: "إضافة",
  history: "السجل",
  insights: "النظرة",
  settings: "الإعدادات",
  total: "المجموع",
  inBank: "في RHB",
  inWallet: "في تاتش آن جو",
  treasury: "الخزينة",
  monthly: "الشهري",
  emergency: "الطوارئ",
  daily: "اليومية",
  treasuryHint: "تبقى مكانها",
  monthlyHint: "الفواتير والأيام",
  emergencyHint: "الوسادة",
  dailyHint: "تاتش آن جو",
  todayTopup: "تعبئة اليوم",
  toppedUp: "عبّيت",
  tight: "اليوم ضيّق شوي. عبّ هذا المبلغ، لا أكثر.",
  comfortable: "مبلغ اليوم جاهز.",
  learning: "لسه يتعلّم إيقاعك. يستخدم الأرضية إلى أن يكتمل أسبوعان.",
  seeNumbers: "أرني الأرقام",
  hideNumbers: "أخفِ الأرقام",
  monthEnd: "نهاية الشهر إن تكرّر اليوم",
  runway: "أيام يكفي فيها الشهر",
  runwayUnit: "يوم",
  health: "صحة النظام",
  learnedTitle: "ماذا تعلّم النظام",
  split: "كيف يُقسَّم الباقي",
  emergencyTarget: "هدف الطوارئ",
  safe: "الأمان",
  target: "الهدف",
  allowanceArrived: "وصل المصروف",
  apply: "طبّق",
  notNow: "ليس الآن",
  incomeShort: "الدخل ما غطّى الشهر. الفواتير أولاً.",
  undo: "تراجع عن آخر تغيير",
  nothingYet: "لا شيء هنا بعد.",
  historyEmpty: "ما تصرفه يظهر هنا.",
  imported: "من ملفك",
  setupTitle: "نفتح المحفظة",
  setupBody: "أربعة أرقام ورمز، والصباح يتدبّر نفسه.",
  pin: "اختر رمزاً من 4 أرقام",
  pinAgain: "أدخله مرة ثانية",
  pinMismatch: "الرمزان غير متطابقين.",
  pinShort: "أربعة أرقام.",
  openWallet: "افتح محفظة",
  welcomeBack: "أهلاً بعودتك",
  wrongPin: "الرمز غير صحيح.",
  locked: "محاولات كثيرة. انتظر دقيقة.",
  signOut: "قفل",
  language: "اللغة",
  english: "English",
  arabic: "العربية",
  bills: "الفواتير",
  rent: "الإيجار",
  internet: "الإنترنت",
  electricity: "الكهرباء",
  electricityHint: "فاتورة البيت كاملة إن عرفتها. إن تُركت فارغة نستخدم 170.",
  expectedIncome: "المصروف المتوقع",
  save: "حفظ",
  importCsv: "استيراد CSV",
  importHelp: "ملفك يبقى داخل المحفظة. يعلّم مبلغ اليوم ولا يُحفظ في الكود.",
  importAction: "أضف هذا السجل",
  exportBackup: "تنزيل نسخة",
  notifications: "التذكير",
  enableNotifications: "نبّهني بتعبئة اليوم",
  notificationsOn: "التنبيهات تعمل.",
  cronHelp: "فحص الصباح يشتغل وحده بعد النشر. فتح التطبيق يكفي إلى ذلك الحين.",
  move: "انقل بين الصناديق",
  from: "من",
  to: "إلى",
  moveAction: "انقل",
  plannedWait: "فكّر فيه إلى الغد.",
  recordNow: "دفعته فعلاً",
  dailyLiving: "يومي",
  subscription: "اشتراك",
  medical: "علاج",
  planned: "شراء مخطط",
  other: "أخرى",
  recent: "الأخيرة",
  addExpense: "أضف صرفاً",
  topUpThis: "عبّئ هذا",
  differentAmount: "مبلغ مختلف",
  monthSweep: "كنس نهاية الشهر",
  confirmSweep: "وزّع الشهري",
  balances: "الأرصدة",
  correctBalances: "صحّح الأرصدة",
  of100: "من 100",
  purchaseFloor: "الشراء المخطط ينتظر حتى تتجاوز الطوارئ",
  alertGlance: "يلفت النظر",
  anomalyHot: "الصرف تجاوز ضعف اليوم المعتاد.",
  anomalyNew: "ظهر تاجر جديد.",
  anomalyBoth: "صرف عالٍ، وتاجر جديد.",
  learnedLearning: "لسه يتعلّم. مبلغ اليوم على الأرضية حتى يكتمل أسبوعان من الصرف.",
  learnedHotter: "الصرف الأخير أعلى من نافذة 28 يوماً، فدُمج التقديران.",
  learnedLighter: "الصرف الأخير أخف من نافذة 28 يوماً، فدُمج التقديران.",
  learnedSteady: "الصرف مستقر، فبقي تقدير 28 يوماً.",
  noticeTopup: "تعبئة اليوم جاهزة.",
  noticeAlert: "اليوم ضيّق شوي.",
  noticeWeekly: "مراجعة الأسبوع جاهزة.",
  noticeMonth: "باقي الشهري جاهز للتوزيع.",
  noticeInfo: "تم.",
  decisionTarget: "تحرّك الهدف اليومي.",
  decisionEmergency: "تحرّك هدف الطوارئ.",
  decisionSplit: "تحرّكت نسبة التقسيم.",
  proposals: "بانتظارك",
  toTreasury: "الخزينة",
  toEmergency: "الطوارئ",
  fromMonthly: "من الشهري",
  saved: "تم الحفظ.",
  merchant: "المكان",
  optional: "اختياري",
  pinPad: "الرمز",
  settingsIntro: "المقابض الهادئة. الحساب يبقى على التطبيق.",
  dangerTreasury: "الخزينة لا تنزل عن أرضيتها إلا إذا صحّحت الرصيد نفسه.",
  backup: "نسخة",
  restore: "استعد نسخة",
  restoreAction: "استعادة",
  category: "الفئة",
  today: "اليوم",
  noPlan: "فحص الصباح لم يجرِ بعد.",
  markRead: "تمام",
  waitingBuys: "قيد التفكير",
  ready: "جاهز للتسجيل",
  dropBuy: "ألغِ",
  electricityShare: "حصتك",
  showMath: "حساب الصباح، إن أحببت أن تراه.",
  rhbNote: "RHB هو الحساب الحقيقي. هذه الصناديق بداخله.",
  signIn: "ادخل",
  setupBalances: "أرصدة البداية",
  currencyNote: "رينغت، بتوقيت ماليزيا.",
  errAmount: "أدخل مبلغاً.",
  errTreasury: "الخزينة تبقى 2000 أو أكثر.",
  errFloorBuy: "الطوارئ لم تبلغ أرضية الشراء المخطط بعد.",
  errSame: "اختر صندوقين مختلفين.",
  errWait: "انتظر إلى الغد.",
  errGone: "لم يعد هذا بانتظارك.",
  errNothing: "لا شيء للتراجع عنه.",
  errSave: "تعذّر الحفظ. حاول مرة أخرى.",
  errPin: "الرمز غير صحيح.",
};

export type Copy = typeof en;

export function copyOf(locale: Locale): Copy {
  return locale === "ar" ? ar : en;
}

export function learnedText(code: "learning" | "hotter" | "lighter" | "steady", copy: Copy): string {
  if (code === "learning") return copy.learnedLearning;
  if (code === "hotter") return copy.learnedHotter;
  if (code === "lighter") return copy.learnedLighter;
  return copy.learnedSteady;
}

export function anomalyText(code: "hot" | "new" | "both", copy: Copy): string {
  if (code === "hot") return copy.anomalyHot;
  if (code === "new") return copy.anomalyNew;
  return copy.anomalyBoth;
}

export function noticeText(kind: "topup" | "alert" | "anomaly" | "weekly" | "month" | "info", copy: Copy): string {
  if (kind === "topup") return copy.noticeTopup;
  if (kind === "alert") return copy.noticeAlert;
  if (kind === "anomaly") return copy.alertGlance;
  if (kind === "weekly") return copy.noticeWeekly;
  if (kind === "month") return copy.noticeMonth;
  return copy.noticeInfo;
}

export function categoryLabel(category: ExpenseCategory, copy: Copy): string {
  if (category === "daily") return copy.dailyLiving;
  if (category === "subscription") return copy.subscription;
  if (category === "medical") return copy.medical;
  if (category === "planned") return copy.planned;
  if (category === "rent") return copy.rent;
  if (category === "internet") return copy.internet;
  if (category === "electricity") return copy.electricity;
  return copy.other;
}

export function errorText(code: string | undefined, copy: Copy): string {
  if (code === "amount") return copy.errAmount;
  if (code === "treasury_floor") return copy.errTreasury;
  if (code === "floor_buy") return copy.errFloorBuy;
  if (code === "same_box") return copy.errSame;
  if (code === "wait") return copy.errWait;
  if (code === "gone") return copy.errGone;
  if (code === "nothing") return copy.errNothing;
  if (code === "locked") return copy.locked;
  if (code === "wrong" || code === "pin") return copy.errPin;
  if (code === "mismatch") return copy.pinMismatch;
  if (code === "short") return copy.pinShort;
  return copy.errSave;
}

export function proposalLine(label: string, copy: Copy): string {
  if (label === "Rent") return copy.rent;
  if (label === "Internet") return copy.internet;
  if (label === "Electricity") return copy.electricity;
  if (label === "Monthly") return copy.monthly;
  if (label === "Treasury") return copy.toTreasury;
  if (label === "Emergency") return copy.toEmergency;
  if (label === "From monthly") return copy.fromMonthly;
  return label;
}
