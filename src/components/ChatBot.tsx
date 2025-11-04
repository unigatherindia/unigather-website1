'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am the Unigather assistant.',
    },
  ]);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement | null>(null);

  const suggestions = [
    'How do I join an event?',
    'What is your refund policy?',
    'What is Unigather?',
    'How to contact support?',
  ];

  // Find which suggestion matches the user's message
  const findMatchingSuggestion = (msg: string): string | null => {
    const msgLower = msg.toLowerCase().trim();
    for (const suggestion of suggestions) {
      const suggestionLower = suggestion.toLowerCase().trim();
      // Check for exact match or if the message contains the suggestion text
      if (msgLower === suggestionLower || 
          msgLower.includes(suggestionLower) || 
          suggestionLower.includes(msgLower)) {
        return suggestion;
      }
    }
    // Also check for intent-based matching
    if (/(how .*join.*event|join our events|events|event|join an event)/i.test(msgLower)) {
      return 'How do I join an event?';
    } else if (/(refund policy|refunds|refund|cancel.*refund|postpone.*refund)/i.test(msgLower)) {
      return 'What is your refund policy?';
    } else if (/(what is unigather|about unigather|who are you)/i.test(msgLower)) {
      return 'What is Unigather?';
    } else if (/(contact support|support|help.*contact|reach you|contact us|email us|call us|whatsapp)/i.test(msgLower)) {
      return 'How to contact support?';
    }
    return null;
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const processMessage = async (msg: string) => {
    if (!msg.trim() || loading) return;
    
    // Check if this message matches a predefined suggestion
    const matchingSuggestion = findMatchingSuggestion(msg);
    if (matchingSuggestion) {
      setAskedQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.add(matchingSuggestion);
        return newSet;
      });
    }
    
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    
    try {
      // Simple intent matching for common FAQs
      const lower = msg.toLowerCase();
      let canned: string | null = null;
      if (/(how .*join.*event|join our events|events|event|join an event)/i.test(lower)) {
        canned =
          'Visit our website and locate the "Join Our Events" thumbnail.\n\n' +
          'Open the events page and browse the events listed.\n\n' +
          'Select the event you want to join.\n\n' +
          'Complete the booking to secure your spot.';
      } else if (/(refund policy|refunds|refund|cancel.*refund|postpone.*refund)/i.test(lower)) {
        canned =
          "Unigather's refund policy is simple: Tickets are non-refundable if you can't attend, but you can join any upcoming event instead. If an event is canceled or postponed, you can get a refund within 24 hours by emailing unigatherindia@gmail.com.";
      } else if (/(what is unigather|about unigather|who are you)/i.test(lower)) {
        canned =
          "We're a passionate community dedicated to creating meaningful connections between strangers. Through carefully crafted events and activities, we transform awkward first meetings into lasting friendships.";
      } else if (/(contact support|support|help.*contact|reach you|contact us|email us|call us|whatsapp)/i.test(lower)) {
        canned =
          'You can contact Unigather by emailing unigatherindia@gmail.com or WhatsApp at +91 7901751593. We try to respond within 24 hours. For urgent matters, please message us on WhatsApp first before calling.';
      }

      if (canned) {
        setMessages((prev) => [...prev, { role: 'assistant', content: canned as string }]);
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        const reply = data?.reply || "Sorry, I couldn't get that right now.";
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'There was an error. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      {!open && (
        <button
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white p-4 shadow-lg ring-2 ring-primary-500/30"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(92vw,380px)] bg-dark-800/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gradient-to-r from-dark-900 to-dark-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 flex items-center justify-center text-white text-xs">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="font-semibold">Unigather Assistant</div>
            </div>
            <button 
              onClick={() => {
                setOpen(false);
                // Reset asked questions when closing chat
                setAskedQuestions(new Set());
              }} 
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Suggestions - Show only unasked questions */}
          {suggestions.filter(s => !askedQuestions.has(s)).length > 0 && (
            <div className="p-3 border-b border-gray-700 bg-dark-900/50">
              <div className="text-xs text-gray-400 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter(s => !askedQuestions.has(s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        processMessage(s);
                      }}
                      className="px-3 py-1.5 text-xs rounded-full bg-dark-700 hover:bg-dark-600 border border-gray-600 text-gray-200 hover:border-primary-500 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div ref={listRef} className="max-h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 text-xs">U</div>
                )}
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[75%] px-3 py-2 rounded-2xl bg-primary-500 text-white shadow'
                      : 'max-w-[75%] px-3 py-2 rounded-2xl bg-dark-700 text-gray-200 border border-gray-600 shadow'
                  }
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-dark-700 border border-gray-600 flex items-center justify-center text-gray-300 text-xs">You</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 text-xs">U</div>
                <div className="px-3 py-2 rounded-2xl bg-dark-700 text-gray-200 border border-gray-600 opacity-90">
                  Typing...
                </div>
              </div>
            )}
          </div>
          {suggestions.filter(s => !askedQuestions.has(s)).length === 0 && (
            <div className="border-t border-gray-700 p-4 text-center">
              <p className="text-sm text-gray-400">
                All questions have been answered. Close and reopen the chat to ask questions again.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;


