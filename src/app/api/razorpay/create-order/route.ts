import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, receipt, notes } = await request.json();

    // Check if environment variables are set
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_RcOdmWvLEj5q5L';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'nAbTPxhMBsg2i5Cd8dT1DuBs';

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

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise (multiply by 100)
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
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
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create order',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

