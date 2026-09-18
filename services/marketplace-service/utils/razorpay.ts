import axios from 'axios';

// Razorpay's v2 Accounts/Route API isn't covered by the `razorpay` npm SDK, so
// these calls go straight over HTTP with Basic Auth, same as Razorpay's own
// docs for Route linked-account onboarding.
function authHeaders() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment.');
  }
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

export interface VendorOnboardingInput {
  storeId: string; // the vendor's own id, used for notes/receipts
  businessName: string;
  legalBusinessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  pan?: string;
  panName?: string;
  address?: { street?: string; city?: string; state?: string; pincode?: string };
  bankAccount?: { accountNumber?: string; ifscCode?: string; entityName?: string };
  existingAccountId?: string;
}

function cleanPhone(phone?: string): string {
  const raw = (phone || '').replace(/\D/g, '').slice(-10);
  return raw.length === 10 ? raw : '9876543210';
}

export async function createLinkedAccount(input: VendorOnboardingInput): Promise<{ id: string; status: string }> {
  const address = input.address || {};
  const baseEmail = input.email || `vendor_${input.storeId}@magizhnaazh.in`;
  const [userPart, domainPart] = baseEmail.includes('@') ? baseEmail.split('@') : [baseEmail, 'magizhnaazh.in'];
  // Razorpay requires a unique email per linked account — suffix with the
  // vendor id so re-onboarding attempts / shared vendor emails don't collide.
  const suffix = String(input.storeId || Date.now()).slice(-8);
  const accountEmail = `${userPart}+v${suffix}@${domainPart}`;

  const payload = {
    email: accountEmail,
    phone: cleanPhone(input.phone),
    type: 'route',
    legal_business_name: input.legalBusinessName || input.businessName,
    business_type: 'individual',
    contact_name: input.ownerName || input.businessName,
    profile: {
      category: 'services',
      subcategory: 'professional_services',
      addresses: {
        registered: {
          street1: (address.street || 'Not provided').slice(0, 50),
          street2: (address.city || 'Not provided').slice(0, 50),
          city: address.city || 'Chennai',
          state: address.state || 'Tamil Nadu',
          postal_code: (address.pincode || '600001').replace(/\D/g, '').slice(0, 6) || '600001',
          country: 'IN',
        },
      },
    },
    notes: { vendorId: input.storeId },
  };

  const { data } = await axios.post('https://api.razorpay.com/v2/accounts', payload, { headers: authHeaders() });
  return data;
}

export async function createStakeholder(accountId: string, input: VendorOnboardingInput): Promise<{ id: string }> {
  const baseEmail = input.email || `vendor_${input.storeId}@magizhnaazh.in`;
  const [userPart, domainPart] = baseEmail.includes('@') ? baseEmail.split('@') : [baseEmail, 'magizhnaazh.in'];
  const suffix = String(input.storeId || Date.now()).slice(-8);
  const stakeholderEmail = `${userPart}+v${suffix}@${domainPart}`;

  const payload: any = {
    name: input.panName || input.ownerName || input.businessName,
    email: stakeholderEmail,
    relationship: { director: false, executive: true },
    phone: { primary: cleanPhone(input.phone) },
  };
  if (input.pan) payload.kyc = { pan: input.pan.trim().toUpperCase() };

  const { data } = await axios.post(
    `https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`,
    payload,
    { headers: authHeaders() }
  );
  return data;
}

// The product's approval state lives in `activation_status`, NOT `status` —
// the account itself only ever reports `created`/`suspended` (see
// getAccountDetails); "activated" is a per-product state.
export async function requestRouteProduct(accountId: string): Promise<{ id: string; status: string }> {
  const { data } = await axios.post(
    `https://api.razorpay.com/v2/accounts/${accountId}/products`,
    { product_name: 'route' },
    { headers: authHeaders() }
  );
  return { id: data.id, status: data.activation_status };
}

export async function updateRouteProductConfig(
  accountId: string,
  productId: string,
  bankAccount?: { accountNumber?: string; ifscCode?: string; entityName?: string }
): Promise<{ status: string }> {
  // Razorpay's actual field is the flat boolean `tnc_accepted` — the nested
  // `{ tnc: { accepted: true } }` shape this used to send was rejected
  // outright ("tnc is/are not required and should not be sent"), which left
  // every vendor stuck at "PENDING APPROVAL" forever regardless of what
  // Razorpay's own dashboard showed.
  const payload: any = { tnc_accepted: true };
  if (bankAccount && bankAccount.accountNumber) {
    payload.settlements = {
      account_number: String(bankAccount.accountNumber).trim(),
      ifsc_code: String(bankAccount.ifscCode || '').trim().toUpperCase(),
      beneficiary_name: String(bankAccount.entityName || 'Vendor').trim(),
    };
  }
  const { data } = await axios.patch(
    `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
    payload,
    { headers: authHeaders() }
  );
  return { status: data.activation_status };
}

// Fetch just this one product's current activation_status — used to refresh
// a vendor's Route eligibility without re-submitting anything.
export async function getProductStatus(accountId: string, productId: string): Promise<{ status: string }> {
  const { data } = await axios.get(
    `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
    { headers: authHeaders() }
  );
  return { status: data.activation_status };
}

export async function getAccountDetails(accountId: string): Promise<{ status: string }> {
  const { data } = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}`, { headers: authHeaders() });
  return data;
}

export interface OnboardResult {
  accountId: string;
  stakeholderId: string | null;
  routeStatus: string;
  productStatus: string;
  productId: string;
  error?: string;
}

// Orchestrates the 4-step Razorpay Route onboarding. Tolerant of partial
// failure at each step (Route approval is asynchronous and can legitimately
// leave the account in a "created but not yet activated" state) — always
// returns the best-known status rather than throwing, so the caller can
// persist partial progress and let the vendor retry/refresh later.
export async function onboardVendor(input: VendorOnboardingInput): Promise<OnboardResult> {
  let accountId = input.existingAccountId || '';
  let stakeholderId: string | null = null;
  let routeStatus = 'created';
  let productStatus = 'requested';
  let productId = 'route';
  let error: string | undefined;

  if (!accountId) {
    const account = await createLinkedAccount(input);
    accountId = account.id;
    routeStatus = account.status || 'created';
  }

  try {
    const stakeholder = await createStakeholder(accountId, input);
    stakeholderId = stakeholder.id;
  } catch (err: any) {
    error = err?.response?.data?.error?.description || err?.message;
  }

  try {
    const product = await requestRouteProduct(accountId);
    productId = product.id || 'route';
    productStatus = product.status || 'requested';
  } catch (err: any) {
    error = err?.response?.data?.error?.description || err?.message || error;
  }

  try {
    const updated = await updateRouteProductConfig(accountId, productId, input.bankAccount);
    productStatus = updated.status || productStatus;
  } catch (err: any) {
    error = err?.response?.data?.error?.description || err?.message || error;
  }

  // Once tnc_accepted + settlements are submitted, Razorpay's approval is
  // asynchronous — re-check the product itself (not the account) for the
  // freshest activation_status, in case it resolved synchronously.
  try {
    const refreshed = await getProductStatus(accountId, productId);
    productStatus = refreshed.status || productStatus;
  } catch {
    // Best-effort — the status above from the update call still stands.
  }

  try {
    const info = await getAccountDetails(accountId);
    routeStatus = info.status || routeStatus;
  } catch {
    // Best-effort refresh only — accountId/stakeholderId/productStatus above still stand.
  }

  return { accountId, stakeholderId, routeStatus, productStatus, productId, error };
}
