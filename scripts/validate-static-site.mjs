import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pairs = [
  ['index.html', 'public/index.html'],
  ['en/index.html', 'public/en/index.html'],
  ['styles.css', 'public/styles.css'],
  ['site.js', 'public/site.js'],
  ['contact.js', 'public/contact.js'],
];

for (const [rootPath, publicPath] of pairs) {
  const [root, published] = await Promise.all([
    readFile(rootPath),
    readFile(publicPath),
  ]);
  assert.deepEqual(root, published, `${rootPath} and ${publicPath} differ`);
}

const no = await readFile('index.html', 'utf8');
const en = await readFile('en/index.html', 'utf8');

function ids(html) {
  return new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]));
}

function assertInternalAnchors(html, label) {
  const knownIds = ids(html);
  for (const match of html.matchAll(/\shref=["']#([^"']+)["']/g)) {
    assert(knownIds.has(match[1]), `${label} has broken #${match[1]} link`);
  }
}

assert.match(no, /<html lang="no">/);
assert.match(en, /<html lang="en">/);
assert.match(no, /rel="canonical" href="https:\/\/www\.nexorait\.no\/"/);
assert.match(en, /rel="canonical" href="https:\/\/www\.nexorait\.no\/en\/"/);

for (const html of [no, en]) {
  assert.match(html, /hreflang="nb" href="https:\/\/www\.nexorait\.no\/"/);
  assert.match(html, /hreflang="en" href="https:\/\/www\.nexorait\.no\/en\/"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/www\.nexorait\.no\/"/);
  assert.doesNotMatch(html, /Adil Bhutto|\bAB\b/);
}

assert.match(no, /href="en\/"/);
assert.match(en, /href="\.\.\/"/);
assert.match(no, /action="https:\/\/nexorait-support-production\.up\.railway\.app\/api\/inquiries"/);
assert.match(no, /name="contact_permission" type="checkbox" required/);
assert.match(no, /name="website"/);
assert.match(no, /2 990 kr/);
assert.match(no, /Én avtalt innsamlingskanal/);
assert.match(no, /Opptil tre avtalte kategorier/);
assert.match(no, /Skriftlig test og overlevering/);
assert.doesNotMatch(en, /guaranteed|guarantee|automatic booking|fully automated/i);

assertInternalAnchors(no, 'Norwegian page');
assertInternalAnchors(en, 'English page');

console.log('Static site QA passed.');
