// Balanço da 2ª rodada: roda o modelo do app (Elo atual, sem odds/deflator/contexto)
// e confronta os palpites com os resultados reais. Uso: node tests/balanco-r2.js
// >>> PREENCHA os dois últimos números de cada linha de R2 (golsCasa, golsFora). <<<
const fs = require('fs');
const path = require('path');

function fakeEl() {
  return {
    style: {}, dataset: {}, value: '', textContent: '', className: '', innerHTML: '',
    type: '', open: false,
    addEventListener() {}, appendChild() {},
    querySelector() { return fakeEl(); }, querySelectorAll() { return []; },
  };
}
const inputs = { pE: '10', pS: '7', pV: '5', pH: '80', pT: '2.3' };
const els = {};
global.document = {
  getElementById(id) {
    if (!els[id]) { els[id] = fakeEl(); if (inputs[id] !== undefined) els[id].value = inputs[id]; }
    return els[id];
  },
  createElement() { return fakeEl(); },
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const html = fs.readFileSync(path.join(__dirname, '..', 'output', 'bolao-copa-2026-v3.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
eval(src);

// 2ª rodada (mando = time da esquerda, como no GRUPOS). Preencha golsCasa/golsFora.
// [grupo, casa, fora, golsCasa, golsFora]
const R2 = [
  ['A','R. Tcheca','África do Sul',null,null], ['A','México','Coreia do Sul',null,null],
  ['B','Suíça','Bósnia',null,null],            ['B','Canadá','Qatar',null,null],
  ['C','Escócia','Marrocos',null,null],        ['C','Brasil','Haiti',null,null],
  ['D','Turquia','Paraguai',null,null],        ['D','EUA','Austrália',null,null],
  ['E','Alemanha','C. do Marfim',null,null],   ['E','Equador','Curaçao',null,null],
  ['F','Tunísia','Japão',null,null],           ['F','Holanda','Suécia',null,null],
  ['G','Bélgica','Irã',null,null],             ['G','N. Zelândia','Egito',null,null],
  ['H','Espanha','A. Saudita',null,null],      ['H','Uruguai','Cabo Verde',null,null],
  ['I','França','Iraque',null,null],           ['I','Noruega','Senegal',null,null],
  ['J','Argentina','Áustria',null,null],       ['J','Jordânia','Argélia',null,null],
  ['K','Portugal','Uzbequistão',null,null],    ['K','Colômbia','RD. Congo',null,null],
  ['L','Inglaterra','Gana',null,null],         ['L','Panamá','Croácia',null,null],
];

if (R2.some(r => r[3] === null || r[4] === null)) {
  console.error('Preencha os placares (golsCasa/golsFora) em R2 antes de rodar o balanço.');
  process.exit(1);
}

const PE = 10, PS = 7, PV = 5;
const sign = x => x > 0 ? 1 : x < 0 ? -1 : 0;
function pts(px, py, ax, ay) {
  if (px === ax && py === ay) return PE;          // placar exato
  if (px - py === ax - ay) return PS;             // vencedor + saldo
  if (sign(px - py) === sign(ax - ay)) return PV; // só vencedor
  return 0;
}
function probsWinner(probs) {
  const m = Math.max(probs.home, probs.draw, probs.away);
  return probs.home === m ? 'casa' : probs.away === m ? 'fora' : 'empate';
}

const totals = { safe:0, conservative:0, aggressive:0 };
const counts = { exato:0, saldo:0, vencedor:0, zero:0 }; // para o palpite seguro
let acertosResultado = 0; // o app previu o vencedor/empate correto (1X2)

console.log('grp | jogo                              | real | seguro cons agres | pts(seg)');
console.log('-'.repeat(92));
for (const [g, a, b, ax, ay] of R2) {
  const st = { defA:100, defB:100, o1:'', oX:'', o2:'', context:'normal' };
  const r = calcGame(a, b, st);
  const real = `${ax}x${ay}`;
  const ps = pts(r.safe.x, r.safe.y, ax, ay);
  const pc = pts(r.conservative.x, r.conservative.y, ax, ay);
  const pg = pts(r.aggressive.x, r.aggressive.y, ax, ay);
  totals.safe += ps; totals.conservative += pc; totals.aggressive += pg;
  if (ps === PE) counts.exato++; else if (ps === PS) counts.saldo++;
  else if (ps === PV) counts.vencedor++; else counts.zero++;

  const predW = probsWinner(r.main.probs);
  const realW = sign(ax-ay) > 0 ? 'casa' : sign(ax-ay) < 0 ? 'fora' : 'empate';
  if (predW === realW) acertosResultado++;

  const jogo = `${a} x ${b}`.padEnd(33).slice(0,33);
  const picks = `${r.safe.x}x${r.safe.y}   ${r.conservative.x}x${r.conservative.y}  ${r.aggressive.x}x${r.aggressive.y}`;
  console.log(`${g}   | ${jogo} | ${real.padEnd(4)} | ${picks.padEnd(17)} | ${ps}`);
}

console.log('-'.repeat(92));
console.log(`\nPontos totais (24 jogos, máx 240):`);
console.log(`  Seguro:       ${totals.safe}`);
console.log(`  Conservador:  ${totals.conservative}`);
console.log(`  Agressivo:    ${totals.aggressive}`);
console.log(`\nDistribuição do palpite SEGURO:`);
console.log(`  Placar exato (10): ${counts.exato}`);
console.log(`  Saldo (7):         ${counts.saldo}`);
console.log(`  Só vencedor (5):   ${counts.vencedor}`);
console.log(`  Zerou (0):         ${counts.zero}`);
console.log(`\nAcerto do resultado 1X2 (favorito do modelo): ${acertosResultado}/24 (${(acertosResultado/24*100).toFixed(0)}%)`);
console.log(`Empates reais na rodada: ${R2.filter(r=>r[3]===r[4]).length}/24`);
