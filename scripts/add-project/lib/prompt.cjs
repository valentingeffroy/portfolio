const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

async function askText({ rl, label, defaultValue = "" }) {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function askChoice({ rl, label, choices, defaultId }) {
  output.write(`\n${label}\n`);
  choices.forEach((c, i) => {
    const mark = c.id === defaultId ? "*" : " ";
    output.write(`  ${mark} ${i + 1}. ${c.label}\n`);
  });
  const raw = (await rl.question(`Choose 1-${choices.length}: `)).trim();
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > choices.length) {
    return defaultId ?? choices[0].id;
  }
  return choices[n - 1].id;
}

async function withPrompts(fn) {
  const rl = readline.createInterface({ input, output });
  try {
    return await fn(rl);
  } finally {
    rl.close();
  }
}

module.exports = { withPrompts, askText, askChoice };

