const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
}

const objects = [
  { code: 'FLOW_001', title: 'Feature Delivery Flow' },
  { code: 'ARCH_001', title: 'NextJS Modular Architecture' },
  { code: 'PROMPT_001', title: 'Incremental Edit Prompt' },
];

const vaultList = document.getElementById('vaultList');
objects.forEach(o => {
  const li = document.createElement('li');
  li.textContent = `${o.code} — ${o.title}`;
  vaultList.appendChild(li);
});

document.getElementById('tokenSaved').textContent = '4,320';
document.getElementById('skillsCreated').textContent = '7';
document.getElementById('workflowReuse').textContent = '19';
document.getElementById('effScore').textContent = '84%';

function computeTokenWasteScore(input) {
  const total = input.inputTokens + input.outputTokens;
  const repeatRate = input.repeatedContextTokens / Math.max(1, input.inputTokens);
  const retryPenalty = Math.min(20, input.retries * 4);
  const overflowPenalty = Math.min(25, input.overflowEvents * 8);
  const compressionBonus = input.compressionApplied ? 10 : 0;

  let score = 0;
  score += Math.min(40, repeatRate * 100 * 0.4);
  score += retryPenalty;
  score += overflowPenalty;
  score += total > 12000 ? 15 : total > 6000 ? 8 : 2;
  score -= compressionBonus;
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

document.getElementById('tokenForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const data = {
    inputTokens: Number(form.get('inputTokens')),
    outputTokens: Number(form.get('outputTokens')),
    repeatedContextTokens: Number(form.get('repeatedContextTokens')),
    retries: Number(form.get('retries')),
    overflowEvents: Number(form.get('overflowEvents')),
    compressionApplied: form.get('compressionApplied') === 'true',
  };
  const score = computeTokenWasteScore(data);
  document.getElementById('wasteScore').textContent = `${score}`;
});

let archCounter = 1;
document.getElementById('compressBtn').addEventListener('click', () => {
  const raw = document.getElementById('promptInput').value.trim();
  if (!raw) return;
  const code = `ARCH_${String(archCounter).padStart(3, '0')}`;
  archCounter += 1;
  const payload = {
    goals: [raw.slice(0, 80)],
    constraints: ['incremental edits', 'reuse FLOW_001'],
    stack: ['NextJS', 'Node', 'PostgreSQL']
  };
  document.getElementById('compressedCode').textContent = code;
  document.getElementById('compressedPayload').textContent = JSON.stringify(payload, null, 2);
});

document.getElementById('skillForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const name = form.get('name');
  const identity = form.get('identity');
  const mission = form.get('mission');

  const markdown = `# SKILL: ${name}\n\n## Identity\nYou are ${identity}.\n\n## Mission\n${mission}\n\n## Workflow\n1. Parse intent\n2. Retrieve FLOW_*/ARCH_*\n3. Produce minimal diff plan\n4. Output implementation-ready artifacts only`;
  document.getElementById('skillOutput').textContent = markdown;
});
