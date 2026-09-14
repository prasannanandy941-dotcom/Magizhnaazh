const axios = require('axios');

const STORE_SERVICE_URL        = process.env.STORE_SERVICE_URL        || 'http://localhost:3007';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009';

// Fire-and-forget in-app notifications for the customer and the fulfilling
// store, once an order has a storeId (i.e. it came from Smart Nearby Store
// Comparison). Never blocks or throws — a notification failure shouldn't
// affect an already-successful order.
const notifyOrderParties = async (order) => {
  if (!order.storeId) return;
  console.log('[notifyOrderParties] storeId:', order.storeId, 'userId:', order.userId);

  let store = null;
  try {
    const res = await axios.get(`${STORE_SERVICE_URL}/api/stores/internal/${order.storeId}`);
    store = res.data?.data || null;
  } catch (err) {
    console.error('❌ [Notify] Could not resolve store:', err.message);
    return;
  }
  if (!store) return;

  const itemCount = (order.items || []).length;

  if (store.ownerId) {
    axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/create`, {
      userId: store.ownerId,
      title: `🛒 New order — ${order.orderId}`,
      body: `${itemCount} item${itemCount === 1 ? '' : 's'} · Rs ${order.totalAmount} · COD`,
      url: '/store/dashboard',
      storeId: order.storeId,
      type: 'order',
    }).catch(err => console.error('❌ [Notify] store notify failed:', err.message));
  }

  if (order.userId) {
    axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/create`, {
      userId: order.userId,
      title: `Order placed — ${order.orderId}`,
      body: `Your order from ${order.storeName || store.name} is confirmed. Total: Rs ${order.totalAmount}`,
      url: '/my-orders',
      storeId: order.storeId,
      type: 'order',
    }).catch(err => console.error('❌ [Notify] customer notify failed:', err.message));
  }
};

const sendOrderConfirmationSMS = async (order) => {
  try {
    const rawPhone = order.shippingAddress?.phone || '';
    const phone = rawPhone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) { console.error('❌ [SMS] Invalid phone:', rawPhone); return; }

    const storeSuffix = order.storeName ? ` from ${order.storeName}` : '';
    const message = `Hi ${order.shippingAddress.firstName}, your order ${order.orderId}${storeSuffix} for Rs ${order.totalAmount} is confirmed. Thank you!`;

    await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message,
      language: 'english',
      flash: 0,
      numbers: phone,
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ [SMS] Sent to ${phone}`);
  } catch (error) {
    console.error('❌ [SMS] Error:', error.response?.data || error.message);
  }
};

const sendOrderConfirmationEmail = async (order) => {
  try {
    const name = order.shippingAddress?.firstName || 'Customer';
    if (!order.contactEmail) { console.error('❌ [Email] No customer email for order:', order.orderId); return; }

    const itemsHtml = order.items
      .map(item => `<li>${item.quantity}x <strong>${item.title}</strong> - Rs ${item.price}</li>`)
      .join('');

    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'WOW Lifestyle Toys', email: process.env.BREVO_SENDER_EMAIL || 'noreply@wowlifestyle.com' },
      to: [{ email: order.contactEmail, name }],
      subject: `Order Confirmation - ${order.orderId}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;padding:20px;color:#333">
          <h2 style="color:#4CAF50">Order Confirmed! 🎉</h2>
          <p>Hi ${name},</p>
          <p>Thank you for shopping with WOW Lifestyle Toys. Your order <strong>${order.orderId}</strong>${order.storeName ? ` from <strong>${order.storeName}</strong>` : ''} has been received.</p>
          <h3>Order Summary:</h3><ul>${itemsHtml}</ul>
          <h3 style="border-top:1px solid #eee;padding-top:10px">Total Amount: Rs ${order.totalAmount}</h3>
          <p>We will notify you once your order is processed and shipped.</p>
          <p>Best Regards,<br/><strong>WOW Lifestyle Toys Team</strong></p>
        </div>`,
    }, {
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json',
      },
    });

    console.log(`✅ [Email] Sent to ${order.contactEmail}`);
  } catch (error) {
    console.error('❌ [Email] Error:', error.response?.data || error.message);
  }
};

module.exports = { sendOrderConfirmationSMS, sendOrderConfirmationEmail, notifyOrderParties };
