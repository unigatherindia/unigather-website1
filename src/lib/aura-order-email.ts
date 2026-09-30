export interface AuraOrderConfirmationEmailInput {
  customerEmail: string;
  customerName: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  bookingId: string;
  paymentId?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
}

export interface AuraOrderConfirmationEmailResult {
  sent: boolean;
  provider: 'resend';
  messageId?: string;
  warning?: string;
}

function formatAmount(amount: number, currency: string) {
  if (currency === 'INR') return `₹${amount}`;
  return `${currency} ${amount}`;
}

function createAuraOrderConfirmationHtml(input: AuraOrderConfirmationEmailInput) {
  const logoUrl = 'https://www.unigather.co.in/media/logo-new.png';
  const fullAddress = [
    input.shippingAddress,
    input.shippingCity,
    input.shippingState,
    input.shippingPincode,
  ]
    .filter(Boolean)
    .join(', ');

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmed - Unigather Fragrance</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; }
            .container { background-color: #111; border-radius: 10px; padding: 30px; border: 1px solid #D4AF37; color: #f5f5f5; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #D4AF37; }
            .brand-logo { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 12px; border: 2px solid #D4AF37; }
            .header h1 { color: #FFD700; margin: 0; font-size: 26px; }
            .booking-details { background-color: #1a1a1a; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px solid #333; padding-bottom: 8px; }
            .detail-label { color: #D4AF37; font-weight: bold; }
            .footer { text-align: center; margin-top: 24px; color: #888; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Unigather" class="brand-logo" />
              <h1>Your Aura Order is Confirmed</h1>
              <p>unigather Fragrance</p>
            </div>
            <p>Hi ${input.customerName},</p>
            <p>Thank you for your purchase. Your payment was successful and we are preparing your order for delivery.</p>
            <div class="booking-details">
              <div class="detail-row"><span class="detail-label">Order ID:</span><span>${input.bookingId}</span></div>
              <div class="detail-row"><span class="detail-label">Product:</span><span>${input.productTitle}</span></div>
              <div class="detail-row"><span class="detail-label">Quantity:</span><span>${input.quantity}</span></div>
              <div class="detail-row"><span class="detail-label">Unit price:</span><span>${formatAmount(input.unitPrice, input.currency)}</span></div>
              <div class="detail-row"><span class="detail-label">Total paid:</span><span>${formatAmount(input.amount, input.currency)}</span></div>
              ${
                input.paymentId
                  ? `<div class="detail-row"><span class="detail-label">Payment ID:</span><span>${input.paymentId}</span></div>`
                  : ''
              }
              <div class="detail-row"><span class="detail-label">Ship to:</span><span>${fullAddress}</span></div>
            </div>
            <p>We will reach out on WhatsApp if we need any delivery details.</p>
            <div class="footer">
              <p>Questions? Reply to this email or message us on WhatsApp.</p>
              <p>&copy; Unigather — More than a fragrance, it's a feeling.</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

function createAuraOrderConfirmationText(input: AuraOrderConfirmationEmailInput) {
  const fullAddress = [
    input.shippingAddress,
    input.shippingCity,
    input.shippingState,
    input.shippingPincode,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `Hi ${input.customerName},`,
    '',
    'Your Unigather Fragrance order is confirmed.',
    '',
    `Order ID: ${input.bookingId}`,
    `Product: ${input.productTitle}`,
    `Quantity: ${input.quantity}`,
    `Total: ${formatAmount(input.amount, input.currency)}`,
    input.paymentId ? `Payment ID: ${input.paymentId}` : '',
    `Delivery address: ${fullAddress}`,
    '',
    'Thank you for choosing Unigather Fragrance.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function sendAuraOrderConfirmationEmail(
  input: AuraOrderConfirmationEmailInput
): Promise<AuraOrderConfirmationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Unigather <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      sent: false,
      provider: 'resend',
      warning: 'RESEND_API_KEY is not configured',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.customerEmail],
      subject: `Order Confirmed - ${input.productTitle} | Unigather Fragrance`,
      html: createAuraOrderConfirmationHtml(input),
      text: createAuraOrderConfirmationText(input),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      provider: 'resend',
      warning: typeof data.message === 'string' ? data.message : 'Failed to send email',
    };
  }

  return {
    sent: true,
    provider: 'resend',
    messageId: typeof data.id === 'string' ? data.id : undefined,
  };
}
