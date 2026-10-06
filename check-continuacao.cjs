const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app-sao-gabriel/index.html','utf8');
const logic=html.slice(html.indexOf('const dias ='),html.indexOf('function render(){'));
vm.runInNewContext(`let data='2026-10-02';const hoje=()=>data,fmt=d=>d,emp=()=>({nome:'Cliente'});const state={solicitacoes:[]};${logic}
const atual={id:'1',empresa:'a',inicio:'2026-09-01',fim:'2026-10-03',autorizada:true};
const proxima={id:'2',empresa:'a',inicio:'2026-10-04',fim:'2026-10-20',autorizada:true};
state.solicitacoes=[atual,proxima];assert(status(atual).t.includes('já OK'));assert.equal(avisos().length,0);assert.equal(status(proxima).t,'Agendada');
proxima.autorizada=false;assert.equal(status(atual).t,'Vence amanhã');
proxima.autorizada=true;proxima.situacao='aguardando';assert.equal(status(atual).t,'Vence amanhã');delete proxima.situacao;
proxima.empresa='b';assert.equal(status(atual).t,'Vence amanhã');proxima.empresa='a';
proxima.inicio='2026-10-05';assert.equal(status(atual).t,'Vence amanhã');proxima.inicio='2026-10-04';
data='2026-10-03';assert(status(atual).t.includes('já OK'));assert.equal(avisos().length,0);
data='2026-10-04';assert(!visivel(atual));assert.equal(status(proxima).t,'Em vigor');
data='2026-10-21';assert(visivel(proxima));assert.equal(status(proxima).t,'Não autorizada');
data='2026-12-30';atual.fim='2026-12-31';proxima.inicio='2027-01-01';proxima.fim='2027-01-10';assert(status(atual).t.includes('já OK'));
`,{assert});
console.log('OK: renovação consecutiva confirmada suprime aviso hoje/amanhã; pendência, intervalo e outra empresa não suprimem; virada do ano e término preservados.');
