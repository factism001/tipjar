/**
 * lib/paystack.ts — Paystack Split + lazy subaccount
 * Naira only, kobo amounts. 10% platform fee via subaccount percentage_charge.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';
const SECRET = () => {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new Error('PAYSTACK_SECRET_KEY missing');
  return s;
};

type PaystackHeaders = Record<string, string>;
function headers(): PaystackHeaders {
  return {
    Authorization: `Bearer ${SECRET()}`,
    'Content-Type': 'application/json',
  };
}

async function paystackRequest<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: headers(),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) {
    throw new Error(`Paystack ${path} failed: ${json.message || res.statusText} — ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json.data;
}

// ---- Bank resolve (verify account belongs to creator) ----
export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  // GET /bank/resolve?account_number=&bank_code=
  const data = await paystackRequest<{ account_name: string; account_number: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
  return data; // { account_name, account_number }
}

// ---- Subaccount ----
export type CreateSubaccountParams = {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number; // 10
  primary_contact_email?: string;
  primary_contact_name?: string;
};

export async function createSubaccount(params: CreateSubaccountParams) {
  const data = await paystackRequest<{ subaccount_code: string; id: number }>(
    '/subaccount',
    {
      method: 'POST',
      body: {
        business_name: params.business_name,
        settlement_bank: params.bank_code,
        account_number: params.account_number,
        percentage_charge: params.percentage_charge,
        primary_contact_email: params.primary_contact_email,
        primary_contact_name: params.primary_contact_name,
      },
    }
  );
  return data;
}

/**
 * Lazy get-or-create subaccount for a creator.
 * - If creator.paystack_subaccount_code exists, return it (no API call)
 * - Else: bank/resolve -> subaccount create -> update creators row (service_role)
 */
export async function getOrCreateSubaccount(creator: {
  id: string;
  handle: string;
  display_name?: string | null;
  bank_account?: string | null;
  bank_code?: string | null;
  paystack_subaccount_code?: string | null;
  // optional email from auth
  email?: string | null;
}) {
  if (creator.paystack_subaccount_code) return creator.paystack_subaccount_code;
  // Test mode shortcut: if using test secret, allow missing bank to proceed with a test subaccount placeholder
  // In live, bank details are required; in test, we return a dummy that will be ignored by initializeTransaction
  const isTest = (process.env.PAYSTACK_SECRET_KEY || '').startsWith('sk_test_');
  if (!creator.bank_account || !creator.bank_code) {
    if (isTest) {
      console.warn(`[paystack] test mode: creator @${creator.handle} has no bank, using dummy subaccount for test`);
      return 'ACCT_test_dummy_no_bank';
    }
    throw new Error(`Creator @${creator.handle} missing bank_account/bank_code — cannot create subaccount`);
  }

  // 1. Verify account resolves (throws if invalid)
  const resolved = await resolveBankAccount(creator.bank_account, creator.bank_code);

  // 2. Create subaccount (10% platform fee)
  const sub = await createSubaccount({
    business_name: `TipJar @${creator.handle} — ${resolved.account_name}`,
    bank_code: creator.bank_code,
    account_number: creator.bank_account,
    percentage_charge: 10,
    primary_contact_name: creator.display_name || creator.handle,
    primary_contact_email: creator.email || undefined,
  });

  // 3. Persist to Supabase (service_role bypasses RLS)
  const { createClient } = await import('./supabase');
  const supabase = createClient('service_role');
  const { error } = await supabase
    .from('creators')
    .update({ paystack_subaccount_code: sub.subaccount_code })
    .eq('id', creator.id);

  if (error) {
    // Log but don't fail — returning code is still usable
    console.warn('[paystack] failed to persist subaccount_code', error.message);
  }

  return sub.subaccount_code as string;
}

// ---- Transaction initialize (Split 10%) ----
export type InitializeTransactionParams = {
  email: string;
  amount: number; // kobo, 100 - 5_000_000
  reference: string; // paystack_ref unique, e.g. TJR_...
  subaccount: string; // subaccount_code
  metadata?: Record<string, unknown>;
  callback_url?: string;
};

export async function initializeTransaction(params: InitializeTransactionParams) {
  const isDummy = params.subaccount === 'ACCT_test_dummy_no_bank';
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    metadata: params.metadata,
    callback_url: params.callback_url,
  };
  if (!isDummy) {
    body.subaccount = params.subaccount;
    body.bearer = 'subaccount';
  }
  const data = await paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>('/transaction/initialize', {
    method: 'POST',
    body,
  });
  return data;
}

// Convenience: generate paystack ref
export function generatePaystackRef(handle?: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `TJR_${handle ? handle.slice(0, 8).toUpperCase() + '_' : ''}${ts}_${rand}`;
}
