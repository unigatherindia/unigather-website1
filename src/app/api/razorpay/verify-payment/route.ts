import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    // Check if secret is configured
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'nAbTPxhMBsg2i5Cd8dT1DuBs';

    if (!keySecret) {
      console.error('Razorpay secret not configured!');
      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification not configured. Please contact support.',
        },
        { status: 500 }
      );
    }

    // Create signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification failed',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Payment verification error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

