'use strict';

const crypto = require('crypto');
const { getPool } = require('../db/sites');
const { authMiddleware, getUserPlanInfo, PLANS } = require('./auth');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

function safeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hmacHex(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

async function razorpayRequest(path, options = {}) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || `Razorpay request failed (${response.status})`);
  }
  return data;
}

/**
 * Activate exactly once. Both frontend verification and webhook call this,
 * so a transaction lock and status check prevent duplicate plan purchases.
 */
async function activatePaidOrder(pool, razorpayOrderId, paymentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT id, user_id, plan, amount_paise, status
       FROM razorpay_orders
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpayOrderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      return { found: false };
    }

    if (order.status === 'paid') {
      await client.query('COMMIT');
      const info = await getUserPlanInfo(pool, order.user_id);
      return { found: true, alreadyPaid: true, userId: order.user_id, info };
    }

    const plan = PLANS[order.plan];
    if (!plan || order.plan === 'free') throw new Error('Invalid plan on payment order');

    const userResult = await client.query(
      'SELECT plan, plan_expires FROM users WHERE id = $1 FOR UPDATE',
      [order.user_id]
    );
    const user = userResult.rows[0];
    if (!user) throw new Error('Payment user not found');

    // Renewals of the same active plan extend from the current expiry.
    const currentExpiry = user.plan_expires ? new Date(user.plan_expires).getTime() : 0;
    const base = user.plan === order.plan && currentExpiry > Date.now() ? currentExpiry : Date.now();
    const expires = new Date(base + plan.days * 86400000);

    await client.query(
      `UPDATE razorpay_orders
       SET status = 'paid', razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
           paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
       WHERE id = $2`,
      [paymentId || null, order.id]
    );
    await client.query(
      `UPDATE users SET plan = $1, plan_expires = $2, updated_at = NOW() WHERE id = $3`,
      [order.plan, expires, order.user_id]
    );
    await client.query(
      `INSERT INTO plan_purchases
         (user_id, plan, amount, expires_at, razorpay_order_id, razorpay_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (razorpay_order_id) DO NOTHING`,
      [
        order.user_id,
        order.plan,
        Math.round(order.amount_paise / 100),
        expires,
        razorpayOrderId,
        paymentId || null,
      ]
    );
    await client.query('COMMIT');

    const info = await getUserPlanInfo(pool, order.user_id);
    return { found: true, alreadyPaid: false, userId: order.user_id, info };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function planResponse(info) {
  return {
    id: info.plan,
    name: info.planName,
    quota: info.quota,
    used: info.used,
    remaining: info.remaining,
    daysLeft: info.daysLeft,
    expiresAt: info.expiresAt,
  };
}

function mountPaymentRoutes(router) {
  router.get('/payments/config', (_req, res) => {
    res.json({ enabled: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET), keyId: RAZORPAY_KEY_ID });
  });

  router.post('/create-order', authMiddleware, async (req, res) => {
    try {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: 'Razorpay is not configured yet.' });
      }
      const planId = String(req.body?.plan || '');
      const plan = PLANS[planId];
      if (!plan || planId === 'free') {
        return res.status(400).json({ error: 'Choose Monthly or Yearly plan.' });
      }
      const pool = getPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });

      const amount = plan.price * 100;
      const receipt = `wc_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`.slice(0, 40);
      const order = await razorpayRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          currency: 'INR',
          receipt,
          notes: { plan: planId, product: 'WebsConnect Website Plan' },
        }),
      });

      await pool.query(
        `INSERT INTO razorpay_orders
           (razorpay_order_id, user_id, plan, amount_paise, currency, status, receipt)
         VALUES ($1, $2, $3, $4, 'INR', 'created', $5)`,
        [order.id, req.userId, planId, amount, receipt]
      );

      res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        plan: { id: planId, name: plan.name, price: plan.price },
      });
    } catch (error) {
      console.error('create-order:', error.message);
      res.status(502).json({ error: error.message || 'Could not create payment order.' });
    }
  });

  router.post('/verify-payment', authMiddleware, async (req, res) => {
    try {
      if (!RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ success: false, error: 'Razorpay is not configured.' });
      }
      const orderId = String(req.body?.razorpay_order_id || '');
      const paymentId = String(req.body?.razorpay_payment_id || '');
      const signature = String(req.body?.razorpay_signature || '');
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ success: false, error: 'Incomplete payment response.' });
      }

      const expected = hmacHex(RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
      if (!safeEqualHex(expected, signature)) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
      }

      const pool = getPool();
      if (!pool) return res.status(503).json({ success: false, error: 'Database unavailable' });
      const owned = await pool.query(
        'SELECT 1 FROM razorpay_orders WHERE razorpay_order_id = $1 AND user_id = $2',
        [orderId, req.userId]
      );
      if (!owned.rows.length) {
        return res.status(404).json({ success: false, error: 'Payment order not found.' });
      }

      const activated = await activatePaidOrder(pool, orderId, paymentId);
      res.json({
        success: true,
        plan: planResponse(activated.info),
        alreadyProcessed: activated.alreadyPaid,
      });
    } catch (error) {
      console.error('verify-payment:', error.message);
      res.status(500).json({ success: false, error: 'Payment verification failed.' });
    }
  });
}

/**
 * Express raw-body webhook handler. Mount before express.json().
 * Razorpay retries non-2xx responses, while duplicate captured events are safe.
 */
async function razorpayWebhookHandler(req, res) {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const expected = hmacHex(RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (!safeEqualHex(expected, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    if (event.event !== 'payment.captured') {
      return res.json({ ok: true, ignored: true });
    }
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) {
      return res.status(400).json({ error: 'Missing order id' });
    }

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    const activated = await activatePaidOrder(pool, payment.order_id, payment.id || null);
    // An unknown order may belong to another integration; acknowledge safely.
    res.json({ ok: true, processed: activated.found });
  } catch (error) {
    console.error('razorpay-webhook:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = {
  mountPaymentRoutes,
  razorpayWebhookHandler,
  safeEqualHex,
  hmacHex,
  activatePaidOrder,
};
