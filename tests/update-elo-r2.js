// Atualiza os ratings Elo após a 2ª rodada pelo método eloratings.net.
// K=60 (Copa), G por saldo de gols, mando de 100 só p/ anfitriões em casa.
// Parte do Elo ATUAL do HTML (já pós-1ª rodada). Uso: node tests/update-elo-r2.js
// >>> PREENCHA os dois últimos números de cada linha de R2 (golsCasa, golsFora). <<<
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'output', 'bolao-copa-2026-v3.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
const ELO = eval('(' + src.match(/const ELO = (\{[\s\S]*?\});/)[1] + ')');
const HOSTS = new Set(['México','EUA','Canadá']);

// 2ª rodada (mando = time da esquerda, como no GRUPOS). Preencha golsCasa/golsFora.
const R2 = [
  ['R. Tcheca','África do Sul',null,null], ['México','Coreia do Sul',null,null],
  ['Suíça','Bósnia',null,null],            ['Canadá','Qatar',null,null],
  ['Escócia','Marrocos',null,null],        ['Brasil','Haiti',null,null],
  ['Turquia','Paraguai',null,null],        ['EUA','Austrália',null,null],
  ['Alemanha','C. do Marfim',null,null],   ['Equador','Curaçao',null,null],
  ['Tunísia','Japão',null,null],           ['Holanda','Suécia',null,null],
  ['Bélgica','Irã',null,null],             ['N. Zelândia','Egito',null,null],
  ['Espanha','A. Saudita',null,null],      ['Uruguai','Cabo Verde',null,null],
  ['França','Iraque',null,null],           ['Noruega','Senegal',null,null],
  ['Argentina','Áustria',null,null],       ['Jordânia','Argélia',null,null],
  ['Portugal','Uzbequistão',null,null],    ['Colômbia','RD. Congo',null,null],
  ['Inglaterra','Gana',null,null],         ['Panamá','Croácia',null,null],
];

// Preenche automaticamente a partir de tests/results-r2.json (gerado por sofascore-parse.js), se existir.
try {
  const res = JSON.parse(fs.readFileSync(path.join(__dirname, 'results-r2.json'), 'utf8'));
  for (const r of R2) { const k = res[`${r[0]}|${r[1]}`]; if (k) { r[2] = k[0]; r[3] = k[1]; } }
} catch {}

if (R2.some(r => r[2] === null || r[3] === null)) {
  console.error('Sem placares: preencha o R2 ou gere tests/results-r2.json com:\n  node tests/sofascore-parse.js <arquivo-da-rodada.json>');
  process.exit(1);
}

const K = 60, HOME = 100;
function gIndex(diff) {
  const n = Math.abs(diff);
  if (n <= 1) return 1;
  if (n === 2) return 1.5;
  return (11 + n) / 8;
}
function expected(drm) { return 1 / (Math.pow(10, -drm / 400) + 1); }

const newElo = { ...ELO };
for (const [a, b, ax, ay] of R2) {
  const ha = HOSTS.has(a) ? HOME : 0;
  const hb = HOSTS.has(b) ? HOME : 0;
  const dr = (ELO[a] + ha) - (ELO[b] + hb);
  const Wa = ax > ay ? 1 : ax === ay ? 0.5 : 0;
  const G = gIndex(ax - ay);
  const dA = Math.round(K * G * (Wa - expected(dr)));
  newElo[a] += dA;
  newElo[b] -= dA; // jogo zero-soma
}

console.log('Variação de Elo por seleção (2ª rodada):');
const deltas = Object.keys(ELO).map(t => [t, ELO[t], newElo[t], newElo[t]-ELO[t]])
  .sort((p,q)=>q[3]-p[3]);
for (const [t, o, n, d] of deltas) {
  console.log(`  ${t.padEnd(16)} ${o} -> ${n}  (${d>0?`+${d}`:d})`);
}

const order = Object.keys(ELO);
let out = 'const ELO = {\n';
for (let i = 0; i < order.length; i += 4) {
  out += order.slice(i, i+4).map(t => `"${t}":${newElo[t]}`).join(',') + ',\n';
}
out = out.replace(/,\n$/, '};\n');
console.log('\nCole este objeto no lugar do ELO em output/bolao-copa-2026-v3.html:\n');
console.log(out);
