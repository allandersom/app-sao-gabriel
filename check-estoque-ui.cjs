const fs=require('fs'),assert=require('assert');
const {chromium}=require('C:/Users/LOGISTICA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('https://app.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="app"></div>'}));await page.goto('https://app.test/');
 await page.addStyleTag({content:fs.readFileSync('app-sao-gabriel/style.css','utf8')});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addScriptTag({content:`
window.auth={currentUser:{uid:'admin-test',email:'kewen.allan.nave@gmail.com'}};
window.rows=new Map();window.listeners=[];
const doc=(_,c,id)=>({id,key:c+'/'+id}),collection=(_,c)=>c,serverTimestamp=()=>({seconds:Date.now()/1000}),query=(...x)=>x,orderBy=(...x)=>x,limit=x=>x,startAfter=x=>x,where=(...x)=>x;
function snap(ref){return {exists:()=>rows.has(ref.key),data:()=>structuredClone(rows.get(ref.key))};}
function onSnapshot(ref,fn){listeners.push(()=>fn(snap(ref)));queueMicrotask(()=>fn(snap(ref)));return ()=>{};}
async function runTransaction(_,fn){const changes=[];await fn({get:async r=>snap(r),set:(r,d)=>changes.push([r,d]),update:(r,d)=>changes.push([r,{...rows.get(r.key),...d}])});changes.forEach(([r,d])=>rows.set(r.key,d));setTimeout(()=>listeners.forEach(f=>f()),0);}
async function getDocs(){const docs=[...rows.entries()].filter(([k])=>k.startsWith('estoque_movimentos/')).map(([key,data])=>({id:key.split('/')[1],data:()=>data}));return {docs,size:docs.length};}
`});
 await page.addScriptTag({content:fs.readFileSync('app-sao-gabriel/estoque-core.js','utf8').replaceAll('export ','')});
 await page.addScriptTag({content:fs.readFileSync('app-sao-gabriel/estoque.js','utf8').replace(/^import .*$/gm,'').replace('export function','function')+`\nwindow.stock=iniciarEstoque({},auth,()=>({empresas:[{id:'empresa',nome:'Empresa teste'}],solicitacoes:[]}));stock.mostrar(true);`});
 await page.getByRole('button',{name:'+ Local',exact:true}).click();
 await page.locator('#est-local-tipo').selectOption('usina');await page.locator('#est-nome').fill('Usina principal');await page.getByRole('button',{name:'Cadastrar local',exact:true}).click();
 await page.getByText('Usina principal',{exact:true}).waitFor();
 await page.getByRole('button',{name:'+ Movimentação',exact:true}).click();await page.locator('#est-destino').selectOption({label:'Usina principal (0 caixas)'});await page.locator('#est-qtd').fill('20');await page.locator('#est-motivo').fill('Contagem conferida');await page.getByRole('button',{name:'Registrar movimentação',exact:true}).click();
 await page.waitForFunction(()=>[...rows.values()].some(r=>r.locais?.some(l=>l.saldo===20)));
 await page.getByRole('button',{name:'Histórico',exact:true}).click();await page.getByRole('button',{name:'Estornar',exact:true}).waitFor();
 await page.locator('#est-dia-historico').fill(await page.evaluate(()=>diaSP()));await page.getByRole('button',{name:'Consultar posição',exact:true}).click();await page.getByText(/20 caixa\(s\) em/).waitFor();
 await page.getByRole('button',{name:'Saldos',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'estoque-mobile.png',fullPage:true});
 await page.evaluate(()=>{auth.currentUser=null;stock.mostrar(true)});assert.equal(await page.getByRole('button',{name:'+ Local',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Histórico',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('OK UI: cadastro, saldo inicial, histórico, posição por data, visitante sem alterações, layout mobile. Dados simulados.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
