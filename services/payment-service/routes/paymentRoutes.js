const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  sendOrderConfirmationSMS,
  sendOrderConfirmationEmail,
  notifyOrderParties,
} = require('../utils/notifications');
const {
  getRazorpayInstance,
  createMarketplaceOrder,
  verifyPaymentSignature: verifyRazorpayPaymentSignature,
  verifyWebhookSignature: verifyRazorpayWebhookSignature,
  onboardVendor: onboardRazorpayVendor,
  getAccountDetails: getRazorpayAccountDetails,
  reverseTransfer: reverseRazorpayTransfer,
  createPaymentTransfers: createRazorpayPaymentTransfers,
  createDirectTransfer: createRazorpayDirectTransfer,
} = require('../utils/razorpay');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
const STORE_SERVICE_URL = process.env.STORE_SERVICE_URL || 'http://localhost:3007';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const PLATFORM_COMMISSION_ENABLED = process.env.PLATFORM_COMMISSION_ENABLED === 'true';
const DEFAULT_COMMISSION_PERCENT = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '0');

// PhonePe credentials (for alternative flow)
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID || 'M23IOM3UNHZVS_2603051535';
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || 'YmFjMDMzYjItYjJlOS00NWRkLWFjZDYtYTU1MzU5YzE1ZTJl';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'M23IOM3UNHZVS';
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';
const PHONEPE_BASE = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

// Helper: reserve stock via product-service (atomic check & decrement)
const reserveStock = async (orderId, items) => {
  return await axios.post(`${PRODUCT_SERVICE_URL}/api/products/reserve-stock`, {
    orderId,
    items,
  });
};

// Helper: commit stock via product-service (finalizes sale & low stock alerts)
const commitStock = async (orderId, items) => {
  try {
    await axios.post(`${PRODUCT_SERVICE_URL}/api/products/commit-stock`, {
      orderId,
      items,
    });
  } catch (err) {
    console.error('Stock commit error:', err.message);
  }
};

// Helper: release stock via product-service (restores inventory to product catalog)
const releaseStock = async (orderId, items, reason) => {
  try {
    await axios.post(`${PRODUCT_SERVICE_URL}/api/products/release-stock`, {
      orderId,
      items,
      reason,
    });
  } catch (err) {
    console.error('Stock release error:', err.message);
  }
};

