// Alimenta o app com as odds 1X2 (decimais) dos jogos parelhos da 2ª rodada
// e compara o mercado (sem margem) com o modelo Elo. Uso: node tests/odds-r2.js
const fs = require('fs');
const path = require('path');
function fakeEl(){return{style:{},dataset:{},value:'',textContent:'',className:'',innerHTML:'',type:'',open:false,addEventListener(){},appendChild(){},querySelector(){return fakeEl();},querySelectorAll(){return[];}};}
const inputs={pE:'10',pS:'7',pV:'5',pH:'80',pT:'2.3'};const els={};
global.document={getElementById(id){if(!els[id]){els[id]=fakeEl();if(inputs[id]!==undefined)els[id].value=inputs[id];}return els[id];},createElement(){return fakeEl();}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
eval(fs.readFileSync(path.join(__dirname,'..','output','bolao-copa-2026-v3.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1]);

// [casa, fora, odd1, oddX, odd2] — odds decimais da SofaScore (featured), 2ª rodada
const JOGOS = [
  ['Turquia','Paraguai',2.05,3.45,4.00],
  ['R. Tcheca','África do Sul',1.91,3.50,4.55],
  ['México','Coreia do Sul',2.15,3.25,3.90],
  ['EUA','Austrália',1.67,4.15,5.30],
];
const P = v => `${(v*100).toFixed(0)}%`;
for(const [a,b,o1,oX,o2] of JOGOS){
  const stElo={defA:100,defB:100,o1:'',oX:'',o2:'',context:'normal'};
  const stOdds={defA:100,defB:100,o1:String(o1),oX:String(oX),o2:String(o2),context:'normal'};
  const e=calcGame(a,b,stElo), m=calcGame(a,b,stOdds);
  const ep=e.main.probs, mp=m.main.probs;
  console.log(`\n${a} x ${b}   (odds p/ o app: ${o1} / ${oX} / ${o2})`);
  console.log(`  Elo:     ${a} ${P(ep.home)} · X ${P(ep.draw)} · ${b} ${P(ep.away)}  -> seguro ${e.safe.x}x${e.safe.y}`);
  console.log(`  Mercado: ${a} ${P(mp.home)} · X ${P(mp.draw)} · ${b} ${P(mp.away)}  -> seguro ${m.safe.x}x${m.safe.y}`);
  if(m.oddsComparison) console.log(`  Divergência máx: ${(m.oddsComparison.maxDiff*100).toFixed(0)} p.p.${m.oddsComparison.hasAlert?'  *** ALERTA (>=10 p.p.) ***':''}`);
}
