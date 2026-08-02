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
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const promptQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Sort personas alphabetically and assign a code (1 to 208)
const sortedPersonas = [...personas].sort((a, b) => a.name.localeCompare(b.name));

// Auto-compress flag
let autoCompressEnabled = true;

// Helper to get current terminal width
function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

// Draw dynamic horizontal rule spanning exact terminal width
function drawHorizontalRule(color = C.gold) {
  console.log(color + "─".repeat(getTerminalWidth()) + C.reset);
}

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
  const frames = ["-", "\\", "|", "/"];
  console.log();
  for (let i = 0; i < 20; i++) {
    const frame = frames[i % frames.length];
    process.stdout.write(`\r${C.gold}${frame} Reconstructing mind: ${C.bold}${name}${C.reset} ${C.dim}[Quantum state ${i * 5}%]${C.reset}`);
    await new Promise((r) => setTimeout(r, 60));
  }
  process.stdout.write(`\r${C.green}[Reconstructed] ${C.bold}${name}${C.reset}                       \n\n`);
  await new Promise((r) => setTimeout(r, 400));
}

async function summonCouncilAnimation() {
  console.log();
  for (let i = 0; i < 25; i++) {
    const pct = i * 4;
    process.stdout.write(`\r${C.gold}* Aligning temperament grid for Council... ${pct}%${C.reset}`);
    await new Promise((r) => setTimeout(r, 40));
  }
  process.stdout.write(`\r${C.green}[Council grid aligned. Minds online.]                  \n\n`);
  await new Promise((r) => setTimeout(r, 400));
}

async function summonDebateAnimation(name1: string, name2: string) {
  console.log();
  for (let i = 0; i < 25; i++) {
    const pct = i * 4;
    process.stdout.write(`\r${C.red}* Establishing debate protocols: ${name1} vs ${name2}... ${pct}%${C.reset}`);
    await new Promise((r) => setTimeout(r, 40));
  }
  process.stdout.write(`\r${C.green}[Debate protocols active. Arena ready.]                          \n\n`);
  await new Promise((r) => setTimeout(r, 400));
}

