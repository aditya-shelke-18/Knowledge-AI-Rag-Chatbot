# Knowledge AI — RAG Chatbot Generator

A full-featured **Retrieval-Augmented Generation (RAG)** chatbot platform built with the Vercel AI SDK. Upload documents or scrape websites, then chat with your knowledge base — the AI answers **strictly from your content**, never from general knowledge.

---

## Features

- 📁 **File Upload** — Upload PDF, DOCX, XLSX, CSV, TXT, and Markdown files
- 🌐 **Website Scraping** — Add any public URL and the AI will extract and index its content
- 🤖 **Multi-Chatbot Dashboard** — Create multiple isolated chatbots, each with its own knowledge base
- 🔍 **Semantic Search** — OpenAI embeddings + pgvector cosine similarity to find relevant content
- 💬 **RAG Chat** — AI answers only from your documents/websites and cites sources
- 🧩 **Embeddable Widget** — Embed any chatbot on your website with a single `<script>` tag
- 💾 **Conversation History** — Chats are saved to the database and restored on reload
- 🔒 **Authentication** — Email/password, Google OAuth, and GitHub OAuth via NextAuth
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop
- 🤝 **Friendly Fallbacks** — Warm, helpful responses when the AI doesn't have relevant information

---

## Required Tools & Packages

- **[Next.js](https://nextjs.org) 14** (App Router)
- **[Vercel AI SDK](https://sdk.vercel.ai/docs) v5**
- **[OpenAI API](https://openai.com)** — `gpt-4o-mini` and `text-embedding-ada-002`
- **[Drizzle ORM](https://orm.drizzle.team)**
- **[PostgreSQL](https://postgresql.org)** with pgvector — e.g. [Neon](https://neon.tech), Supabase
- **[NextAuth.js](https://next-auth.js.org)** — authentication
- **[shadcn-ui](https://ui.shadcn.com)** & **[TailwindCSS](https://tailwindcss.com)**

### Prerequisites

1. **Node.js** v18+ and **npm** installed
2. A valid **OpenAI API Key**
3. A **PostgreSQL database URL** with pgvector enabled (e.g. Neon)
4. *(Optional)* Google and GitHub OAuth app credentials for social login

---

## Quick Start

### 1. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure environment
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
OPENAI_API_KEY=sk-your-openai-api-key

NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Optional — for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional — for GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Setup the database
```bash
npm run db:generate
npm run db:migrate
```

### 4. Run the project
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

### Upload Flow
1. User uploads a file or pastes a website URL
2. Text is extracted (PDF via `pdf-parse`, DOCX via `mammoth`, XLSX/CSV via `xlsx`, websites via HTML stripping)
3. Text is split into overlapping chunks (~800 chars, ~150 char overlap)
4. Each chunk is embedded using `text-embedding-ada-002` and stored in the `embeddings` table, scoped to the user and chatbot

### Website Scraping Flow
1. User pastes a URL in the Docs tab of a chatbot
2. The server fetches the page, strips scripts/styles/nav/footer HTML
3. Clean text is chunked and embedded — same pipeline as file uploads
4. The hostname is stored as the source name for citations

### Chat Flow
1. User sends a message
2. AI calls `getInformation` tool with the user's question
3. `getInformation` embeds the question, runs cosine similarity search (threshold: 0.4), returns top matching chunks with source names
4. AI synthesizes an answer, cites the source, and streams the response
5. If no relevant content is found, the AI responds warmly and suggests alternatives

### Multi-Chatbot Flow
1. Create a chatbot from the Dashboard with a custom name, color, and welcome message
2. Upload documents or scrape URLs scoped to that chatbot
3. Each chatbot has an isolated knowledge base — documents don't bleed between bots
4. Copy the embed snippet and paste it into any website

---

## Supported File Types

| Extension | Type |
|---|---|
| `.pdf` | PDF document |
| `.docx` / `.doc` | Word document |
| `.xlsx` / `.xls` | Excel spreadsheet |
| `.csv` | CSV file |
| `.txt` | Plain text |
| `.md` | Markdown |
| Any public URL | Website (scraped) |

---

## Database Scripts

| Command | Description |
|---|---|
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:push` | Push schema changes directly (no migration files) |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:check` | Check migration consistency |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Streaming RAG chat endpoint
│   │   ├── upload/route.ts         # File upload, extraction, and embedding
│   │   ├── scrape/route.ts         # Website URL scraping and embedding
│   │   ├── files/route.ts          # List and delete uploaded files
│   │   ├── chatbots/route.ts       # CRUD for chatbots
│   │   ├── conversations/          # Conversation history (list, get, save, delete)
│   │   └── widget/[apiKey]/        # Public widget API (CORS-enabled)
│   ├── dashboard/page.tsx          # Multi-chatbot management dashboard
│   ├── chat/page.tsx               # Personal RAG chat UI
│   └── login/page.tsx              # Auth page (email + OAuth)
├── lib/
│   ├── ai/
│   │   └── embedding.ts            # Embedding generation and similarity search
│   ├── actions/
│   │   └── resources.ts            # Server action to create resources and embeddings
│   └── db/
│       ├── schema/
│       │   ├── files.ts            # Files table (uploads + scraped URLs)
│       │   ├── resources.ts        # Resources table
│       │   ├── embeddings.ts       # Embeddings table (pgvector)
│       │   ├── chatbots.ts         # Chatbots table
│       │   └── conversations.ts    # Conversations table
│       ├── index.ts                # Drizzle DB client
│       └── migrate.ts              # Migration runner
├── vercel.json                     # Vercel install command override
├── next.config.mjs                 # serverExternalPackages config
└── .npmrc                          # frozen-lockfile=false for CI
```
