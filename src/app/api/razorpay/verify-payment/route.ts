import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    console.log('verify-payment:start', {
      requestId,
      bookingId,
      eventId,
      ticketType,
      customerEmail,
      razorpay_order_id,
      razorpay_payment_id,
    });

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keySecret) {
      console.error('verify-payment:missing-secret', { requestId });
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

    console.log('verify-payment:signature-check', {
      requestId,
      bookingId,
      isAuthentic,
    });

    if (!isAuthentic) {
      console.error('verify-payment:signature-failed', {
        requestId,
        bookingId,
        razorpay_order_id,
        razorpay_payment_id,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification failed',
        },
        { status: 400 }
      );
    }

    const bookingPayload = {
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
    };

    const bookingRef = await adminDb.collection('eventBookings').add(bookingPayload);

    console.log('verify-payment:booking-saved', {
      requestId,
      bookingId,
      firestoreDocId: bookingRef.id,
    });

    const eventRef = adminDb.collection('events').doc(eventId);

    if (ticketType === 'male' || ticketType === 'female' || ticketType === 'couple') {
      await eventRef.update({
        [`currentParticipants.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });

      console.log('verify-payment:participant-incremented', {
        requestId,
        bookingId,
        eventId,
        path: `currentParticipants.${ticketType}`,
      });
    } else {
      await eventRef.update({
        [`customParticipantCounts.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });

      console.log('verify-payment:participant-incremented', {
        requestId,
        bookingId,
        eventId,
        path: `customParticipantCounts.${ticketType}`,
      });
    }

    let emailSent = false;
    let emailWarning: string | null = null;

    try {
      const origin = request.nextUrl.origin;

      const emailRes = await fetch(`${origin}/api/send-booking-email`, {
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
          currency: currency || 'INR',
        }),
      });

      let emailData: any = null;
      try {
        emailData = await emailRes.json();
      } catch (parseError: any) {
        console.error('verify-payment:email-response-parse-failed', {
          requestId,
          bookingId,
          error: parseError?.message || 'Unknown parse error',
        });
      }

      console.log('verify-payment:email-response', {
        requestId,
        bookingId,
        status: emailRes.status,
        ok: emailRes.ok,
        emailSuccess: emailData?.success ?? null,
        emailMessage: emailData?.message ?? null,
      });

      if (emailRes.ok && emailData?.success) {
        emailSent = true;
        console.log('verify-payment:email-sent', {
          requestId,
          bookingId,
        });
      } else {
        emailWarning =
          emailData?.message || 'Booking confirmed, but confirmation email could not be sent';

        console.error('verify-payment:email-failed', {
          requestId,
          bookingId,
          status: emailRes.status,
          emailData,
        });
      }
    } catch (emailError: any) {
      emailWarning = emailError?.message || 'Email sending failed unexpectedly';

      console.error('verify-payment:email-exception', {
        requestId,
        bookingId,
        error: emailError?.message || String(emailError),
      });
    }

    console.log('verify-payment:success', {
      requestId,
      bookingId,
      paymentId: razorpay_payment_id,
      emailSent,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and booking saved successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingId,
      emailSent,
      emailWarning,
    });
  } catch (error: any) {
    console.error('verify-payment:error', {
      requestId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Payment verification error',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
