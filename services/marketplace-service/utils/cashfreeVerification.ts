import axios from 'axios';

// Cashfree Secure ID (Verification Suite) — real PAN lookups against Income
// Tax Department records, and real Aadhaar verification via DigiLocker
// consent (never a raw OTP-to-UIDAI flow, which needs a special AUA/KUA
// license most businesses don't have; DigiLocker is the compliant,
// self-serve alternative — see docs.cashfree.com/docs/secure-id).
function baseUrl(): string {
  const env = (process.env.CASHFREE_ENVIRONMENT || 'PRODUCTION').toUpperCase();
  return env === 'PRODUCTION' ? 'https://api.cashfree.com/verification' : 'https://sandbox.cashfree.com/verification';
}

function authHeaders() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials (CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET) are missing in environment.');
  }
  return { 'Content-Type': 'application/json', 'x-client-id': clientId, 'x-client-secret': clientSecret };
}

export interface PanVerifyResult {
  valid: boolean;
  registeredName: string;
  nameMatchResult: string;
  nameMatchScore: number;
  panStatus: string;
  message: string;
}

// Checks a PAN against actual Income Tax Department records — not a format
// check. `valid` reflects whether the PAN itself exists and is active;
// nameMatchResult/Score tell you separately whether the name provided
// matches ITD's registered name for it.
export async function verifyPan(pan: string, name: string): Promise<PanVerifyResult> {
  const { data } = await axios.post(
    `${baseUrl()}/pan`,
    { pan: pan.trim().toUpperCase(), name: (name || '').trim() },
    { headers: authHeaders() }
  );
  return {
    valid: Boolean(data.valid),
    registeredName: data.registered_name || '',
    nameMatchResult: data.name_match_result || '',
    nameMatchScore: Number(data.name_match_score) || 0,
    panStatus: data.pan_status || '',
    message: data.message || '',
  };
}

export interface DigilockerUrlResult {
  verificationId: string;
  referenceId: number;
  url: string;
}

// Kicks off the DigiLocker consent flow — returns a one-time URL (valid 10
// minutes) the vendor completes on DigiLocker's own site (logging in with
// their Aadhaar-linked mobile + OTP there, never with us). We only ever
// learn the outcome, not the OTP.
export async function createDigilockerUrl(params: {
  verificationId: string;
  redirectUrl: string;
  userFlow?: 'signin' | 'signup';
}): Promise<DigilockerUrlResult> {
  const { data } = await axios.post(
    `${baseUrl()}/digilocker`,
    {
      verification_id: params.verificationId,
      document_requested: ['AADHAAR'],
      redirect_url: params.redirectUrl,
      user_flow: params.userFlow || 'signin',
    },
    { headers: authHeaders() }
  );
  return { verificationId: data.verification_id, referenceId: data.reference_id, url: data.url };
}

export interface DigilockerStatusResult {
  status: 'PENDING' | 'AUTHENTICATED' | 'EXPIRED' | 'CONSENT_DENIED';
}

export async function getDigilockerStatus(verificationId: string): Promise<DigilockerStatusResult> {
  const { data } = await axios.get(`${baseUrl()}/digilocker`, {
    headers: authHeaders(),
    params: { verification_id: verificationId },
  });
  return { status: data.status };
}

export interface AadhaarDocumentResult {
  status: string;
  maskedUid: string;
  name: string;
  dob: string;
}

// Only call once status is AUTHENTICATED. Cashfree/DigiLocker already mask
// the UID to the last 4 digits (e.g. "xxxxxxxx5647") — that masked form is
// all we ever store, never a full Aadhaar number.
export async function getAadhaarDocument(verificationId: string): Promise<AadhaarDocumentResult> {
  const { data } = await axios.get(`${baseUrl()}/digilocker/document/AADHAAR`, {
    headers: authHeaders(),
    params: { verification_id: verificationId },
  });
  return { status: data.status || '', maskedUid: data.uid || '', name: data.name || '', dob: data.dob || '' };
}
