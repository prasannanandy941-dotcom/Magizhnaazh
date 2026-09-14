const crypto = require('crypto');
const axios = require('axios');

const getEnvConfig = () => {
  const appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || '';
  const secretKey = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || '';
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || secretKey;
  const env = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
  const baseUrl = env === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  return { appId, secretKey, webhookSecret, env, apiVersion, baseUrl };
};

/**
 * Standard Cashfree v2023-08-01 Request Headers
 */
const getHeaders = (idempotencyKey) => {
  const { appId, secretKey, apiVersion } = getEnvConfig();
  const headers = {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': apiVersion,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['x-idempotency-key'] = idempotencyKey;
  }
  return headers;
};

/**
 * 1. Create or Onboard Vendor for Easy Split
 * POST /easy-split/vendors
 */
const createVendor = async (vendorData) => {
  const { baseUrl, env } = getEnvConfig();
  const url = `${baseUrl}/easy-split/vendors`;
  const rawPhone = (vendorData.phone || '').replace(/\D/g, '').slice(-10);
  const cleanPhone = rawPhone.length === 10 ? rawPhone : '9876543210';

  const vendorId = vendorData.vendorId || vendorData.storeId || `vendor_${Date.now()}`;
  const bankAccount = vendorData.bankAccount || vendorData.bank || {};

  const payload = {
    vendor_id: vendorId,
    name: vendorData.legalBusinessName || vendorData.name || 'Store Vendor',
    email: vendorData.email || `vendor_${vendorId}@marketplace.com`,
    phone: cleanPhone,
    status: 'ACTIVE',
    verify_account: false,
  };

  if (bankAccount.accountNumber && bankAccount.ifscCode) {
    payload.bank = {
      account_number: bankAccount.accountNumber.trim(),
      account_holder: bankAccount.beneficiaryName || vendorData.ownerName || vendorData.name || 'Vendor',
      ifsc: bankAccount.ifscCode.trim().toUpperCase(),
    };
  }

  const panNumber = (vendorData.pan || vendorData.panNumber || 'AAAPA0000A').toString().trim().toUpperCase();
  payload.kyc_details = {
    account_type: vendorData.accountType || (vendorData.businessType === 'business' ? 'CURRENT' : 'SAVINGS'),
    business_type: vendorData.businessType === 'business' ? 'PROPRIETORSHIP' : 'INDIVIDUAL',
    pan: panNumber,
  };

  try {
    const response = await axios.post(url, payload, { headers: getHeaders() });
    return {
      vendorId: response.data.vendor_id || vendorId,
      status: response.data.status || 'ACTIVE',
      data: response.data,
      isSandbox: env === 'SANDBOX',
    };
  } catch (err) {
    const isAlreadyExists = err.response?.status === 409 || err.response?.data?.message?.includes('already exists');

    if (isAlreadyExists) {
      console.log(`ℹ️ [Cashfree Easy Split]: Vendor '${vendorId}' is already registered in Cashfree.`);
      return {
        vendorId,
        status: 'ACTIVE',
        isExisting: true,
      };
    }

    const errorMessage = err.response?.data?.message || err.message;
    const isEasySplitNotEnabled =
      errorMessage.toLowerCase().includes('not enabled with easy splits') ||
      errorMessage.toLowerCase().includes('easy split is not enabled') ||
      errorMessage.toLowerCase().includes('easy splits');

    if (isEasySplitNotEnabled) {
      console.warn(`⚠️ [Cashfree Notice]: Easy Split feature is pending activation on Cashfree account ('${errorMessage}'). Vendor bank details saved in marketplace.`);
      return {
        vendorId,
        status: 'active',
        easySplitPending: true,
        message: 'Vendor bank details saved. Easy Split activation is pending on Cashfree Production account.',
      };
    }

    console.error(`❌ [Cashfree Easy Split Vendor Error]: ${errorMessage}`);
    throw new Error(`Failed to onboard vendor in Cashfree: ${errorMessage}`);
  }
};

/**
 * 2. Get Vendor Details
 * GET /easy-split/vendors/{vendor_id}
 */
const getVendorDetails = async (vendorId) => {
  const { baseUrl } = getEnvConfig();
  const url = `${baseUrl}/easy-split/vendors/${vendorId}`;
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    console.error(`❌ [Cashfree Get Vendor Error]: ${errorMessage}`);
    throw new Error(`Cashfree vendor lookup failed: ${errorMessage}`);
  }
};

/**
 * 3. Create Cashfree Order with Easy Split (Single & Multi-Vendor Distribution)
 * POST /orders
 */
