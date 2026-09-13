# ⚡ FuelUp — AI Fitness Recipe Assistant

FuelUp is a full-stack web app that generates personalized, macro-aware recipes using AI.
It's built for athletes and gymrats who are bored of eating the same meals on repeat.

**🔗 Live app:** https://super-chef-one.vercel.app/

## Features

- 🍳 **Ingredient-based recipes** — type what's in your fridge, pick a mood (Quick, High Protein, Sweet, Savoury, Spicy, Unique) and a cooking method, and get AI-generated recipes with full macros
- 🎯 **Macro Goals** — set a calorie range, minimum protein, and preferred protein sources (chicken, tofu, eggs, etc.) for a specific meal, and get recipes built to hit those exact targets
- 🤖 **Conversational AI chat** — an ai with full chat memory, so you can ask for ideas, pick one, and get the full recipe in context. Includes voice input (speech-to-text) and voice output (text-to-speech)
- ❤️ **Save & track recipes** — save your favourite recipes and mark recipes as tried/not tried
- 📱 **Responsive design** — sidebar navigation on desktop, bottom nav bar on mobile
- 🔒 **Secure by design** — API key is never exposed to the browser. It is stored as a Vercel environment variable and never exposed in frontend code.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla — no frameworks)
- **AI:** Groq API (Llama / GPT-OSS models)
- **Backend:** Vercel Serverless Functions (Node.js) — hides the API key
- **Browser APIs:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Storage:** localStorage for saved recipes
- **Deployment:** Vercel, connected to GitHub for auto-deploy whenever you make changes and push 

## How it works

1. User input (ingredients, filters, or a chat message) is sent to a backend endpoint (`/api/chat`)
2. The backend attaches the hidden API key and forwards the request to Groq
3. Groq's model returns either a natural chat reply or strict JSON (for recipe cards), which the frontend parses and renders dynamically
4. Prompt engineering controls tone, creativity, and format — e.g. forcing the AI to suggest genuinely unique dishes instead of generic meals, and to hold off on full recipes until the user picks one from a shortlist

## Running locally

```bash
git clone https://github.com/harsh-rk28/SuperChef.git
cd SuperChef
```

You'll need a Groq API key (free at [console.groq.com](https://console.groq.com)) set as an environment variable `GROQ_API_KEY` if running the `/api` function locally via Vercel CLI.

## Roadmap

- [ ] Hardcoded original recipes alongside AI-generated ones
- [ ] Video links (YouTube/TikTok) attached to recipes
- [ ] Drag-to-rank favourite recipes
- [ ] Supabase backend for cross-device sync