// Centering text helper
function printCentered(text: string, color = C.reset, isBold = false) {
  const width = getTerminalWidth();
  const rawText = text.replace(/\x1b\[[0-9;]*m/g, ""); // strip colors for length math
  const pad = Math.max(0, Math.floor((width - rawText.length) / 2));
  console.log(" ".repeat(pad) + (isBold ? C.bold : "") + color + text + C.reset);
}

// Draw a beautiful boxed title with dynamic width to prevent overflows/crashes
function drawBox(title: string, subtitle?: string) {
  const width = getTerminalWidth();
  console.log(C.gold + "┌" + "─".repeat(width - 2) + "┐");
  const padL = Math.floor((width - 2 - title.length) / 2);
  const padR = width - 2 - title.length - padL;
  console.log(C.gold + "│" + C.reset + " ".repeat(padL) + C.bold + title + C.reset + C.gold + " ".repeat(padR) + "│");
  
  if (subtitle) {
    const sPadL = Math.floor((width - 2 - subtitle.length) / 2);
    const sPadR = width - 2 - subtitle.length - sPadL;
    console.log(C.gold + "│" + C.reset + " ".repeat(sPadL) + C.dim + subtitle + C.reset + C.gold + " ".repeat(sPadR) + "│");
  }
  console.log(C.gold + "└" + "─".repeat(width - 2) + "┘" + C.reset);
}

// Setup API Key
async function ensureApiKey(forcePrompt = false): Promise<string> {
  let key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    // Attempt to read from .env file
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

  if (!key || forcePrompt) {
    console.clear();
    drawBox("API KEY CONFIGURATION", "A Gemini API Key is required to run the archive.");
    console.log(C.gray + "\nYou can get a free key from Google AI Studio.\n" + C.reset);
    const input = await promptQuestion(C.bold + "Enter your GEMINI_API_KEY: " + C.reset);
    key = input.trim();
    if (key) {
      process.env.GEMINI_API_KEY = key;
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
    } else if (!forcePrompt) {
      console.log(C.red + "⚠ Key was not entered. Running in read-only mode." + C.reset);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return key || "";
}

// Interactive Codex Browser with recommendations and code mapping
async function queryPersonaInteractive(title: string): Promise<Persona | null> {
  while (true) {
    console.clear();
    drawBox(title, "Enter a numeric code [1-208] or search by name");
    
    const input = await promptQuestion(
      C.bold + "Enter Thinker Code [1-208] or Name (or /back to return): " + C.reset
    );
    const query = input.trim();
    if (query === "/back") return null;
    if (!query) continue;

    // Check if it's a numeric code selection
    const codeNum = parseInt(query, 10);
    if (!isNaN(codeNum) && codeNum > 0 && codeNum <= sortedPersonas.length) {
      return sortedPersonas[codeNum - 1];
    }

    // Fuzzy matching engine
    const searchTerms = query.toLowerCase();
    const matches = sortedPersonas.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchTerms) ||
        p.role.toLowerCase().includes(searchTerms) ||
        p.slug.toLowerCase().includes(searchTerms) ||
        p.aliases.some((a) => a.toLowerCase().includes(searchTerms)) ||
        p.tags.some((t) => t.toLowerCase().includes(searchTerms))
      );
    });

    if (matches.length === 0) {
      console.log(C.red + `\nNo thinkers matched "${query}". Please check the spelling.` + C.reset);
      await promptQuestion("Press Enter to try again.");
      continue;
    }

    if (matches.length === 1) {
      return matches[0];
    }

    // Multiple recommendations found
    console.log(C.gold + `\n┌── RECOMMENDATIONS ────────────────────────────────────────────────┐` + C.reset);
    matches.forEach((p) => {
      const code = sortedPersonas.indexOf(p) + 1;
      console.log(
        ` ${C.gold}[${String(code).padStart(3, " ")}]${C.reset} ` +
        `${C.bold}${p.name.padEnd(28)}${C.reset} ` +
        `${C.cyan}${p.role.slice(0, 32)}${C.reset}`
      );
    });
    console.log(C.gold + "└───────────────────────────────────────────────────────────────────┘" + C.reset);

    const select = await promptQuestion(C.bold + "\nEnter Code from recommendations (or press Enter to search again): " + C.reset);
    const finalCode = parseInt(select.trim(), 10);
    if (!isNaN(finalCode) && finalCode > 0 && finalCode <= sortedPersonas.length) {
      return sortedPersonas[finalCode - 1];
    }
  }
}

// Chat Header Drawer dynamically sizing borders to prevent wrap errors
function drawChatHeader(p: Persona) {
  const width = getTerminalWidth();
  console.log(C.gold + "┌" + "─".repeat(width - 2) + "┐");
  
  // Dynamic padding helper
  const drawRow = (text: string, colorCode: string) => {
    const pad = width - 4 - text.length;
    console.log(C.gold + "│ " + C.reset + colorCode + text + " ".repeat(Math.max(0, pad)) + C.gold + " │" + C.reset);
  };

  drawRow(p.name.toUpperCase(), C.bold);
  drawRow(p.role, C.dim);
  
  const maxSig = width - 4;
  const sigText = p.signature.length > maxSig ? p.signature.slice(0, maxSig - 3) + "..." : p.signature;
  drawRow(sigText, C.italic);
  
  console.log(C.gold + "└" + "─".repeat(width - 2) + "┘" + C.reset);
}

