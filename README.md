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
Or download PERSONAE.zip and Use it locally.
---

## ✦ Terminal User Interface (CLI TUI)

PERSONAE features an immersive, keyboard-driven Terminal User Interface (TUI) designed to run directly inside your command line. The interface leverages standard ASCII borders to ensure perfect layout alignment across all terminals (Cmd, PowerShell, Windows Terminal) while maintaining a modern, minimalist command aesthetic.

### Launching the CLI
Initialize the terminal archive from the root of the project:
```bash
npm run cli
# or
bun run cli
```
```bash
E:
cd E:\PERSONAE
npm run cli
```

### Features & Operations
*   **Alphabetical Registry & Code Index:** The entire codex of 208 minds is organized alphabetically and indexed with unique numeric codes (`1` to `208`). You can view details, signatures, and eras page-by-page.
*   **Direct Invocations:** Bypass search prompts by immediately typing a thinker's code (e.g. `175` to chat with Netaji Subhas Chandra Bose) or querying partial names (e.g. `netaji` or `socrates`) to trigger auto-recommendation lists.
*   **The Council Chamber:** Convene three distinct historical minds to analyze, debate, and deliberate over a single prompt, watching their reasoning styles clash or converge.
*   **The Debate Arena:** Select two thinkers and set them against each other in a structured, turn-based intellectual battle on any thesis you define.

### Context Control Commands
When interacting with any mind, input these slash commands in the chat prompt for advanced, real-time context management:
*   `/context` — Inspect active conversation statistics, turn counts, and auto-compression toggles.
*   `/new` — Reset the active context and clear conversation history while retaining the thinker's core identity prompt.
*   `/compress` — Manually trigger a summarization prompt to collapse preceding dialogue turns and maximize context window efficiency.
*   `/api` — Swap or update your Gemini API Key mid-conversation without exiting the active session.

---

## ✦ Archive Structure

*   `src/components/` — Modals, particle portraits, key configurations, and command palette.
*   `src/routes/` — Archive views (Index, Chat, Council, Constellation, Codex, Create, Debate).
*   `src/data/` — Static data profiles, signatures, and initial profiles for the 208 minds.
*   `src/integrations/` — Supabase client setup and related query providers.
*   `src/styles.css` — Custom global typography, glassmorphism filters, and CSS grain effects.

---

## ✦ CLI UI Design

## LANDING
<img width="1920" height="578" alt="{B4640D8E-ED26-46A6-BF4B-7C235CCBDD9C}" src="https://github.com/user-attachments/assets/f20861b8-6ea9-4f9b-9f40-8660c8992ec4" />

## INDEX
<img width="1920" height="586" alt="{DEB670A8-3297-4407-8437-E0D430554DC4}" src="https://github.com/user-attachments/assets/18234384-c5f4-4956-b55c-62e6392df8c7" />

## CHAT
<img width="1920" height="1080" alt="{B70F037D-4B72-4AB7-BB84-92890363E473}" src="https://github.com/user-attachments/assets/2715ab32-cc68-4000-b2a7-c1e97e27a2ab" />

## COUNCIL
<img width="1920" height="1080" alt="{C047FF10-02C7-4F25-8E88-E78BC250AF2B}" src="https://github.com/user-attachments/assets/65bc3a49-e6ff-4b4c-9192-0091fdfb05dc" />

## DEBATE
<img width="1920" height="923" alt="{FF5BEC19-C6C9-422F-9A9E-090EFDBD81DD}" src="https://github.com/user-attachments/assets/a458e4b8-c894-49ba-a88b-acabad62a3e4" />

## EXIT OUTRO
<img width="678" height="121" alt="{B3AE1F7E-129A-48EB-9B66-6EEE73B0E63D}" src="https://github.com/user-attachments/assets/9028fe76-b21c-430d-b3d4-aeaeae85125a" />




