// Testes da lógica do bolão v3. Uso: node tests/run.js (a partir da raiz do projeto).
// Extrai o <script> do HTML, roda com stubs de DOM/localStorage e avalia asserts.js no mesmo escopo.
const fs = require('fs');
const path = require('path');

function fakeEl() {
  return {
    style: {}, dataset: {}, value: '', textContent: '', className: '', innerHTML: '',
    type: '', open: false,
    addEventListener() {}, appendChild() {},
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
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
const asserts = fs.readFileSync(path.join(__dirname, 'asserts.js'), 'utf8');
eval(src + '\n' + asserts);
