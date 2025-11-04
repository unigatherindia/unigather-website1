import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message, type } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER || 'unigatherindia@gmail.com';
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

    if (!emailPassword) {
      console.error('Email credentials not configured. Please set EMAIL_PASSWORD or EMAIL_APP_PASSWORD in environment variables.');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // Create transporter using Gmail SMTP
    // Note: For Gmail, you need to use an App Password (not your regular password)
    // Go to: Google Account > Security > 2-Step Verification > App passwords
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error('Email transporter verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Email service configuration error. Please check your email credentials.' },
        { status: 500 }
      );
    }

    // Format inquiry type
    const inquiryTypeLabels: { [key: string]: string } = {
      general: 'General Inquiry',
      event: 'Event Related',
      partnership: 'Partnership',
      feedback: 'Feedback',
      support: 'Technical Support',
      other: 'Other',
    };

    const inquiryTypeLabel = inquiryTypeLabels[type] || 'General Inquiry';

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'unigatherindia@gmail.com',
      to: 'unigatherindia@gmail.com',
      replyTo: email,
      subject: subject || `New Contact Form Submission: ${inquiryTypeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .field {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
              }
              .field-label {
                font-weight: bold;
                color: #667eea;
                margin-bottom: 5px;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 1px;
              }
              .field-value {
                color: #333;
                font-size: 14px;
              }
              .message-box {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                border-left: 4px solid #667eea;
                margin-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Contact Form Submission</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="field-label">Name</div>
                  <div class="field-value">${name}</div>
                </div>
                
                <div class="field">
                  <div class="field-label">Email</div>
                  <div class="field-value">${email}</div>
                </div>
                
                ${phone ? `
                <div class="field">
                  <div class="field-label">Phone</div>
                  <div class="field-value">${phone}</div>
                </div>
                ` : ''}
                
                <div class="field">
                  <div class="field-label">Inquiry Type</div>
                  <div class="field-value">${inquiryTypeLabel}</div>
                </div>
                
                ${subject ? `
                <div class="field">
                  <div class="field-label">Subject</div>
                  <div class="field-value">${subject}</div>
                </div>
                ` : ''}
                
                <div class="field">
                  <div class="field-label">Message</div>
                  <div class="message-box">
                    ${message.replace(/\n/g, '<br>')}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ''}
Inquiry Type: ${inquiryTypeLabel}
${subject ? `Subject: ${subject}\n` : ''}
Message:
${message}
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Email sent successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
}

