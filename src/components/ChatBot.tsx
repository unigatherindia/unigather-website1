'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am the Unigather assistant. Ask me about events, refunds, or how to get started.',
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const suggestions = [
    'How do I join an event?',
    'What is your refund policy?',
    'What is Unigather?',
    'How to contact support?',
  ];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply = data?.reply || "Sorry, I couldn't get that right now.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
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
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="p-3 border-b border-gray-700 bg-dark-900/50">
              <div className="text-xs text-gray-400 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 text-xs rounded-full bg-dark-700 hover:bg-dark-600 border border-gray-600 text-gray-200"
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
          <div className="border-t border-gray-700 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder="Ask about events, refunds, getting started..."
                className="flex-1 px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                onClick={send}
                disabled={loading}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500 text-white disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;


