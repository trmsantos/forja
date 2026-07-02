// Thin client for the FastAPI backend (proxied at /api in dev).

const TOKEN_KEY = "forja_token";

export type User = {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function detail(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: string };
  return body.detail ?? fallback;
}

export type LeadPayload = {
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
};

export async function submitLead(payload: LeadPayload): Promise<void> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Lead failed (${res.status})`);
}

// ----- Public lead-magnet: stateless overdue-invoice audit (no signup, key never stored) -----
export type AuditSummary = {
  outstanding_amount: number; // cents
  outstanding_count: number;
  overdue_count: number;
  overdue_amount: number; // cents
  oldest_overdue: {
    customer_name?: string | null;
    amount_due: number; // cents
    currency?: string | null;
    due_date: string;
    days_overdue: number;
  } | null;
  currency: string;
};

export async function runAudit(apiKey: string, email?: string): Promise<AuditSummary> {
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, email: email || undefined }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not run the audit"));
  return (await res.json()) as AuditSummary;
}

export async function startCheckout(packageId: string): Promise<{ url?: string; message?: string }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package_id: packageId }),
  });
  return (await res.json()) as { url?: string; message?: string };
}

type AuthResponse = { token: string; user: User };

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not create account"));
  return (await res.json()) as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await detail(res, "Wrong email or password"));
  return (await res.json()) as AuthResponse;
}

export async function me(token: string): Promise<User> {
  const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Session expired");
  return (await res.json()) as User;
}

export async function verifyEmail(token: string): Promise<User> {
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error(await detail(res, "This confirmation link is invalid or has expired"));
  const data = (await res.json()) as { user: User };
  return data.user;
}

export async function resendVerification(): Promise<void> {
  const res = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Could not resend the confirmation email");
}

export type RequestRecord = { service?: string; message: string; at: string };

export async function myRequests(): Promise<RequestRecord[]> {
  const res = await fetch("/api/account/requests", { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Could not load your requests");
  return (await res.json()) as RequestRecord[];
}

export type PaymentRecord = {
  description?: string;
  amount?: number; // cents
  currency?: string;
  status: string;
  at: string;
};

export async function myPayments(): Promise<PaymentRecord[]> {
  const res = await fetch("/api/account/payments", { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Could not load your orders");
  return (await res.json()) as PaymentRecord[];
}

// ----- AR collections: connect Stripe, dashboard, billing -----
export type TrackedInvoice = {
  stripe_invoice_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  amount_due?: number | null; // cents
  currency?: string | null;
  due_date?: string | null;
  hosted_invoice_url?: string | null;
  status: string;
  reminder_step: number;
  last_reminder_at?: string | null;
};

export type Dashboard = {
  connected: boolean;
  stripe_account_id: string | null;
  last_synced_at: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  trial_days_left: number | null;
  totals: {
    open_count: number;
    outstanding_amount: number; // cents
    recovered_amount: number; // cents
    reminders_sent: number;
  };
  invoices: TrackedInvoice[];
};

export async function getDashboard(): Promise<Dashboard> {
  const res = await fetch("/api/dashboard", { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Could not load your dashboard");
  return (await res.json()) as Dashboard;
}

export type ConnectResult = {
  ok: boolean;
  synced: number;
  reconciled: number;
  stripe_account_id: string | null;
  trial_started?: boolean;
  trial_days_left?: number | null;
};

export async function connectStripe(apiKey: string): Promise<ConnectResult> {
  const res = await fetch("/api/connect/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not connect your Stripe account"));
  return (await res.json()) as ConnectResult;
}

// ----- Profile & account settings -----
export async function updateProfile(name: string, displayName: string): Promise<User> {
  const res = await fetch("/api/account/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name, display_name: displayName || null }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not save your profile"));
  return (await res.json()) as User;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/account/password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not change your password"));
}

// Avatar is sent as the raw file body (Content-Type = the image type); the backend reads it
// directly, so no multipart/form-data is needed.
export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const res = await fetch("/api/account/avatar", {
    method: "POST",
    headers: { "Content-Type": file.type, ...authHeaders() },
    body: file,
  });
  if (!res.ok) throw new Error(await detail(res, "Could not upload your photo"));
  return (await res.json()) as { avatar_url: string };
}

export async function removeAvatar(): Promise<void> {
  const res = await fetch("/api/account/avatar", { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await detail(res, "Could not remove your photo"));
}

export async function disconnectStripe(): Promise<void> {
  const res = await fetch("/api/connect/disconnect", { method: "POST", headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await detail(res, "Could not disconnect Stripe"));
}

export async function billingPortal(): Promise<{ url: string }> {
  const res = await fetch("/api/billing/portal", { method: "POST", headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await detail(res, "Could not open billing"));
  return (await res.json()) as { url: string };
}

export type PlanId = "solo" | "studio" | "agency";

// Starts a Stripe Checkout subscription (with free trial). Returns a URL to redirect to,
// or a message when billing isn't configured yet (dev/demo).
export async function startSubscription(plan: PlanId): Promise<{ url?: string; message?: string }> {
  const res = await fetch("/api/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not start your subscription"));
  return (await res.json()) as { url?: string; message?: string };
}

export type SweepResult = {
  connections: number;
  synced: number;
  reminders: number;
  skipped: number;
  errors: number;
  dry_run: boolean;
};

export async function runCollections(): Promise<SweepResult> {
  const res = await fetch("/api/collections/run", { method: "POST", headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await detail(res, "Could not run the chase"));
  return (await res.json()) as SweepResult;
}

// ----- Reminder settings + preview -----
export type ReminderTone = "friendly" | "firm";
export type ReminderSettings = { business_name: string; tone: ReminderTone; gap_days: number };
export type ReminderPreviewStep = { step: number; subject: string; html: string };
export type ReminderPreview = ReminderSettings & { steps: ReminderPreviewStep[] };

export async function getReminderSettings(): Promise<ReminderSettings> {
  const res = await fetch("/api/reminders/settings", { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Could not load your reminder settings");
  return (await res.json()) as ReminderSettings;
}

export async function updateReminderSettings(s: ReminderSettings): Promise<ReminderSettings> {
  const res = await fetch("/api/reminders/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ business_name: s.business_name || null, tone: s.tone, gap_days: s.gap_days }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not save your reminder settings"));
  return (await res.json()) as ReminderSettings;
}

export async function getReminderPreview(): Promise<ReminderPreview> {
  const res = await fetch("/api/reminders/preview", { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Could not load the reminder preview");
  return (await res.json()) as ReminderPreview;
}
