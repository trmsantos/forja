// Thin client for the FastAPI backend (proxied at /api in dev).

const TOKEN_KEY = "forja_token";

export type User = { id: number; name: string; email: string; email_verified: boolean };

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

export type ConnectResult = { ok: boolean; synced: number; reconciled: number; stripe_account_id: string | null };

export async function connectStripe(apiKey: string): Promise<ConnectResult> {
  const res = await fetch("/api/connect/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(await detail(res, "Could not connect your Stripe account"));
  return (await res.json()) as ConnectResult;
}

export async function billingPortal(): Promise<{ url: string }> {
  const res = await fetch("/api/billing/portal", { method: "POST", headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(await detail(res, "Could not open billing"));
  return (await res.json()) as { url: string };
}
