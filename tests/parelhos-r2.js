// Lista os jogos da 2ª rodada ordenados por equilíbrio (prob. do favorito),
// usando o Elo ATUAL do HTML. Marca os "parelhos" (favorito < 50% ou empate competitivo).
const fs = require('fs');
const path = require('path');
function fakeEl(){return{style:{},dataset:{},value:'',textContent:'',className:'',innerHTML:'',type:'',open:false,addEventListener(){},appendChild(){},querySelector(){return fakeEl();},querySelectorAll(){return[];}};}
const inputs={pE:'10',pS:'7',pV:'5',pH:'80',pT:'2.3'};const els={};
global.document={getElementById(id){if(!els[id]){els[id]=fakeEl();if(inputs[id]!==undefined)els[id].value=inputs[id];}return els[id];},createElement(){return fakeEl();}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(__dirname,'..','output','bolao-copa-2026-v3.html'),'utf8');
eval(html.match(/<script>([\s\S]*)<\/script>/)[1]);

const R2=[
  ['A','R. Tcheca','África do Sul'],['A','México','Coreia do Sul'],
  ['B','Suíça','Bósnia'],['B','Canadá','Qatar'],
  ['C','Escócia','Marrocos'],['C','Brasil','Haiti'],
  ['D','Turquia','Paraguai'],['D','EUA','Austrália'],
  ['E','Alemanha','C. do Marfim'],['E','Equador','Curaçao'],
  ['F','Tunísia','Japão'],['F','Holanda','Suécia'],
  ['G','Bélgica','Irã'],['G','N. Zelândia','Egito'],
  ['H','Espanha','A. Saudita'],['H','Uruguai','Cabo Verde'],
  ['I','França','Iraque'],['I','Noruega','Senegal'],
  ['J','Argentina','Áustria'],['J','Jordânia','Argélia'],
  ['K','Portugal','Uzbequistão'],['K','Colômbia','RD. Congo'],
  ['L','Inglaterra','Gana'],['L','Panamá','Croácia'],
];
const st={defA:100,defB:100,o1:'',oX:'',o2:'',context:'normal'};
const rows=R2.map(([g,a,b])=>{
  const r=calcGame(a,b,st);
  const p=r.main.probs;
  const fav=Math.max(p.home,p.draw,p.away);
  return {g,a,b,p,fav,cd:r.competitiveDraw,risk:r.risk.label};
});
rows.sort((x,y)=>x.fav-y.fav);
console.log('Jogos da 2ª rodada ordenados por equilíbrio (favorito %):\n');
for(const r of rows){
  const flag = (r.fav<0.50||r.cd) ? ' <== PARELHO' : '';
  console.log(`${r.g} | ${(r.a+' x '+r.b).padEnd(30)} | ${r.a} ${(r.p.home*100).toFixed(0)}% / X ${(r.p.draw*100).toFixed(0)}% / ${r.b} ${(r.p.away*100).toFixed(0)}% | risco ${r.risk}${flag}`);
}
