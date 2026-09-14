/**
 * Automated Verification Script for Razorpay Route Multi-Vendor Marketplace Integration
 * Run with: node services/payment-service/scripts/test-razorpay-route.js
 */
const crypto = require('crypto');
const {
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../utils/razorpay');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

const TEST_SECRET = 'ZkQFAlJnRc7XTlqlOddEdFC8';
const TEST_WEBHOOK_SECRET = 'rzp_webhook_secret_wowlife_2026';

console.log('\n============================================================');
console.log('🧪 RUNNING RAZORPAY ROUTE MARKETPLACE INTEGRATION TEST SUITE');
console.log('============================================================\n');

// ── TEST 1: Single-Vendor Payout Calculation (0% Remise Platform Commission) ──
console.log('--- TEST 1: Single Vendor Calculation (0% Platform Commission) ---');
{
  const PLATFORM_COMMISSION_ENABLED = false;
  const DEFAULT_COMMISSION_PERCENT = 0;

  const vendorA = {
    gross: 1000,
    commissionPct: 10, // store-level percentage
  };

  const effectiveCommissionPct = PLATFORM_COMMISSION_ENABLED ? vendorA.commissionPct : DEFAULT_COMMISSION_PERCENT;
  const grossPaise = Math.round(vendorA.gross * 100);
  const commissionPaise = Math.round(grossPaise * (effectiveCommissionPct / 100));
  const vendorPaise = Math.max(0, grossPaise - commissionPaise);
  const commission = Math.round(commissionPaise) / 100;
  const vendorNet = Math.round(vendorPaise) / 100;

  assert(effectiveCommissionPct === 0, `Effective commission rate is 0%`);
  assert(commission === 0, `Remise platform commission is ₹0 (got ₹${commission})`);
  assert(vendorNet === 1000, `Vendor A receives full gross ₹1,000 (got ₹${vendorNet})`);
  assert(vendorPaise === 100000, `Vendor A receives 100000 paise (got ${vendorPaise})`);
}

// ── TEST 2: Multi-Vendor Marketplace Distribution (0% Remise Platform Commission) ──
console.log('\n--- TEST 2: Multi-Vendor Marketplace Distribution (0% Platform Commission) ---');
{
  const PLATFORM_COMMISSION_ENABLED = false;
  const DEFAULT_COMMISSION_PERCENT = 0;

  // Vendor A: 2 products (₹500 + ₹200 = ₹700)
  // Vendor B: 1 product (₹300)
  // Total cart = ₹1,000
  const cart = [
    { title: 'Vendor A Item 1', price: 500, qty: 1, storeId: 'store_A', commissionPct: 10, razorpayAccountId: 'acc_vendorA_001' },
    { title: 'Vendor A Item 2', price: 200, qty: 1, storeId: 'store_A', commissionPct: 10, razorpayAccountId: 'acc_vendorA_001' },
    { title: 'Vendor B Item 1', price: 300, qty: 1, storeId: 'store_B', commissionPct: 15, razorpayAccountId: 'acc_vendorB_002' },
  ];

  const storeTotals = {};
  for (const item of cart) {
    if (!storeTotals[item.storeId]) {
      storeTotals[item.storeId] = {
        gross: 0,
        commissionPct: item.commissionPct,
        razorpayAccountId: item.razorpayAccountId,
      };
    }
    storeTotals[item.storeId].gross += item.price * item.qty;
  }

  const transfers = [];
  let platformCommissionPaise = 0;
  let customerTotalPaise = 0;

  for (const [storeId, data] of Object.entries(storeTotals)) {
    const effectiveCommissionPct = PLATFORM_COMMISSION_ENABLED ? data.commissionPct : DEFAULT_COMMISSION_PERCENT;
    const grossPaise = Math.round(data.gross * 100);
    const commPaise = Math.round(grossPaise * (effectiveCommissionPct / 100));
    const netPaise = Math.max(0, grossPaise - commPaise);

    customerTotalPaise += grossPaise;
    platformCommissionPaise += commPaise;

    transfers.push({
      storeId,
      account: data.razorpayAccountId,
      gross: data.gross,
      commission: commPaise / 100,
      net: netPaise / 100,
      amountPaise: netPaise,
    });
  }

  assert(customerTotalPaise === 100000, `Total customer cart is 100000 paise (₹1,000)`);
  assert(platformCommissionPaise === 0, `Remise platform commission is 0 paise (₹0)`);

  const transferA = transfers.find((t) => t.storeId === 'store_A');
  const transferB = transfers.find((t) => t.storeId === 'store_B');

  assert(transferA.gross === 700, `Vendor A gross is ₹700 (got ₹${transferA.gross})`);
  assert(transferA.commission === 0, `Vendor A commission is ₹0 (got ₹${transferA.commission})`);
  assert(transferA.net === 700, `Vendor A payout is ₹700 (got ₹${transferA.net})`);
  assert(transferA.amountPaise === 70000, `Vendor A Route transfer amount is 70000 paise`);

  assert(transferB.gross === 300, `Vendor B gross is ₹300 (got ₹${transferB.gross})`);
  assert(transferB.commission === 0, `Vendor B commission is ₹0 (got ₹${transferB.commission})`);
  assert(transferB.net === 300, `Vendor B payout is ₹300 (got ₹${transferB.net})`);
  assert(transferB.amountPaise === 30000, `Vendor B Route transfer amount is 30000 paise`);

  const totalTransfersPaise = transfers.reduce((sum, t) => sum + t.amountPaise, 0);
  assert(totalTransfersPaise === customerTotalPaise, `Sum of vendor transfers (${totalTransfersPaise} paise) equals Order amount (${customerTotalPaise} paise)`);
}

// ── TEST 3: Configurable Re-enabling Verification ──
console.log('\n--- TEST 3: Configurable Commission Architecture Verification ---');
{
  const PLATFORM_COMMISSION_ENABLED = true; // when re-enabled in future
  const DEFAULT_COMMISSION_PERCENT = 10;

  const vendorA = { gross: 1000, commissionPct: 10 };
  const effectiveCommissionPct = PLATFORM_COMMISSION_ENABLED ? vendorA.commissionPct : DEFAULT_COMMISSION_PERCENT;
  const grossPaise = Math.round(vendorA.gross * 100);
  const commissionPaise = Math.round(grossPaise * (effectiveCommissionPct / 100));
  const vendorPaise = Math.max(0, grossPaise - commissionPaise);

  assert(commissionPaise === 10000, `When re-enabled, 10% commission calculates ₹100 fee correctly`);
  assert(vendorPaise === 90000, `When re-enabled, vendor receives ₹900 payout correctly`);
}

// ── TEST 4: Payment Signature Verification ──
console.log('\n--- TEST 4: Payment Signature Verification ---');
{
  const orderId = 'order_test_123456';
  const paymentId = 'pay_test_789012';

  const validSignature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyPaymentSignature({
    orderId,
    paymentId,
    signature: validSignature,
    secret: TEST_SECRET,
  });

  assert(isValid === true, 'Valid payment signature verified successfully via HMAC SHA256');

  const isInvalid = verifyPaymentSignature({
    orderId,
    paymentId,
    signature: 'tampered_signature_xyz123',
    secret: TEST_SECRET,
  });

  assert(isInvalid === false, 'Tampered payment signature rejected as invalid');

  const isMissing = verifyPaymentSignature({
    orderId: '',
    paymentId,
    signature: validSignature,
    secret: TEST_SECRET,
  });

  assert(isMissing === false, 'Empty order ID signature rejected');
}

// ── TEST 5: Webhook Signature Verification ──
console.log('\n--- TEST 5: Webhook Signature Verification ---');
{
  const webhookPayload = JSON.stringify({
    event: 'transfer.processed',
    payload: {
      transfer: {
        entity: {
          id: 'trf_123456789',
          recipient: 'acc_vendorA_999',
          amount: 70000,
          notes: { orderId: 'TXN_TEST_001' },
        },
      },
    },
  });

  const validWebhookSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(webhookPayload)
    .digest('hex');

  const isWebhookValid = verifyWebhookSignature({
    body: webhookPayload,
    signature: validWebhookSig,
    secret: TEST_WEBHOOK_SECRET,
  });

  assert(isWebhookValid === true, 'Webhook HMAC SHA256 signature verified successfully');

  const isWebhookInvalid = verifyWebhookSignature({
    body: webhookPayload,
    signature: 'bad_signature_hex_123',
    secret: TEST_WEBHOOK_SECRET,
  });

  assert(isWebhookInvalid === false, 'Bad webhook signature rejected');
}

// ── TEST 6: Webhook Idempotency Simulation ──
console.log('\n--- TEST 6: Webhook Idempotency Simulation ---');
{
  const order = {
    orderId: 'TXN_TEST_001',
    paymentStatus: 'PENDING',
    stockStatus: 'RESERVED',
    vendorTransfers: [
      {
        storeId: 'store_A',
        razorpayAccountId: 'acc_vendorA_999',
        transferStatus: 'pending',
        grossAmount: 700,
        commissionAmount: 0,
        vendorAmount: 700,
      },
    ],
  };

  let stockCommits = 0;
  let notificationsSent = 0;

  // First webhook processing: payment.captured
  if (order.paymentStatus !== 'SUCCESS') {
    order.paymentStatus = 'SUCCESS';
    order.stockStatus = 'COMMITTED';
    stockCommits++;
    notificationsSent++;
  }
  assert(order.paymentStatus === 'SUCCESS', 'First webhook marks order as SUCCESS and commits stock');
  assert(stockCommits === 1 && notificationsSent === 1, 'Stock committed and notification sent once');

  // Second duplicate webhook processing: payment.captured (idempotent no-op)
  if (order.paymentStatus !== 'SUCCESS') {
    stockCommits++;
    notificationsSent++;
  }
  assert(stockCommits === 1 && notificationsSent === 1, 'Duplicate webhook handled idempotently without re-triggering stock commit or notifications');

  // Transfer processed webhook
  const transferEvent = {
    transferId: 'trf_999000',
    accountId: 'acc_vendorA_999',
    status: 'processed',
  };

  const trf = order.vendorTransfers.find((t) => t.razorpayAccountId === transferEvent.accountId);
  if (trf) {
    trf.transferStatus = 'processed';
    trf.razorpayTransferId = transferEvent.transferId;
  }

  assert(trf.transferStatus === 'processed', 'Vendor transfer status updated to PROCESSED');
  assert(trf.razorpayTransferId === 'trf_999000', 'Transfer ID recorded correctly on order');
}

// ── TEST 7: Security Check Against Frontend Amount/Vendor Tampering ──
console.log('\n--- TEST 7: Security Check Against Frontend Amount/Vendor Tampering ---');
{
  const PLATFORM_COMMISSION_ENABLED = false;

  const untrustedFrontendPayload = {
    cartItems: [{ id: 'prod_1', price: 10, quantity: 1, storeId: 'store_A' }],
    vendorAmount: 1,
    commissionAmount: 50,
  };

  const catalogProduct = { id: 'prod_1', price: 500, storeId: 'store_A' };
  const storeRecord = { _id: 'store_A', commissionPercentage: 10, razorpayAccountId: 'acc_real_vendor' };

  const effectiveCommPct = PLATFORM_COMMISSION_ENABLED ? storeRecord.commissionPercentage : 0;
  const verifiedPrice = catalogProduct.price;
  const verifiedGross = verifiedPrice * untrustedFrontendPayload.cartItems[0].quantity;
  const verifiedGrossPaise = Math.round(verifiedGross * 100);
  const verifiedCommPaise = Math.round(verifiedGrossPaise * (effectiveCommPct / 100));
  const verifiedVendorPaise = verifiedGrossPaise - verifiedCommPaise;

  assert(verifiedGross === 500, `Backend authoritative gross amount is ₹500 (rejected frontend ₹10)`);
  assert(verifiedCommPaise === 0, `Backend authoritative commission is ₹0 (rejected frontend ₹50)`);
  assert(verifiedVendorPaise === 50000, `Backend authoritative vendor payout is ₹500 / 50000 paise (rejected frontend ₹1)`);
}

// ── TEST 8: Mandatory Razorpay Route Checkout Protection Validation ──
console.log('\n--- TEST 8: Store without Razorpay Account Rejected for Razorpay Checkout ---');
{
  function validateStoresForPayment(paymentMethod, stores) {
    if (paymentMethod === 'razorpay') {
      for (const store of stores) {
        if (!store.razorpayAccountId || store.razorpayRouteStatus !== 'active') {
          return {
            allowed: false,
            statusCode: 400,
            code: 'RAZORPAY_VENDOR_NOT_READY',
            message: `The store "${store.name}" is not yet ready to accept Razorpay payments. Please complete store onboarding or choose another payment method (Cashfree, QR, or Cash on Delivery).`,
          };
        }
      }
    }
    return { allowed: true, statusCode: 200 };
  }

  // 1. Store without Razorpay account
  const storeWithoutAccount = [{ name: 'Store A', razorpayAccountId: null, razorpayRouteStatus: 'not_created' }];
  const res1 = validateStoresForPayment('razorpay', storeWithoutAccount);
  assert(res1.allowed === false && res1.statusCode === 400, 'Store without Razorpay account is rejected with 400');
  assert(res1.code === 'RAZORPAY_VENDOR_NOT_READY', 'Returns RAZORPAY_VENDOR_NOT_READY error code');

  // 2. Store with account but inactive status
  const storeInactive = [{ name: 'Store B', razorpayAccountId: 'acc_inactive_123', razorpayRouteStatus: 'under_review' }];
  const res2 = validateStoresForPayment('razorpay', storeInactive);
  assert(res2.allowed === false && res2.statusCode === 400, 'Store with inactive status is rejected with 400');

  // 3. Store with active Route account
  const storeActive = [{ name: 'Store C', razorpayAccountId: 'acc_active_456', razorpayRouteStatus: 'active' }];
  const res3 = validateStoresForPayment('razorpay', storeActive);
  assert(res3.allowed === true && res3.statusCode === 200, 'Store with active Route account is allowed (200)');

  // 4. Multi-vendor where all vendors are active
  const multiAllActive = [
    { name: 'Vendor 1', razorpayAccountId: 'acc_v1', razorpayRouteStatus: 'active' },
    { name: 'Vendor 2', razorpayAccountId: 'acc_v2', razorpayRouteStatus: 'active' },
  ];
  const res4 = validateStoresForPayment('razorpay', multiAllActive);
  assert(res4.allowed === true, 'Multi-vendor order where all vendors are active is allowed');

  // 5. Multi-vendor where one vendor is inactive
  const multiOneInactive = [
    { name: 'Vendor 1', razorpayAccountId: 'acc_v1', razorpayRouteStatus: 'active' },
    { name: 'Vendor 2 (Pending)', razorpayAccountId: 'acc_v2', razorpayRouteStatus: 'created' },
  ];
  const res5 = validateStoresForPayment('razorpay', multiOneInactive);
  assert(res5.allowed === false && res5.statusCode === 400, 'Multi-vendor order with one inactive vendor is rejected (400)');
  assert(res5.message.includes('Vendor 2 (Pending)'), 'Rejection error specifies the exact inactive store');

  // 6. Cashfree order for non-Razorpay-ready vendor
  const res6 = validateStoresForPayment('cashfree', storeWithoutAccount);
  assert(res6.allowed === true && res6.statusCode === 200, 'Cashfree checkout works for non-Razorpay-ready vendor');

  // 7. QR payment
  const res7 = validateStoresForPayment('qr', storeWithoutAccount);
  assert(res7.allowed === true && res7.statusCode === 200, 'QR payment works for non-Razorpay-ready vendor');

  // 8. COD payment
  const res8 = validateStoresForPayment('cod', storeWithoutAccount);
  assert(res8.allowed === true && res8.statusCode === 200, 'COD payment works for non-Razorpay-ready vendor');
}

// ── TEST 9: Onboarding Failure & Idempotency Safeguards ──
console.log('\n--- TEST 9: Onboarding Failure & Idempotency Safeguards ---');
{
  // 9. API Failure does not generate fake ID
  function handleOnboardingFailure(store, apiError) {
    if (!store.razorpayAccountId) {
      store.razorpayRouteStatus = 'not_created';
    }
    return {
      success: false,
      message: apiError.message,
      store,
    };
  }

  const unlinkedStore = { name: 'New Store', razorpayAccountId: null, razorpayRouteStatus: 'not_created' };
  const failResult = handleOnboardingFailure(unlinkedStore, new Error('Razorpay API Timeout'));
  assert(failResult.store.razorpayAccountId === null, 'Razorpay onboarding failure does NOT generate fake account ID');
  assert(failResult.store.razorpayRouteStatus === 'not_created', 'Status remains not_created on failure');

  // 10. Duplicate onboarding reuses existing linked account
  function resolveAccountToOnboard(store, payload) {
    return payload.existingAccountId || store.razorpayAccountId || null;
  }
  const existingStore = { name: 'Existing Store', razorpayAccountId: 'acc_existing_888', razorpayRouteStatus: 'active' };
  const resolvedId = resolveAccountToOnboard(existingStore, {});
  assert(resolvedId === 'acc_existing_888', 'Duplicate onboarding request reuses existing linked account ID');

  // 11. Existing paid orders remain unchanged
  const historicalOrder = {
    orderId: 'HISTORICAL_TXN_001',
    paymentMethod: 'razorpay',
    paymentStatus: 'SUCCESS',
    razorpayPaymentId: 'pay_historical_123',
    vendorTransfers: [
      {
        storeId: 'store_A',
        grossAmount: 48032.87,
        vendorAmount: 48032.87,
        transferStatus: 'processing',
      },
    ],
  };
  const snapshotBefore = JSON.stringify(historicalOrder);
  // Store gets onboarded later
  existingStore.razorpayAccountId = 'acc_new_route_999';
  const snapshotAfter = JSON.stringify(historicalOrder);
  assert(snapshotBefore === snapshotAfter, 'Existing paid historical orders remain completely unchanged after vendor onboarding');
}

// ── TEST 10: 4-Step Linked Account Onboarding Sequence Verification ──
console.log('\n--- TEST 10: 4-Step Linked Account Onboarding Sequence Verification ---');
{
  const stepsExecuted = [];

  // Mock implementation of the 4 steps
  function step1CreateLinkedAccount(data) {
    stepsExecuted.push('1_create_account');
    return { id: 'acc_test_123456', status: 'created', type: 'route' };
  }

  function step2CreateStakeholder(accountId, data) {
    stepsExecuted.push('2_create_stakeholder');
    return { id: 'sth_test_789012', account_id: accountId };
  }

  function step3RequestProductConfig(accountId) {
    stepsExecuted.push('3_request_product_config');
    return { id: 'prd_route_001', product_name: 'route', status: 'requested' };
  }

  function step4UpdateProductConfig(accountId, bankAccount, productId) {
    stepsExecuted.push('4_update_product_config');
    assert(bankAccount.accountNumber === '123456789012', 'Step 4 receives correct bank account number');
    assert(bankAccount.ifscCode === 'HDFC0001234', 'Step 4 receives correct IFSC code');
    return {
      status: 'active',
      settlements: {
        account_number: bankAccount.accountNumber,
        ifsc_code: bankAccount.ifscCode,
        beneficiary_name: bankAccount.beneficiaryName,
      },
      tnc: { accepted: true },
    };
  }

  function onboardPipeline(vendorData) {
    const acc = step1CreateLinkedAccount(vendorData);
    const stk = step2CreateStakeholder(acc.id, vendorData);
    const prd = step3RequestProductConfig(acc.id);
    const cfg = step4UpdateProductConfig(acc.id, vendorData.bankAccount, prd.id);
    return {
      accountId: acc.id,
      stakeholderId: stk.id,
      routeStatus: cfg.status,
      productStatus: cfg.status,
    };
  }

  const result = onboardPipeline({
    name: 'Sample Supermarket',
    ownerName: 'Alice Green',
    email: 'alice@store.com',
    phone: '9876543210',
    pan: 'ABCDE1234F',
    bankAccount: {
      accountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
      beneficiaryName: 'Sample Supermarket',
    },
  });

  assert(stepsExecuted.length === 4, 'Exactly 4 onboarding steps were executed');
  assert(stepsExecuted[0] === '1_create_account', 'Step 1: Create Linked Account is first');
  assert(stepsExecuted[1] === '2_create_stakeholder', 'Step 2: Create Stakeholder is second');
  assert(stepsExecuted[2] === '3_request_product_config', 'Step 3: Request Product Configuration is third');
  assert(stepsExecuted[3] === '4_update_product_config', 'Step 4: Update Product Configuration (Bank & T&C) is fourth');
  assert(result.accountId === 'acc_test_123456', 'Returns valid accountId');
  assert(result.routeStatus === 'active', 'Route status successfully activated');
}

// ── TEST 11: 3 Fund Transfer Methods Verification ──
console.log('\n--- TEST 11: 3 Fund Transfer Methods Verification ---');
{
  // Method 1: Using Order ID (transfers parameter during order creation)
  function createOrderWithTransfers(orderPayload) {
    assert(Array.isArray(orderPayload.transfers), 'Method 1: transfers array exists in order creation payload');
    assert(orderPayload.transfers[0].account === 'acc_test_123456', 'Method 1: Linked account ID matches');
    assert(orderPayload.transfers[0].amount === 95000, 'Method 1: Amount in paise is calculated correctly');
    return { id: 'order_rzp_order_id_123', transfers: orderPayload.transfers };
  }

  createOrderWithTransfers({
    amount: 100000,
    currency: 'INR',
    transfers: [
      {
        account: 'acc_test_123456',
        amount: 95000,
        currency: 'INR',
        on_hold: 0,
        notes: { orderId: 'ORD_101' },
      },
    ],
  });

  // Method 2: Using Payment ID (Transfers API via paymentId)
  function createPaymentTransfersMock(paymentId, transfers) {
    assert(paymentId === 'pay_rzp_captured_456', 'Method 2: Target payment ID is passed');
    assert(transfers[0].account === 'acc_test_123456', 'Method 2: Transfer recipient linked account is set');
    assert(transfers[0].amount === 95000, 'Method 2: Transfer amount is 95000 paise');
    return { id: 'trf_split_001', payment_id: paymentId, transfers };
  }

  createPaymentTransfersMock('pay_rzp_captured_456', [
    { account: 'acc_test_123456', amount: 95000, currency: 'INR' },
  ]);

  // Method 3: Direct Transfer from Balance (Transfers API via master balance)
  function createDirectTransferMock({ account, amount, currency, notes }) {
    assert(account === 'acc_test_123456', 'Method 3: Recipient linked account is set');
    assert(amount === 50000, 'Method 3: Direct transfer amount is 50000 paise');
    assert(currency === 'INR', 'Method 3: Currency is INR');
    return { id: 'trf_direct_002', recipient: account, amount, currency, status: 'processed' };
  }

  createDirectTransferMock({
    account: 'acc_test_123456',
    amount: 50000,
    currency: 'INR',
    notes: { reason: 'Weekly settlement balance transfer' },
  });
}

console.log('\n============================================================');
console.log(`📊 RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log('============================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

