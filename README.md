# Unigather Chat Assistant (Quick Setup)

## Environment

Create `.env.local` in the project root and add:

```
OPENAI_API_KEY=your_openai_api_key
```

## What was added
- API: `src/app/api/chat/route.ts` – calls OpenAI and answers strictly from Unigather FAQ.
- UI: `src/components/ChatBot.tsx` – floating widget on the home page.
- Wired on home: `src/app/page.tsx` imports `<ChatBot />`.

## Usage
- Go to the home page. Click the chat bubble in the bottom-right.
- Ask about Unigather, events, refund policy, or getting started.

## Editing FAQs
- Update the `FAQ_ENTRIES` array in `src/app/api/chat/route.ts` to refine or expand allowed answers.

## Notes
- The assistant is restricted to the FAQ. If an answer is not present, it will suggest contacting support.


## Project Structure

```
src/
├── app/
│   ├── about/          # About page
│   ├── contact/        # Contact page
│   ├── events/         # Events page
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage
├── components/
│   ├── events/         # Event-related components
│   ├── home/           # Homepage sections
│   ├── Footer.tsx      # Footer component
│   ├── Header.tsx      # Header component
│   └── Layout.tsx      # Page layout wrapper
└── public/
    └── media/          # Images and media files
```



## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications


"# unigather-website1111" 