// Helper: fetch product details to verify vendor/price
const resolveProductStore = async (productId) => {
  try {
    const res = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch (err) {
    console.warn(`Could not fetch product ${productId} from product-service:`, err.message);
  }
  return null;
};

// Helper: fetch store details (including Razorpay & Cashfree vendor IDs)
const resolveStoreDetails = async (storeId) => {
  if (!storeId) return null;
  try {
    const res = await axios.get(`${STORE_SERVICE_URL}/api/stores/internal/${storeId}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
  } catch (err) {
    console.warn(`Could not fetch store ${storeId} from store-service:`, err.message);
  }
  return null;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. POST /api/payment/create-order (or /api/payment/initiate)
 * Marketplace Order Creation (Razorpay Route / COD / QR)
 * ─────────────────────────────────────────────────────────────────────────────
 */
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');

const handleCreateOrder = async (req, res) => {
  require('dotenv').config({ path: envPath, override: true });
  try {
    const {
      amount,
      redirectUrl,
      cartItems,
      contactEmail,
      shippingAddress,
      billingAddress,
      paymentMethod = 'razorpay',
      userId,
      deliveryMethod,
    } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    if (!contactEmail) {
      return res.status(400).json({ success: false, message: 'Contact email is required' });
    }

    const merchantOrderId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
    const returnUrl = redirectUrl
      ? `${redirectUrl}?orderId=${merchantOrderId}`
      : `/payment-status?orderId=${merchantOrderId}`;

    // 1. Group items by store / vendor and verify products
    const storeGroups = {};
    const processedItems = [];

    const bodyStoreId = req.body.storeId || null;
    let bodyStoreName = req.body.storeName || null;
    if (bodyStoreId && !bodyStoreName) {
      const s = await resolveStoreDetails(bodyStoreId);
      if (s?.name) bodyStoreName = s.name;
    }

    for (const item of cartItems) {
      const pId = item.id || item._id || item.productId;
      const productInfo = await resolveProductStore(pId);

      const storeId = item.storeId || productInfo?.storeId || bodyStoreId || null;
      let storeName = item.storeName || productInfo?.storeName || (storeId === bodyStoreId ? bodyStoreName : null);
      if (storeId && !storeName) {
        const s = await resolveStoreDetails(storeId);
        if (s?.name) storeName = s.name;
      }

      const title = productInfo?.title || item.title || 'Product';
      const price = productInfo ? (productInfo.discountedPrice || productInfo.price) : Number(item.price);
      const quantity = Number(item.quantity) || 1;
      const brand = productInfo?.brand || item.brand || null;
      const image = item.image || (productInfo?.images?.[0] || productInfo?.imageUrl) || null;

      const itemRecord = {
        productId: pId,
        storeId,
        storeName: storeName || 'Vendor Store',
        title,
        brand,
        price,
        quantity,
        image,
      };
      processedItems.push(itemRecord);

      const groupKey = storeId || 'platform_direct';
      if (!storeGroups[groupKey]) {
        storeGroups[groupKey] = {
          storeId,
          storeName: storeName || 'Vendor Store',
          items: [],
          grossAmount: 0,
        };
      }
      storeGroups[groupKey].items.push(itemRecord);
      storeGroups[groupKey].grossAmount += price * quantity;
    }

    // 2. Compute Vendor Distributions & Splits
    const razorpayTransfers = [];
    const vendorTransfers = [];
    let calculatedTotal = 0;

    for (const [groupKey, group] of Object.entries(storeGroups)) {
      calculatedTotal += group.grossAmount;

      if (group.storeId && group.storeId !== 'platform_direct') {
        const store = await resolveStoreDetails(group.storeId);
        const storeName = store?.name || group.storeName || 'Vendor Store';

        // ── MANDATORY RAZORPAY ROUTE ONBOARDING CHECK ──
        if (paymentMethod === 'razorpay') {
          const hasRazorpayAccount = Boolean(store?.razorpayAccountId);
          const isRouteActive = store?.razorpayRouteStatus === 'active' || store?.razorpayRouteStatus === 'created';

          if (!hasRazorpayAccount || !isRouteActive) {
            await releaseStock(merchantOrderId, processedItems, 'razorpay_vendor_unready');
            return res.status(400).json({
              success: false,
              code: 'RAZORPAY_VENDOR_NOT_READY',
              message: `The store "${storeName}" is not yet ready to accept Razorpay payments. Please complete store onboarding or choose another payment method (QR or Cash on Delivery).`,
              details: {
                storeId: group.storeId,
                storeName,
                razorpayRouteStatus: store?.razorpayRouteStatus || 'not_created',
              },
            });
          }
        }

        // Remise platform commission percentage (0% while commission is disabled)
        const commissionPct = PLATFORM_COMMISSION_ENABLED
          ? (store?.commissionPercentage !== undefined ? store.commissionPercentage : DEFAULT_COMMISSION_PERCENT)
          : 0;

        // Calculate commission and vendor net amount (using integer rounding to paise)
        const grossPaise = Math.round(group.grossAmount * 100);
        const commissionPaise = Math.round(grossPaise * (commissionPct / 100));
        const vendorAmountPaise = Math.max(0, grossPaise - commissionPaise);

        const commissionAmount = Math.round(commissionPaise) / 100;
        const vendorAmount = Math.round(vendorAmountPaise) / 100;

        // Razorpay Route Linked Account
        const razorpayAccountId = store?.razorpayAccountId || null;
        if (razorpayAccountId && vendorAmountPaise > 0) {
          razorpayTransfers.push({
            account: razorpayAccountId,
            amount: vendorAmountPaise, // in paise
            currency: 'INR',
            notes: {
              storeId: group.storeId,
              storeName,
              orderId: merchantOrderId,
            },
            linked_account_notes: ['storeId', 'orderId'],
            on_hold: 0,
          });
        }

        vendorTransfers.push({
          storeId: group.storeId,
          storeName,
          razorpayAccountId: razorpayAccountId || null,
          grossAmount: group.grossAmount,
          commissionAmount,
          vendorAmount,
          transferStatus: 'pending',
        });
      }
    }

    const totalAmount = Math.round(calculatedTotal * 100) / 100;
    const totalAmountPaise = Math.round(totalAmount * 100);

    // 3. Atomically Reserve Stock in product-service (prevents concurrent overselling)
    try {
      await reserveStock(merchantOrderId, processedItems);
    } catch (stockErr) {
      const detail =
        stockErr.response?.data?.message ||
        'One or more items in your cart are out of stock.';
      console.warn(`[Stock Reservation Failed] Order ${merchantOrderId}:`, detail);
      return res.status(stockErr.response?.status || 409).json({
        success: false,
        code: 'OUT_OF_STOCK',
        message: detail,
        details: stockErr.response?.data?.details || null,
      });
    }

    const primaryStoreId = bodyStoreId || processedItems.find((i) => i.storeId)?.storeId || null;
    const primaryStoreName = bodyStoreName || processedItems.find((i) => i.storeName)?.storeName || (primaryStoreId ? 'Vendor Store' : null);

    // 4. Create MongoDB Order in order-service
    const orderPayload = {
      orderId: merchantOrderId,
      userId: userId || null,
      contactEmail,
      storeId: primaryStoreId,
      storeName: primaryStoreName,
      items: processedItems,
      totalAmount,
      shippingAddress,
      billingAddress,
      paymentMethod,
      deliveryMethod: deliveryMethod || undefined,
      paymentStatus: 'PENDING',
      stockStatus: 'RESERVED',
      stockExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      vendorTransfers,
    };

    let newOrder;
    try {
      const orderRes = await axios.post(`${ORDER_SERVICE_URL}/api/orders/internal`, orderPayload);
      newOrder = orderRes.data.data;
    } catch (orderErr) {
      await releaseStock(merchantOrderId, processedItems, 'order_creation_failed');
      const detail = orderErr.response?.data?.message || orderErr.message;
      console.error('Order creation error via order-service:', detail);
      return res.status(502).json({
        success: false,
        message: `Could not create your order: ${detail}`,
      });
    }

    // 5. Handle Payment Flow based on paymentMethod
    // ── COD / QR ──
    if (paymentMethod === 'cod' || paymentMethod === 'qr') {
      try {
        const isCod = paymentMethod === 'cod';
        if (isCod) {
          await axios.patch(
            `${ORDER_SERVICE_URL}/api/orders/internal/${merchantOrderId}/payment-status`,
            { paymentStatus: 'SUCCESS', stockStatus: 'COMMITTED' }
          );
          await commitStock(merchantOrderId, newOrder.items);
        }

        const updatedOrder = {
          ...newOrder,
          paymentStatus: isCod ? 'SUCCESS' : 'PENDING',
          shippingAddress,
          contactEmail,
        };
        if (shippingAddress?.phone) sendOrderConfirmationSMS(updatedOrder);
        if (contactEmail) sendOrderConfirmationEmail(updatedOrder);
        notifyOrderParties(updatedOrder);
      } catch (postCreateErr) {
        console.error('Post-create COD notification/stock note:', postCreateErr.message);
      }

      return res.status(200).json({
        success: true,
        isCod: paymentMethod === 'cod',
        isQr: paymentMethod === 'qr',
        orderId: merchantOrderId,
        url: returnUrl,
      });
    }

    // ── RAZORPAY PG + ROUTE FLOW ──
    if (paymentMethod === 'razorpay') {
      try {
        const customerName = `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 'Customer';
        const customerPhone = shippingAddress?.phone || '';

        // Validate transfer sum <= total order amount
        const totalTransfersPaise = razorpayTransfers.reduce((sum, t) => sum + t.amount, 0);
        if (totalTransfersPaise > totalAmountPaise) {
          throw new Error('Total vendor transfers exceed order amount.');
        }

        const rzpOrder = await createMarketplaceOrder({
          amount: totalAmountPaise,
          currency: 'INR',
          receipt: merchantOrderId,
          transfers: razorpayTransfers.length > 0 ? razorpayTransfers : undefined,
          notes: {
            orderId: merchantOrderId,
            userId: String(userId || 'guest'),
            itemCount: String(processedItems.length),
            vendorCount: String(vendorTransfers.length),
          },
        });

        // Save Razorpay order details to MongoDB order
        await axios.patch(
          `${ORDER_SERVICE_URL}/api/orders/internal/${merchantOrderId}/razorpay-details`,
          {
            razorpayOrderId: rzpOrder.id,
            vendorTransfers,
          }
        );

        return res.status(200).json({
          success: true,
          orderId: merchantOrderId,
          razorpayOrderId: rzpOrder.id,
          amount: totalAmount,
          amountPaise: totalAmountPaise,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          name: 'Remise Marketplace',
          description: `Order #${merchantOrderId}`,
          customer: {
            name: customerName,
            email: contactEmail,
            contact: customerPhone,
          },
          vendorTransfers,
        });
      } catch (rzpErr) {
        console.error('Razorpay Order Creation Error:', rzpErr.response?.data || rzpErr.message);
        await releaseStock(merchantOrderId, processedItems, 'razorpay_initiation_failed');
        await axios.patch(
          `${ORDER_SERVICE_URL}/api/orders/internal/${merchantOrderId}/payment-status`,
          { paymentStatus: 'FAILED', stockStatus: 'RELEASED' }
        ).catch(() => {});

        return res.status(500).json({
          success: false,
          message: `Failed to create Razorpay Order: ${rzpErr.error?.description || rzpErr.response?.data?.message || rzpErr.message}`,
        });
      }
    }

    // ── PHONEPE PG (Alternative) ──
    if (paymentMethod === 'phonepe') {
      try {
        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', CLIENT_ID);
        tokenParams.append('client_version', CLIENT_VERSION);
        tokenParams.append('client_secret', CLIENT_SECRET);
        tokenParams.append('grant_type', 'client_credentials');

        const tokenRes = await axios.post(
          `${PHONEPE_BASE}/v1/oauth/token`,
          tokenParams.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
          await releaseStock(merchantOrderId, processedItems, 'phonepe_token_failed');
          return res.status(500).json({ success: false, message: 'Failed to generate Auth Token' });
        }

        const paymentPayload = {
          merchantId: MERCHANT_ID,
          merchantOrderId,
          amount: Math.round(totalAmount * 100),
          expireAfter: 1800,
          metaInfo: { udf1: 'Website Order' },
          paymentFlow: {
            type: 'PG_CHECKOUT',
            message: 'Order Payment',
            merchantUrls: { redirectUrl: returnUrl, cancelUrl: returnUrl },
          },
        };

        const payRes = await axios.post(
          `${PHONEPE_BASE}/checkout/v2/pay`,
          paymentPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `O-Bearer ${accessToken}`,
            },
          }
        );

        const payUrl = payRes.data.redirectUrl || payRes.data.data?.redirectUrl;
        if (!payUrl) {
          await releaseStock(merchantOrderId, processedItems, 'phonepe_url_failed');
          return res.status(500).json({
            success: false,
            message: 'Payment URL not found in PhonePe response',
          });
        }

        return res.status(200).json({ success: true, url: payUrl });
      } catch (phonePeErr) {
        await releaseStock(merchantOrderId, processedItems, 'phonepe_initiation_failed');
        throw phonePeErr;
      }
    }

    return res.status(400).json({ success: false, message: `Unsupported payment method: ${paymentMethod}` });

  } catch (error) {
    console.error('handleCreateOrder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment initiation failed' });
  }
};

