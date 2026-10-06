import {doc,collection,onSnapshot,runTransaction,serverTimestamp,query,orderBy,limit,getDocs,startAfter,where} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {TIPOS,diaSP,totais,movimentar,posicaoEm,alertaObra} from './estoque-core.js';
const ADMIN='kewen.allan.nave@gmail.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataBR=d=>d?d.split('-').reverse().join('/'):'—';
export function iniciarEstoque(db,auth,fontes){
  const root=document.createElement('section');root.className='wrap estoque-area';root.hidden=true;document.querySelector('#app').after(root);
  const ref=doc(db,'estoque','atual');let locais=[],ready=false,error='',busy=false,formId=crypto.randomUUID(),historico=[],cursor=null,more=false;
  let filtro='',aba='saldos',historicoDate='',historicoSaldos=null,unsubscribe=null,loadedUser=null;
  const admin=()=>auth.currentUser?.email===ADMIN;
  const equipe=()=>[ADMIN,'adm2@saogabrieltransportes.com.br'].includes(auth.currentUser?.email);
  const mensagens=(text)=>{const n=root.querySelector('#est-msg');if(n)n.textContent=text;};
  const localOptions=(tipo)=>'<option value="">Selecione</option>'+locais.filter(l=>l.ativo&&(!tipo||l.tipo===tipo)).map(l=>`<option value="${esc(l.id)}">${esc(l.nome)} (${l.saldo} caixas)</option>`).join('');
  function formMov(){return `<form id="est-mov" class="panel"><h3>Registrar movimentação</h3>
    <div class="row"><div><label for="est-tipo">Operação</label><select id="est-tipo" name="tipo">${['troca','entrega','retirada'].map(k=>`<option value="${k}">${TIPOS[k]}</option>`).join('')}</select></div>
    <div><label for="est-data">Data</label><input id="est-data" name="data" type="date" max="${diaSP()}" value="${diaSP()}" required></div></div>
    <p class="sub" id="est-ajuda"></p><div class="row"><div id="est-origem-box"><label for="est-origem">Origem</label><select id="est-origem" name="origem"></select></div>
    <div><label for="est-destino">Destino / local</label><select id="est-destino" name="destino" required></select></div></div>
    <div><label for="est-qtd" id="est-qtd-label">Quantidade</label><input id="est-qtd" name="quantidade" type="number" min="0" max="100000" step="1" required></div>
    <div><label for="est-motivo">Motivo / observação</label><input id="est-motivo" name="motivo" maxlength="500"></div>
    <button class="btn" type="submit">Registrar movimentação</button></form>`;}
  function formLocal(){return `<form id="est-local" class="panel"><h3>Cadastrar local</h3><div class="row"><div><label for="est-local-tipo">Tipo</label><select id="est-local-tipo" name="tipo"><option value="obra">Obra / cliente</option><option value="veiculo">Veículo</option><option value="usina">Usina / pátio</option></select></div>
    <div><label for="est-nome">Nome da obra, placa ou nome do pátio</label><input id="est-nome" name="nome" maxlength="160" required></div></div>
    <div id="est-obra-fields"><label for="est-empresa">Empresa responsável</label><select id="est-empresa" name="empresa"><option value="">Selecione uma empresa cadastrada</option>${fontes().empresas.filter(e=>!e.arquivada).map(e=>`<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('')}</select>
    <label for="est-endereco">Endereço da obra</label><input id="est-endereco" name="endereco" maxlength="300"></div>
    <p class="sub">O local começa com zero caixas. Cadastre empresas na aba Empresas.</p><button class="btn" type="submit">Cadastrar local</button></form>`;}
  function draw(){
    const t=totais(locais);
    root.innerHTML=`<div class="section-heading"><h2>Controle de caixas</h2><span>Quantidade por local</span></div>
      <p class="sub">Saldos físicos. Entregas e retiradas são registradas separadamente das autorizações.</p>
      <div id="est-msg" class="alert" role="status" aria-live="polite">${esc(error||(!ready?'Carregando saldos…':''))}</div>
      <div class="stats estoque-stats">${[['obra','Nos clientes'],['veiculo','Nos veículos'],['usina','Na usina'],['total','Total geral']].map(([k,n])=>`<div class="stat"><b>${ready?t[k]:'—'}</b><span>${n}</span></div>`).join('')}</div>
      <div class="est-actions"><button class="btn ${aba==='saldos'?'':'g'}" data-est-aba="saldos">Saldos</button>${equipe()?`<button class="btn ${aba==='historico'?'':'g'}" data-est-aba="historico">Histórico</button>`:''}${admin()?'<button class="btn g" data-est-aba="mov">+ Movimentação</button><button class="btn g" data-est-aba="local">+ Local</button>':''}</div>
      <div id="est-conteudo">${!ready?'':aba==='mov'&&admin()?formMov():aba==='local'&&admin()?formLocal():aba==='historico'&&equipe()?`<div class="panel"><h3>Histórico e posição por dia</h3><div class="row"><div><label for="est-dia-historico">Posição no fim do dia</label><input id="est-dia-historico" type="date" max="${diaSP()}" value="${historicoDate}"></div><button class="btn g" id="est-consultar">Consultar posição</button></div><div id="est-posicao"></div></div><div id="est-historico"></div><button class="btn g" id="est-mais">Carregar mais</button>`:`<input id="est-busca" aria-label="Buscar local" placeholder="Buscar obra, empresa ou placa…" value="${esc(filtro)}"><div id="est-lista"></div>`}</div>`;
    root.querySelectorAll('[data-est-aba]').forEach(b=>b.onclick=()=>{if(busy)return;aba=b.dataset.estAba;formId=crypto.randomUUID();draw();if(aba==='historico')loadHistory(true);});
    const busca=root.querySelector('#est-busca');if(busca){busca.oninput=()=>{filtro=busca.value;drawList();};drawList();}
    const mov=root.querySelector('#est-mov');if(mov){root.querySelector('#est-tipo').onchange=updateMove;updateMove();mov.onsubmit=saveMove;}
    const local=root.querySelector('#est-local');if(local){const update=()=>{const obra=local.tipo.value==='obra';root.querySelector('#est-obra-fields').hidden=!obra;local.empresa.required=obra;local.endereco.required=obra;};local.tipo.onchange=update;update();local.onsubmit=saveLocal;}
    root.querySelector('#est-mais')?.addEventListener('click',()=>loadHistory(false));root.querySelector('#est-consultar')?.addEventListener('click',position);drawHistory();
  }
  function drawList(){
    const target=root.querySelector('#est-lista');if(!target)return;
    const list=locais.filter(l=>(l.nome+' '+l.endereco+' '+(fontes().empresas.find(e=>e.id===l.empresa)?.nome||'')).toLocaleLowerCase().includes(filtro.toLocaleLowerCase()));
    target.innerHTML=list.length?list.map(l=>{const alerta=alertaObra(l,fontes().solicitacoes);return `<article class="item"><div class="m"><div class="t">${esc(l.nome)} ${!l.ativo?'<span class="badge c">Arquivado</span>':''}</div><div class="s">${{obra:'Obra',veiculo:'Veículo',usina:'Usina'}[l.tipo]}${l.empresa?' · '+esc(fontes().empresas.find(e=>e.id===l.empresa)?.nome||'Empresa arquivada'):''}<br>${esc(l.endereco||'')}<br>Última movimentação: ${dataBR(l.ultima)}${!l.inicializado?' · Contagem inicial pendente':''}</div>${alerta?`<div class="badge h">${esc(alerta)}</div>`:''}</div><div class="qtd"><b>${l.saldo}</b><span>caixas</span></div>${admin()&&l.saldo===0?`<button class="btn g" data-est-archive="${esc(l.id)}">${l.ativo?'Arquivar':'Reativar'}</button>`:''}</article>`;}).join(''):'<div class="empty">Nenhum local cadastrado. Comece pelas obras, veículos e usina, depois registre os saldos conferidos.</div>';
    target.querySelectorAll('[data-est-archive]').forEach(b=>b.onclick=()=>archive(b.dataset.estArchive));
  }
  function updateMove(){
    const f=root.querySelector('#est-mov'),tipo=f.tipo.value;
    const pares={entrega:['veiculo','obra'],retirada:['obra','veiculo'],carregamento:['usina','veiculo'],descarregamento:['veiculo','usina'],troca:['veiculo','obra']};
    const pair=pares[tipo];root.querySelector('#est-origem-box').hidden=!pair;f.origem.required=!!pair;
    f.origem.innerHTML=localOptions(pair?.[0]);f.destino.innerHTML=localOptions(pair?.[1]);
    f.quantidade.min=['inicial','ajuste'].includes(tipo)?0:1;f.motivo.required=!pair;
    root.querySelector('#est-qtd-label').textContent=tipo==='ajuste'?'Quantidade total contada no local':'Quantidade';
    root.querySelector('#est-ajuda').textContent=tipo==='troca'?'Retira e entrega a mesma quantidade. O saldo não muda, mas a movimentação fica registrada.':tipo==='ajuste'?'Informe o saldo correto. A diferença será registrada com o motivo.':tipo==='inicial'?'Registre uma única contagem inicial conferida para este local.':'A transferência desconta da origem e acrescenta ao destino.';
  }
  async function exclusive(action){if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{if(!admin())throw Error('Apenas o administrador pode alterar o estoque.');await action();error='';}catch(e){error=e.message||'Não foi possível salvar. Verifique a conexão.';mensagens(error);}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  async function saveLocal(event){event.preventDefault();const f=event.currentTarget;const tipo=f.tipo.value,nome=f.nome.value.trim(),empresa=tipo==='obra'?f.empresa.value:'',endereco=tipo==='obra'?f.endereco.value.trim():'';
    await exclusive(async()=>{if(!nome||(tipo==='obra'&&(!empresa||!endereco)))throw Error('Preencha o nome, a empresa e o endereço.');
      await runTransaction(db,async tx=>{const s=await tx.get(ref);const ls=s.exists()?s.data().locais:[];if(ls.some(l=>l.id===formId))return;
        if(ls.length>=400)throw Error('Limite de 400 locais atingido. Contate o administrador.');
        if(ls.some(l=>l.tipo===tipo&&l.nome.toLowerCase()===nome.toLowerCase()&&l.empresa===empresa&&l.endereco.toLowerCase()===endereco.toLowerCase()))throw Error('Este local já está cadastrado.');
        tx.set(ref,{locais:[...ls,{id:formId,tipo,nome,empresa,endereco,saldo:0,ativo:true,inicializado:false,ultima:''}],atualizadoEm:serverTimestamp()});});aba='saldos';formId=crypto.randomUUID();draw();});}
  async function saveMove(event){event.preventDefault();const f=event.currentTarget;const input=Object.fromEntries(new FormData(f));
    await exclusive(async()=>{const movementRef=doc(db,'estoque_movimentos',formId);
      await runTransaction(db,async tx=>{const existing=await tx.get(movementRef);if(existing.exists())return;const state=await tx.get(ref);const result=movimentar(state.exists()?state.data().locais:[],input);
        tx.set(ref,{locais:result.locais,atualizadoEm:serverTimestamp()});tx.set(movementRef,{...result.movimento,responsavel:auth.currentUser.uid,registradoEm:serverTimestamp(),estornadoPor:''});});aba='saldos';formId=crypto.randomUUID();draw();mensagens('Movimentação registrada.');});}
  async function archive(id){await exclusive(async()=>{await runTransaction(db,async tx=>{const s=await tx.get(ref);if(!s.exists())throw Error('Local não encontrado.');const ls=s.data().locais;const l=ls.find(l=>l.id===id);if(!l||l.saldo!==0)throw Error('Somente locais com saldo zero podem ser arquivados.');l.ativo=!l.ativo;tx.set(ref,{locais:ls,atualizadoEm:serverTimestamp()});});});}
  async function loadHistory(reset){if(!equipe())return;const uid=auth.currentUser.uid;
    try{mensagens('Carregando histórico…');const q=reset?query(collection(db,'estoque_movimentos'),orderBy('registradoEm','desc'),limit(50)):query(collection(db,'estoque_movimentos'),orderBy('registradoEm','desc'),startAfter(cursor),limit(50));
      const s=await getDocs(q);if(auth.currentUser?.uid!==uid)return;historico=reset?[]:historico;historico.push(...s.docs.map(d=>({id:d.id,...d.data()})));cursor=s.docs.at(-1)||null;more=s.size===50;mensagens('');drawHistory();}catch(e){mensagens('Não foi possível carregar o histórico. Verifique sua conexão e acesso.');}}
  function drawHistory(){const list=root.querySelector('#est-historico');if(!list)return;
    list.innerHTML=historico.length?historico.map(m=>`<article class="panel"><strong>${esc(TIPOS[m.tipo])} · ${dataBR(m.data)} ${m.estornadoPor?'(estornado)':''}</strong><div class="sub">${m.quantidade} caixa(s) · registrado pelo administrador<br>${m.locais.map(l=>`${esc(l.nome)}: ${l.antes} → ${l.depois}`).join('<br>')}</div><p>${esc(m.motivo)}</p>${admin()&&m.tipo!=='estorno'&&!m.estornadoPor?`<button class="btn d" data-est-estorno="${m.id}">Estornar</button>`:''}</article>`).join(''):'<div class="empty">Nenhuma movimentação registrada.</div>';
    root.querySelector('#est-mais').hidden=!more;list.querySelectorAll('[data-est-estorno]').forEach(b=>b.onclick=()=>reverse(b.dataset.estEstorno));
  }
  async function reverse(id){const motivo=prompt('Motivo do estorno (o histórico será preservado):');if(!motivo?.trim())return;
    await exclusive(async()=>{const originalRef=doc(db,'estoque_movimentos',id),reverseRef=doc(db,'estoque_movimentos','estorno_'+id);
      await runTransaction(db,async tx=>{const original=await tx.get(originalRef),oldReverse=await tx.get(reverseRef),state=await tx.get(ref);
        if(oldReverse.exists())throw Error('Este movimento já foi estornado.');if(!original.exists())throw Error('Movimento não encontrado.');
        const result=movimentar(state.data().locais,{tipo:'estorno',data:diaSP(),motivo},original.data());
        tx.set(ref,{locais:result.locais,atualizadoEm:serverTimestamp()});tx.update(originalRef,{estornadoPor:reverseRef.id});tx.set(reverseRef,{...result.movimento,estornoDe:id,responsavel:auth.currentUser.uid,registradoEm:serverTimestamp(),estornadoPor:''});});await loadHistory(true);});}
  async function position(){const date=root.querySelector('#est-dia-historico').value;if(!date||date>diaSP())return mensagens('Selecione uma data até hoje.');const uid=auth.currentUser?.uid;if(!equipe())return;
    const button=root.querySelector('#est-consultar');button.disabled=true;mensagens('Consultando movimentos até a data…');
    try{const s=await getDocs(query(collection(db,'estoque_movimentos'),where('data','<=',date)));if(auth.currentUser?.uid!==uid)return;const movimentos=s.docs.map(d=>d.data()),map=posicaoEm(movimentos,date);historicoDate=date;
      const used=new Map();for(const m of movimentos)for(const l of m.locais)used.set(l.id,l);
      const total=Object.values(map).reduce((a,b)=>a+b,0);root.querySelector('#est-posicao').innerHTML=`<strong>${total} caixa(s) em ${dataBR(date)}</strong><p class="sub">Posição reconstruída dos lançamentos. Dias anteriores ao saldo inicial não representam uma contagem física.</p>${[...used.values()].map(l=>`<div class="sub">${esc(l.nome)}: ${map[l.id]||0}</div>`).join('')}`;mensagens('');
    }catch(e){mensagens('Não foi possível consultar a posição.');}finally{button.disabled=false;}}
  function connect(){if(unsubscribe)return;unsubscribe=onSnapshot(ref,s=>{locais=s.exists()?s.data().locais:[];ready=true;error='';if(!root.hidden&&aba==='saldos')draw();},()=>{ready=false;error='Não foi possível carregar os saldos. Verifique a conexão.';if(!root.hidden)draw();});}
  connect();
  return {mostrar(visible){const changed=root.hidden===visible||loadedUser!==auth.currentUser?.uid;root.hidden=!visible;if(loadedUser!==auth.currentUser?.uid){loadedUser=auth.currentUser?.uid;aba='saldos';historico=[];}if(!visible)return;if(changed)draw();else if(aba==='saldos')drawList();},
    pronto:()=>ready,locais:()=>locais,temEmpresa:id=>locais.some(l=>l.empresa===id),atualizar(){if(!root.hidden&&aba==='saldos')draw();}};
}
