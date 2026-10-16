import { formatEventPrice } from '@/lib/formatPrice';
import { ONE_ON_ONE_MEETUP_LABEL } from '@/constants/beyond-hellos-copy';

export interface BeyondHellosConfirmationEmailInput {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  city: string;
  genderPreferenceLabel: string;
  ticketLabel: string;
  hobbies: string;
  scheduleNote: string;
  duration: string;
}

export interface BeyondHellosConfirmationEmailResult {
  sent: boolean;
  provider: 'resend';
  messageId?: string;
  warning?: string;
}

function createBeyondHellosConfirmationHtml(input: BeyondHellosConfirmationEmailInput) {
  const logoUrl = 'https://www.unigather.co.in/media/logo-new.png';
  const amountLabel = formatEventPrice(input.amount, input.currency);

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${ONE_ON_ONE_MEETUP_LABEL} Confirmed - Unigather</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
            .brand-logo { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 12px; border: 2px solid #f97316; }
            .header h1 { color: #f97316; margin: 0; font-size: 24px; }
            .booking-details { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px solid #fed7aa; padding-bottom: 8px; gap: 12px; }
            .detail-label { color: #c2410c; font-weight: bold; flex-shrink: 0; }
            .detail-value { text-align: right; }
            .footer { text-align: center; margin-top: 24px; color: #666; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Unigather" class="brand-logo" />
              <h1>${ONE_ON_ONE_MEETUP_LABEL} — You're booked!</h1>
            </div>
            <p>Hi ${input.customerName},</p>
            <p>Thank you for joining <strong>${ONE_ON_ONE_MEETUP_LABEL}</strong>. Your payment was successful and our team will match you with a compatible guest and host in your city.</p>
            <div class="booking-details">
              <div class="detail-row"><span class="detail-label">Booking ID:</span><span class="detail-value">${input.bookingId}</span></div>
              <div class="detail-row"><span class="detail-label">Amount paid:</span><span class="detail-value">${amountLabel}</span></div>
              ${
                input.paymentId
                  ? `<div class="detail-row"><span class="detail-label">Payment ID:</span><span class="detail-value">${input.paymentId}</span></div>`
                  : ''
              }
              <div class="detail-row"><span class="detail-label">City:</span><span class="detail-value">${input.city}</span></div>
              <div class="detail-row"><span class="detail-label">Ticket:</span><span class="detail-value">${input.ticketLabel}</span></div>
              <div class="detail-row"><span class="detail-label">Gender preference:</span><span class="detail-value">${input.genderPreferenceLabel}</span></div>
              <div class="detail-row"><span class="detail-label">Hobbies:</span><span class="detail-value">${input.hobbies}</span></div>
              <div class="detail-row"><span class="detail-label">When:</span><span class="detail-value">${input.scheduleNote} · ${input.duration}</span></div>
            </div>
            <p>We'll reach out on your registered contact details with café details and next steps. If you have questions, reply to this email or contact us at unigatherindia@gmail.com.</p>
            <div class="footer">
              <p>— Team Unigather</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

export async function sendBeyondHellosConfirmationEmail(
  input: BeyondHellosConfirmationEmailInput
): Promise<BeyondHellosConfirmationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim() || 'Unigather <bookings@unigather.co.in>';

  if (!apiKey) {
    return { sent: false, provider: 'resend', warning: 'RESEND_API_KEY is not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.customerEmail],
      subject: `${ONE_ON_ONE_MEETUP_LABEL} confirmed — ${input.bookingId}`,
      html: createBeyondHellosConfirmationHtml(input),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) {
    return {
      sent: false,
      provider: 'resend',
      warning: data.message || `Resend error (${response.status})`,
    };
  }

  return { sent: true, provider: 'resend', messageId: data.id };
}
