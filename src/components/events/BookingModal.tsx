'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Calendar, MapPin,
  CreditCard, Check, AlertCircle, Users, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { createWhatsAppSupportLink, createCustomerBookingConfirmation, WhatsAppBookingDetails } from '@/lib/whatsapp';
import { db } from '@/lib/firebase';
import { toRazorpayAscii } from '@/lib/razorpayUtf8';
import { DEFAULT_CURRENCY } from '@/constants/countries';
import { formatEventPrice } from '@/lib/formatPrice';
import { formatEventDate } from '@/lib/formatEventDate';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Ignore popstate caused by modal cleanup `history.back()` (e.g. React Strict Mode remount). */
let bookingModalProgrammaticBackPending = 0;

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
    couple?: number | string;
  };
  customTicketOptions?: { id: string; label: string; price: number | string }[];
  customParticipantCounts?: Record<string, number>;
  maxCapacity: number;
  currentParticipants: {
    male: number;
    female: number;
    couple?: number;
  };
  duration: string;
  highlights: string[];
  currency?: string;
}

interface BookingModalProps {
  event: Event;
  onClose: () => void;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  /** 'male' | 'female' | 'couple' or custom option id from event.customTicketOptions */
  ticketType: string;
  age: string;
  dietaryRestrictions: string;
  experience: string;
  terms: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ event, onClose }) => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Confirmation
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    paymentId: string;
    bookingId: string;
    backendConfirmationPending?: boolean;
    emailSent?: boolean;
  } | null>(null);
  const [bookingLeadDocId, setBookingLeadDocId] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string>('');
  
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    ticketType: 'male',
    age: '',
    dietaryRestrictions: '',
    experience: '',
    terms: false
  });

  const stepRef = useRef(step);
  const onCloseRef = useRef(onClose);
  const showAuthModalRef = useRef(showAuthModal);
  const closedFromPopstateRef = useRef(false);

  stepRef.current = step;
  onCloseRef.current = onClose;
  showAuthModalRef.current = showAuthModal;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Android/iOS hardware back: close modal (or previous step) instead of leaving /events.
  useEffect(() => {
    const pushModalState = () => {
      window.history.pushState({ bookingModal: true }, '');
    };

    pushModalState();

    const handlePopState = () => {
      if (bookingModalProgrammaticBackPending > 0) {
        bookingModalProgrammaticBackPending--;
        return;
      }

      if (showAuthModalRef.current) {
        setShowAuthModal(false);
        pushModalState();
        return;
      }

      if (stepRef.current > 1) {
        setStep((current) => current - 1);
        pushModalState();
        return;
      }

      closedFromPopstateRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (!closedFromPopstateRef.current) {
        bookingModalProgrammaticBackPending++;
        window.history.back();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Prevent background scroll when modal is open (iOS-safe).
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;

    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Signal to other floating UI (e.g. chatbot) that a modal is open.
    const previousModalOpen = html.dataset.modalOpen;
    html.dataset.modalOpen = 'true';

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    // iOS Safari needs body fixed to fully stop scrolling behind overlays.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      if (previousModalOpen === undefined) {
        delete html.dataset.modalOpen;
      } else {
        html.dataset.modalOpen = previousModalOpen;
      }

      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      body.style.left = '';
      body.style.right = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const getPriceForTicketType = (ticketType: string): number | string | undefined => {
    if (ticketType === 'male') return event.price.male;
    if (ticketType === 'female') return event.price.female;
    if (ticketType === 'couple') return event.price.couple;
    return event.customTicketOptions?.find((o) => o.id === ticketType)?.price;
  };

  const getTicketLabel = (ticketType: string): string => {
    if (ticketType === 'male') return 'Male';
    if (ticketType === 'female') return 'Female';
    if (ticketType === 'couple') return 'Couple';
    return event.customTicketOptions?.find((o) => o.id === ticketType)?.label || 'Ticket';
  };

  // Check if price indicates sold out
  const isSoldOut = (price: number | string | undefined): boolean => {
    if (price === undefined || price === null) return false;
    if (typeof price === 'number') return false;
    const priceText = String(price).toLowerCase().trim();
    return priceText === 'sold out' || priceText === 'soldout' || priceText === 'sold-out';
  };

  // Check if a price is available (not N/A, not 0, not undefined)
  const isPriceAvailable = (price: number | string | undefined): boolean => {
    if (price === undefined || price === null) return false;
    if (typeof price === 'number') return price > 0;
    const priceStr = String(price).toLowerCase().trim();
    return priceStr !== 'n/a' && priceStr !== '0' && priceStr !== '';
  };

  const eventCurrency = event.currency || DEFAULT_CURRENCY;
  const formatPrice = (price: number | string | undefined) =>
    formatEventPrice(price === undefined || price === null ? '' : price, eventCurrency);

  /** Numeric ticket amount for Razorpay (INR checkout). */
  const parseNumericPriceRupee = (
    price: number | string | undefined
  ): number | undefined => {
    if (price === undefined || price === null) return undefined;
    if (typeof price === 'number') {
      return Number.isFinite(price) && price > 0 ? price : undefined;
    }
    if (isSoldOut(price)) return undefined;
    const s = String(price).trim();
    if (!s || s.toLowerCase() === 'n/a') return undefined;
    const cleaned = s.replace(/[₹,\s]/g, '');
    const n = Number(cleaned);
    if (Number.isFinite(n) && n > 0) return n;
    return undefined;
  };

  // Set default ticket type to first available option
  useEffect(() => {
    const availableTypes: string[] = [];
    if (isPriceAvailable(event.price.male)) availableTypes.push('male');
    if (isPriceAvailable(event.price.female)) availableTypes.push('female');
    if (isPriceAvailable(event.price.couple)) availableTypes.push('couple');
    (event.customTicketOptions || []).forEach((o) => {
      if (isPriceAvailable(o.price)) availableTypes.push(o.id);
    });

    if (availableTypes.length === 0) return;

    if (!availableTypes.includes(bookingForm.ticketType)) {
      setBookingForm((prev) => ({ ...prev, ticketType: availableTypes[0] }));
    }
  }, [event.price, event.customTicketOptions]);

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

  // Check if selected ticket type is sold out when it changes
  useEffect(() => {
    const price = getPriceForTicketType(bookingForm.ticketType);
    if (isSoldOut(price)) {
      toast.error(`${getTicketLabel(bookingForm.ticketType)} tickets are sold out. Please select another option.`, {
        duration: 4000,
      });
    }
  }, [bookingForm.ticketType, event.price, event.customTicketOptions]);

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

  const updateBookingLead = async (
    updates: Record<string, unknown>,
    leadDocId = bookingLeadDocId
  ) => {
    if (!db || !leadDocId) return;

    await updateDoc(doc(db, 'bookingLeads', leadDocId), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  };

  const saveBookingLead = async (status = 'payment_not_started') => {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }

    const selectedTicketPrice = getPriceForTicketType(bookingForm.ticketType);
    const leadPayload = {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      ticketType: bookingForm.ticketType,
      ticketLabel: getTicketLabel(bookingForm.ticketType),
      amountQuoted: selectedTicketPrice ?? 0,
      currency: eventCurrency,
      paymentRequired: parseNumericPriceRupee(selectedTicketPrice) !== undefined,
      customerName: bookingForm.name,
      customerEmail: bookingForm.email,
      customerPhone: bookingForm.phone,
      age: bookingForm.age,
      dietaryRestrictions: bookingForm.dietaryRestrictions,
      experience: bookingForm.experience,
      status,
      source: 'booking_popup',
      userId: user?.uid || null,
      updatedAt: Timestamp.now(),
    };

    if (bookingLeadDocId) {
      await updateDoc(doc(db, 'bookingLeads', bookingLeadDocId), leadPayload);
      return bookingLeadDocId;
    }

    const docRef = await addDoc(collection(db, 'bookingLeads'), {
      ...leadPayload,
      createdAt: Timestamp.now(),
    });
    setBookingLeadDocId(docRef.id);
    return docRef.id;
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
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(bookingForm.phone)) {
      toast.error('Please enter a valid phone number with country code without spaces');
      return false;
    }

    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if the selected price is sold out
    if (isSelectedPriceSoldOut) {
      toast.error('This ticket type is sold out. Please select another option or contact support.');
      return;
    }

    setIsLoading(true);

    try {
      const leadDocId = await saveBookingLead('payment_not_started');

      const price = getPriceForTicketType(bookingForm.ticketType);
      const rupees = parseNumericPriceRupee(price);
      if (rupees !== undefined) {
        setStep(2);
        setIsLoading(false);
      } else if (typeof price === 'string' && price.trim() !== '' && !isSoldOut(price)) {
        await handleTextPriceBooking(leadDocId);
      } else {
        toast.error('No valid ticket price for this option.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error saving booking lead:', error);
      toast.error(error?.message || 'Could not save your details. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    toast.success('You can now proceed with your booking!');
    // After successful login, check if payment is needed
    if (validateForm()) {
      setIsLoading(true);
      try {
        const leadDocId = await saveBookingLead('payment_not_started');
        const price = getPriceForTicketType(bookingForm.ticketType);
        const rupees = parseNumericPriceRupee(price);
        if (rupees !== undefined) {
          setStep(2);
          setIsLoading(false);
        } else if (typeof price === 'string' && price.trim() !== '' && !isSoldOut(price)) {
          await handleTextPriceBooking(leadDocId);
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error saving booking lead after auth:', error);
        toast.error(error?.message || 'Could not save your details. Please try again.');
        setIsLoading(false);
      }
    }
  };

  // Handle booking for text prices (skip payment)
  const handleTextPriceBooking = async (leadDocId = bookingLeadDocId) => {
    setIsLoading(true);
    
    try {
      const confirmResponse = await fetch('/api/bookings/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketType: bookingForm.ticketType,
          bookingLeadId: leadDocId,
          customer: {
            name: bookingForm.name,
            email: bookingForm.email,
            phone: bookingForm.phone,
          },
          bookingDetails: {
            age: bookingForm.age,
            dietaryRestrictions: bookingForm.dietaryRestrictions,
            experience: bookingForm.experience,
          },
        }),
      });

      const confirmation = await confirmResponse.json().catch(() => null);
      if (!confirmResponse.ok || !confirmation?.success || !confirmation.bookingId) {
        throw new Error(confirmation?.message || 'Failed to confirm booking');
      }

      const bookingId = confirmation.bookingId as string;
      setPaymentDetails({
        orderId: 'N/A',
        paymentId: 'N/A',
        bookingId,
        backendConfirmationPending: false,
        emailSent: true,
      });

      // Generate WhatsApp confirmation URL for customer
      const priceValue = getPriceForTicketType(bookingForm.ticketType);
      const whatsappAmount =
        parseNumericPriceRupee(priceValue) ??
        (typeof priceValue === 'number' ? priceValue : 0);
      const whatsappDetails: WhatsAppBookingDetails = {
        bookingId: bookingId,
        paymentId: 'N/A',
        customerName: bookingForm.name,
        eventTitle: event.title,
        eventDate: formatEventDate(event.date),
        eventTime: event.time,
        eventLocation: event.location,
        amount: whatsappAmount,
        ticketType: `${getTicketLabel(bookingForm.ticketType)} Ticket`,
      };
      
      // Create link for customer to save confirmation in their WhatsApp
      const whatsappUrl = createCustomerBookingConfirmation(whatsappDetails);
      setWhatsAppUrl(whatsappUrl);

      if (confirmation.emailSent !== false) {
        toast.success('Booking confirmed! Check your email for details.');
      } else {
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
      const checkoutKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
      if (!checkoutKey) {
        throw new Error(
          'Payment checkout is not configured (missing Razorpay key). Please contact support.'
        );
      }

      const orderController = new AbortController();
      const orderTimeoutId = window.setTimeout(() => orderController.abort(), 45000);

      let orderResponse: Response;
      try {
        orderResponse = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: orderController.signal,
          body: JSON.stringify({
            eventId: event.id,
            ticketType: bookingForm.ticketType,
            bookingLeadId: bookingLeadDocId,
            customer: {
              name: bookingForm.name,
              email: bookingForm.email,
              phone: bookingForm.phone,
            },
            bookingDetails: {
              age: bookingForm.age,
              dietaryRestrictions: bookingForm.dietaryRestrictions,
              experience: bookingForm.experience,
            },
          }),
        });
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error('Payment request timed out. Please try again in a moment.');
        }
        throw fetchError;
      } finally {
        window.clearTimeout(orderTimeoutId);
      }

      let orderData: {
        success?: boolean;
        message?: string;
        error?: string;
        internalOrderId?: string;
        bookingId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        companyName?: string;
        themeColor?: string;
      };
      try {
        orderData = await orderResponse.json();
      } catch {
        throw new Error(
          'Payment server returned an invalid response. Please try again or contact support.'
        );
      }

      if (!orderResponse.ok || !orderData.success) {
        const detail = [orderData.message, orderData.error].filter(Boolean).join(' — ');
        throw new Error(detail || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: checkoutKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.companyName,
        description: toRazorpayAscii(event.title, 250, 'Event booking'),
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const bookingId = orderData.bookingId || `UG${Date.now().toString().slice(-8)}`;
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                internalOrderId: orderData.internalOrderId,
                
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location,

                customerEmail: bookingForm.email,
                customerName: bookingForm.name,
                customerPhone: bookingForm.phone,
                age: bookingForm.age,
                dietaryRestrictions: bookingForm.dietaryRestrictions,
                experience: bookingForm.experience,

                ticketType: bookingForm.ticketType,
                ticketLabel: `${getTicketLabel(bookingForm.ticketType)} Ticket`,
                amount: selectedPrice,
                bookingId,
                currency: eventCurrency,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              const confirmedBookingId = verifyData.bookingId || bookingId;
              const backendConfirmationPending =
                verifyData.webhookConfirmationPending === true;
              
              // Store payment details
              setPaymentDetails({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                bookingId: confirmedBookingId,
                backendConfirmationPending,
                emailSent: verifyData.emailSent === true,
              });

              // Generate WhatsApp confirmation URL for customer
              const whatsappDetails: WhatsAppBookingDetails = {
                bookingId: confirmedBookingId,
                paymentId: response.razorpay_payment_id,
                customerName: bookingForm.name,
                eventTitle: event.title,
                eventDate: formatEventDate(event.date),
                eventTime: event.time,
                eventLocation: event.location,
                amount: selectedPrice,
                ticketType: `${getTicketLabel(bookingForm.ticketType)} Ticket`,
              };
              
              // Create link for customer to save confirmation in their WhatsApp
              const whatsappUrl = createCustomerBookingConfirmation(whatsappDetails);
              setWhatsAppUrl(whatsappUrl);

              setStep(3);
              setIsLoading(false);
            } else {
              throw new Error(verifyData?.message || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            void updateBookingLead({
              status: 'payment_verification_failed',
              failureReason: error?.message || 'Payment verification failed',
            }).catch((leadError) => {
              console.error('Error updating booking lead after verification failure:', leadError);
            });
            toast.error('Payment verification failed. Please contact support.');
            setIsLoading(false);
          }
        },
        prefill: {
          name: toRazorpayAscii(bookingForm.name, 120, 'Customer'),
          email: toRazorpayAscii(bookingForm.email, 120, 'customer@example.com'),
          contact: toRazorpayAscii(bookingForm.phone, 20, '0000000000'),
        },
        theme: {
          color: orderData.themeColor,
        },
        modal: {
          ondismiss: function() {
            void updateBookingLead({
              status: 'payment_cancelled',
            }).catch((leadError) => {
              console.error('Error updating booking lead after payment cancellation:', leadError);
            });
            setIsLoading(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setIsLoading(false);
    } catch (error: any) {
      console.error('Payment error:', error);
      setIsLoading(false);
      toast.error(error.message || 'Failed to process payment. Please try again.');
      void updateBookingLead({
        status: 'payment_error',
        failureReason: error?.message || 'Failed to process payment',
      }).catch((leadError) => {
        console.error('Error updating booking lead after payment error:', leadError);
      });
    }
  };

  const rawSelectedPrice = getPriceForTicketType(bookingForm.ticketType);
  const numericRupees = parseNumericPriceRupee(rawSelectedPrice);
  const selectedPrice: number | string =
    numericRupees !== undefined
      ? numericRupees
      : rawSelectedPrice === undefined
        ? 0
        : rawSelectedPrice;
  const isSelectedPriceSoldOut =
    rawSelectedPrice !== undefined && isSoldOut(rawSelectedPrice);
  const customPartSum = Object.values(event.customParticipantCounts || {}).reduce(
    (a, b) => a + (typeof b === 'number' ? b : 0),
    0
  );
  const totalParticipants =
    event.currentParticipants.male +
    event.currentParticipants.female +
    (event.currentParticipants.couple || 0) +
    customPartSum;
  const progressSteps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Payment' },
    { number: 3, label: 'Confirm' },
  ];

  const formActionsClassName =
    'shrink-0 flex gap-3 border-t border-gray-700 bg-dark-800 px-4 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]';

  const bookingModal = (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md overscroll-none sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 8 }}
        className="relative flex min-h-0 w-full flex-1 flex-col bg-dark-800 sm:mx-auto sm:my-auto sm:max-h-[min(90dvh,900px)] sm:max-w-2xl sm:flex-none sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700 p-4 sm:p-6">
          <div className="flex-1 min-w-0">
            <h2 id="booking-modal-title" className="text-lg sm:text-2xl font-bold text-white truncate">
              {step === 1 ? 'Book Event' : step === 2 ? 'Payment' : 'Booking Confirmed'}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{event.title}</p>
          </div>
          <button
            aria-label="Close booking modal"
            onClick={onClose}
            className="relative w-10 h-10 flex-shrink-0 rounded-full bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white transition-colors"
          >
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xl leading-none">
              X
            </span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="shrink-0 border-b border-gray-700 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-3 text-center">
            {progressSteps.map(({ number, label }) => (
              <div key={number} className="relative flex flex-col items-center">
                {number < 3 && (
                  <div
                    className={`absolute left-1/2 top-3.5 sm:top-4 h-0.5 w-full transition-colors ${
                      number < step ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                    number <= step
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-600 text-gray-400'
                  }`}
                >
                  {number < step ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : number}
                </div>
                <span className={`mt-2 text-xs sm:text-sm ${number <= step ? 'text-primary-400' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Booking Form */}
        {step === 1 && (
          <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
              <div className="space-y-6">
              {/* Event Summary */}
              <div className="bg-dark-700 rounded-2xl p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-primary-400" />
                        {formatEventDate(event.date)} at {event.time}
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
                    Ticket Type *
                  </label>
                  <select
                    value={bookingForm.ticketType}
                    onChange={(e) => handleInputChange('ticketType', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    {isPriceAvailable(event.price.male) && (
                      <option value="male">Male</option>
                    )}
                    {isPriceAvailable(event.price.female) && (
                      <option value="female">Female</option>
                    )}
                    {isPriceAvailable(event.price.couple) && (
                      <option value="couple">Couple</option>
                    )}
                    {(event.customTicketOptions || []).map((opt) =>
                      isPriceAvailable(opt.price) ? (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ) : null
                    )}
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
                      placeholder="+919876543210"
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
                  <span className="text-white font-medium">
                    {getTicketLabel(bookingForm.ticketType)} Ticket
                  </span>
                  <div className="text-2xl font-bold text-primary-400">
                    {formatPrice(selectedPrice)}
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

              {/* Sold Out Warning */}
              {isSelectedPriceSoldOut && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <div className="text-red-400 font-medium mb-1">Sold Out</div>
                      <div className="text-sm text-gray-300">
                        This ticket type is currently sold out. Please select a different ticket type or contact support for availability.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              </div>
            </div>
            <div className={formActionsClassName}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="basis-[30%] rounded-xl bg-dark-600 py-4 font-semibold text-white transition-colors hover:bg-dark-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex basis-[70%] items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 py-4 font-semibold text-white transition-all duration-300 hover:from-primary-600 hover:to-primary-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600"
                disabled={isLoading || isSelectedPriceSoldOut}
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : isSelectedPriceSoldOut ? (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    <span>Sold Out</span>
                  </>
                ) : (
                  <>
                    {typeof selectedPrice === 'number' ? (
                      <>
                        <CreditCard className="h-5 w-5" />
                        <span>Proceed to Payment</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Confirm Booking</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
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
                    <span className="text-white">{getTicketLabel(bookingForm.ticketType)} Ticket</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Date & Time</span>
                    <span className="text-white">{formatEventDate(event.date)} at {event.time}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total Amount</span>
                      <span className="text-primary-400">
                        {formatPrice(selectedPrice)}
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

            </div>
            <div className={`${formActionsClassName} space-x-4`}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl bg-dark-600 px-6 py-3 font-medium text-white transition-colors hover:bg-dark-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={isLoading}
                className="flex flex-[2] items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 px-6 py-3 font-semibold text-white transition-all duration-300 hover:from-primary-600 hover:to-primary-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay {formatPrice(selectedPrice)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 text-center sm:p-6 [-webkit-overflow-scrolling:touch]">
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
                  {paymentDetails?.backendConfirmationPending ? 'Payment Received!' : 'Booking Confirmed!'}
                </h3>
                <p className="text-gray-300">
                  {paymentDetails?.backendConfirmationPending
                    ? `Your payment was successful. Our backend is confirming your booking and sending the confirmation email to ${bookingForm.email}.`
                    : typeof selectedPrice === 'number'
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
                    <span className="text-white">{formatEventDate(event.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-green-400">
                      {formatPrice(selectedPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-white mb-1">
                      {paymentDetails?.backendConfirmationPending ? 'Email handled by backend' : 'Check your email'}
                    </p>
                    <p>
                      {paymentDetails?.backendConfirmationPending
                        ? 'Razorpay webhook processing sends your confirmation email automatically after payment capture.'
                        : "We've sent a detailed confirmation with event information and your ticket details to your email address."}
                    </p>
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

            </div>
            <div className={formActionsClassName}>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 py-3 font-semibold text-white transition-all duration-300 hover:from-primary-600 hover:to-primary-500"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
      {mounted && createPortal(bookingModal, document.body)}
    </>
  );
};

export default BookingModal;
