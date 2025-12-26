'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User, Mail, Phone, Calendar, MapPin, IndianRupee, 
  CreditCard, Check, AlertCircle, Users, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { createWhatsAppSupportLink, createCustomerBookingConfirmation, WhatsAppBookingDetails } from '@/lib/whatsapp';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: {
    male: number | string;
    female: number | string;
  };
  maxCapacity: number;
  currentParticipants: {
    male: number;
    female: number;
  };
  duration: string;
  highlights: string[];
}

interface BookingModalProps {
  event: Event;
  onClose: () => void;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  age: string;
  dietaryRestrictions: string;
  experience: string;
  terms: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ event, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Confirmation
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    paymentId: string;
    bookingId: string;
  } | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string>('');
  
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    age: '',
    dietaryRestrictions: '',
    experience: '',
    terms: false
  });

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user) {
      setBookingForm(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleInputChange = (field: keyof BookingForm, value: string | boolean) => {
    setBookingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = ['name', 'email', 'phone', 'age'];
    for (let field of required) {
      if (!bookingForm[field as keyof BookingForm]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    if (!bookingForm.terms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingForm.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(bookingForm.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Optional: Suggest sign-in but allow guest booking
    if (!user) {
      toast.success('Proceeding as guest. Sign in for faster bookings next time!', {
        duration: 3000,
      });
    }

    // Check if price is text (not numeric) - skip payment if so
    const price = event.price[bookingForm.gender];
    if (typeof price === 'string') {
      // Handle text price booking (skip payment)
      handleTextPriceBooking();
    } else {
      // Proceed to payment for numeric prices
      setStep(2);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast.success('You can now proceed with your booking!');
    // After successful login, check if payment is needed
    if (validateForm()) {
      const price = event.price[bookingForm.gender];
      if (typeof price === 'string') {
        handleTextPriceBooking();
      } else {
        setStep(2);
      }
    }
  };

  // Handle booking for text prices (skip payment)
  const handleTextPriceBooking = async () => {
    setIsLoading(true);
    
    try {
      // Generate booking ID
      const bookingId = `UG${Date.now().toString().slice(-8)}`;
      
      // Store booking details (no payment)
      setPaymentDetails({
        orderId: 'N/A',
        paymentId: 'N/A',
        bookingId: bookingId,
      });

      // Persist booking record for admin visibility
      try {
        if (db) {
          const bookingPayload = {
            bookingId,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            ticketGender: bookingForm.gender,
            amountPaid: event.price[bookingForm.gender], // Store text price as-is
            orderId: 'N/A',
            paymentId: 'N/A',
            customerName: bookingForm.name,
            customerEmail: bookingForm.email,
            customerPhone: bookingForm.phone,
            age: bookingForm.age,
            dietaryRestrictions: bookingForm.dietaryRestrictions,
            experience: bookingForm.experience,
            createdAt: Timestamp.now(),
            status: 'confirmed',
          };

          await addDoc(collection(db, 'eventBookings'), bookingPayload);

          const eventRef = doc(db, 'events', event.id);
          const genderField = `currentParticipants.${bookingForm.gender}`;

          await updateDoc(eventRef, {
            [genderField]: increment(1),
            updatedAt: Timestamp.now(),
          });
        }
      } catch (firestoreError) {
        console.error('Error saving booking details:', firestoreError);
        toast.error('Booking saved, but failed to sync with admin dashboard. Please contact support.');
      }

      // Generate WhatsApp confirmation URL for customer
      const whatsappDetails: WhatsAppBookingDetails = {
        bookingId: bookingId,
        paymentId: 'N/A',
        customerName: bookingForm.name,
        eventTitle: event.title,
        eventDate: formatDate(event.date),
        eventTime: event.time,
        eventLocation: event.location,
        amount: typeof event.price[bookingForm.gender] === 'number' 
          ? event.price[bookingForm.gender] 
          : 0,
        ticketType: `${bookingForm.gender.charAt(0).toUpperCase() + bookingForm.gender.slice(1)} Ticket`,
      };
      
      // Create link for customer to save confirmation in their WhatsApp
      const whatsappUrl = createCustomerBookingConfirmation(whatsappDetails);
      setWhatsAppUrl(whatsappUrl);

      // Send confirmation email
      try {
        await fetch('/api/send-booking-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerEmail: bookingForm.email,
            customerName: bookingForm.name,
            eventTitle: event.title,
            eventDate: formatDate(event.date),
            eventTime: event.time,
            eventLocation: event.location,
            ticketType: `${bookingForm.gender} Ticket`,
            amount: event.price[bookingForm.gender],
            bookingId: bookingId,
            paymentId: 'N/A',
          }),
        });
        
        toast.success('Booking confirmed! Check your email for details.');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        toast.success('Booking confirmed! (Email delivery may be delayed)');
      }

      setStep(3);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to process booking. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    // Safety check: if price is text, handle as text price booking
    if (typeof selectedPrice === 'string') {
      handleTextPriceBooking();
      return;
    }

    setIsLoading(true);
    
    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPrice,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            eventId: event.id,
            eventTitle: event.title,
            customerName: bookingForm.name,
            customerEmail: bookingForm.email,
            gender: bookingForm.gender,
          },
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Unigather',
        description: event.title,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Generate booking ID
              const bookingId = `UG${Date.now().toString().slice(-8)}`;
              
              // Store payment details
              setPaymentDetails({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                bookingId: bookingId,
              });

              // Persist booking record for admin visibility
              try {
                if (db) {
                  const bookingPayload = {
                    bookingId,
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventTime: event.time,
                    eventLocation: event.location,
                    ticketGender: bookingForm.gender,
                    amountPaid: selectedPrice,
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    customerName: bookingForm.name,
                    customerEmail: bookingForm.email,
                    customerPhone: bookingForm.phone,
                    age: bookingForm.age,
                    dietaryRestrictions: bookingForm.dietaryRestrictions,
                    experience: bookingForm.experience,
                    createdAt: Timestamp.now(),
                    status: 'confirmed',
                  };

                  await addDoc(collection(db, 'eventBookings'), bookingPayload);

                  const eventRef = doc(db, 'events', event.id);
                  const genderField = `currentParticipants.${bookingForm.gender}`;

                  await updateDoc(eventRef, {
                    [genderField]: increment(1),
                    updatedAt: Timestamp.now(),
                  });
                }
              } catch (firestoreError) {
                console.error('Error saving booking details:', firestoreError);
                toast.error('Booking saved, but failed to sync with admin dashboard. Please contact support.');
              }

              // Generate WhatsApp confirmation URL for customer
              const whatsappDetails: WhatsAppBookingDetails = {
                bookingId: bookingId,
                paymentId: response.razorpay_payment_id,
                customerName: bookingForm.name,
                eventTitle: event.title,
                eventDate: formatDate(event.date),
                eventTime: event.time,
                eventLocation: event.location,
                amount: selectedPrice,
                ticketType: `${bookingForm.gender.charAt(0).toUpperCase() + bookingForm.gender.slice(1)} Ticket`,
              };
              
              // Create link for customer to save confirmation in their WhatsApp
              const whatsappUrl = createCustomerBookingConfirmation(whatsappDetails);
              setWhatsAppUrl(whatsappUrl);

              // Send confirmation email
              try {
                await fetch('/api/send-booking-email', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    customerEmail: bookingForm.email,
                    customerName: bookingForm.name,
                    eventTitle: event.title,
                    eventDate: formatDate(event.date),
                    eventTime: event.time,
                    eventLocation: event.location,
                    ticketType: `${bookingForm.gender} Ticket`,
                    amount: selectedPrice,
                    bookingId: bookingId,
                    paymentId: response.razorpay_payment_id,
                  }),
                });
                
                toast.success('Booking confirmed! Check your email for details.');
              } catch (emailError) {
                console.error('Email sending failed:', emailError);
                toast.success('Booking confirmed! (Email delivery may be delayed)');
              }

              setStep(3);
              setIsLoading(false);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setIsLoading(false);
          }
        },
        prefill: {
          name: bookingForm.name,
          email: bookingForm.email,
          contact: bookingForm.phone,
        },
        notes: {
          eventId: event.id,
          eventTitle: event.title,
          gender: bookingForm.gender,
        },
        theme: {
          color: '#f97316',
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment. Please try again.');
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const selectedPrice = event.price[bookingForm.gender];
  const totalParticipants = event.currentParticipants.male + event.currentParticipants.female;

  return (
    <>
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Booking Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-dark-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
              {step === 1 ? 'Book Event' : step === 2 ? 'Payment' : 'Booking Confirmed'}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                    stepNumber <= step
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-600 text-gray-400'
                  }`}
                >
                  {stepNumber < step ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 transition-colors ${
                      stepNumber < step ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs sm:text-sm">
            <span className={step >= 1 ? 'text-primary-400' : 'text-gray-500'}>Details</span>
            <span className={step >= 2 ? 'text-primary-400' : 'text-gray-500'}>Payment</span>
            <span className={step >= 3 ? 'text-primary-400' : 'text-gray-500'}>Confirm</span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 1: Booking Form */}
          {step === 1 && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Event Summary */}
              <div className="bg-dark-700 rounded-2xl p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-primary-400" />
                        {formatDate(event.date)} at {event.time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-primary-400" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary-400" />
                        {event.duration}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-primary-400" />
                        {totalParticipants}/{event.maxCapacity} participants
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={bookingForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gender *
                  </label>
                  <select
                    value={bookingForm.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={bookingForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={bookingForm.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={bookingForm.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="25"
                    min="18"
                    max="80"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dietary Restrictions (Optional)
                </label>
                <textarea
                  value={bookingForm.dietaryRestrictions}
                  onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Any dietary restrictions or allergies..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Previous Experience (Optional)
                </label>
                <textarea
                  value={bookingForm.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Tell us about your experience with similar events..."
                  rows={3}
                />
              </div>

              {/* Price Display */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {typeof selectedPrice === 'number' && (
                      <IndianRupee className="w-5 h-5 text-primary-400" />
                    )}
                    <span className="text-white font-medium">
                      {bookingForm.gender === 'male' ? 'Male' : 'Female'} Ticket
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-400">
                    {typeof selectedPrice === 'number' ? `₹${selectedPrice}` : selectedPrice}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={bookingForm.terms}
                  onChange={(e) => handleInputChange('terms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-500 bg-dark-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" className="text-primary-400 hover:text-primary-300 underline">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy" target="_blank" className="text-primary-400 hover:text-primary-300 underline">
                    Privacy Policy
                  </a>
                  . I understand the event details and cancellation policy.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-4 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {typeof selectedPrice === 'number' ? (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>Proceed to Payment</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Confirm Booking</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-dark-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Booking Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Event</span>
                    <span className="text-white">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Participant</span>
                    <span className="text-white">{bookingForm.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ticket Type</span>
                    <span className="text-white">{bookingForm.gender} Ticket</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Date & Time</span>
                    <span className="text-white">{formatDate(event.date)} at {event.time}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total Amount</span>
                      <span className="text-primary-400">
                        {typeof selectedPrice === 'number' ? `₹${selectedPrice}` : selectedPrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Notice */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <div className="text-primary-400 font-medium mb-1">Secure Payment</div>
                    <div className="text-sm text-gray-300">
                      Your payment will be processed securely through Razorpay. You'll receive a confirmation email after successful payment.
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-6 bg-dark-600 text-white rounded-xl font-medium hover:bg-dark-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="flex-2 bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 px-6 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₹{selectedPrice}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Booking Confirmed!
                </h3>
                <p className="text-gray-300">
                  {typeof selectedPrice === 'number' 
                    ? `Your payment was successful. A confirmation email has been sent to ${bookingForm.email}`
                    : `Your booking has been confirmed. A confirmation email has been sent to ${bookingForm.email}`
                  }
                </p>
              </div>

              <div className="bg-dark-700 rounded-2xl p-6 text-left">
                <h4 className="text-lg font-semibold text-white mb-4">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Booking ID</span>
                    <span className="text-white font-mono">{paymentDetails?.bookingId || 'N/A'}</span>
                  </div>
                  {typeof selectedPrice === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payment ID</span>
                      <span className="text-white font-mono text-xs">{paymentDetails?.paymentId || 'N/A'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event</span>
                    <span className="text-white">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-green-400">
                      {typeof selectedPrice === 'number' ? `₹${selectedPrice}` : selectedPrice}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-white mb-1">Check your email</p>
                    <p>We've sent a detailed confirmation with event information and your ticket details to your email address.</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Save Confirmation Button */}
              {whatsAppUrl && (
                <button
                  onClick={() => window.open(whatsAppUrl, '_blank')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Save Confirmation to WhatsApp</span>
                </button>
              )}
              
              {/* Info about WhatsApp */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <p className="text-xs text-gray-300 text-center">
                  💚 Click above to save your booking details in WhatsApp for easy access at the venue
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    </>
  );
};

export default BookingModal;
