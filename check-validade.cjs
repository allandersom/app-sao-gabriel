const fs=require('fs'),assert=require('assert');
const {chromium}=require('C:/Users/LOGISTICA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({timezoneId:'Asia/Tokyo'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-02T23:59:59-03:00')});
 await page.clock.pauseAt(new Date('2026-10-02T23:59:59-03:00'));
 await page.route('https://app.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="app"></div>'}));await page.goto('https://app.test/');
 await page.addScriptTag({content:`const firebaseConfig={apiKey:'test',authDomain:'test',projectId:'test',appId:'test'};
const initializeApp=()=>({}),getFirestore=()=>({}),getAuth=()=>({currentUser:null}),iniciarComercial=()=>()=>{},iniciarEstoque=()=>({mostrar:()=>{},locais:()=>[]}),signOut=async()=>{},signInWithEmailAndPassword=async()=>{};
const doc=()=>({}),collection=(_,c)=>c,runTransaction=async()=>{},addDoc=async()=>{},deleteDoc=async()=>{},writeBatch=()=>({});
const datasets={empresas:[{id:'e1',nome:'Empresa com duas autorizações',endereco:''}],solicitacoes:[
{id:'antiga',empresa:'e1',inicio:'2026-09-01',fim:'2026-10-02',autorizada:true,qtd:2},
{id:'nova',empresa:'e1',inicio:'2026-10-01',fim:'2026-10-20',autorizada:true,qtd:3},
{id:'anterior',empresa:'e1',inicio:'2026-09-01',fim:'2026-10-01',autorizada:true,qtd:7},
{id:'pendente',empresa:'e1',inicio:'2026-09-01',fim:'2026-10-01',autorizada:false,situacao:'aguardando',qtd:1}]};
const onSnapshot=(ref,fn)=>{queueMicrotask(()=>fn({docs:datasets[ref].map(x=>({id:x.id,data:()=>x}))}));};const onAuthStateChanged=(a,fn)=>{queueMicrotask(()=>fn(null));};`});
 const script=fs.readFileSync('app-sao-gabriel/index.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'');await page.addScriptTag({content:'(()=>{'+script+'})();'});
 assert.equal(await page.locator('.item').count(),3);
 assert.equal(await page.locator('.alert').filter({hasText:'vence hoje'}).count(),1);
 assert.equal(await page.locator('.stat b').nth(1).textContent(),'5');
 await page.clock.runFor(1200);
 assert.equal(await page.locator('.item').count(),2);
 assert.equal(await page.locator('.alert').filter({hasText:'vence'}).count(),0);
 assert.equal(await page.locator('.stat b').nth(1).textContent(),'3');
 assert.equal(await page.getByText('Em vigor',{exact:true}).count(),1);
 assert.equal(await page.getByText('Aguardando autorização',{exact:true}).count(),1);
 assert.deepEqual(errors,[]);
 console.log('OK: duas autorizações na mesma empresa; antiga e aviso somem à meia-noite de Brasília, nova permanece, total é recalculado e pendência é preservada.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
