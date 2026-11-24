export const ROLES = ["ADMIN", "EDITOR", "AUTHOR", "CASEWORKER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor (can publish)",
  AUTHOR: "Author (writes drafts)",
  CASEWORKER: "Caseworker / Organiser",
  MEMBER: "Member",
};

/** Which roles may enter each portal. */
export const PORTAL_ACCESS = {
  admin: ["ADMIN", "CASEWORKER"] as Role[],
  editorial: ["ADMIN", "EDITOR", "AUTHOR"] as Role[],
  members: ["MEMBER", "ADMIN"] as Role[],
};

export const ATOLLS = [
  "Malé City", "Haa Alifu", "Haa Dhaalu", "Shaviyani", "Noonu", "Raa", "Baa",
  "Lhaviyani", "Kaafu", "Alifu Alifu", "Alifu Dhaalu", "Vaavu", "Meemu", "Faafu",
  "Dhaalu", "Thaa", "Laamu", "Gaafu Alifu", "Gaafu Dhaalu", "Gnaviyani", "Addu City",
];

export const PROFESSIONS = [
  "Nurse", "Midwife", "Medical Doctor", "Specialist / Consultant", "Dentist",
  "Pharmacist", "Laboratory Technologist", "Radiographer", "Physiotherapist",
  "Paramedic / EMT", "Public Health Officer", "Community Health Worker",
  "Health Administrator", "Support Staff", "Student", "Other",
];

export const JOIN_CATEGORIES = [
  { id: "nurse", label: "Nurses & Midwives", desc: "Staff nurses, nurse specialists, midwives and nursing officers." },
  { id: "doctor", label: "Doctors & Dentists", desc: "Medical officers, specialists, consultants and dental surgeons." },
  { id: "allied", label: "Allied Health", desc: "Lab, imaging, pharmacy, physio, paramedics and more." },
  { id: "community", label: "Public & Community Health", desc: "Health centres, island clinics and public-health teams." },
  { id: "support", label: "Support & Admin Staff", desc: "Health administration, attendants and support services." },
  { id: "expat", label: "Expatriate Health Workers", desc: "Health professionals working in the Maldives on a work permit." },
];

export const POST_STATUSES = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export const POST_CATEGORIES = [
  { id: "NEWS", label: "News" },
  { id: "PRESS_RELEASE", label: "Press release" },
  { id: "STATEMENT", label: "Statement" },
  { id: "NOTICE", label: "Member notice" },
  { id: "FEATURE", label: "Feature story" },
];

export const CASE_TYPES = [
  { id: "PAY_OVERTIME", label: "Pay & overtime" },
  { id: "WORKING_HOURS", label: "Working hours & rosters" },
  { id: "SAFETY", label: "Safety at work / staffing" },
  { id: "DISCIPLINARY", label: "Disciplinary or grievance" },
  { id: "CONTRACT", label: "Contract or job classification" },
  { id: "VISA_PERMIT", label: "Work permit / visa (expatriate)" },
  { id: "HARASSMENT", label: "Bullying, harassment or violence" },
  { id: "OTHER", label: "Something else" },
];

export const CASE_STATUSES = ["OPEN", "IN_PROGRESS", "AWAITING_MEMBER", "RESOLVED", "CLOSED"] as const;

export const RESOURCE_CATEGORIES = [
  { id: "AGREEMENT", label: "Agreements" },
  { id: "POLICY", label: "Policy & positions" },
  { id: "GUIDE", label: "Know your rights" },
  { id: "FORM", label: "Forms" },
  { id: "REPORT", label: "Reports & research" },
  { id: "CONSTITUTION", label: "Constitution & rules" },
];

export const EVENT_TYPES = ["MEETING", "TRAINING", "CPD", "RALLY", "AGM", "WEBINAR"] as const;

export const MEMBER_STATUSES = ["ACTIVE", "LAPSED", "SUSPENDED", "RESIGNED"] as const;


export const labelOf = (list: { id: string; label: string }[], id: string) =>
  list.find((x) => x.id === id)?.label ?? id;
