const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const path = require('path');
const envPath = path.resolve(__dirname, '../.env');

/**
 * Initialize Razorpay SDK instance lazily or safely with current env vars
 */
const getRazorpayInstance = () => {
  require('dotenv').config({ path: envPath, override: true });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment.');
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Generate HTTP Basic Auth Header for Razorpay v2 API calls
 */
const getBasicAuthHeaders = () => {
  require('dotenv').config({ path: envPath });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing.');
  }
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Standard Indian State names formatted for Razorpay Accounts v2 API
 */
const STATE_NAME_MAP = {
  'tn': 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'ka': 'Karnataka',
  'karnataka': 'Karnataka',
  'kl': 'Kerala',
  'kerala': 'Kerala',
  'mh': 'Maharashtra',
  'maharashtra': 'Maharashtra',
  'ap': 'Andhra Pradesh',
  'andhra pradesh': 'Andhra Pradesh',
  'tg': 'Telangana',
  'ts': 'Telangana',
  'telangana': 'Telangana',
  'dl': 'Delhi',
  'delhi': 'Delhi',
  'gj': 'Gujarat',
  'gujarat': 'Gujarat',
  'rj': 'Rajasthan',
  'rajasthan': 'Rajasthan',
  'wb': 'West Bengal',
  'west bengal': 'West Bengal',
  'up': 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'mp': 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  'hr': 'Haryana',
  'haryana': 'Haryana',
  'pb': 'Punjab',
  'punjab': 'Punjab',
  'or': 'Odisha',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'br': 'Bihar',
  'bihar': 'Bihar',
  'as': 'Assam',
  'assam': 'Assam',
  'ga': 'Goa',
  'goa': 'Goa',
  'jk': 'Jammu and Kashmir',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'uk': 'Uttarakhand',
  'uttarakhand': 'Uttarakhand',
  'jh': 'Jharkhand',
  'jharkhand': 'Jharkhand',
  'ch': 'Chandigarh',
  'chandigarh': 'Chandigarh',
  'py': 'Puducherry',
  'puducherry': 'Pondicherry',
  'pondicherry': 'Pondicherry',
};

const resolveStateName = (stateName) => {
  if (!stateName) return 'Tamil Nadu';
  const clean = stateName.replace(/[\u00a0\s]+/g, ' ').toLowerCase().trim();
  return STATE_NAME_MAP[clean] || (stateName.replace(/[\u00a0\s]+/g, ' ').trim());
};

/**
 * 1. Create a Razorpay Route Linked Account
 * POST https://api.razorpay.com/v2/accounts
 */
const createLinkedAccount = async (vendorData) => {
  const url = 'https://api.razorpay.com/v2/accounts';
  const rawPhone = (vendorData.phone || '').replace(/\D/g, '').slice(-10);
  const cleanPhone = rawPhone.length === 10 ? rawPhone : '9876543210';

  const address = vendorData.address || {};
  const stateName = resolveStateName(address.state || 'Tamil Nadu');

  const baseEmail = vendorData.email || `vendor_${vendorData.storeId}@remise.in`;
  const [userPart, domainPart] = baseEmail.includes('@') ? baseEmail.split('@') : [baseEmail, 'remise.in'];
  const suffix = String(vendorData.storeId || Date.now()).slice(-6);
  const vendorEmail = `${userPart}+v${suffix}@${domainPart}`;

  const payload = {
    email: vendorEmail,
    phone: cleanPhone,
    type: 'route',
    legal_business_name: vendorData.legalBusinessName || vendorData.name || 'Store Vendor',
    business_type: vendorData.businessType || 'individual',
    contact_name: vendorData.ownerName || vendorData.name || 'Store Owner',
    profile: {
      category: 'services',
      subcategory: 'professional_services',
      addresses: {
        registered: {
          street1: (address.street || address.address || 'Market Street').slice(0, 50),
          street2: (address.street2 || address.area || address.city || 'Main Road').slice(0, 50),
          city: address.city || 'Chennai',
          state: stateName,
          postal_code: (address.pinCode || '600001').replace(/\D/g, '').slice(0, 6) || '600001',
          country: 'IN',
        },
      },
    },
    notes: {
      storeId: vendorData.storeId ? String(vendorData.storeId) : '',
      ownerId: vendorData.ownerId ? String(vendorData.ownerId) : '',
    },
  };

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 2. Create Stakeholder for Linked Account
 * POST https://api.razorpay.com/v2/accounts/:id/stakeholders
 */
const createStakeholder = async (accountId, stakeholderData) => {
  const url = `https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`;
  const rawPhone = (stakeholderData.phone || '').replace(/\D/g, '').slice(-10);
  const cleanPhone = rawPhone.length === 10 ? rawPhone : '9876543210';

  const baseEmail = stakeholderData.email || `vendor_${stakeholderData.storeId || '1'}@remise.in`;
  const [userPart, domainPart] = baseEmail.includes('@') ? baseEmail.split('@') : [baseEmail, 'remise.in'];
  const suffix = String(stakeholderData.storeId || Date.now()).slice(-6);
  const stakeholderEmail = `${userPart}+v${suffix}@${domainPart}`;

  const payload = {
    name: stakeholderData.name || 'Store Owner',
    email: stakeholderEmail,
    relationship: {
      director: false,
      executive: true,
    },
    phone: {
      primary: cleanPhone,
    },
  };

  if (stakeholderData.pan) {
    payload.kyc = {
      pan: stakeholderData.pan.trim().toUpperCase(),
    };
  }

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 3. Request Route Product Configuration
 * POST https://api.razorpay.com/v2/accounts/:id/products
 */
const requestRouteProduct = async (accountId) => {
  const url = `https://api.razorpay.com/v2/accounts/${accountId}/products`;
  const payload = {
    product_name: 'route',
  };

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 4. Update Product Configuration (Bank Account Details & T&C Acceptance)
 * PATCH https://api.razorpay.com/v2/accounts/:id/products/:product_id
 */
const updateRouteProductConfig = async (accountId, bankAccount = null, productId = 'route') => {
  const targetProduct = productId || 'route';
  const url = `https://api.razorpay.com/v2/accounts/${accountId}/products/${targetProduct}`;
  
  const payload = {
    tnc: {
      accepted: true,
    },
  };

  if (bankAccount && (bankAccount.accountNumber || bankAccount.account_number)) {
    payload.settlements = {
      account_number: String(bankAccount.accountNumber || bankAccount.account_number).trim(),
      ifsc_code: String(bankAccount.ifscCode || bankAccount.ifsc_code || '').trim().toUpperCase(),
      beneficiary_name: String(bankAccount.beneficiaryName || bankAccount.beneficiary_name || 'Store Merchant').trim(),
    };
  }

  const response = await axios.patch(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * Legacy alias for step 4
 */
const acceptRouteTerms = async (accountId, bankAccount = null) => {
  return updateRouteProductConfig(accountId, bankAccount, 'route');
};

/**
 * 5. Fetch Account Details / Status from Razorpay
 * GET https://api.razorpay.com/v2/accounts/:id
 */
const getAccountDetails = async (accountId) => {
  const url = `https://api.razorpay.com/v2/accounts/${accountId}`;
  const response = await axios.get(url, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * Full vendor onboarding pipeline (4 Steps in exact sequence):
 * Step 1: Create Linked Account (POST /v2/accounts)
 * Step 2: Create Stakeholder (POST /v2/accounts/:id/stakeholders)
 * Step 3: Request Product Configuration (POST /v2/accounts/:id/products)
 * Step 4: Update Product Configuration with Bank Account & T&C (PATCH /v2/accounts/:id/products/:product_id)
 */
const onboardVendor = async (vendorData) => {
  let accountId = vendorData.existingAccountId || vendorData.razorpayAccountId;
  let stakeholderId = vendorData.razorpayStakeholderId || null;
  let routeStatus = 'created';
  let productStatus = 'requested';
  let productId = 'route';

  // Step 1: Create Linked Account
  if (!accountId) {
    const account = await createLinkedAccount(vendorData);
    accountId = account.id;
    routeStatus = account.status || 'created';
  }

  // Step 2: Create Stakeholder
  try {
    const stakeholder = await createStakeholder(accountId, {
      name: vendorData.ownerName || vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone,
      pan: vendorData.pan,
      storeId: vendorData.storeId,
    });
    stakeholderId = stakeholder.id;
  } catch (stkErr) {
    console.warn(`Stakeholder creation note for ${accountId}:`, stkErr.response?.data?.error?.description || stkErr.message);
  }

  // Step 3: Request Route Product Configuration
  try {
    const product = await requestRouteProduct(accountId);
    productId = product.id || product.product_name || 'route';
    productStatus = product.status || 'requested';
  } catch (prdErr) {
    console.warn(`Route product request note for ${accountId}:`, prdErr.response?.data?.error?.description || prdErr.message);
  }

  // Step 4: Update Product Configuration (Bank Details + T&C)
  try {
    const bankAccount = vendorData.bankAccount || {
      accountNumber: vendorData.bankAccountNumber,
      ifscCode: vendorData.bankIfsc,
      beneficiaryName: vendorData.ownerName || vendorData.name,
    };
    await updateRouteProductConfig(accountId, bankAccount, productId);
    productStatus = 'active';
  } catch (tncErr) {
    console.warn(`Route product update / T&C note for ${accountId}:`, tncErr.response?.data?.error?.description || tncErr.message);
  }

  // Fetch final status
  try {
    const accountInfo = await getAccountDetails(accountId);
    routeStatus = accountInfo.status === 'activated' || accountInfo.status === 'active' ? 'active' : (accountInfo.status || routeStatus);
  } catch (infoErr) {
    console.warn(`Fetch account info note for ${accountId}:`, infoErr.message);
  }

  return {
    accountId,
    stakeholderId,
    routeStatus,
    productStatus,
  };
};

/**
 * 6. Create Razorpay Order with Route Transfers (Multi-Vendor Split)
 * POST https://api.razorpay.com/v1/orders
 *
 * @param {Object} params
 * @param {number} params.amount - Total amount in paise (integer)
 * @param {string} params.currency - 'INR'
 * @param {string} params.receipt - Internal order ID
 * @param {Array} params.transfers - Array of transfer configs for linked accounts
 * @param {Object} params.notes - Metadata notes
 */
const createMarketplaceOrder = async ({ amount, currency = 'INR', receipt, transfers = [], notes = {} }) => {
  const instance = getRazorpayInstance();

  const payload = {
    amount: Math.round(amount),
    currency,
    receipt,
    notes,
  };

  // Only attach transfers if valid transfer entries exist with valid account IDs
  if (transfers && Array.isArray(transfers) && transfers.length > 0) {
    const validTransfers = transfers
      .filter((t) => t.account && t.amount > 0)
      .map((t) => ({
        account: t.account,
        amount: Math.round(t.amount), // in paise
        currency: t.currency || 'INR',
        notes: t.notes || {},
        linked_account_notes: t.linked_account_notes || ['storeId', 'orderId'],
        on_hold: t.on_hold !== undefined ? t.on_hold : 0,
      }));

    if (validTransfers.length > 0) {
      payload.transfers = validTransfers;
    }
  }

  const order = await instance.orders.create(payload);
  return order;
};

/**
 * 7. Post-Payment Direct Transfers (Fallback / Direct transfer upon payment capture)
 * POST https://api.razorpay.com/v1/payments/:paymentId/transfers
 */
const createPaymentTransfers = async (paymentId, transfers) => {
  const url = `https://api.razorpay.com/v1/payments/${paymentId}/transfers`;
  const payload = {
    transfers: transfers.map((t) => ({
      account: t.account,
      amount: Math.round(t.amount), // in paise
      currency: t.currency || 'INR',
      notes: t.notes || {},
      on_hold: t.on_hold || 0,
    })),
  };

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 8. Direct Transfer from Razorpay Balance to Linked Account
 * POST https://api.razorpay.com/v1/transfers
 */
const createDirectTransfer = async ({ account, amount, currency = 'INR', notes = {} }) => {
  const url = 'https://api.razorpay.com/v1/transfers';
  const payload = {
    account,
    amount: Math.round(amount), // in paise
    currency: currency || 'INR',
    notes: notes || {},
  };

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 9. Reverse Route Transfer (For refunds / order cancellations)
 * POST https://api.razorpay.com/v1/transfers/:transferId/reversals
 */
const reverseTransfer = async ({ transferId, amount, currency = 'INR', notes = {} }) => {
  const url = `https://api.razorpay.com/v1/transfers/${transferId}/reversals`;
  const payload = {};
  if (amount) payload.amount = Math.round(amount);
  if (currency) payload.currency = currency;
  if (notes) payload.notes = notes;

  const response = await axios.post(url, payload, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 10. Fetch Transfer Details
 * GET https://api.razorpay.com/v1/transfers/:transferId
 */
const getTransferDetails = async (transferId) => {
  const url = `https://api.razorpay.com/v1/transfers/${transferId}`;
  const response = await axios.get(url, { headers: getBasicAuthHeaders() });
  return response.data;
};

/**
 * 11. Verify Razorpay Payment Signature
 * HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET }) => {
  if (!orderId || !paymentId || !signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
};

/**
 * 12. Verify Razorpay Webhook Signature
 * HMAC-SHA256(rawBody, webhookSecret) == x-razorpay-signature
 */
const verifyWebhookSignature = ({ body, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET }) => {
  if (!body || !signature || !secret) return false;
  const rawBodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBodyString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
};

module.exports = {
  getRazorpayInstance,
  createLinkedAccount,
  createStakeholder,
  requestRouteProduct,
  updateRouteProductConfig,
  acceptRouteTerms,
  getAccountDetails,
  onboardVendor,
  createMarketplaceOrder,
  createPaymentTransfers,
  createDirectTransfer,
  reverseTransfer,
  getTransferDetails,
  verifyPaymentSignature,
  verifyWebhookSignature,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
};
