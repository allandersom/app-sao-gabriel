import {doc,collection,runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const normalizar=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
export function prepararImportacao(input,existentes){
  if(!input||!Array.isArray(input.empresas)||!input.empresas.length||input.empresas.length>200)throw Error('Lista de empresas inválida.');
  let total=0,obras=0;const nomes=new Set();
  const empresas=input.empresas.map(e=>{
    if(typeof e.nome!=='string'||!e.nome.trim()||e.nome.length>160||!Array.isArray(e.obras)||!e.obras.length||e.obras.length>200)throw Error('Empresa ou obras inválidas.');
    const nome=e.nome.trim(),key=normalizar(nome);if(nomes.has(key))throw Error('Empresa repetida: '+nome);nomes.add(key);
    const matches=existentes.filter(x=>normalizar(x.nome)===key);if(matches.length>1)throw Error('Há mais de um cadastro para '+nome+'. Revise antes de importar.');
    const ids=new Set(),lista=e.obras.map(o=>{
      if(typeof o.nome!=='string'||!o.nome.trim()||o.nome.length>160||!Number.isInteger(o.qtdCaixas)||o.qtdCaixas<0||o.qtdCaixas>100000)throw Error('Nome ou quantidade da obra inválidos.');
      const endereco=String(o.endereco||'').trim();if(endereco.length>300)throw Error('Endereço muito longo.');
      const obraKey=normalizar(o.nome)+'|'+normalizar(endereco);if(ids.has(obraKey))throw Error('Obra repetida em '+nome);ids.add(obraKey);total+=o.qtdCaixas;obras++;
      return {nome:o.nome.trim(),endereco,qtdCaixas:o.qtdCaixas,ultimaTrocaCaixas:''};
    });return {nome,existente:matches[0]||null,obras:lista};
  });
  if(input.total!==total)throw Error('A soma das obras não confere com o total do arquivo.');
  const substituidos=(input.substituirCaixas||[]).map(x=>{const e=existentes.find(e=>e.id===x.id);if(!e||e.nome!==x.nome||e.qtdCaixas!==x.quantidade||Array.isArray(e.obrasCaixas))throw Error('Cadastro alterado ou inválido para substituição.');if(empresas.some(c=>c.existente?.id===e.id))throw Error('Substituição conflita com empresa importada.');return e;});
  return {empresas,substituidos,total,obras};
}
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export function montarImportacao(root,db,auth,fontes,ocupado){
  if(auth.currentUser?.email!=='kewen.allan.nave@gmail.com')return;
  const detail=document.createElement('details');detail.className='panel';detail.innerHTML='<summary>Importar empresas e obras</summary><label for="caixas-json">Cadastros em JSON</label><textarea id="caixas-json" rows="5" style="width:100%"></textarea><button type="button" class="btn g" id="caixas-revisar">Conferir importação</button><div id="caixas-import-msg" role="status"></div><button type="button" class="btn" id="caixas-importar" hidden>Importar cadastros conferidos</button>';root.prepend(detail);
  let plano=null;const msg=detail.querySelector('#caixas-import-msg'),salvar=detail.querySelector('#caixas-importar'),entrada=detail.querySelector('textarea');
  entrada.oninput=()=>{plano=null;salvar.hidden=true;msg.textContent='';};
  detail.querySelector('#caixas-revisar').onclick=()=>{try{plano=prepararImportacao(JSON.parse(entrada.value),fontes().empresas);msg.textContent=`${plano.empresas.length} empresas, ${plano.obras} obras, ${plano.total} caçambas. ${plano.substituidos.length} cadastros antigos terão o saldo transferido para os grupos da planilha. Datas de troca em branco. Caminhões e usina ficam preservados.`;salvar.hidden=false;}catch(e){plano=null;salvar.hidden=true;msg.textContent=e.message;}};
  salvar.onclick=async()=>{
    if(!plano||auth.currentUser?.email!=='kewen.allan.nave@gmail.com')return;
    detail.querySelectorAll('button').forEach(b=>b.disabled=true);entrada.disabled=true;const p=plano;ocupado(true);
    try{
      const entries=p.empresas.map(e=>({e,ref:e.existente?doc(db,'empresas',e.existente.id):doc(collection(db,'empresas')),obras:e.obras.map(o=>({...o,id:crypto.randomUUID()}))}));
      await runTransaction(db,async tx=>{
        const refs=[...entries.map(x=>x.ref),...p.substituidos.map(e=>doc(db,'empresas',e.id))],snaps=[];for(const ref of refs)snaps.push(await tx.get(ref));
        entries.forEach((x,i)=>{const snap=snaps[i];if(x.e.existente&&(!snap.exists()||canonical(snap.data())!==canonical(Object.fromEntries(Object.entries(x.e.existente).filter(([k])=>k!=='id')))))throw Error('Um cadastro mudou durante a conferência. Recarregue e confira novamente.');if(!x.e.existente&&snap.exists())throw Error('Cadastro já existe.');});
        p.substituidos.forEach((e,i)=>{const snap=snaps[entries.length+i];if(!snap.exists()||snap.data().nome!==e.nome||snap.data().qtdCaixas!==e.qtdCaixas||Array.isArray(snap.data().obrasCaixas))throw Error('Um saldo antigo mudou. Confira novamente.');});
        entries.forEach(x=>{const data={obrasCaixas:x.obras,qtdCaixas:x.obras.reduce((n,o)=>n+o.qtdCaixas,0)};if(x.e.existente)tx.update(x.ref,data);else tx.set(x.ref,{nome:x.e.nome,endereco:'',...data});});
        p.substituidos.forEach(e=>tx.update(doc(db,'empresas',e.id),{qtdCaixas:0,obrasCaixas:[]}));
      });plano=null;salvar.hidden=true;entrada.value='';msg.textContent=`Importação concluída: ${p.empresas.length} empresas, ${p.obras} obras e ${p.total} caçambas.`;
    }catch(e){msg.textContent=e.message||'Não foi possível importar.';}
    finally{ocupado(false);detail.querySelectorAll('button').forEach(b=>b.disabled=false);entrada.disabled=false;}
  };
}
