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
 * Generate WhatsApp message URL for booking confirmation
 * Opens WhatsApp with pre-filled confirmation message
 */
export const sendWhatsAppBookingNotification = (
  details: WhatsAppBookingDetails,
  businessPhone: string = '917901751593' // Unigather WhatsApp number
): string => {
  const message = `
Hi ${details.customerName}! 👋

🎉 *Congratulations! Your booking with Unigather is confirmed!*

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
🎟️ Ticket Type: ${details.ticketType}
💰 Amount Paid: *₹${details.amount}*

*Important Instructions:*
✅ Please arrive 15 minutes before the event starts
✅ Carry a valid ID proof for verification
✅ Show this confirmation at the venue
✅ Check your email for detailed information

We're super excited to see you at the event! Get ready to make new friends and create unforgettable memories! 🎊

_This is your booking confirmation from Unigather._
_For any queries, feel free to reply to this message._
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodedMessage}`;
  
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
  return `https://wa.me/917901751593?text=${encodedMessage}`;
};

