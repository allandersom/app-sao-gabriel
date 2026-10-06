const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app-sao-gabriel/index.html','utf8');
const logic=html.slice(html.indexOf('const dias ='),html.indexOf('function render(){'));
const ctx=vm.createContext({assert});
vm.runInContext(`let data='2026-10-03';const hoje=()=>data,fmt=d=>d,emp=()=>({nome:'Cliente'});const state={solicitacoes:[]};${logic}
const antiga={id:'1',empresa:'a',inicio:'2026-09-01',fim:'2026-10-02',autorizada:true};
const nova={id:'2',empresa:'a',inicio:'2026-10-03',fim:'2026-10-20',autorizada:true};
state.solicitacoes=[antiga];assert(visivel(antiga));assert.equal(status(antiga).t,'Não autorizada');assert.equal(avisos().length,1);
state.solicitacoes.push(nova);assert(!visivel(antiga));assert(visivel(nova));assert.equal(avisos().length,0);
nova.inicio='2026-10-04';assert(visivel(antiga));assert.equal(status(nova).t,'Agendada');assert.equal(avisos().length,1);
data='2026-10-04';assert(!visivel(antiga));assert.equal(avisos().length,0);
data='2026-10-21';assert(!visivel(antiga));assert(visivel(nova));assert.equal(avisos().length,1);
state.solicitacoes.push({...nova,id:'3',empresa:'b',fim:'2026-10-30'});assert(visivel(nova));
`,ctx);
console.log('OK: última vencida gera aviso; renovação vigente oculta antiga; agendada não cobre intervalo; múltiplas vencidas geram um aviso; empresas independentes.');
