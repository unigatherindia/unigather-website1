import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const {
      customerEmail,
      customerName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      ticketType,
      amount,
      bookingId,
      paymentId,
    } = await request.json();

    // Check if email is configured
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.warn('Email service not configured. Skipping email notification.');
      return NextResponse.json({
        success: true,
        message: 'Booking confirmed, but email not configured',
        warning: 'Email service not set up. Please configure SMTP credentials.',
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation - Unigather</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 3px solid #f97316;
            }
            .header h1 {
              color: #f97316;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 5px 0 0 0;
            }
            .content {
              padding: 20px 0;
            }
            .booking-details {
              background-color: #f9f9f9;
              border-left: 4px solid #f97316;
              padding: 15px;
              margin: 20px 0;
            }
            .booking-details h2 {
              color: #f97316;
              margin-top: 0;
              font-size: 20px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: bold;
              color: #555;
            }
            .detail-value {
              color: #333;
            }
            .amount {
              font-size: 24px;
              color: #f97316;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 14px;
            }
            .success-badge {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 10px 20px;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #f97316;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Unigather</h1>
              <p>Gathering Minds - Uniting Hearts</p>
            </div>

            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">✓ Booking Confirmed</span>
              </div>

              <p>Dear ${customerName},</p>
              <p>Thank you for booking with Unigather! Your payment has been successfully processed, and your spot is confirmed.</p>

              <div class="booking-details">
                <h2>📋 Booking Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span class="detail-value">${bookingId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment ID:</span>
                  <span class="detail-value">${paymentId}</span>
                </div>
              </div>

              <div class="booking-details">
                <h2>🎪 Event Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Event:</span>
                  <span class="detail-value">${eventTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${eventDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${eventTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${eventLocation}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Ticket Type:</span>
                  <span class="detail-value">${ticketType}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Amount Paid:</span>
                  <span class="amount">₹${amount}</span>
                </div>
              </div>

              <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #f97316; margin-top: 0;">📌 Important Information</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Please arrive 15 minutes before the event starts</li>
                  <li>Carry a valid ID proof for verification</li>
                  <li>Show this email confirmation at the venue</li>
                  <li>For any queries, contact our support team</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://unigather.com/events" class="button">View My Bookings</a>
              </div>

              <p style="margin-top: 30px;">We're excited to see you at the event! Get ready to make new friends and create unforgettable memories.</p>

              <p>Best regards,<br><strong>Team Unigather</strong></p>
            </div>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>© ${new Date().getFullYear()} Unigather. All rights reserved.</p>
              <p>
                <a href="https://unigather.com" style="color: #f97316; text-decoration: none;">Website</a> |
                <a href="https://unigather.com/contact" style="color: #f97316; text-decoration: none;">Contact Us</a> |
                <a href="https://unigather.com/privacy-policy" style="color: #f97316; text-decoration: none;">Privacy Policy</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Unigather" <noreply@unigather.com>',
      to: customerEmail,
      subject: `🎉 Booking Confirmed - ${eventTitle}`,
      html: emailHtml,
      text: `Dear ${customerName},

Thank you for booking with Unigather! Your payment has been successfully processed.

Booking Details:
- Booking ID: ${bookingId}
- Payment ID: ${paymentId}

Event Details:
- Event: ${eventTitle}
- Date: ${eventDate}
- Time: ${eventTime}
- Location: ${eventLocation}
- Ticket Type: ${ticketType}
- Amount Paid: ₹${amount}

Important Information:
- Please arrive 15 minutes before the event starts
- Carry a valid ID proof for verification
- Show this email confirmation at the venue

We're excited to see you at the event!

Best regards,
Team Unigather`,
    });

    console.log('Email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

