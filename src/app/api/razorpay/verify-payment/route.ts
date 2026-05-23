import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,

      eventId,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,

      customerEmail,
      customerName,
      customerPhone,
      age,
      dietaryRestrictions,
      experience,

      ticketType,
      ticketLabel,
      amount,
      bookingId,
      currency,
    } = await request.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

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

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification failed',
        },
        { status: 400 }
      );
    }

    await adminDb.collection('eventBookings').add({
      bookingId,
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      ticketGender: ticketType,
      ticketLabel,
      amountPaid: amount,
      currency: currency || 'INR',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      customerName,
      customerEmail,
      customerPhone,
      age,
      dietaryRestrictions,
      experience,
      createdAt: new Date(),
      status: 'confirmed',
    });

    const eventRef = adminDb.collection('events').doc(eventId);

    if (ticketType === 'male' || ticketType === 'female' || ticketType === 'couple') {
      await eventRef.update({
        [`currentParticipants.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });
    } else {
      await eventRef.update({
        [`customParticipantCounts.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });
    }

    try {
      const origin = request.nextUrl.origin;

      await fetch(`${origin}/api/send-booking-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail,
          customerName,
          eventTitle,
          eventDate,
          eventTime,
          eventLocation,
          ticketType: ticketLabel || ticketType,
          amount,
          bookingId,
          paymentId: razorpay_payment_id,
          currency,
        }),
      });
    } catch (emailError) {
      console.error('Server-side email trigger failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and booking saved successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingId,
    });
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
