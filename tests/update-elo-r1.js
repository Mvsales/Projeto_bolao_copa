// Atualiza os ratings Elo após a 1ª rodada pelo método eloratings.net.
// K=60 (Copa), G por saldo de gols, mando de 100 só p/ anfitriões em casa.
// Uso: node tests/update-elo-r1.js   (imprime tabela + objeto ELO novo)
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'output', 'bolao-copa-2026-v3.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
// extrai só o objeto ELO e HOSTS
global.document = { getElementById:()=>({value:''}) };
const ELO = eval('(' + src.match(/const ELO = (\{[\s\S]*?\});/)[1] + ')');
const HOSTS = new Set(['México','EUA','Canadá']);

const R1 = [
  ['México','África do Sul',2,0], ['Coreia do Sul','R. Tcheca',2,1],
  ['Canadá','Bósnia',1,1], ['Qatar','Suíça',1,1],
  ['Brasil','Marrocos',1,1], ['Haiti','Escócia',0,1],
  ['EUA','Paraguai',4,1], ['Austrália','Turquia',2,0],
  ['Alemanha','Curaçao',7,1], ['C. do Marfim','Equador',1,0],
  ['Holanda','Japão',2,2], ['Suécia','Tunísia',5,1],
  ['Bélgica','Egito',1,1], ['Irã','N. Zelândia',2,2],
  ['Espanha','Cabo Verde',0,0], ['A. Saudita','Uruguai',1,1],
  ['França','Senegal',3,1], ['Iraque','Noruega',1,4],
  ['Argentina','Argélia',3,0], ['Áustria','Jordânia',3,1],
  ['Portugal','RD. Congo',1,1], ['Uzbequistão','Colômbia',1,3],
  ['Inglaterra','Croácia',4,2], ['Gana','Panamá',1,0],
];

const K = 60, HOME = 100;
function gIndex(diff) {
  const n = Math.abs(diff);
  if (n <= 1) return 1;
  if (n === 2) return 1.5;
  return (11 + n) / 8;
}
function expected(drm) { return 1 / (Math.pow(10, -drm / 400) + 1); }

const newElo = { ...ELO };
const rows = [];
for (const [a, b, ax, ay] of R1) {
  const ha = HOSTS.has(a) ? HOME : 0;
  const hb = HOSTS.has(b) ? HOME : 0;
  const dr = (ELO[a] + ha) - (ELO[b] + hb);
  const Wa = ax > ay ? 1 : ax === ay ? 0.5 : 0;
  const G = gIndex(ax - ay);
  const ea = expected(dr);
  const dA = Math.round(K * G * (Wa - ea));
  newElo[a] += dA;
  newElo[b] -= dA; // jogo zero-soma
  rows.push([a, b, `${ax}x${ay}`, dA]);
}

// tabela de variação por seleção
console.log('Variação de Elo por seleção (1ª rodada):');
const deltas = Object.keys(ELO).map(t => [t, ELO[t], newElo[t], newElo[t]-ELO[t]])
  .sort((p,q)=>q[3]-p[3]);
for (const [t, o, n, d] of deltas) {
  const s = d>0?`+${d}`:`${d}`;
  console.log(`  ${t.padEnd(16)} ${o} -> ${n}  (${s})`);
}

// objeto ELO formatado igual ao HTML (4 por linha)
const order = Object.keys(ELO);
let out = 'const ELO = {\n';
for (let i = 0; i < order.length; i += 4) {
  out += order.slice(i, i+4).map(t => `"${t}":${newElo[t]}`).join(',') + ',\n';
}
out = out.replace(/,\n$/, '};\n');
console.log('\n' + out);