// Context compressor helper using Gemini
async function compressHistory(history: GwMessage[], key: string): Promise<GwMessage[]> {
  if (history.length <= 3) return history;
  const toCompress = history.filter((m) => m.role !== "system");
  const prompt: GwMessage[] = [
    {
      role: "system",
      content:
        "You are an archival context compressor. Summarize the conversation history between the user and a historical mind. Retain the core ideas, critical agreements/disagreements, and the topic of discussion, so that they can continue chatting smoothly. Keep it under 150 words.",
    },
    { role: "user", content: JSON.stringify(toCompress) },
  ];

  try {
    const summary = await gatewayChat(prompt, { userKey: key });
    console.log(C.green + "\n[Context compressed successfully]" + C.reset);
    return [
      history[0], // keep the system prompt
      { role: "user", content: `Here is a summary of our conversation so far: ${summary}` },
      { role: "assistant", content: "Understood. Let us proceed with our dialogue." },
    ];
  } catch (e: any) {
    console.log(C.red + "\n[Failed to compress context: " + e.message + "]" + C.reset);
    return history;
  }
}

// Chat Mode
async function runChat() {
  const p = await queryPersonaInteractive("CONVERSE WITH A THINKER");
  if (!p) return;

  const key = await ensureApiKey();
  if (!key) return;

  await summonAnimation(p.name);

  const systemInstruction = (prompts as Record<string, string>)[p.slug] || "";
  let history: GwMessage[] = [{ role: "system", content: systemInstruction }];

  console.clear();
  drawChatHeader(p);
  console.log(C.gray + "Type your message to begin conversation." + C.reset);
  console.log(C.gray + "Commands: /back (exit), /context (size info), /compress (reduce history), /new (clear history)\n" + C.reset);

  while (true) {
    const input = await promptQuestion(C.green + C.bold + "You > " + C.reset);
    const query = input.trim();
    if (query === "/back") break;
    if (!query) continue;

    // Chat context settings commands
    if (query === "/context") {
      const turns = history.filter((h) => h.role !== "system").length;
      console.log(C.cyan + `\n--- Context Window Status ---` + C.reset);
      console.log(`• Total message turns: ${turns}`);
      console.log(`• System instructions active: ${systemInstruction ? "Yes" : "No"}`);
      console.log(`• Auto-compression: ${autoCompressEnabled ? "ON" : "OFF"}`);
      console.log(C.cyan + `─────────────────────────────\n` + C.reset);
      continue;
    }

    if (query === "/new") {
      history = [{ role: "system", content: systemInstruction }];
      console.log(C.green + "\n[New chat started. Context cleared.]\n" + C.reset);
      continue;
    }

    if (query === "/compress") {
      process.stdout.write(C.dim + "Compressing historical context..." + C.reset + "\r");
      history = await compressHistory(history, key);
      console.log();
      continue;
    }

    // Auto-compress trigger (compress history if length grows too large)
    if (autoCompressEnabled && history.length > 10) {
      console.log(C.dim + "[Auto-compressing context to fit token limits...]" + C.reset);
      history = await compressHistory(history, key);
    }

    history.push({ role: "user", content: query });
    process.stdout.write(C.bold + C.gold + `${p.name} > ` + C.reset + C.dim + "(thinking...)" + C.reset + "\r");

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
      // Remove failed message from history to prevent context errors
      history.pop();
    }
  }
}

