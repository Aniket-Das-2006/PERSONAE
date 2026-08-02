# 🏛️ P E R S O N A E
### *The Living Archive of Reconstructed Minds*

```
 ____  _____ ____  ____   ___  _   _    _     _____ 
|  _ \| ____|  _ \/ ___| / _ \| \ | |  / \   | ____|
| |_) |  _| | |_) \___ \| | | |  \| | / _ \  |  _|  
|  __/| |___|  _ < ___) | |_| | |\  |/ ___ \ | |___ 
|_|   |_____|_| \_\____/ \___/|_| \_/_/   \_\|_____|

              T H E   L I V I N G   A R C H I V E
```

**PERSONAE** is an immersive conversational archive that hosts **208 reconstructed minds** from the documented historical record. This interface does not seek to resurrect; rather, it provides a structured reading room where you can consult, cross-examine, and reason alongside history's greatest thinkers.

---

## ✦ Key Dimensions

*   **Provenance, Not Disclaimers:** Every statement made by a reconstructed mind is annotated span-by-span, indicating what the historical record documents versus what the archive infers.
*   **Council Mode:** Summon three distinct minds to address a single query, observing where their philosophies align and where they clash.
*   **Constellation:** A dynamic visual temperament map placing all 208 minds within a shared universe of temperament and school of thought.
*   **Codex:** A complete, searchable directory to browse, filter, and inspect the credentials and signatures of the thinkers in residence.
*   **Reconstructive Editor:** Build and configure custom minds by defining their specific reasoning patterns, decision profiles, and logical constraints.
*   **Debates:** Orchestrate direct intellectual match-ups between thinkers on timeless philosophical and political conflicts.

---

## ✦ Technology Stack

The archive is engineered using a robust, highly performant frontend stack:

```
  ┌──────────────────────────────────────────────────────────┐
  │  Core Framework   │  React 19 + TypeScript               │
  ├───────────────────┼──────────────────────────────────────┤
  │  Routing System   │  TanStack Start & Router             │
  ├───────────────────┼──────────────────────────────────────┤
  │  Styling          │  Tailwind CSS v4 + Custom Theme      │
  ├───────────────────┼──────────────────────────────────────┤
  │  Database & Auth  │  Supabase                            │
  ├───────────────────┼──────────────────────────────────────┤
  │  Intelligence     │  Gemini API Client Integrations      │
  ├───────────────────┼──────────────────────────────────────┤
  │  Build Tooling    │  Vite & Bun                          │
  └──────────────────────────────────────────────────────────┘
```

---

## ✦ Local Development & Installation

Ensure you have [Node.js](https://nodejs.org) and [Bun](https://bun.sh/) (or `npm`) installed locally.

### 1. Clone the repository
```bash
git clone https://github.com/Aniket-Das-2006/PERSONAE.git
cd PERSONAE
```

### 2. Install dependencies
```bash
bun install
# or
npm install
```

### 3. Setup environment variables
Create a `.env` file at the root of the project with the following configuration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the development server
```bash
bun run dev
# or
npm run dev
```
Open `http://localhost:3000` (or the port specified in console) to consult the archive.

---

## ✦ Terminal User Interface (CLI TUI)

PERSONAE includes a fully-featured, premium Terminal User Interface (TUI) allowing you to interact with the Living Archive directly from your command line.

### Launching the CLI
To open and run the TUI on your terminal, execute:
```bash
npm run cli
# or
bun run cli
```

### Features & Capabilities
1. **Search Codex:** Browse and search all 208 minds alphabetically using pagination. Each thinker has a unique index code (1–208) mapped to them.
2. **Converse with a Thinker:** Initiate an interactive chat with any thinker. You can select them directly using their numeric index code (e.g. `81` for Netaji) or search by name (e.g. `socrates`).
3. **Summon the Council:** Choose 3 thinkers to deliberate and discuss a specific prompt/query together.
4. **Orchestrate a Debate:** Pit 2 thinkers against each other in a turn-based intellectual battle on a topic of your choice.

### In-Chat Context Commands
While chatting, use these custom slash-commands directly in the prompt for advanced context control:
- `/context` — View the active conversation details (total turns, instruction status, auto-compression toggles).
- `/new` — Instantly wipe history and start a fresh session with the thinker.
- `/compress` — Manually trigger a context summarization model to collapse old turns and free up context space.
- `/api` — Change your Gemini API key mid-conversation without exiting the chat session.

---

## ✦ Archive Structure

*   `src/components/` — Modals, particle portraits, key configurations, and command palette.
*   `src/routes/` — Archive views (Index, Chat, Council, Constellation, Codex, Create, Debate).
*   `src/data/` — Static data profiles, signatures, and initial profiles for the 208 minds.
*   `src/integrations/` — Supabase client setup and related query providers.
*   `src/styles.css` — Custom global typography, glassmorphism filters, and CSS grain effects.
