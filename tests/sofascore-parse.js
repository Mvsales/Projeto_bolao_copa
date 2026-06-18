// Parser OFFLINE da API da SofaScore (contorna o Cloudflare sem automação:
// você abre a URL no seu Chrome normal, salva o JSON num arquivo, e roda isto).
//
// Uso:
//   node tests/sofascore-parse.js <arquivo.json>
//
// - Se o JSON for de uma RODADA (.../events/round/N): mapeia os nomes para o
//   padrão do bolão, extrai os placares dos jogos encerrados, grava
//   tests/results-r{N}.json e imprime o array pronto para colar. Os scripts
//   balanco-r{N}.js e update-elo-r{N}.js passam a ler esse results-r{N}.json.
// - Se o JSON for de ODDS (.../event/{id}/odds/...): imprime 1X2 em decimal.
const fs = require('fs');
const path = require('path');

// --- nomes SofaScore (EN) -> bolão (PT). Chave normalizada (sem acento/pontuação). ---
const RAW_MAP = {
  'Mexico':'México','South Korea':'Coreia do Sul','South Africa':'África do Sul','Czechia':'R. Tcheca',
  'Canada':'Canadá','Bosnia & Herzegovina':'Bósnia','Qatar':'Qatar','Switzerland':'Suíça',
  'Brazil':'Brasil','Morocco':'Marrocos','Scotland':'Escócia','Haiti':'Haiti',
  'USA':'EUA','United States':'EUA','Paraguay':'Paraguai','Australia':'Austrália','Türkiye':'Turquia','Turkey':'Turquia',
  'Germany':'Alemanha','Curaçao':'Curaçao','Côte d\'Ivoire':'C. do Marfim','Ivory Coast':'C. do Marfim','Ecuador':'Equador',
  'Netherlands':'Holanda','Japan':'Japão','Sweden':'Suécia','Tunisia':'Tunísia',
  'Belgium':'Bélgica','Egypt':'Egito','Iran':'Irã','New Zealand':'N. Zelândia',
  'Spain':'Espanha','Cabo Verde':'Cabo Verde','Cape Verde':'Cabo Verde','Saudi Arabia':'A. Saudita','Uruguay':'Uruguai',
  'France':'França','Senegal':'Senegal','Iraq':'Iraque','Norway':'Noruega',
  'Argentina':'Argentina','Algeria':'Argélia','Austria':'Áustria','Jordan':'Jordânia',
  'Portugal':'Portugal','DR Congo':'RD. Congo','Congo DR':'RD. Congo','DR Congo (Congo-Kinshasa)':'RD. Congo','Uzbekistan':'Uzbequistão','Colombia':'Colômbia',
  'England':'Inglaterra','Croatia':'Croácia','Ghana':'Gana','Panama':'Panamá',
};
const norm = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const MAP = {};
for (const [k,v] of Object.entries(RAW_MAP)) MAP[norm(k)] = v;
function toBolao(name){
  const b = MAP[norm(name)];
  if (!b) throw new Error(`Nome sem mapeamento: "${name}" (normalizado: ${norm(name)}). Adicione em RAW_MAP.`);
  return b;
}

function frac2dec(v){
  if (v == null) return null;
  if (typeof v === 'number') return v > 1 ? v : 1 + v;       // já decimal
  const m = String(v).match(/^(\d+)\s*\/\s*(\d+)$/);          // fracionário a/b
  if (m) return +(1 + (+m[1])/(+m[2])).toFixed(2);
  const f = parseFloat(v);
  return Number.isFinite(f) ? (f > 1 ? f : +(1+f).toFixed(2)) : null;
}

// procura recursivamente um conjunto de choices 1/X/2 (com fractionalValue) num objeto de odds
function find1x2(node){
  let found = null;
  (function walk(n){
    if (found || !n || typeof n !== 'object') return;
    if (Array.isArray(n)){
      const names = n.map(c => c && (c.name || c.choice));
      if (names.includes('1') && names.includes('X') && names.includes('2')){
        const get = nm => n.find(c => (c.name||c.choice) === nm);
        const val = c => c && (c.fractionalValue ?? c.decimalValue ?? c.value);
        found = { home: frac2dec(val(get('1'))), draw: frac2dec(val(get('X'))), away: frac2dec(val(get('2'))) };
        return;
      }
      n.forEach(walk); return;
    }
    Object.values(n).forEach(walk);
  })(node);
  return found;
}

// --- main ---
const file = process.argv[2];
if (!file){ console.error('Uso: node tests/sofascore-parse.js <arquivo.json>'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (Array.isArray(data.events)) {
  // ---- JSON de rodada ----
  const ev = data.events;
  let round = null;
  const rows = [];
  for (const e of ev){
    round = round ?? e.roundInfo?.round ?? e.round?.round ?? null;
    const home = toBolao(e.homeTeam?.name), away = toBolao(e.awayTeam?.name);
    const fin = (e.status?.type === 'finished') || (e.status?.code === 100);
    const gh = fin ? (e.homeScore?.current ?? e.homeScore?.normaltime ?? null) : null;
    const ga = fin ? (e.awayScore?.current ?? e.awayScore?.normaltime ?? null) : null;
    rows.push({ home, away, gh, ga, fin });
  }
  const done = rows.filter(r => r.fin && r.gh != null && r.ga != null);
  console.log(`Rodada ${round ?? '?'}: ${ev.length} jogos, ${done.length} encerrados.\n`);

  // grava results-r{N}.json (mapa "casa|fora" -> [gh,ga]) só com os encerrados
  const out = {};
  for (const r of done) out[`${r.home}|${r.away}`] = [r.gh, r.ga];
  if (round != null){
    const outPath = path.join(__dirname, `results-r${round}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`Gravado ${path.relative(path.join(__dirname,'..'), outPath)} (${done.length} placares).`);
    console.log(`Agora rode:  node tests/balanco-r${round}.js   e   node tests/update-elo-r${round}.js\n`);
  }
  console.log('Placares lidos:');
  for (const r of rows){
    console.log(`  ${(r.home+' x '+r.away).padEnd(34)} ${r.fin ? `${r.gh} x ${r.ga}` : '(não encerrado)'}`);
  }
} else {
  // ---- JSON de odds ----
  const odds = find1x2(data);
  if (!odds){ console.error('Não encontrei o mercado 1X2 neste JSON. É um arquivo de odds (event/{id}/odds/...)?'); process.exit(1); }
  const f = v => Number(v).toFixed(2);
  console.log('Odds 1X2 (decimal, prontas para o app):');
  console.log(`  1 (casa):   ${f(odds.home)}`);
  console.log(`  X (empate): ${f(odds.draw)}`);
  console.log(`  2 (fora):   ${f(odds.away)}`);
  console.log(`\nNo app, cole no campo de odds:  ${f(odds.home)} / ${f(odds.draw)} / ${f(odds.away)}`);
}