// Council Mode
async function runCouncil() {
  console.clear();
  drawBox("SUMMON THE COUNCIL", "Form a panel of three minds to deliberate a query");
  
  const council: Persona[] = [];
  for (let i = 1; i <= 3; i++) {
    const p = await queryPersonaInteractive(`SELECT THINKER [${i}/3]`);
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

  const p1 = await queryPersonaInteractive("SELECT DEBATER 1");
  if (!p1) return;
  const p2 = await queryPersonaInteractive("SELECT DEBATER 2");
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

// Show the complete alphabetical directory of minds
async function showCodexIndex() {
  let page = 0;
  const pageSize = 15;
  const totalPages = Math.ceil(sortedPersonas.length / pageSize);

  while (true) {
    console.clear();
    drawBox("MINDS CODEX INDEX", `Page ${page + 1} of ${totalPages} · sorted alphabetically`);
    console.log(C.gold + "\n┌─── INDEX ────────────────────────────────────────────────────────┐" + C.reset);
    
    const start = page * pageSize;
    const end = Math.min(start + pageSize, sortedPersonas.length);
    for (let i = start; i < end; i++) {
      const p = sortedPersonas[i];
      const code = i + 1;
      console.log(
        ` ${C.gold}[${String(code).padStart(3, " ")}]${C.reset} ` +
        `${C.bold}${p.name.padEnd(28)}${C.reset} ` +
        `${C.cyan}${p.role.slice(0, 32).padEnd(32)}${C.reset} `
      );
    }
    console.log(C.gold + "└──────────────────────────────────────────────────────────────────┘" + C.reset);

    const action = await promptQuestion(
      C.bold + "\nCommands: [n] Next, [p] Prev, [code] Select Mind, or [Enter] Back to Menu: " + C.reset
    );
    
    const cmd = action.trim().toLowerCase();
    if (!cmd) break;
    
    if (cmd === "n" && page < totalPages - 1) {
      page++;
    } else if (cmd === "p" && page > 0) {
      page--;
    } else {
      const codeVal = parseInt(cmd, 10);
      if (!isNaN(codeVal) && codeVal > 0 && codeVal <= sortedPersonas.length) {
        const p = sortedPersonas[codeVal - 1];
        console.clear();
        drawBox(p.name, p.role);
        console.log(`\n${C.bold}CODE:${C.reset} [${codeVal}]`);
        console.log(`${C.bold}ERA:${C.reset} ${p.eraStart ?? "?"} to ${p.eraEnd ?? "?"}`);
        console.log(`${C.bold}POLITY/REGION:${C.reset} ${p.country ?? "?"} (${p.region ?? "?"})`);
        console.log(`${C.bold}TEMPERAMENT:${C.reset} ${p.tags.join("  ·  ")}`);
        console.log(`${C.bold}SIGNATURE PROFILE:${C.reset}\n${p.signature}`);
        await promptQuestion("\nPress Enter to return.");
      }
    }
  }
}

// Main CLI Loop
async function main() {
  // Take users Gemini API Key on start for smooth chatting further
  await ensureApiKey();

  while (true) {
    console.clear();
    console.log();
    // Borderless center header logo matching user preferences
    printCentered("██████╗ ███████╗██████╗ ███████╗ ██████╗ ███╗   ██╗ █████╗ ███████╗", C.gold, true);
    printCentered("██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗████╗  ██║██╔══██╗██╔════╝", C.gold, true);
    printCentered("██████╔╝█████╗  ██████╔╝███████╗██║   ██║██╔██╗ ██║███████║█████╗  ", C.gold, true);
    printCentered("██╔═══╝ ██╔══╝  ██╔══██╗╚════██║██║   ██║██║╚██╗██║██╔══██║██╔══╝  ", C.gold, true);
    printCentered("██║     ███████╗██║  ██║███████║╚██████╔╝██║ ╚████║██║  ██║███████╗", C.gold, true);
    printCentered("╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝", C.gold, true);
    console.log();
    printCentered("THE LIVING ARCHIVE OF 208 RECONSTRUCTED MINDS", C.gold, false);
    printCentered("Licensed under the MIT Open Source License · Edition 2026.1", C.gold, false);
    console.log();
    
    // Horizontal rule spanning entire terminal screen width
    drawHorizontalRule(C.gold);
    
    console.log();
    console.log("   [1]  Search Codex (208 Minds)");
    console.log("   [2]  Converse with a Thinker");
    console.log("   [3]  Summon the Council (3 minds, 1 query)");
    console.log("   [4]  Orchestrate a Debate (2 minds, 1 topic)");
    console.log("   [5]  Configure Gemini API Key");
    console.log("   [6]  Exit Archive");
    console.log();

    drawHorizontalRule(C.gold);

    const choice = await promptQuestion(C.bold + "\nSelect an option [1-6]: " + C.reset);
    switch (choice.trim()) {
      case "1":
        await showCodexIndex();
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
        await ensureApiKey(true);
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
