const assert=require('assert');
const {chromium}=require('C:/Users/LOGISTICA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://saogabriel-sgc-soli.web.app',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Controle de caixas',exact:true}).click();
 await page.getByRole('heading',{name:'Controle de caixas',exact:true}).waitFor();
 await page.getByText('Nenhum local cadastrado.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('OK: aplicativo publicado, aba de caixas carregada, leitura do estoque e layout mobile sem erros.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
