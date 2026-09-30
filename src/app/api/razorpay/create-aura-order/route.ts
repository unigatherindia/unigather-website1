import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedAuraProductData } from '@/lib/aura-product-data-cache';
import {
  assertAuraProductInStock,
  createAuraOrderDedupeKey,
  normalizeAuraShippingDetails,
  resolveTrustedAuraProductPrice,
} from '@/lib/aura-product-payment-utils';
import {
  PAYMENT_COLLECTIONS,
  PaymentValidationError,
  createPaymentBookingId,
  getOrderCreationRetryAfterSeconds,
  isOrderCreationInFlight,
  isReusablePendingOrder,
  normalizePaymentCustomer,
} from '@/lib/payment-hardening';
import {
  createRazorpayReceipt,
  getRazorpayPaymentTimeoutMs,
  getServerRazorpayConfig,
} from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

function syncAuraLead(
  leadId: string | null,
  updates: Record<string, unknown>
) {
  if (!leadId) return;
  void adminDb
    .collection('auraProductLeads')
    .doc(leadId)
    .update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    .catch(() => undefined);
}

function buildReusedResponse(
  orderIntent: {
    internalOrderId: string;
    bookingId: string;
    razorpayOrderId: string;
    amountSubunits: number;
    currency: string;
  },
  razorpayConfig: ReturnType<typeof getServerRazorpayConfig>,
  leadId: string | null
) {
  syncAuraLead(leadId, {
    status: 'payment_order_created',
    internalOrderId: orderIntent.internalOrderId,
    razorpayOrderId: orderIntent.razorpayOrderId,
    bookingId: orderIntent.bookingId,
  });

  return NextResponse.json({
    success: true,
    internalOrderId: orderIntent.internalOrderId,
    bookingId: orderIntent.bookingId,
    orderId: orderIntent.razorpayOrderId,
    amount: orderIntent.amountSubunits,
    currency: orderIntent.currency,
    companyName: razorpayConfig.checkout.companyName,
    themeColor: '#D4AF37',
    reused: true,
  });
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let dedupeKey: string | null = null;
  let orderPersisted = false;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const { productId, bookingLeadId, customer, shippingDetails } = body as {
      productId?: unknown;
      bookingLeadId?: unknown;
      customer?: unknown;
      shippingDetails?: unknown;
    };

    if (typeof productId !== 'string' || !productId.trim()) {
      throw new PaymentValidationError('Product ID is required');
    }

    const normalizedProductId = productId.trim();
    const normalizedLeadId =
      typeof bookingLeadId === 'string' && bookingLeadId.trim() ? bookingLeadId.trim() : null;
    const normalizedCustomer = normalizePaymentCustomer(customer);
    const normalizedShipping = normalizeAuraShippingDetails(shippingDetails);

    const razorpayConfig = getServerRazorpayConfig();
    if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
      return NextResponse.json(
        { success: false, message: 'Payment gateway not configured.' },
        { status: 500 }
      );
    }

    const productData = await getCachedAuraProductData(adminDb, normalizedProductId);
    if (asString(productData.status) === 'archived') {
      throw new PaymentValidationError('Product is no longer available', 404);
    }

    assertAuraProductInStock(productData, normalizedShipping.quantity);
    const trustedPrice = resolveTrustedAuraProductPrice(productData, normalizedShipping.quantity);

    const nowMillis = Date.now();
    dedupeKey = createAuraOrderDedupeKey({
      productId: normalizedProductId,
      quantity: normalizedShipping.quantity,
      customer: normalizedCustomer,
    });

    const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
    const dedupeRef = adminDb.collection(PAYMENT_COLLECTIONS.orderDedupe).doc(dedupeKey);

    const existingDedupe = await dedupeRef.get();
    if (existingDedupe.exists) {
      const existingData = existingDedupe.data() || {};
      if (
        existingData.orderKind === 'aura_product' &&
        isReusablePendingOrder(existingData, nowMillis)
      ) {
        return buildReusedResponse(
          {
            internalOrderId: String(existingData.internalOrderId),
            bookingId: String(existingData.bookingId),
            razorpayOrderId: String(existingData.razorpayOrderId),
            amountSubunits: Number(existingData.amountSubunits),
            currency: String(existingData.currency),
          },
          razorpayConfig,
          normalizedLeadId
        );
      }
    }

    const orderRef = orderCollection.doc();
    internalOrderId = orderRef.id;

    const orderIntent = await adminDb.runTransaction(async (transaction) => {
      const dedupeSnapshot = await transaction.get(dedupeRef);
      if (dedupeSnapshot.exists) {
        const data = dedupeSnapshot.data() || {};
        if (data.orderKind === 'aura_product' && isReusablePendingOrder(data, nowMillis)) {
          return {
            reused: true as const,
            internalOrderId: String(data.internalOrderId),
            bookingId: String(data.bookingId),
            razorpayOrderId: String(data.razorpayOrderId),
            amountSubunits: Number(data.amountSubunits),
            currency: String(data.currency),
          };
        }
        if (isOrderCreationInFlight(data, nowMillis)) {
          const retryAfterSeconds = getOrderCreationRetryAfterSeconds(data, nowMillis);
          throw new PaymentValidationError(
            `Order creation is already in progress. Please try again in ${retryAfterSeconds} seconds.`,
            409,
            { retryAfterSeconds }
          );
        }
      }

      const productRef = adminDb.collection('auraProducts').doc(normalizedProductId);
      const freshProduct = await transaction.get(productRef);
      if (!freshProduct.exists) {
        throw new PaymentValidationError('Product not found', 404);
      }
      assertAuraProductInStock(freshProduct.data() || {}, normalizedShipping.quantity);

      const receipt = createRazorpayReceipt(internalOrderId!);
      const bookingId = createPaymentBookingId();
      const expiresAt = Timestamp.fromMillis(nowMillis + getRazorpayPaymentTimeoutMs());

      const orderFields = {
        internalOrderId: internalOrderId!,
        bookingId,
        orderKind: 'aura_product',
        razorpayOrderId: null,
        status: 'pending',
        paymentState: 'created',
        productId: normalizedProductId,
        productLabel: trustedPrice.productLabel,
        bookingLeadId: normalizedLeadId,
        customer: normalizedCustomer,
        shippingDetails: normalizedShipping,
        unitPrice: trustedPrice.unitPrice,
        quantity: normalizedShipping.quantity,
        amount: trustedPrice.amount,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
        receipt,
        dedupeKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt,
      };

      transaction.set(orderRef, orderFields);
      transaction.set(dedupeRef, {
        ...orderFields,
        orderKind: 'aura_product',
      });

      return {
        reused: false as const,
        internalOrderId: internalOrderId!,
        bookingId,
        receipt,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
      };
    });

    orderPersisted = !orderIntent.reused;

    if (orderIntent.reused) {
      return buildReusedResponse(orderIntent, razorpayConfig, normalizedLeadId);
    }

    const razorpay = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });

    const order = await razorpay.orders.create({
      amount: orderIntent.amountSubunits,
      currency: orderIntent.currency,
      receipt: orderIntent.receipt,
    });

    const razorpayUpdate = {
      razorpayOrderId: order.id,
      receipt: order.receipt || orderIntent.receipt,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await Promise.all([
      orderCollection.doc(orderIntent.internalOrderId).update(razorpayUpdate),
      dedupeRef.set(razorpayUpdate, { merge: true }),
      adminDb.collection(PAYMENT_COLLECTIONS.orderRazorpay).doc(order.id).set({
        internalOrderId: orderIntent.internalOrderId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    syncAuraLead(normalizedLeadId, {
      status: 'payment_order_created',
      internalOrderId: orderIntent.internalOrderId,
      razorpayOrderId: order.id,
      bookingId: orderIntent.bookingId,
      amountQuoted: trustedPrice.amount,
      currency: orderIntent.currency,
    });

    return NextResponse.json({
      success: true,
      internalOrderId: orderIntent.internalOrderId,
      bookingId: orderIntent.bookingId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      companyName: razorpayConfig.checkout.companyName,
      themeColor: '#D4AF37',
    });
  } catch (error: unknown) {
    console.error('create-aura-order error:', error);

    if (error instanceof PaymentValidationError) {
      return NextResponse.json(
        { success: false, message: error.message, ...(error.details ?? {}) },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    );
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