const createEasySplitOrder = async ({
  orderId,
  orderAmount,
  currency = 'INR',
  customer = {},
  orderMeta = {},
  splits = [],
  notes = {},
}) => {
  const { baseUrl, env } = getEnvConfig();
  const url = `${baseUrl}/orders`;

  const rawPhone = (customer.phone || customer.customer_phone || '').replace(/\D/g, '').slice(-10);
  const cleanPhone = rawPhone.length === 10 ? rawPhone : '9876543210';
  const customerId = (customer.id || customer.customer_id || `cust_${Date.now()}`).toString().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

  const payload = {
    order_id: orderId,
    order_amount: Math.round(Number(orderAmount) * 100) / 100,
    order_currency: currency,
    customer_details: {
      customer_id: customerId,
      customer_phone: cleanPhone,
      customer_email: customer.email || customer.customer_email || 'customer@marketplace.com',
      customer_name: customer.name || customer.customer_name || 'Valued Customer',
    },
    order_meta: {
      return_url: (orderMeta.return_url && orderMeta.return_url.startsWith('https://')) ? orderMeta.return_url : undefined,
      notify_url: (orderMeta.notify_url && orderMeta.notify_url.startsWith('https://')) ? orderMeta.notify_url : undefined,
      payment_methods: 'cc,dc,upi,nb,app',
    },
    order_tags: notes,
  };

  if (splits && splits.length > 0) {
    payload.order_splits = splits.map((s) => {
      const splitObj = {
        vendor_id: s.vendor_id || s.vendorId,
      };
      if (s.amount !== undefined && s.amount > 0) {
        splitObj.amount = Math.round(Number(s.amount) * 100) / 100;
      } else if (s.percentage !== undefined) {
        splitObj.percentage = Number(s.percentage);
      }
      if (s.tags) {
        splitObj.tags = s.tags;
      }
      return splitObj;
    });
  }

  try {
    const response = await axios.post(url, payload, { headers: getHeaders() });
    return {
      ...response.data,
      isSandbox: env === 'SANDBOX',
    };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    const isEasySplitOrVendorIssue =
      errorMsg.toLowerCase().includes('easy split is not enabled') ||
      errorMsg.toLowerCase().includes('easy split') ||
      errorMsg.toLowerCase().includes('vendor not found') ||
      errorMsg.toLowerCase().includes('vendor');

    // If Easy Split or vendor registration is pending on this Cashfree environment,
    // gracefully retry as a standard marketplace payment order so checkout succeeds.
    if (isEasySplitOrVendorIssue && payload.order_splits) {
      console.warn(`⚠️ [Cashfree Notice]: Order split notice ('${errorMsg}'). Proceeding with standard payment collection.`);
      const fallbackPayload = { ...payload };
      delete fallbackPayload.order_splits;
      try {
        const fallbackRes = await axios.post(url, fallbackPayload, { headers: getHeaders() });
        return {
          ...fallbackRes.data,
          isSandbox: env === 'SANDBOX',
          easySplitPending: true,
        };
      } catch (fbErr) {
        const fbMsg = fbErr.response?.data?.message || fbErr.message;
        console.error(`❌ [Cashfree Create Order Error]: ${fbMsg}`);
        throw new Error(`Failed to create Cashfree Order: ${fbMsg}`);
      }
    }

    console.error(`❌ [Cashfree Create Order Error]: ${errorMsg}`);
    throw new Error(`Failed to create Cashfree Order: ${errorMsg}`);
  }
};

/**
 * 4. Get Order Status from Cashfree
 * GET /orders/{order_id}
 */
const getOrderDetails = async (orderId) => {
  const { baseUrl } = getEnvConfig();
  const url = `${baseUrl}/orders/${orderId}`;
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    console.error(`❌ [Cashfree Get Order Details Error]: ${errorMessage}`);
    throw new Error(`Cashfree order status lookup failed: ${errorMessage}`);
  }
};

/**
 * 5. Get Payment Transactions for an Order
 * GET /orders/{order_id}/payments
 */
const getOrderPayments = async (orderId) => {
  const { baseUrl } = getEnvConfig();
  const url = `${baseUrl}/orders/${orderId}/payments`;
  try {
    const response = await axios.get(url, { headers: getHeaders() });
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    console.error(`❌ [Cashfree Get Order Payments Error]: ${errorMessage}`);
    throw new Error(`Cashfree order payments lookup failed: ${errorMessage}`);
  }
};

/**
 * 6. Create Refund with Easy Split Vendor Deductions
 * POST /orders/{order_id}/refunds
 */
const createRefund = async ({
  orderId,
  refundId,
  refundAmount,
  refundSplits = [],
  refundNote = 'Order refund',
  refundSpeed = 'STANDARD',
}) => {
  const { baseUrl } = getEnvConfig();
  const url = `${baseUrl}/orders/${orderId}/refunds`;
  const payload = {
    refund_id: refundId || `RFND_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    refund_amount: Math.round(Number(refundAmount) * 100) / 100,
    refund_note: refundNote,
    refund_speed: refundSpeed,
  };

  if (refundSplits && refundSplits.length > 0) {
    payload.refund_splits = refundSplits.map((s) => ({
      vendor_id: s.vendor_id || s.vendorId,
      amount: Math.round(Number(s.amount) * 100) / 100,
    }));
  }

  try {
    const response = await axios.post(url, payload, { headers: getHeaders() });
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;
    console.error(`❌ [Cashfree Refund Error]: ${errorMessage}`);
    throw new Error(`Cashfree refund creation failed: ${errorMessage}`);
  }
};

/**
 * 7. Verify Cashfree Webhook Signature
 */
const verifyWebhookSignature = ({
  rawBody,
  signature,
  timestamp,
  secret,
}) => {
  const { webhookSecret } = getEnvConfig();
  const effectiveSecret = secret || webhookSecret;
  if (!rawBody || !signature || !timestamp || !effectiveSecret) return false;

  const rawBodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const signatureData = `${timestamp}${rawBodyString}`;

  const expectedSignature = crypto
    .createHmac('sha256', effectiveSecret)
    .update(signatureData)
    .digest('base64');

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
  createVendor,
  getVendorDetails,
  createEasySplitOrder,
  getOrderDetails,
  getOrderPayments,
  createRefund,
  verifyWebhookSignature,
  getHeaders,
  getEnvConfig,
};
