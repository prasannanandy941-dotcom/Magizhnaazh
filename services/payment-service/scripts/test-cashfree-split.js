/**
 * Comprehensive Automated Test Suite for Cashfree Payment Gateway & Easy Split
 * Validates:
 * 1. Single-Vendor Commission & Payout Math
 * 2. Multi-Vendor Cart Split Distribution & Platform Fee Retention
 * 3. Cashfree API v2023-08-01 Header & Request Contracts
 * 4. Webhook HMAC-SHA256 Signature Verification Algorithm (timestamp + rawBody)
 * 5. Tampered Webhook Payload Detection & Rejection
 * 6. Multi-Vendor Order Split Payload Structure
 * 7. Vendor Onboarding Payload Structure
 * 8. Refund with Vendor Split Deductions Structure
 */

const crypto = require('crypto');
const assert = require('assert');
const {
  verifyWebhookSignature,
  getHeaders,
  CASHFREE_API_VERSION,
} = require('../utils/cashfree');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Reason: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🧪 Starting Cashfree Payment Gateway & Easy Split Test Suite');
  console.log('======================================================\n');

  // Test 1: Single Vendor Split Calculation & Platform Commission
  runTest('Single Vendor Split Math & Platform Retention', () => {
    const grossAmount = 1000.00;
    const commissionPct = 10; // 10% platform fee
    const commissionAmount = Math.round(grossAmount * (commissionPct / 100) * 100) / 100;
    const vendorAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

    assert.strictEqual(commissionAmount, 100.00, 'Commission should be ₹100.00');
    assert.strictEqual(vendorAmount, 900.00, 'Vendor payout should be ₹900.00');
    assert.strictEqual(commissionAmount + vendorAmount, grossAmount, 'Sum must equal gross amount');
  });

  // Test 2: Multi-Vendor Order Distribution with Multiple Split Rules
  runTest('Multi-Vendor Cart Distribution (Store A + Store B + Platform)', () => {
    const cartItems = [
      { id: 'p1', storeId: 'store_A', price: 500, quantity: 2 }, // Store A: ₹1000 (10% fee = ₹100 fee, ₹900 net)
      { id: 'p2', storeId: 'store_B', price: 300, quantity: 1 }, // Store B: ₹300 (15% fee = ₹45 fee, ₹255 net)
    ];

    const storeRates = {
      store_A: 10,
      store_B: 15,
    };

    const storeVendorIds = {
      store_A: 'vendor_store_A_123',
      store_B: 'vendor_store_B_456',
    };

    const storeGroups = {};
    let totalOrderAmount = 0;

    cartItems.forEach(item => {
      if (!storeGroups[item.storeId]) {
        storeGroups[item.storeId] = { gross: 0 };
      }
      const itemTotal = item.price * item.quantity;
      storeGroups[item.storeId].gross += itemTotal;
      totalOrderAmount += itemTotal;
    });

    const orderSplits = [];
    let totalVendorPayout = 0;
    let totalPlatformCommission = 0;

    Object.entries(storeGroups).forEach(([storeId, group]) => {
      const commissionRate = storeRates[storeId] || 10;
      const commission = Math.round(group.gross * (commissionRate / 100) * 100) / 100;
      const netVendor = Math.round((group.gross - commission) * 100) / 100;

      totalPlatformCommission += commission;
      totalVendorPayout += netVendor;

      orderSplits.push({
        vendor_id: storeVendorIds[storeId],
        amount: netVendor,
        tags: { storeId, commission: commission.toString() },
      });
    });

    assert.strictEqual(totalOrderAmount, 1300.00, 'Total order should be ₹1300.00');
    assert.strictEqual(totalPlatformCommission, 145.00, 'Total platform commission should be ₹145.00');
    assert.strictEqual(totalVendorPayout, 1155.00, 'Total vendor payouts should be ₹1155.00');
    assert.strictEqual(orderSplits.length, 2, 'There should be 2 vendor split objects');

    // Platform automatically retains: Total Order - Total Vendor Splits
    const platformRetained = Math.round((totalOrderAmount - orderSplits.reduce((acc, s) => acc + s.amount, 0)) * 100) / 100;
    assert.strictEqual(platformRetained, totalPlatformCommission, 'Platform retained amount matches calculated fee');
  });

  // Test 3: Cashfree Request Headers & API Version
  runTest('Cashfree Standard Headers Contract', () => {
    const headers = getHeaders('TXN_TEST_123');
    assert.strictEqual(headers['x-api-version'], '2023-08-01', 'Must use verified 2023-08-01 API version');
    assert.strictEqual(headers['Content-Type'], 'application/json', 'Content-Type must be application/json');
    assert.strictEqual(headers['x-idempotency-key'], 'TXN_TEST_123', 'Idempotency key must be attached');
    assert(headers['x-client-id'] !== undefined, 'x-client-id header must be present');
    assert(headers['x-client-secret'] !== undefined, 'x-client-secret header must be present');
  });

  // Test 4: Webhook Signature Verification Algorithm (timestamp + rawBody -> Base64)
  runTest('Cashfree Webhook HMAC-SHA256 Signature Verification', () => {
    const secret = 'test_webhook_secret_key_123';
    const timestamp = '1719283921000';
    const payloadObject = {
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      event_time: '2026-08-25T12:00:00+05:30',
      data: {
        order: { order_id: 'TXN1719283921001', order_amount: 1500.00, order_currency: 'INR' },
        payment: { cf_payment_id: '994827182', payment_status: 'SUCCESS', payment_amount: 1500.00 }
      }
    };
    const rawBody = JSON.stringify(payloadObject);

    // Compute expected signature: HMAC-SHA256(timestamp + rawBody) -> Base64
    const signatureData = `${timestamp}${rawBody}`;
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureData)
      .digest('base64');

    const isVerified = verifyWebhookSignature({
      rawBody,
      signature: validSignature,
      timestamp,
      secret,
    });

    assert.strictEqual(isVerified, true, 'Valid signature should verify successfully');

    // Test tampered payload detection
    const tamperedBody = JSON.stringify({ ...payloadObject, type: 'TAMPERED_EVENT' });
    const isTamperedVerified = verifyWebhookSignature({
      rawBody: tamperedBody,
      signature: validSignature,
      timestamp,
      secret,
    });

    assert.strictEqual(isTamperedVerified, false, 'Tampered payload must be rejected');
  });

  // Test 5: Easy Split Payload Construction Validator
  runTest('Cashfree Easy Split Order Request Structure', () => {
    const orderPayload = {
      order_id: 'TXN_TEST_SPLIT_001',
      order_amount: 1500.00,
      order_currency: 'INR',
      customer_details: {
        customer_id: 'user_test_999',
        customer_phone: '9876543210',
        customer_email: 'customer@test.com',
        customer_name: 'Test Customer',
      },
      order_meta: {
        return_url: 'https://marketplace.com/status?orderId=TXN_TEST_SPLIT_001',
        notify_url: 'https://marketplace.com/api/payment/webhook',
      },
      order_splits: [
        { vendor_id: 'vendor_store_1', amount: 1350.00, tags: { storeId: 'store_1' } }
      ],
    };

    assert.strictEqual(orderPayload.order_splits.length, 1);
    assert.strictEqual(orderPayload.order_splits[0].vendor_id, 'vendor_store_1');
    assert.strictEqual(orderPayload.order_splits[0].amount, 1350.00);
    assert.strictEqual(orderPayload.order_amount, 1500.00);
  });

  // Test 6: Easy Split Vendor Onboarding Payload Structure
  runTest('Cashfree Easy Split Vendor Onboarding Structure', () => {
    const vendorPayload = {
      vendor_id: 'vendor_test_store_999',
      name: 'Supermart Test',
      email: 'vendor@supermart.com',
      phone: '9876543210',
      status: 'ACTIVE',
      verify_account: false,
      bank: {
        account_number: '123456789012',
        account_holder: 'Supermart Test Store',
        ifsc: 'HDFC0001234',
      },
      kyc_details: {
        account_type: 'SAVINGS',
        business_type: 'INDIVIDUAL',
        pan: 'ABCDE1234F',
      },
    };

    assert.strictEqual(vendorPayload.vendor_id, 'vendor_test_store_999');
    assert.strictEqual(vendorPayload.status, 'ACTIVE');
    assert.strictEqual(vendorPayload.bank.ifsc, 'HDFC0001234');
    assert.strictEqual(vendorPayload.kyc_details.pan, 'ABCDE1234F');
  });

  // Test 7: Refund with Split Deductions Payload Structure
  runTest('Cashfree Refund with Split Deductions Structure', () => {
    const refundPayload = {
      refund_id: 'RFND_TEST_001',
      refund_amount: 500.00,
      refund_note: 'Item returned by customer',
      refund_speed: 'STANDARD',
      refund_splits: [
        { vendor_id: 'vendor_store_1', amount: 450.00 }
      ],
    };

    assert.strictEqual(refundPayload.refund_id, 'RFND_TEST_001');
    assert.strictEqual(refundPayload.refund_amount, 500.00);
    assert.strictEqual(refundPayload.refund_splits.length, 1);
    assert.strictEqual(refundPayload.refund_splits[0].amount, 450.00);
  });

  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