router.post('/create-order', handleCreateOrder);
router.post('/initiate', handleCreateOrder);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. POST /api/payment/verify and /api/payment/razorpay/verify
 * Server-Side Payment Signature & Gateway Verification
 * ─────────────────────────────────────────────────────────────────────────────
 */
const handlePaymentVerification = async (req, res) => {
  try {
    const {
      orderId, // our internal merchant order ID
      cashfree_order_id,
      paymentSessionId,
      cf_payment_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const lookupId = orderId || cashfree_order_id || razorpay_order_id;
    if (!lookupId && !razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'orderId or gateway order reference is required for payment verification.',
      });
    }

    // 1. Locate internal order
    let orderData = null;
    if (orderId) {
      try {
        const orderRes = await axios.get(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}`);
        orderData = orderRes.data?.data;
      } catch (err) {
        console.warn(`Could not find order by orderId ${orderId}:`, err.message);
      }
    }

    if (!orderData && lookupId) {
      try {
        const orderRes = await axios.get(`${ORDER_SERVICE_URL}/api/orders/internal/${lookupId}`);
        orderData = orderRes.data?.data;
      } catch (err) {
        console.warn(`Could not find order by lookupId ${lookupId}:`, err.message);
      }
    }

    // ── RAZORPAY VERIFICATION ──
    if (razorpay_payment_id && razorpay_signature && razorpay_order_id) {
      const isSignatureValid = verifyRazorpayPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isSignatureValid) {
        console.warn(`❌ [Razorpay Verification] Invalid payment signature for ${razorpay_order_id}`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid Razorpay cryptographic signature.',
        });
      }

      console.log(`✅ [Razorpay] Cryptographically verified payment for order ${lookupId}, payment ${razorpay_payment_id}`);

      if (orderData) {
        const updatedTransfers = (orderData.vendorTransfers || []).map((t) => ({
          ...t,
          transferStatus: t.transferStatus === 'processed' ? 'processed' : 'processing',
        }));

        await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderData.orderId}/razorpay-details`, {
          paymentStatus: 'SUCCESS',
          stockStatus: 'COMMITTED',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          vendorTransfers: updatedTransfers,
        });

        if (orderData.paymentStatus !== 'SUCCESS') {
          await commitStock(orderData.orderId, orderData.items);

          const enrichedOrder = {
            ...orderData,
            paymentStatus: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
          };
          if (enrichedOrder.shippingAddress?.phone) sendOrderConfirmationSMS(enrichedOrder);
          if (enrichedOrder.contactEmail) sendOrderConfirmationEmail(enrichedOrder);
          notifyOrderParties(enrichedOrder);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verification successful.',
        orderId: orderData?.orderId || lookupId,
        paymentId: razorpay_payment_id,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed: Missing or invalid payment credentials.',
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, message: 'Server error during payment verification.' });
  }
};

