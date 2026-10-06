const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app-sao-gabriel/index.html','utf8');
new vm.Script(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,''));
const source=html.slice(html.indexOf('async function criarSolicitacaoDoPedido'),html.indexOf('async function salvarEmp'));
const docs=new Map();
const ctx={admin:true,state:{empresas:[]},db:{},doc:(_,c,id)=>c+'/'+id,
 runTransaction:async(_,fn)=>fn({get:async r=>({exists:()=>docs.has(r)}),set:(r,d)=>docs.set(r,d)})};
vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{
 const pedido={id:'teste',empresa:'Empresa teste',endereco:'Rua teste',inicio:'2026-10-01',fim:'2026-10-07',quantidade:2};
 await ctx.criarSolicitacaoDoPedido(pedido);
 const ref='solicitacoes/comercial_teste';assert.equal(docs.get(ref).situacao,'aguardando');assert.equal(docs.get(ref).autorizada,false);assert.equal(docs.size,2);
 docs.get(ref).situacao='autorizada';docs.get(ref).autorizada=true;
 await ctx.criarSolicitacaoDoPedido(pedido);assert.equal(docs.size,2);assert.equal(docs.get(ref).situacao,'autorizada');
 ctx.admin=false;await assert.rejects(()=>ctx.criarSolicitacaoDoPedido({...pedido,id:'outro'}));
 assert(html.includes('transaction.update(ref, { autorizada: true, situacao: \'autorizada\' })'));
 console.log('OK: sintaxe, criação aguardando, repetição sem duplicar/rebaixar e restrição administrativa.');
})().catch(e=>{console.error(e);process.exit(1)});
