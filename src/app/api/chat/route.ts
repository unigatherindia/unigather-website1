import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const FAQ_ENTRIES = [
  {
    q: 'What is Unigather?',
    a: 'Unigather is a platform to discover and join curated events to build meaningful connections.'
  },
  {
    q: 'How do I join an event?',
    a: 'Sign up, browse events on the Events page, and follow the booking instructions on the event details page.'
  },
  {
    q: 'What is the refund policy?',
    a: 'Please review our Refund Policy on the Legal section; refunds are handled per the policy terms.'
  },
  {
    q: 'How can I contact support?',
    a: 'Use the Contact page to send us a message, or email support@unigather.in.'
  },
];

const SYSTEM_PROMPT = `You are Unigather's helpful assistant. Answer ONLY using the provided FAQ entries. 
If the answer is not clearly covered, say you don't have that information and suggest contacting support or visiting the Contact page. Be concise.`;

type ChatRequest = {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration: OPENAI_API_KEY missing' }, { status: 500 });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userMessage = (body.message || '').toString().trim();
  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const faqText = FAQ_ENTRIES.map((e, i) => `Q${i + 1}: ${e.q}\nA${i + 1}: ${e.a}`).join('\n\n');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Here are the FAQs:\n\n${faqText}\n\nUser question: ${userMessage}` },
  ];

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'OpenAI request failed', detail: err }, { status: 502 });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "I don't have that information. Please contact support via the Contact page.";
    return NextResponse.json({ reply: content });
  } catch (e: any) {
    return NextResponse.json({ error: 'Chat service error', detail: e?.message || 'unknown' }, { status: 500 });
  }
}


