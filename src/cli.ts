import { personas, searchPersonas, type Persona } from "./data/personas";
import prompts from "./data/persona-prompts.json";
import { gatewayChat, type GwMessage } from "./lib/ai-gateway.server";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// Color Utilities
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  gold: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgAccent: "\x1b[48;5;236m",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const promptQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Simple Typewriter Effect
async function typePrint(text: string, ms = 4) {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    await new Promise((r) => setTimeout(r, ms));
  }
  console.log();
}

// Summoning / Reconstruction Animations
async function summonAnimation(name: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  console.log();
  for (let i = 0; i < 20; i++) {
    const frame = frames[i % frames.length];
    process.stdout.write(`\r${C.gold}${frame} Reconstructing mind: ${C.bold}${name}${C.reset} ${C.dim}[Quantum state ${i * 5}%]${C.reset}`);
    await new Promise((r) => setTimeout(r, 70));
  }
  process.stdout.write(`\r${C.green}✓ Mind successfully reconstructed: ${C.bold}${name}${C.reset}                       \n\n`);
  await new Promise((r) => setTimeout(r, 500));
}

async function summonCouncilAnimation() {
  console.log();
  for (let i = 0; i < 25; i++) {
    const pct = i * 4;
    process.stdout.write(`\r${C.gold}⚡ Aligning temperament grid for Council... ${pct}%${C.reset}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  process.stdout.write(`\r${C.green}✓ Council grid aligned. Reconstructed minds online.                  \n\n`);
  await new Promise((r) => setTimeout(r, 500));
}

async function summonDebateAnimation(name1: string, name2: string) {
  console.log();
  for (let i = 0; i < 25; i++) {
    const pct = i * 4;
    process.stdout.write(`\r${C.red}⚔ Establishing debate protocols: ${name1} vs ${name2}... ${pct}%${C.reset}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  process.stdout.write(`\r${C.green}✓ Protocols established. Debate arena active.                          \n\n`);
  await new Promise((r) => setTimeout(r, 500));
}

// Draw a beautiful boxed title with dynamic width
function drawBox(title: string, subtitle?: string) {
  const width = 73;
  console.log(C.gold + "┌" + "─".repeat(width - 2) + "┐");
  const padL = Math.floor((width - 2 - title.length) / 2);
  const padR = width - 2 - title.length - padL;
  console.log("│" + " ".repeat(padL) + C.bold + title + C.reset + C.gold + " ".repeat(padR) + "│");
  
  if (subtitle) {
    const sPadL = Math.floor((width - 2 - subtitle.length) / 2);
    const sPadR = width - 2 - subtitle.length - sPadL;
    console.log("│" + " ".repeat(sPadL) + C.dim + subtitle + C.reset + C.gold + " ".repeat(sPadR) + "│");
  }
  console.log("└" + "─".repeat(width - 2) + "┘" + C.reset);
}

// Dynamically draws a menu row to ensure right-border alignment is 100% correct
function drawMenuRow(text: string) {
  const innerWidth = 73;
  const padding = innerWidth - 6 - text.length; // 3 spaces left margin, variable right margin
  console.log(
    C.gold + "│" + C.reset + "   " + text + " ".repeat(padding) + C.gold + "  │" + C.reset
  );
}

// Setup API Key
async function ensureApiKey(): Promise<string> {
  let key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    // Attempt to read from .env file directly
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(/VITE_GEMINI_API_KEY\s*=\s*(.+)/);
        if (match && match[1]) {
          key = match[1].trim();
        }
      }
    } catch (_) {}
  }

  if (!key) {
    console.clear();
    drawBox("API KEY CONFIGURATION", "A Gemini API Key is required to run the archive.");
    console.log(C.gray + "\nYou can get a free key from Google AI Studio.\n" + C.reset);
    const input = await promptQuestion(C.bold + "Enter your GEMINI_API_KEY: " + C.reset);
    key = input.trim();
    if (key) {
      process.env.GEMINI_API_KEY = key;
      // Save to local session or env
      try {
        const envPath = path.resolve(process.cwd(), ".env");
        const newEntry = `\nVITE_GEMINI_API_KEY=${key}\n`;
        if (fs.existsSync(envPath)) {
          fs.appendFileSync(envPath, newEntry);
        } else {
          fs.writeFileSync(envPath, newEntry);
        }
        console.log(C.green + "✓ Key configured and saved to .env file." + C.reset);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (_) {}
    } else {
      console.log(C.red + "⚠ Key was not entered. Returning to menu." + C.reset);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return key || "";
}

// Search and select persona helper
async function selectPersona(title: string): Promise<Persona | null> {
  while (true) {
    console.clear();
    drawBox(title, "Search from 208 reconstructed minds");
    const query = await promptQuestion(C.bold + "🔍 Search (or press Enter to list all, /back to return): " + C.reset);
    if (query.trim() === "/back") return null;

    const matches = searchPersonas(query, 15);
    if (matches.length === 0) {
      console.log(C.red + "\nNo thinkers found. Press Enter to try again." + C.reset);
      await promptQuestion("");
      continue;
    }

    console.log(C.gold + "\n┌─── INDEX ────────────────────────────────────────────────────────┐" + C.reset);
    matches.forEach((p, idx) => {
      console.log(
        ` ${C.gold}[${String(idx + 1).padStart(2, "0")}]${C.reset} ` +
        `${C.bold}${p.name.padEnd(24)}${C.reset} ` +
        `${C.cyan}${p.role.slice(0, 36).padEnd(36)}${C.reset} `
      );
    });
    console.log(C.gold + "└──────────────────────────────────────────────────────────────────┘" + C.reset);

    const selection = await promptQuestion(C.bold + "\nSelect number (or Enter to search again): " + C.reset);
    if (!selection.trim()) continue;

    const num = parseInt(selection.trim(), 10);
    if (!isNaN(num) && num > 0 && num <= matches.length) {
      return matches[num - 1];
    }
  }
}

// Chat Mode
async function runChat() {
  const p = await selectPersona("CONVERSE WITH A THINKER");
  if (!p) return;

  const key = await ensureApiKey();
  if (!key) return;

  await summonAnimation(p.name);

  const systemInstruction = (prompts as Record<string, string>)[p.slug] || "";
  const history: GwMessage[] = [{ role: "system", content: systemInstruction }];

  console.clear();
  console.log(C.gold + "┌" + "─".repeat(69) + "┐");
  console.log(`│ ${C.bold}${p.name.toUpperCase().padEnd(67)}${C.reset}${C.gold} │`);
  console.log(`│ ${C.dim}${p.role.padEnd(67)}${C.reset}${C.gold} │`);
  console.log(`│ ${C.italic}${p.signature.slice(0, 65).padEnd(67)}${C.reset}${C.gold} │`);
  console.log("└" + "─".repeat(69) + "┘" + C.reset);
  console.log(C.gray + "Type /back to exit conversation.\n" + C.reset);

  while (true) {
    const input = await promptQuestion(C.green + C.bold + "You > " + C.reset);
    if (input.trim() === "/back") break;
    if (!input.trim()) continue;

    history.push({ role: "user", content: input });
    process.stdout.write(C.bold + C.gold + `\n${p.name} > ` + C.reset + C.dim + "(thinking...)" + C.reset + "\r");

    try {
      const response = await gatewayChat(history, { userKey: key });
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(C.bold + C.gold + `${p.name} > ` + C.reset);
      await typePrint(response, 5);
      console.log();
      history.push({ role: "assistant", content: response });
    } catch (err: any) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(C.red + "Error calling Gemini: " + err.message + C.reset + "\n");
    }
  }
}

// Council Mode
async function runCouncil() {
  console.clear();
  drawBox("SUMMON THE COUNCIL", "Form a panel of three minds to deliberate a query");
  
  const council: Persona[] = [];
  for (let i = 1; i <= 3; i++) {
    const p = await selectPersona(`SELECT THINKER [${i}/3]`);
    if (!p) return;
    council.push(p);
  }

  const key = await ensureApiKey();
  if (!key) return;

  await summonCouncilAnimation();

  console.clear();
  drawBox("THE CONVENED COUNCIL", council.map((p) => p.name).join("  ·  "));

  const query = await promptQuestion(C.bold + "\nEnter question or query for the Council: " + C.reset);
  if (!query.trim()) return;

  console.log(C.gray + "\nDeliberating..." + C.reset);

  const dialogue: GwMessage[] = [];
  const councilNames = council.map(c => c.name).join(", ");

  for (let round = 0; round < 2; round++) {
    for (const member of council) {
      const memberPrompt = (prompts as Record<string, string>)[member.slug] || "";
      const systemContext = 
        `${memberPrompt}\n\n` +
        `You are a member of a convened council alongside: ${councilNames}.\n` +
        `The prompt from the seeker is: "${query}".\n` +
        `Participate in this intellectual dialogue. React directly to what the other council members have stated previously, keep your arguments sharp, concise (under 120 words), and consistent with your historical reasoning.`;

      const messages: GwMessage[] = [
        { role: "system", content: systemContext },
        ...dialogue
      ];

      try {
        const reply = await gatewayChat(messages, { userKey: key });
        console.log(C.gold + `\n┌── ${member.name} ──────────────────────────────────────────` + C.reset);
        await typePrint(reply, 5);
        console.log(C.gold + "└" + "─".repeat(58) + C.reset);
        dialogue.push({ role: "user", content: `Statement by ${member.name}: "${reply}"` });
      } catch (err: any) {
        console.log(C.red + `\n[${member.name} remained silent: ${err.message}]` + C.reset);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(C.green + "\n✓ Council deliberation has concluded." + C.reset);
  await promptQuestion("\nPress Enter to return to main menu.");
}

// Debate Mode
async function runDebate() {
  console.clear();
  drawBox("DEBATE ARENA", "Set two minds against each other in intellectual combat");

  const p1 = await selectPersona("SELECT DEBATER 1");
  if (!p1) return;
  const p2 = await selectPersona("SELECT DEBATER 2");
  if (!p2) return;

  const key = await ensureApiKey();
  if (!key) return;

  await summonDebateAnimation(p1.name, p2.name);

  console.clear();
  drawBox("MATCH-UP ESTABLISHED", `${p1.name}   VS   ${p2.name}`);

  const topic = await promptQuestion(C.bold + "\nEnter topic or thesis to debate: " + C.reset);
  if (!topic.trim()) return;

  console.log(C.gray + "\nOpening statements are being prepared..." + C.reset);

  const contextHistory: GwMessage[] = [];

  // 2 Rounds of debate
  for (let round = 1; round <= 2; round++) {
    // Debater 1 Turn
    const sys1 = 
      `${(prompts as Record<string, string>)[p1.slug]}\n\n` +
      `You are in a formal debate with ${p2.name} on the topic: "${topic}".\n` +
      `Keep your responses short, analytical, and highly critical of your opponent. Maximum 100 words. This is round ${round} of the debate.`;
    
    try {
      const reply1 = await gatewayChat([{ role: "system", content: sys1 }, ...contextHistory], { userKey: key });
      console.log(C.cyan + `\n[${p1.name}] (Round ${round}) > ` + C.reset);
      await typePrint(reply1, 5);
      contextHistory.push({ role: "user", content: `${p1.name}: ${reply1}` });
    } catch (e: any) {
      console.log(C.red + `\n[${p1.name} yielded turn: ${e.message}]` + C.reset);
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Debater 2 Turn
    const sys2 = 
      `${(prompts as Record<string, string>)[p2.slug]}\n\n` +
      `You are in a formal debate with ${p1.name} on the topic: "${topic}".\n` +
      `Analyze their statements and construct a rebuttal from your perspective. Keep your responses short and analytical. Maximum 100 words. This is round ${round} of the debate.`;

    try {
      const reply2 = await gatewayChat([{ role: "system", content: sys2 }, ...contextHistory], { userKey: key });
      console.log(C.magenta + `\n[${p2.name}] (Round ${round}) > ` + C.reset);
      await typePrint(reply2, 5);
      contextHistory.push({ role: "user", content: `${p2.name}: ${reply2}` });
    } catch (e: any) {
      console.log(C.red + `\n[${p2.name} yielded turn: ${e.message}]` + C.reset);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(C.green + "\n✓ Debate finished." + C.reset);
  await promptQuestion("\nPress Enter to return to main menu.");
}

// Main CLI Loop
async function main() {
  while (true) {
    console.clear();
    console.log(C.gold + `┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ██████╗ ███████╗██████╗ ███████╗ ██████╗ ███╗   ██╗ █████╗ ███████╗    │
│  ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗████╗  ██║██╔══██╗██╔════╝    │
│  ██████╔╝█████╗  ██████╔╝███████╗██║   ██║██╔██╗ ██║███████║█████╗      │
│  ██╔═══╝ ██╔══╝  ██╔══██╗╚════██║██║   ██║██║╚██╗██║██╔══██║██╔══╝      │
│  ██║     ███████╗██║  ██║███████║╚██████╔╝██║ ╚████║██║  ██║███████╗    │
│  ╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    │
│                                                                        │
│               THE LIVING ARCHIVE OF 208 RECONSTRUCTED MINDS            │
│       Licensed under the MIT Open Source License · Edition 2026.1      │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │` + C.reset);

    drawMenuRow("[1]  🔎  Search Codex (208 Minds)");
    drawMenuRow("[2]  💬  Converse with a Thinker");
    drawMenuRow("[3]  🏛️   Summon the Council (3 minds, 1 query)");
    drawMenuRow("[4]  ⚔️   Orchestrate a Debate (2 minds, 1 topic)");
    drawMenuRow("[5]  🔑  Configure Gemini API Key");
    drawMenuRow("[6]  ❌  Exit Archive");

    console.log(C.gold + `│                                                                        │
└────────────────────────────────────────────────────────────────────────┘` + C.reset);

    const choice = await promptQuestion(C.bold + "\nSelect an option [1-6]: " + C.reset);
    switch (choice.trim()) {
      case "1":
        const p = await selectPersona("BROWSE MINDS CODEX");
        if (p) {
          console.clear();
          drawBox(p.name, p.role);
          console.log(`\n${C.bold}ERA:${C.reset} ${p.eraStart ?? "?"} to ${p.eraEnd ?? "?"}`);
          console.log(`${C.bold}POLITY/REGION:${C.reset} ${p.country ?? "?"} (${p.region ?? "?"})`);
          console.log(`${C.bold}TEMPERAMENT:${C.reset} ${p.tags.join("  ·  ")}`);
          console.log(`${C.bold}SIGNATURE PROFILE:${C.reset}\n${p.signature}`);
          await promptQuestion("\nPress Enter to return.");
        }
        break;
      case "2":
        await runChat();
        break;
      case "3":
        await runCouncil();
        break;
      case "4":
        await runDebate();
        break;
      case "5":
        await ensureApiKey();
        break;
      case "6":
        console.clear();
        console.log(C.gold + "\nClosing connection to the Living Archive. Fare well.\n" + C.reset);
        rl.close();
        process.exit(0);
      default:
        console.log(C.red + "Invalid option. Select [1-6]." + C.reset);
        await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// Start execution
main().catch((err) => {
  console.error("Fatal Error running TUI:", err);
  process.exit(1);
});
