import { createHash, randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
let deckPath = '/deck.html';
let jsonOnly = false;
const investorNames = [];

for (const arg of args) {
  if (arg === '--json-only') {
    jsonOnly = true;
  } else if (arg.startsWith('--deck=')) {
    deckPath = normalizeDeckPath(arg.slice('--deck='.length));
  } else {
    investorNames.push(arg);
  }
}

if (investorNames.length === 0) {
  console.error('Usage: npm run codes -- [--deck=/deck.html] [--json-only] "Investor Name" "Another Investor"');
  process.exit(1);
}

const records = investorNames.map((name) => {
  const accessCode = `lupi_${randomBytes(14).toString('base64url')}`;
  return {
    id: slugify(name),
    investor: name,
    accessCode,
    accessCodeHash: createHash('sha256').update(accessCode, 'utf8').digest('hex'),
    deck: deckPath,
  };
});

const secretJson = records.map(({ id, investor, accessCodeHash, deck }) => ({
  id,
  investor,
  accessCodeHash,
  deck,
}));

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(secretJson)}\n`);
} else {
  console.log('Share these investor-specific access codes:');
  for (const record of records) {
    console.log(`- ${record.investor} (${record.id}): ${record.accessCode}`);
  }

  console.log('\nSecret JSON for INVESTOR_DECK_ACCESS_JSON:');
  console.log(JSON.stringify(secretJson, null, 2));
}

function normalizeDeckPath(value) {
  const raw = value && value.trim() ? value.trim() : '/deck.html';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const pathname = new URL(`https://deck.local${withSlash}`).pathname;
  if (!pathname.endsWith('.html')) {
    throw new Error(`Deck path must end in .html: ${value}`);
  }
  return pathname;
}

function slugify(value) {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `investor-${randomBytes(4).toString('hex')}`;
}
