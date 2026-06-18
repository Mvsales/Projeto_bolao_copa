// Ajusta a constante de sensibilidade Elo->gols (o "/850" da fórmula de lambda)
// minimizando a divergência média contra o mercado (10 jogos com odds abertas).
// Não altera o app — só reporta. Uso: node tests/fit-sensibilidade.js
const fs = require('fs');
const path = require('path');
function fakeEl(){return{style:{},dataset:{},value:'',textContent:'',className:'',innerHTML:'',type:'',open:false,addEventListener(){},appendChild(){},querySelector(){return fakeEl();},querySelectorAll(){return[];}};}
const inputs={pE:'10',pS:'7',pV:'5',pH:'80',pT:'2.3'};const els={};
global.document={getElementById(id){if(!els[id]){els[id]=fakeEl();if(inputs[id]!==undefined)els[id].value=inputs[id];}return els[id];},createElement(){return fakeEl();}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const src = fs.readFileSync(path.join(__dirname,'..','output','bolao-copa-2026-v3.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

const code = `
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
const T=2.3, PHOST=80;
function eloProbsD(a,b,D){
  const ea=ELO[a]+(HOSTS.has(a)?PHOST:0), eb=ELO[b]+(HOSTS.has(b)?PHOST:0);
  const dr=ea-eb;
  const la=cl(T/2*Math.pow(10,dr/D)), lb=cl(T/2*Math.pow(10,-dr/D));
  return wdl(matrix(la,lb));
}
function avgDiv(D){
  let s=0;
  for(const g of JOGOS){
    const e=eloProbsD(g[0],g[1],D), m=marketProbabilitiesFromOdds(g[2],g[3],g[4]);
    s+=Math.max(Math.abs(e.home-m.home),Math.abs(e.draw-m.draw),Math.abs(e.away-m.away));
  }
  return s/JOGOS.length;
}
let best=null;
console.log('  D     divMédia');
for(let D=700; D<=1400; D+=25){ const d=avgDiv(D); if(!best||d<best.d) best={D,d}; if(D%100===0) console.log('  '+D+'    '+(d*100).toFixed(2)+' p.p.'); }
for(let D=best.D-25; D<=best.D+25; D+=5){ const d=avgDiv(D); if(d<best.d) best={D,d}; }
console.log('\\nAtual (D=850):  '+(avgDiv(850)*100).toFixed(2)+' p.p.');
console.log('Ótimo (D='+best.D+'): '+(best.d*100).toFixed(2)+' p.p.');
`;
eval(src + code);
