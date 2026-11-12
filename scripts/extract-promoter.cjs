const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
const start = script.indexOf('const METERS=');
const end = script.indexOf('const $=s=>');
const data = script.slice(start, end).replace(/const PORTRAITS=[^\n]*\n/, '');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(data + '\n;globalThis.__out={CHARS,PROSPECTS,SIGNABLE,DIVISIONS,CARDS,HEADLINES,LINES,ENDINGS,MAX_FIGHTERS};', ctx);
const out = ctx.__out;
const outDir = process.argv[3];
const header = '// Generated from ringside-mvps/promoter/index.html by scripts/extract-promoter.cjs. Edit the content here going forward.\n';
const lines = (arr) => '[\n' + arr.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n]';
const obj = (o) => '{\n' + Object.entries(o).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}';

const chars = Object.fromEntries(Object.entries(out.CHARS).map(([id, [name, role, colour]]) => [id, { name, role, colour }]));
const endings = Object.fromEntries(Object.entries(out.ENDINGS).map(([id, [title, story]]) => [id, { title, story }]));
const prospect = (p) => ({ name: p.name, nick: p.nick, arch: p.arch, ...(p.bio ? { bio: p.bio } : {}), skill: p.skill, power: p.power, chin: p.chin, stamina: p.stamina, colour: p.col });
const option = (o) => {
  const r = { label: o.l, fx: o.fx };
  if (o.set) r.set = o.set;
  if (o.sign) r.sign = true;
  return r;
};
const cards = out.CARDS.map((c) => {
  const r = { id: c.id, who: c.who, text: c.t, left: option(c.L), right: option(c.R) };
  if (c.req) r.req = c.req;
  if (c.sign) r.signing = true;
  return r;
});
const extraKeys = new Set();
out.CARDS.forEach((c) => Object.keys(c).forEach((k) => extraKeys.add(k)));
out.CARDS.forEach((c) => ['L', 'R'].forEach((s) => Object.keys(c[s]).forEach((k) => extraKeys.add(s + '.' + k))));
console.error('card keys:', [...extraKeys].join(','));

fs.writeFileSync(outDir + '/characters.ts', header + "import type { CharacterDef } from '../types';\n\nexport const CHARACTERS: Record<string, CharacterDef> = " + obj(chars) + ';\n');
fs.writeFileSync(outDir + '/fighters.ts', header + "import type { FighterTemplate } from '../types';\n\nexport const MAX_FIGHTERS = " + out.MAX_FIGHTERS + ';\n\nexport const PROSPECTS: FighterTemplate[] = ' + lines(out.PROSPECTS.map(prospect)) + ';\n\nexport const SIGNABLE: FighterTemplate[] = ' + lines(out.SIGNABLE.map(prospect)) + ';\n');
fs.writeFileSync(outDir + '/divisions.ts', header + "import type { DivisionDef, DivisionName } from '../types';\n\nexport const DIVISIONS: Record<DivisionName, DivisionDef> = " + obj(out.DIVISIONS) + ';\n');
fs.writeFileSync(outDir + '/cards.ts', header + "import type { CardDef } from '../types';\n\nexport const CARDS: CardDef[] = " + lines(cards) + ';\n');
fs.writeFileSync(outDir + '/text.ts', header + "import type { EndingDef, EndingKey } from '../types';\n\nexport const HEADLINES = " + obj(out.HEADLINES) + ' as const;\n\nexport const LINES = ' + obj(out.LINES) + ' as const;\n\nexport const ENDINGS: Record<EndingKey, EndingDef> = ' + obj(endings) + ';\n');
console.error(`cards ${cards.length}, characters ${Object.keys(chars).length}, prospects ${out.PROSPECTS.length}, signable ${out.SIGNABLE.length}`);
