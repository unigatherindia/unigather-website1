/**
 * WhatsApp Click-to-Chat Integration
 * Free WhatsApp notification system for booking confirmations
 */

export interface WhatsAppBookingDetails {
  bookingId: string;
  paymentId: string;
  customerName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  amount: number;
  ticketType: string;
}

/**
 * Generate WhatsApp URL to contact business with booking details
 * Opens WhatsApp where customer can message business for support
 */
export const createWhatsAppSupportLink = (
  details: WhatsAppBookingDetails,
  businessPhone: string = '917901751593' // Unigather WhatsApp support number
): string => {
  const message = `
Hi Unigather Team! 👋

I just completed my booking and wanted to confirm:

📋 Booking ID: *${details.bookingId}*
💳 Payment ID: ${details.paymentId}
🎪 Event: *${details.eventTitle}*
📅 Date: ${details.eventDate}

Please confirm my booking details.

Thank you!
${details.customerName}
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${businessPhone}&text=${encodedMessage}`;
  
  return whatsappUrl;
};

/**
 * Generate shareable booking confirmation for customer's own WhatsApp
 * Customer can save this in their own WhatsApp chat
 */
export const createCustomerBookingConfirmation = (
  details: WhatsAppBookingDetails
): string => {
  const message = `
🎉 *MY BOOKING CONFIRMATION - Unigather*

Hi ${details.customerName}! Your booking is confirmed! ✅

*Booking Details:*
━━━━━━━━━━━━━━━━━━━━
📋 Booking ID: *${details.bookingId}*
💳 Payment ID: ${details.paymentId}

*Event Information:*
━━━━━━━━━━━━━━━━━━━━
🎪 Event: *${details.eventTitle}*
📅 Date: ${details.eventDate}
🕐 Time: ${details.eventTime}
📍 Location: ${details.eventLocation}
🎟️ Ticket: ${details.ticketType}
💰 Paid: *₹${details.amount}*

*Important:*
✅ Arrive 15 minutes early
✅ Carry valid ID proof
✅ Show this at venue

🎊 Get ready to make new friends!

Unigather Support: wa.me/917901751593
  `.trim();

  // Share to customer's own WhatsApp (saved messages)
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
  
  return whatsappUrl;
};

/**
 * Alternative: Simple greeting message
 */
export const sendSimpleWhatsAppMessage = (
  customerName: string,
  bookingId: string,
  eventTitle: string
): string => {
  const message = `
Hi ${customerName}! 👋

Your booking for *${eventTitle}* is confirmed! ✅

Booking ID: *${bookingId}*

Thank you for choosing Unigather! 🎉
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=917901751593&text=${encodedMessage}`;
};

