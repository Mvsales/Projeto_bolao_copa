let fails = 0;
function check(name, cond, extra) {
  if (cond) { console.log('PASS ' + name); }
  else { fails++; console.log('FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); }
}

// 1. Deflator vazio = força total (bug corrigido)
check('deflator vazio nao penaliza', adjustedElo('Brasil', '') === ELO['Brasil']);
// 2. Digitação parcial (ex: "9" a caminho de "95") = força total
check('deflator parcial 9 ignorado', adjustedElo('Brasil', 9) === ELO['Brasil']);
// 3. Deflator válido aplica penalidade de 20/ponto
check('deflator 95 = -100 Elo', adjustedElo('Brasil', 95) === ELO['Brasil'] - 100);
// 4. Fora da faixa (>100) ignorado
check('deflator 120 ignorado', adjustedElo('Brasil', 120) === ELO['Brasil']);

// 5. Matriz Poisson com MAXG=10 cobre quase toda a massa mesmo com lambda alto
const w45 = wdl(matrix(4.5, 0.5));
const mass = w45.home + w45.draw + w45.away;
check('massa da matriz ~1 (lambda 4.5)', mass > 0.99, mass);

// 6. Jogo via Elo: probabilidades coerentes, picks definidos
const stNormal = { defA: 100, defB: 100, o1: '', oX: '', o2: '', context: 'normal' };
const r1 = calcGame('México', 'África do Sul', stNormal);
check('fonte elo', r1.fonte === 'elo');
const sum1 = r1.main.probs.home + r1.main.probs.draw + r1.main.probs.away;
check('probs somam ~1', sum1 > 0.99 && sum1 <= 1.001, sum1);
check('mandante forte favorito', r1.main.probs.home > 0.5, r1.main.probs);
check('safe definido', Number.isInteger(r1.safe.x) && Number.isInteger(r1.safe.y));
check('agressivo != seguro', r1.aggressive.x !== r1.safe.x || r1.aggressive.y !== r1.safe.y,
  { safe: r1.safe, agg: r1.aggressive });

// 7. Jogo via odds: fonte muda, probs = mercado sem margem
const stOdds = { defA: 100, defB: 100, o1: 1.85, oX: 3.4, o2: 4.2, context: 'normal' };
const r2 = calcGame('Coreia do Sul', 'R. Tcheca', stOdds);
check('fonte odds', r2.fonte === 'odds');
const mkt = marketProbabilitiesFromOdds(1.85, 3.4, 4.2);
check('probs principais = mercado', Math.abs(r2.main.probs.home - mkt.home) < 1e-9);
check('comparacao elo vs odds presente', r2.oddsComparison && typeof r2.oddsComparison.maxDiff === 'number');

// 8. Contexto ajusta Elo e alerta
const stCtx = { defA: 100, defB: 100, o1: '', oX: '', o2: '', context: 'a_classificado' };
const r3 = calcGame('Coreia do Sul', 'R. Tcheca', stCtx);
check('contexto -60 Elo no time A', r3.elo.adjustedA === ELO['Coreia do Sul'] - 60, r3.elo.adjustedA);
check('alerta de contexto', r3.elo.context.alert.length > 0);

// 9. Risco em três níveis
check('risco valido', ['low', 'medium', 'high'].includes(r1.risk.cls), r1.risk);

// 10. lambdasFromOdds reproduz o mercado razoavelmente
const fit = lambdasFromOdds(1.85, 3.4, 4.2);
const fitProbs = wdl(matrix(fit.la, fit.lb));
check('fit das odds com erro pequeno', Math.abs(fitProbs.home - mkt.home) < 0.03,
  { fit: fitProbs, mkt });

// 11. Persistência: saveState/loadState round-trip
let stored = null;
global.localStorage = {
  getItem: () => stored,
  setItem: (k, v) => { stored = v; },
  removeItem: () => { stored = null; },
};
gameState['A-0'] = { defA: 95, defB: 100, o1: 1.5, oX: 4.0, o2: 6.0, context: 'jogo_morto' };
ELO['Brasil'] = 2050;
saveState();
gameState['A-0'].defA = 100;
ELO['Brasil'] = 2030;
loadState();
check('loadState restaura jogo', gameState['A-0'].defA === 95 && gameState['A-0'].context === 'jogo_morto');
check('loadState restaura Elo', ELO['Brasil'] === 2050);

process.exit(fails === 0 ? 0 : 1);