router.post('/verify', handlePaymentVerification);
router.post('/razorpay/verify', handlePaymentVerification);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. POST /api/payment/cancel
 * Payment Cancellation / Modal Close Handler
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.post('/cancel', async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    console.log(`↩️ [Payment Cancel] Releasing reserved stock for Order ${orderId} (${reason || 'user_cancelled'})`);

    await releaseStock(orderId, [], reason || 'user_cancelled');

    try {
      await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}/payment-status`, {
        paymentStatus: 'FAILED',
        stockStatus: 'RELEASED',
      });
    } catch (orderErr) {
      console.warn(`[Payment Cancel] Order status update note for ${orderId}:`, orderErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment cancelled and stock reservation released successfully.',
      orderId,
    });
  } catch (error) {
    console.error('Payment Cancel Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel payment', error: error.message });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. Dedicated Razorpay Webhook Handler
 * Processes: payment.captured, order.paid, payment.failed, transfer.processed, transfer.failed
 * ─────────────────────────────────────────────────────────────────────────────
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = verifyRazorpayWebhookSignature({
      body: rawBody,
      signature,
    });

    if (!isValid) {
      console.warn('❌ [Razorpay Webhook] Invalid webhook signature rejected.');
      return res.status(400).json({ success: false, message: 'Invalid Razorpay webhook signature.' });
    }

    const event = req.body.event;
    const payload = req.body.payload;
    console.log(`📩 [Razorpay Webhook] Received Event: ${event}`);

    // Event: payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload?.payment?.entity;
      const orderId = payment?.notes?.orderId || payment?.receipt || payment?.order_id;
      const paymentId = payment?.id;

      if (orderId) {
        try {
          const orderRes = await axios.get(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}`);
          const existingOrder = orderRes.data?.data;

          if (existingOrder && existingOrder.paymentStatus !== 'SUCCESS') {
            await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${existingOrder.orderId}/razorpay-details`, {
              paymentStatus: 'SUCCESS',
              stockStatus: 'COMMITTED',
              razorpayPaymentId: paymentId || existingOrder.razorpayPaymentId,
              razorpayOrderId: payment?.order_id || existingOrder.razorpayOrderId,
            });

            await commitStock(existingOrder.orderId, existingOrder.items);

            const enrichedOrder = {
              ...existingOrder,
              paymentStatus: 'SUCCESS',
              razorpayPaymentId: paymentId,
            };
            if (enrichedOrder.shippingAddress?.phone) sendOrderConfirmationSMS(enrichedOrder);
            if (enrichedOrder.contactEmail) sendOrderConfirmationEmail(enrichedOrder);
            notifyOrderParties(enrichedOrder);
          }
        } catch (err) {
          console.warn(`[Razorpay Webhook] Order lookup/update error for ${orderId}:`, err.message);
        }
      }
    }

    // Event: payment.failed
    if (event === 'payment.failed') {
      const payment = payload?.payment?.entity;
      const orderId = payment?.notes?.orderId || payment?.receipt;
      if (orderId) {
        try {
          await releaseStock(orderId, [], 'razorpay_webhook_payment_failed');
          await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}/payment-status`, {
            paymentStatus: 'FAILED',
            stockStatus: 'RELEASED',
          });
        } catch (err) {
          console.warn(`[Razorpay Webhook] Payment failed processing error for ${orderId}:`, err.message);
        }
      }
    }

    // Event: transfer.processed (Route Split Settled)
    if (event === 'transfer.processed') {
      const transfer = payload?.transfer?.entity;
      const transferId = transfer?.id;
      const accountId = transfer?.recipient;
      const orderId = transfer?.notes?.orderId;
      const storeId = transfer?.notes?.storeId;

      console.log(`💰 [Razorpay Route Transfer Processed] Transfer ${transferId} to Account ${accountId}`);

      if (orderId) {
        try {
          await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}/transfer-status`, {
            razorpayTransferId: transferId,
            razorpayAccountId: accountId,
            storeId,
            transferStatus: 'processed',
          });
        } catch (err) {
          console.warn(`[Razorpay Webhook] Transfer status update note for ${orderId}:`, err.message);
        }
      }
    }

    // Event: transfer.failed
    if (event === 'transfer.failed') {
      const transfer = payload?.transfer?.entity;
      const transferId = transfer?.id;
      const accountId = transfer?.recipient;
      const orderId = transfer?.notes?.orderId;
      const storeId = transfer?.notes?.storeId;
      const failureReason = transfer?.error?.description || 'Razorpay Route transfer settlement failed';

      console.warn(`⚠️ [Razorpay Route Transfer Failed] Transfer ${transferId}: ${failureReason}`);

      if (orderId) {
        try {
          await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}/transfer-status`, {
            razorpayTransferId: transferId,
            razorpayAccountId: accountId,
            storeId,
            transferStatus: 'failed',
            failureReason,
          });
        } catch (err) {
          console.warn(`[Razorpay Webhook] Transfer failure recording note for ${orderId}:`, err.message);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

router.post('/webhook', handleRazorpayWebhook);
router.post('/razorpay/webhook', handleRazorpayWebhook);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. Vendor Onboarding & Status (Razorpay Route)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Razorpay Route Vendor Onboarding
router.post('/razorpay/vendor/onboard', async (req, res) => {
  try {
    const vendorData = req.body;
    if (!vendorData.storeId && !vendorData.email) {
      return res.status(400).json({ success: false, message: 'Vendor storeId and email are required.' });
    }

    const onboardResult = await onboardRazorpayVendor(vendorData);

    if (vendorData.storeId) {
      try {
        await axios.patch(`${STORE_SERVICE_URL}/api/stores/internal/${vendorData.storeId}/razorpay-status`, {
          razorpayAccountId: onboardResult.accountId,
          razorpayStakeholderId: onboardResult.stakeholderId,
          razorpayRouteStatus: onboardResult.routeStatus,
          razorpayRouteProductStatus: onboardResult.productStatus,
        });
      } catch (storeUpdateErr) {
        console.warn(`Could not sync Razorpay status back to store ${vendorData.storeId}:`, storeUpdateErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Razorpay Route Linked Account configured successfully.',
      data: onboardResult,
    });
  } catch (error) {
    console.error('Razorpay Vendor Onboarding Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.description || error.message,
    });
  }
});

// Razorpay Route Vendor Status Check
router.get('/razorpay/vendor/status/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await resolveStoreDetails(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    let accountDetails = null;
    if (store.razorpayAccountId) {
      try {
        accountDetails = await getRazorpayAccountDetails(store.razorpayAccountId);
      } catch (accErr) {
        console.warn(`Could not fetch Razorpay account details for ${store.razorpayAccountId}:`, accErr.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        storeId: store._id,
        storeName: store.name,
        razorpayAccountId: store.razorpayAccountId,
        razorpayStakeholderId: store.razorpayStakeholderId,
        razorpayRouteStatus: store.razorpayRouteStatus || 'not_created',
        razorpayRouteProductStatus: store.razorpayRouteProductStatus,
        commissionPercentage: store.commissionPercentage || 10,
        accountDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Razorpay Route Transfer Method 2: Transfer via Payment ID
 * POST /api/payment/razorpay/transfers/payment
 */
router.post('/razorpay/transfers/payment', async (req, res) => {
  try {
    const { paymentId, transfers } = req.body;
    if (!paymentId || !transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'paymentId and transfers array are required',
      });
    }

    const transferResult = await createRazorpayPaymentTransfers(paymentId, transfers);
    res.status(200).json({
      success: true,
      message: 'Transfers created successfully via Payment ID',
      data: transferResult,
    });
  } catch (error) {
    console.error('Payment Transfers Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.description || error.message,
    });
  }
});

/**
 * Razorpay Route Transfer Method 3: Direct Transfer from Balance to Linked Account
 * POST /api/payment/razorpay/transfers/direct
 */
router.post('/razorpay/transfers/direct', async (req, res) => {
  try {
    const { account, amount, currency, notes } = req.body;
    if (!account || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid linked account ID and positive amount (in paise) are required',
      });
    }

    const directTransferResult = await createRazorpayDirectTransfer({
      account,
      amount,
      currency: currency || 'INR',
      notes: notes || {},
    });

    res.status(200).json({
      success: true,
      message: 'Direct transfer initiated successfully from Razorpay balance',
      data: directTransferResult,
    });
  } catch (error) {
    console.error('Direct Transfer Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error?.description || error.message,
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. POST /api/payment/refund
 * Refund with Razorpay Gateway & Transfer Reversal Handling
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.post('/refund', async (req, res) => {
  try {
    const { orderId, refundAmount, refundNote } = req.body;
    if (!orderId || !refundAmount) {
      return res.status(400).json({ success: false, message: 'orderId and refundAmount are required' });
    }

    // Lookup order to determine provider
    let order = null;
    try {
      const orderRes = await axios.get(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}`);
      order = orderRes.data?.data;
    } catch (err) {
      console.warn(`Could not locate order ${orderId} for refund:`, err.message);
    }

    let refundResult = null;

    // Razorpay Refund Flow
    if (order && order.razorpayPaymentId) {
      const rzp = getRazorpayInstance();
      refundResult = await rzp.payments.refund(order.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100), // paise
        reverse_all_transfers: 1, // Automatically reverses Route transfers back to master account
        notes: {
          orderId,
          reason: refundNote || 'Customer refund',
        },
      });
    }

    try {
      await axios.patch(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}/payment-status`, {
        paymentStatus: 'REFUNDED',
        stockStatus: 'RESTORED',
      });
      await releaseStock(orderId, [], 'refund');
    } catch (orderErr) {
      console.warn(`Could not update order ${orderId} refund status:`, orderErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: refundResult,
    });
  } catch (error) {
    console.error('Refund Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 8. GET /api/payment/status/:orderId (Polling / Fallback Confirmation)
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRes = await axios.get(`${ORDER_SERVICE_URL}/api/orders/internal/${orderId}`);
    let order = orderRes.data.data;

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      status: order.paymentStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      vendorTransfers: order.vendorTransfers || [],
      message: order.paymentStatus === 'SUCCESS' ? 'Payment Verified Successfully!' : 'Order Status Retrieved',
    });
  } catch (error) {
    console.error('Status Check Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to check order status' });
  }
});

router.post('/callback', (req, res) => res.status(200).send('OK'));

module.exports = router;
