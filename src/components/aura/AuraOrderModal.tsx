'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Check,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { INDIAN_STATES_AND_UTS } from '@/constants/indian-states';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { toRazorpayAscii } from '@/lib/razorpayUtf8';
import { DEFAULT_CURRENCY } from '@/constants/countries';
import { formatEventPrice } from '@/lib/formatPrice';
import { collection, addDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import type { AuraProduct } from '@/types/aura-product';
import { createCustomerBookingConfirmation, type WhatsAppBookingDetails } from '@/lib/whatsapp';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AuraOrderModalProps {
  product: AuraProduct;
  onClose: () => void;
}

interface OrderForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  quantity: string;
  terms: boolean;
}

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Confirmed' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] tracking-[0.28em] uppercase text-gray-500 mb-2">{children}</span>
  );
}

const AuraOrderModal: React.FC<AuraOrderModalProps> = ({ product, onClose }) => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [leadDocId, setLeadDocId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    paymentId: string;
    bookingId: string;
    emailSent?: boolean;
  } | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(0);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currency = product.currency || DEFAULT_CURRENCY;

  const [form, setForm] = useState<OrderForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    quantity: '1',
    terms: false,
  });

  const unitPrice =
    typeof product.price === 'number'
      ? product.price
      : Number(String(product.price).replace(/[₹,\s]/g, '')) || 0;
  const quantityNum = Math.min(10, Math.max(1, Number(form.quantity) || 1));
  const totalAmount = unitPrice * quantityNum;

  useEffect(() => setMounted(true), []);

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
    html.dataset.modalOpen = 'true';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      delete html.dataset.modalOpen;
      html.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

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
    const required: (keyof OrderForm)[] = [
      'name',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
    ];
    const fieldLabels: Partial<Record<keyof OrderForm, string>> = {
      name: 'your full name',
      email: 'your email',
      phone: 'your mobile number',
      address: 'your street address',
      city: 'your city',
      state: 'your state',
      pincode: 'your PIN code',
    };
    for (const field of required) {
      if (!form[field]) {
        toast.error(`Please enter ${fieldLabels[field] ?? field}`);
        return false;
      }
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      toast.error('Enter a valid 6-digit PIN code');
      return false;
    }
    if (!form.terms) {
      toast.error('Please confirm the non-refundable product agreement');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Enter a valid email');
      return false;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(form.phone)) {
      toast.error('Phone must include country code, e.g. +919876543210');
      return false;
    }
    return true;
  };

  const saveLead = async (status: string) => {
    if (!db) throw new Error('Database unavailable');
    const payload = {
      productId: product.id,
      productTitle: product.title,
      quantity: quantityNum,
      amountQuoted: totalAmount,
      currency,
      customerName: form.name,
      customerEmail: form.email,
      customerPhone: form.phone,
      shippingAddress: form.address,
      shippingCity: form.city,
      shippingState: form.state,
      shippingPincode: form.pincode,
      status,
      source: 'aura_checkout',
      userId: user?.uid || null,
      updatedAt: Timestamp.now(),
    };

    if (leadDocId) {
      await updateDoc(doc(db, 'auraProductLeads', leadDocId), payload);
      return leadDocId;
    }
    const ref = await addDoc(collection(db, 'auraProductLeads'), {
      ...payload,
      createdAt: Timestamp.now(),
    });
    setLeadDocId(ref.id);
    return ref.id;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (unitPrice <= 0) {
      toast.error('Product price is not available for online payment.');
      return;
    }
    setIsLoading(true);
    try {
      await saveLead('payment_not_started');
      setStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const checkoutKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
      if (!checkoutKey) throw new Error('Payment is not configured. Contact support.');

      const orderResponse = await fetch('/api/razorpay/create-aura-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          bookingLeadId: leadDocId,
          customer: { name: form.name, email: form.email, phone: form.phone },
          shippingDetails: {
            address: form.address,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            quantity: quantityNum,
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
        name: orderData.companyName || 'Unigather Fragrance',
        description: toRazorpayAscii(product.title, 250, 'Aura order'),
        order_id: orderData.orderId,
        theme: { color: orderData.themeColor || '#D4AF37' },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const bookingId = orderData.bookingId || `UG${Date.now().toString().slice(-8)}`;
            const verifyResponse = await fetch('/api/razorpay/verify-aura-payment', {
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

            const confirmedId = verifyData.bookingId || bookingId;
            setPaymentDetails({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              bookingId: confirmedId,
              emailSent: verifyData.emailSent === true,
            });

            const wa: WhatsAppBookingDetails = {
              bookingId: confirmedId,
              paymentId: response.razorpay_payment_id,
              customerName: form.name,
              eventTitle: product.title,
              eventDate: 'Fragrance order',
              eventTime: '',
              eventLocation: `${form.city}, ${form.state}`,
              amount: totalAmount,
              ticketType: `${quantityNum} × ${product.title}`,
            };
            setWhatsAppUrl(createCustomerBookingConfirmation(wa));
            setStep(3);
            toast.success(
              verifyData.emailSent !== false
                ? 'Order confirmed! Check your email.'
                : 'Order confirmed!'
            );
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => setIsLoading(false),
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

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 isolation-isolate">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[94vh] flex flex-col aura-modal-shell rounded-t-2xl sm:rounded-sm overflow-hidden pt-safe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aura-checkout-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-[max(0.625rem,env(safe-area-inset-top,0px))] sm:right-5 sm:top-4 z-[60] grid h-12 w-12 min-h-[48px] min-w-[48px] place-items-center rounded-full border-2 border-[#D4AF37] bg-[#1a1a1a] p-0 text-white shadow-lg transition-colors touch-manipulation hover:border-[#FFD700] hover:bg-black"
          aria-label="Close checkout"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute left-1/2 top-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {/* Header */}
        <div className="shrink-0 relative px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/5">
          <div className="flex items-start gap-3 sm:gap-4 pr-14 sm:pr-16 pt-1">
            <div className="w-12 h-16 sm:w-16 sm:h-20 shrink-0 overflow-hidden ring-1 ring-aura-gold/25">
              <img src={product.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] tracking-[0.2em] sm:tracking-[0.35em] uppercase text-aura-gold/80 mb-1">
                Private checkout
              </p>
              <h2 id="aura-checkout-title" className="font-aura-display text-xl sm:text-3xl text-white break-words leading-tight">
                {product.title}
              </h2>
              {product.volume && (
                <p className="text-gray-500 text-sm mt-1">{product.volume} · unigather Fragrance</p>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 mt-4 sm:mt-6">
            {STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                    step >= s.id
                      ? 'border-aura-gold/60 bg-aura-gold/15 text-aura-gold-light'
                      : 'border-white/10 text-gray-600'
                  }`}
                >
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] tracking-wide uppercase truncate max-w-full px-0.5 ${
                    step >= s.id ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto admin-panel-scroll overscroll-contain px-4 sm:px-8 py-4 sm:py-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                id="aura-checkout-form"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onSubmit={handleFormSubmit}
                className="space-y-6 sm:space-y-8 pb-2"
              >
                <div className="aura-price-plaque rounded-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-gray-500">Order total</p>
                    <p className="font-aura-display text-2xl gradient-text-aura mt-1">
                      {formatEventPrice(totalAmount, currency)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {quantityNum} × {formatEventPrice(unitPrice, currency)}
                  </p>
                </div>

                <div className="space-y-5">
                  <p className="text-[11px] tracking-[0.3em] uppercase text-aura-gold/90">Your details</p>
                  {(
                    [
                      { key: 'name' as const, label: 'Full name', icon: User, type: 'text' },
                      { key: 'email' as const, label: 'Email address', icon: Mail, type: 'email' },
                      {
                        key: 'phone' as const,
                        label: 'WhatsApp / mobile',
                        icon: Phone,
                        type: 'tel',
                        hint: 'Include country code, e.g. +91…',
                      },
                    ] as const
                  ).map(({ key, label, icon: Icon, type, ...rest }) => (
                    <div key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <div className="aura-field rounded-sm flex items-center gap-3 px-4 py-3">
                        <Icon className="w-4 h-4 text-aura-gold/50 shrink-0" strokeWidth={1.5} />
                        <input
                          type={type}
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="flex-1 min-w-0 text-white aura-touch-input placeholder:text-gray-600"
                          placeholder={'hint' in rest ? rest.hint : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  <p className="text-[11px] tracking-[0.3em] uppercase text-aura-gold/90">Delivery</p>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <div className="aura-field rounded-sm px-4 py-3 relative">
                      <select
                        value={form.state}
                        onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                        className={`w-full pr-8 aura-touch-input bg-transparent appearance-none cursor-pointer ${
                          form.state ? 'text-white' : 'text-gray-500'
                        }`}
                        required
                      >
                        <option value="" disabled className="bg-dark-900 text-gray-500">
                          Select your state
                        </option>
                        {INDIAN_STATES_AND_UTS.map((stateName) => (
                          <option key={stateName} value={stateName} className="bg-dark-900 text-white">
                            {stateName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-gold/50"
                        aria-hidden
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <div className="aura-field rounded-sm px-4 py-3">
                        <input
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          className="w-full text-white aura-touch-input placeholder:text-gray-600"
                          placeholder="City or town"
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>PIN code</FieldLabel>
                      <div className="aura-field rounded-sm px-4 py-3">
                        <input
                          value={form.pincode}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                            }))
                          }
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          className="w-full text-white aura-touch-input placeholder:text-gray-600"
                          placeholder="6-digit PIN"
                          autoComplete="postal-code"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Street address</FieldLabel>
                    <div className="aura-field rounded-sm flex gap-3 px-4 py-3">
                      <MapPin className="w-4 h-4 text-aura-gold/50 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <textarea
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        rows={2}
                        className="flex-1 text-white aura-touch-input placeholder:text-gray-600 resize-none min-h-[72px]"
                        placeholder="House no., street, landmark, area"
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                  <div className="max-w-[10rem]">
                    <FieldLabel>Quantity</FieldLabel>
                    <div className="aura-field rounded-sm px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                        className="w-full text-white aura-touch-input"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group touch-manipulation">
                  <input
                    type="checkbox"
                    checked={form.terms}
                    onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))}
                    className="mt-1 w-5 h-5 shrink-0 rounded border-gray-600 bg-transparent text-aura-gold focus:ring-aura-gold/30"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                    I agree that the product you are buying is not refundable.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="hidden sm:block w-full min-h-[48px] py-3.5 rounded-sm aura-brush-btn text-sm disabled:opacity-50 touch-manipulation"
                >
                  {isLoading ? 'Saving…' : 'Continue to payment'}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-6 sm:space-y-8 pb-2"
              >
                <div className="aura-price-plaque rounded-sm p-4 sm:p-6 space-y-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gray-500">Review</p>
                  <p className="font-aura-display text-xl text-white">
                    {quantityNum} × {product.title}
                  </p>
                  <p className="font-aura-display text-3xl gradient-text-aura">
                    {formatEventPrice(totalAmount, currency)}
                  </p>
                  <div className="pt-3 border-t border-white/5 text-sm text-gray-500 space-y-1">
                    <p>{form.name}</p>
                    <p>{form.email}</p>
                    <p>{form.phone}</p>
                    <p className="pt-2 text-gray-400">
                      {form.address}, {form.city}, {form.state} {form.pincode}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-aura-gold/60 shrink-0 mt-0.5" />
                  <p>Payments are processed securely via Razorpay. You will receive a confirmation email after payment.</p>
                </div>

                <div className="hidden sm:flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="sm:order-1 flex-1 min-h-[48px] py-3 text-sm text-gray-400 border border-white/10 hover:border-aura-gold/25 hover:text-gray-200 transition-colors rounded-sm touch-manipulation"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={isLoading || retrySeconds > 0}
                    className="sm:order-2 flex-[1.2] min-h-[48px] py-3.5 rounded-sm aura-brush-btn flex items-center justify-center gap-2 text-sm disabled:opacity-50 touch-manipulation"
                  >
                    <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                    {retrySeconds > 0
                      ? `Retry in ${retrySeconds}s`
                      : isLoading
                        ? 'Opening checkout…'
                        : 'Pay securely'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && paymentDetails && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 sm:py-10 space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full border border-aura-gold/30 bg-aura-gold/10 flex items-center justify-center">
                  <Check className="w-9 h-9 text-aura-gold" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-aura-display text-2xl text-white mb-2">Thank you</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Your aura is on its way. A confirmation has been sent to your email.
                  </p>
                </div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-aura-gold/80">
                  Order {paymentDetails.bookingId}
                </p>
                {paymentDetails.emailSent === false && (
                  <p className="text-amber-400/90 text-xs flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Email may be delayed — please save your order ID.
                  </p>
                )}
                {whatsAppUrl && (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-2.5 text-sm border border-aura-gold/30 text-aura-gold-light hover:bg-aura-gold/5 transition-colors rounded-sm"
                  >
                    Save on WhatsApp
                  </a>
                )}
                <button type="button" onClick={onClose} className="w-full max-w-xs mx-auto py-3.5 rounded-sm aura-brush-btn text-sm">
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile sticky actions (safe area) */}
        {step === 1 && (
          <div className="shrink-0 sm:hidden border-t border-white/10 bg-black/95 backdrop-blur-md px-4 pt-3 pb-safe">
            <button
              type="submit"
              form="aura-checkout-form"
              disabled={isLoading}
              className="w-full min-h-[48px] py-3.5 rounded-sm aura-brush-btn text-sm disabled:opacity-50 touch-manipulation"
            >
              {isLoading ? 'Saving…' : 'Continue to payment'}
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="shrink-0 sm:hidden border-t border-white/10 bg-black/95 backdrop-blur-md px-4 pt-3 pb-safe flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 min-h-[48px] py-3 text-sm text-gray-400 border border-white/10 rounded-sm touch-manipulation"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handlePayment}
              disabled={isLoading || retrySeconds > 0}
              className="flex-[1.4] min-h-[48px] py-3 rounded-sm aura-brush-btn text-xs sm:text-sm disabled:opacity-50 touch-manipulation"
            >
              {retrySeconds > 0 ? `${retrySeconds}s` : isLoading ? '…' : 'Pay securely'}
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="shrink-0 sm:hidden border-t border-white/10 px-4 pt-3 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] py-3.5 rounded-sm aura-brush-btn text-sm touch-manipulation"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default AuraOrderModal;
