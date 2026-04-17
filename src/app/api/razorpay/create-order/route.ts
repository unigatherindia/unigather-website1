import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { amount, currency, receipt, notes } = body as {
      amount?: unknown;
      currency?: string;
      receipt?: string;
      notes?: Record<string, string>;
    };

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured!');
      return NextResponse.json(
        {
          success: false,
          message: 'Payment gateway not configured. Please contact support.',
          error: 'Missing Razorpay credentials',
        },
        { status: 500 }
      );
    }

    const amountRupees = Number(amount);
    if (!Number.isFinite(amountRupees) || amountRupees < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ticket amount. Please refresh and try again.',
          error: 'Amount must be at least ₹1',
        },
        { status: 400 }
      );
    }

    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise < 100) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ticket amount. Please refresh and try again.',
          error: 'Amount too small after conversion',
        },
        { status: 400 }
      );
    }

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Create order (amount in smallest currency unit — paise for INR)
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: currency || 'INR',
      receipt: (receipt || `receipt_${Date.now()}`).toString().slice(0, 40),
      notes: notes || {},
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    const razorpayDesc =
      error?.error?.description ||
      error?.description ||
      (typeof error?.message === 'string' ? error.message : undefined);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create order',
        error: razorpayDesc || 'Unknown Razorpay error',
      },
      { status: 500 }
    );
  }
}

