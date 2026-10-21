'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, CreditCard, Loader2, Mail, Phone, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { toRazorpayAscii } from '@/lib/razorpayUtf8';
import { formatEventPrice } from '@/lib/formatPrice';
import { collection, addDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { GENDER_PREFERENCE_OPTIONS, ONE_ON_ONE_MEETUP_COLLECTION } from '@/constants/meetup-options';
import { ONE_ON_ONE_MEETUP_LABEL } from '@/constants/beyond-hellos-copy';
import { isTicketSoldOut } from '@/lib/ticket-price-utils';
import {
  getBeyondHellosTicketLabel,
  getBeyondHellosTicketPriceNumeric,
  getBeyondHellosTicketPriceRaw,
  isBeyondHellosTicketListed,
  isBeyondHellosTicketPayable,
  type BeyondHellosConfig,
  type BeyondHellosTicketType,
} from '@/types/beyond-hellos';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Ignore popstate from modal cleanup `history.back()` (e.g. React Strict Mode remount). */
let meetupBookingModalProgrammaticBackPending = 0;

type Props = {
  config: BeyondHellosConfig;
  onClose: () => void;
};

type FormState = {
  name: string;
  age: string;
  email: string;
  phone: string;
  ticketType: BeyondHellosTicketType;
  genderPreference: string;
  hobbies: string;
  city: string;
  terms: boolean;
};

const initialForm: FormState = {
  name: '',
  age: '',
  email: '',
  phone: '',
  ticketType: 'male',
  genderPreference: '',
  hobbies: '',
  city: '',
  terms: false,
};

export default function BeyondHellosBookingModal({ config, onClose }: Props) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [leadDocId, setLeadDocId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    bookingId: string;
    paymentId: string;
    emailSent?: boolean;
    textPriceOnly?: boolean;
    priceLabel?: string;
  } | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(step);
  const onCloseRef = useRef(onClose);
  const closedFromPopstateRef = useRef(false);

  stepRef.current = step;
  onCloseRef.current = onClose;

  const currency = config.currency;
  const rawTicketPrice = useMemo(
    () => getBeyondHellosTicketPriceRaw(config, form.ticketType),
    [config, form.ticketType]
  );
  const totalAmount = useMemo(
    () => getBeyondHellosTicketPriceNumeric(config, form.ticketType),
    [config, form.ticketType]
  );
  const ticketLabel = getBeyondHellosTicketLabel(form.ticketType);
  const ticketPriceDisplay = formatEventPrice(rawTicketPrice, currency);
  const isSelectedSoldOut = isTicketSoldOut(rawTicketPrice);

  useEffect(() => setMounted(true), []);

  // Hardware / browser back: close modal or previous step — stay on /one-on-one-meetup.
  useEffect(() => {
    const pushModalState = () => {
      window.history.pushState({ meetupBookingModal: true }, '');
    };

    pushModalState();

    const handlePopState = () => {
      if (meetupBookingModalProgrammaticBackPending > 0) {
        meetupBookingModalProgrammaticBackPending--;
        return;
      }

      if (stepRef.current > 1) {
        setStep((current) => Math.max(1, current - 1));
        pushModalState();
        return;
      }

      closedFromPopstateRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (!closedFromPopstateRef.current) {
        meetupBookingModalProgrammaticBackPending++;
        window.history.back();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const available: BeyondHellosTicketType[] = [];
    if (isBeyondHellosTicketListed(config, 'male')) available.push('male');
    if (isBeyondHellosTicketListed(config, 'female')) available.push('female');
    if (available.length === 0) return;
    if (!available.includes(form.ticketType)) {
      setForm((prev) => ({ ...prev, ticketType: available[0] }));
    }
  }, [config, form.ticketType]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      html.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startRetryCountdown = (seconds: number) => {
    const safe = Math.max(1, Math.ceil(seconds));
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    setRetrySeconds(safe);
    retryIntervalRef.current = setInterval(() => {
      setRetrySeconds((prev) => {
        if (prev <= 1) {
          if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    const ageNum = parseInt(form.age, 10);
    if (!form.age.trim() || Number.isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      toast.error('Please enter a valid age (18–120)');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(form.phone.trim())) {
      toast.error('Phone must include country code, e.g. +919876543210');
      return false;
    }
    if (!isBeyondHellosTicketListed(config, form.ticketType)) {
      toast.error(`${ticketLabel} is not available. Please select another option.`);
      return false;
    }
    if (isSelectedSoldOut) {
      toast.error(`${ticketLabel} is sold out. Please select another option.`);
      return false;
    }
    if (!form.genderPreference) {
      toast.error('Please select your gender preference');
      return false;
    }
    if (!form.hobbies.trim()) {
      toast.error('Please enter your hobbies');
      return false;
    }
    if (!form.city.trim()) {
      toast.error('Please enter the city you live in');
      return false;
    }
    if (!form.terms) {
      toast.error('Please accept the terms to continue');
      return false;
    }
    return true;
  };

  const saveLead = async (status: string) => {
    if (!db) throw new Error('Database unavailable');
    const ageNum = parseInt(form.age, 10);
    const contactInfo = `${form.phone.trim()} · ${form.email.trim()}`;
    const payload = {
      name: form.name.trim(),
      age: ageNum,
      contactInfo,
      customerEmail: form.email.trim(),
      customerPhone: form.phone.trim(),
      gender: form.ticketType,
      ticketType: form.ticketType,
      ticketLabel,
      genderPreference: form.genderPreference,
      hobbies: form.hobbies.trim(),
      city: form.city.trim(),
      location: form.city.trim(),
      amountQuoted: totalAmount ?? ticketPriceDisplay,
      priceDisplay: ticketPriceDisplay,
      paymentRequired: totalAmount !== undefined,
      currency,
      program: 'beyond_hellos',
      status,
      source: 'beyond_hellos_checkout',
      userId: user?.uid || null,
      updatedAt: Timestamp.now(),
    };

    if (leadDocId) {
      await updateDoc(doc(db, ONE_ON_ONE_MEETUP_COLLECTION, leadDocId), payload);
      return leadDocId;
    }
    const ref = await addDoc(collection(db, ONE_ON_ONE_MEETUP_COLLECTION), {
      ...payload,
      createdAt: Timestamp.now(),
    });
    setLeadDocId(ref.id);
    return ref.id;
  };

  const handleTextPriceBooking = async (leadId: string) => {
    if (!db) return;
    const bookingId = `BH${Date.now().toString().slice(-8)}`;
    await updateDoc(doc(db, ONE_ON_ONE_MEETUP_COLLECTION, leadId), {
      status: 'text_price_submitted',
      bookingId,
      updatedAt: Timestamp.now(),
    });
    setPaymentDetails({
      bookingId,
      paymentId: 'N/A',
      textPriceOnly: true,
      priceLabel: ticketPriceDisplay,
    });
    setStep(3);
    toast.success('Details received! Our team will contact you to complete booking.');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const leadId = await saveLead('payment_not_started');
      if (isBeyondHellosTicketPayable(config, form.ticketType) && totalAmount !== undefined) {
        setStep(2);
      } else if (
        isBeyondHellosTicketListed(config, form.ticketType) &&
        !isSelectedSoldOut
      ) {
        await handleTextPriceBooking(leadId);
      } else {
        toast.error('No valid ticket price for this option.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save your details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (totalAmount === undefined) {
      toast.error('Online payment is not available for this ticket price.');
      return;
    }
    setIsLoading(true);
    try {
      const checkoutKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
      if (!checkoutKey) throw new Error('Payment is not configured. Contact support.');

      const ageNum = parseInt(form.age, 10);
      const orderResponse = await fetch('/api/razorpay/create-beyond-hellos-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingLeadId: leadDocId,
          customer: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          meetupDetails: {
            age: ageNum,
            city: form.city.trim(),
            hobbies: form.hobbies.trim(),
            genderPreference: form.genderPreference,
            ticketType: form.ticketType,
            contactInfo: `${form.phone.trim()} · ${form.email.trim()}`,
            scheduleNote: config.scheduleNote,
            duration: config.duration,
          },
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok || !orderData.success) {
        if (orderResponse.status === 409 && orderData.retryAfterSeconds) {
          startRetryCountdown(orderData.retryAfterSeconds);
          setIsLoading(false);
          return;
        }
        throw new Error(orderData.message || 'Failed to create order');
      }

      const options = {
        key: checkoutKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.companyName || 'Unigather',
        description: toRazorpayAscii(config.title, 250, 'Beyond Hellos'),
        order_id: orderData.orderId,
        theme: { color: orderData.themeColor || '#f97316' },
        prefill: {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const bookingId = orderData.bookingId || `UG${Date.now().toString().slice(-8)}`;
            const verifyResponse = await fetch('/api/razorpay/verify-beyond-hellos-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                internalOrderId: orderData.internalOrderId,
                bookingId,
                amount: totalAmount,
                currency,
              }),
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Verification failed');
            }

            setPaymentDetails({
              bookingId: verifyData.bookingId || bookingId,
              paymentId: response.razorpay_payment_id,
              emailSent: verifyData.emailSent === true,
            });
            setStep(3);
            toast.success(
              verifyData.emailSent !== false
                ? 'Booking confirmed! Check your email.'
                : 'Booking confirmed!'
            );
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast('Payment cancelled. You can try again when ready.', { icon: '↩️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setIsLoading(false);
      });
      rzp.open();
      setIsLoading(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment error');
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const inputClass =
    'w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto admin-panel-scroll bg-dark-800 border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-700 bg-dark-800/95 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-white">{config.title}</h2>
            <p className="text-xs text-gray-400">
              Step {step} of 3 · {ticketLabel} · {ticketPriceDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {step === 1 && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <p className="text-sm text-gray-400 mb-2">Tell us about yourself before payment.</p>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Name *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Age *</label>
                <input
                  type="number"
                  min={18}
                  max={120}
                  className={inputClass}
                  value={form.age}
                  onChange={(e) => setField('age', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    className={`${inputClass} pl-10`}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Phone (contact info) *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    className={`${inputClass} pl-10`}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+919876543210"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Your gender (ticket type) *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as const).map((type) => {
                    const listed = isBeyondHellosTicketListed(config, type);
                    const raw = getBeyondHellosTicketPriceRaw(config, type);
                    const soldOut = isTicketSoldOut(raw);
                    const selected = form.ticketType === type;
                    const label = getBeyondHellosTicketLabel(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={!listed || soldOut}
                        onClick={() => setField('ticketType', type)}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${
                          selected
                            ? 'border-primary-500 bg-primary-500/15 text-white'
                            : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
                        } ${!listed || soldOut ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className={type === 'male' ? 'text-blue-300' : 'text-pink-300'}>
                          {label}
                        </span>
                        <span className="block text-xs text-gray-400 mt-1">
                          {formatEventPrice(raw, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Gender preference *</label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={form.genderPreference}
                  onChange={(e) => setField('genderPreference', e.target.value)}
                >
                  <option value="">Select</option>
                  {GENDER_PREFERENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Hobbies *</label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.hobbies}
                  onChange={(e) => setField('hobbies', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">City you live in *</label>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => setField('terms', e.target.checked)}
                  className="mt-1 rounded border-gray-600"
                />
                <span>I agree to share these details with Unigather for matching and safety verification.</span>
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Continue to payment
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-dark-700 border border-gray-600 p-4 text-sm text-gray-300 space-y-2">
                <p>
                  <span className="text-gray-500">Name:</span> {form.name}
                </p>
                <p>
                  <span className="text-gray-500">City:</span> {form.city}
                </p>
                <p>
                  <span className="text-gray-500">Ticket:</span> {ticketLabel}
                </p>
                <p>
                  <span className="text-gray-500">Price:</span> {ticketPriceDisplay}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePayment}
                disabled={isLoading || retrySeconds > 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                {retrySeconds > 0 ? `Try again in ${retrySeconds}s` : 'Pay with Razorpay'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-400 hover:text-white"
              >
                ← Back to your details
              </button>
            </div>
          )}

          {step === 3 && paymentDetails && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {paymentDetails.textPriceOnly ? 'Details submitted!' : 'You&apos;re booked!'}
              </h3>
              <p className="text-gray-400 text-sm">
                Reference: <span className="text-white font-medium">{paymentDetails.bookingId}</span>
              </p>
              {paymentDetails.textPriceOnly ? (
                <p className="text-sm text-gray-300 max-w-sm mx-auto">
                  Ticket price: <strong>{paymentDetails.priceLabel}</strong>. Our team will contact you
                  at {form.email} or {form.phone} to confirm your {ONE_ON_ONE_MEETUP_LABEL}.
                </p>
              ) : paymentDetails.emailSent ? (
                <p className="text-sm text-primary-300">Confirmation email sent to {form.email}</p>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-dark-700 border border-gray-600 text-white hover:bg-dark-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
