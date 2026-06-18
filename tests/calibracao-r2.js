// Calibração Elo x mercado: compara as probabilidades do modelo (Elo atual) com as
// das casas (odds SofaScore, sem margem) nos jogos da 2ª rodada com mercado aberto.
// Uso: node tests/calibracao-r2.js
const fs = require('fs');
const path = require('path');
function fakeEl(){return{style:{},dataset:{},value:'',textContent:'',className:'',innerHTML:'',type:'',open:false,addEventListener(){},appendChild(){},querySelector(){return fakeEl();},querySelectorAll(){return[];}};}
const inputs={pE:'10',pS:'7',pV:'5',pH:'80',pT:'2.3'};const els={};
global.document={getElementById(id){if(!els[id]){els[id]=fakeEl();if(inputs[id]!==undefined)els[id].value=inputs[id];}return els[id];},createElement(){return fakeEl();}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
eval(fs.readFileSync(path.join(__dirname,'..','output','bolao-copa-2026-v3.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1]);

// [casa, fora, odd1, oddX, odd2] — odds decimais (SofaScore featured), 2ª rodada, jogos com mercado aberto
const JOGOS = [
  ['R. Tcheca','África do Sul',1.91,3.50,4.55],
  ['México','Coreia do Sul',2.15,3.25,3.90],
  ['Suíça','Bósnia',1.62,4.00,6.30],
  ['Canadá','Qatar',1.34,5.40,10.50],
  ['Escócia','Marrocos',5.10,3.70,1.80],
  ['Brasil','Haiti',1.15,8.75,26.00],
  ['Turquia','Paraguai',2.05,3.45,4.00],
  ['EUA','Austrália',1.67,4.15,5.30],
  ['Alemanha','C. do Marfim',1.57,4.50,5.90],
  ['Holanda','Suécia',1.80,3.95,4.65],
];
const P = v => `${(v*100).toFixed(0)}%`.padStart(4);
const argmax = p => p.home>=p.draw&&p.home>=p.away?'1':p.away>=p.draw?'2':'X';

let sumAbs=0, n=0, mesmoFav=0, biasFav=0;
console.log('Jogo                            | Elo (1/X/2)        | Mercado (1/X/2)     | divMax | fav');
console.log('-'.repeat(96));
for(const [a,b,o1,oX,o2] of JOGOS){
  const elo=calcGame(a,b,{defA:100,defB:100,o1:'',oX:'',o2:'',context:'normal'});
  const mkt=calcGame(a,b,{defA:100,defB:100,o1:String(o1),oX:String(oX),o2:String(o2),context:'normal'});
  const ep=elo.elo.probs, mp=mkt.main.probs;
  const div=Math.max(Math.abs(ep.home-mp.home),Math.abs(ep.draw-mp.draw),Math.abs(ep.away-mp.away));
  sumAbs+=div; n++;
  const fe=argmax(ep), fm=argmax(mp);
  if(fe===fm) mesmoFav++;
  // viés do Elo no favorito de mercado: Elo - mercado na prob do favorito apontado pela casa
  const favKey = fm==='1'?'home':fm==='2'?'away':'draw';
  biasFav += (ep[favKey]-mp[favKey]);
  const jogo=(a+' x '+b).padEnd(31).slice(0,31);
  const alert=div>=0.10?' *':'  ';
  console.log(`${jogo} | ${P(ep.home)} ${P(ep.draw)} ${P(ep.away)}   | ${P(mp.home)} ${P(mp.draw)} ${P(mp.away)}    | ${(div*100).toFixed(0).padStart(2)} pp${alert}| ${fe===fm?'=':fe+'/'+fm}`);
}
console.log('-'.repeat(96));
console.log(`\nResumo de coerência (${n} jogos):`);
console.log(`  Mesmo favorito Elo x mercado: ${mesmoFav}/${n}`);
console.log(`  Divergência média (máx 1X2):  ${(sumAbs/n*100).toFixed(1)} p.p.`);
console.log(`  Jogos com alerta (>=10 p.p.): ${JOGOS.filter(([a,b,o1,oX,o2])=>{const e=calcGame(a,b,{defA:100,defB:100,o1:'',oX:'',o2:'',context:'normal'}).elo.probs;const m=calcGame(a,b,{defA:100,defB:100,o1:String(o1),oX:String(oX),o2:String(o2),context:'normal'}).main.probs;return Math.max(Math.abs(e.home-m.home),Math.abs(e.draw-m.draw),Math.abs(e.away-m.away))>=0.10;}).length}`);
console.log(`  Viés médio do Elo no favorito da casa: ${(biasFav/n*100>=0?'+':'')}${(biasFav/n*100).toFixed(1)} p.p. (positivo = Elo mais confiante que o mercado)`);
