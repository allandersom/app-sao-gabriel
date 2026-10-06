const URL = 'https://ccevrrdzgbykhsdxupuo.supabase.co';
const KEY = 'sb_publishable_fK2T3r7vFYvvLMz9vpJOqA_C1G8-ybU';
const ADMIN = 'kewen.allan.nave@gmail.com';
const COMERCIAL = 'adm2@saogabrieltransportes.com.br';
const BUCKET = 'pedidos-comercial';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pathUrl = path => path.split('/').map(encodeURIComponent).join('/');
export function iniciarComercial(auth, criarSolicitacao) {
  let pedidos = [], user = null, timer, sequence = 0, busy = false, deletionReady = false;
  const root = document.createElement('section');
  root.className = 'wrap pedidos-area';
  root.hidden = true;
  document.querySelector('#app').after(root);
  async function api(path, options = {}) {
    if (!auth.currentUser) throw Error('Entre novamente para continuar.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(URL + path, {...options, headers: {
      apikey: KEY, Authorization: 'Bearer ' + token, ...options.headers
    }});
    if (!response.ok) throw Error('Não foi possível acessar os pedidos ou anexos. Verifique a configuração e tente novamente.');
    return response;
  }
  function message(text) { const box=root.querySelector('[role="status"]'); if(box) box.textContent=text; }
  function draw() {
    if (!user) return;
    const admin = user.email === ADMIN;
    root.innerHTML = `<div class="section-heading"><h2>${admin ? 'Pedidos do Comercial' : 'Enviar pedido ao administrador'}</h2><span>${pedidos.filter(p=>p.status==='pendente').length} pendente(s)</span></div>
      <p class="sub">${admin ? 'Confira os documentos e marque como atendido após tratar a solicitação.' : 'Preencha os dados e anexe os documentos. O administrador receberá um aviso no aplicativo.'}</p>
      <div role="status" aria-live="polite" class="sub"></div>
      ${admin ? '' : `<form class="panel" id="pedido-form">
      <div><label for="pedido-empresa">Empresa</label><input id="pedido-empresa" name="empresa" maxlength="200" required></div>
      <div><label for="pedido-endereco">Endereço da obra</label><input id="pedido-endereco" name="endereco" maxlength="500" required></div>
      <div class="row"><div><label for="pedido-inicio">Data inicial desejada</label><input id="pedido-inicio" name="inicio" type="date" required></div><div><label for="pedido-fim">Data final desejada</label><input id="pedido-fim" name="fim" type="date" required></div></div>
      <div><label for="pedido-qtd">Quantidade de caçambas</label><input id="pedido-qtd" name="quantidade" type="number" min="1" max="1000" step="1" value="1" required></div>
      <div><label for="pedido-obs">Observações</label><textarea id="pedido-obs" name="observacoes" maxlength="3000" rows="3"></textarea></div>
      <div><label for="pedido-files">Documentos (PDF, JPG ou PNG)</label><input id="pedido-files" name="anexos" type="file" accept="application/pdf,image/jpeg,image/png" multiple required><p class="sub">Até 5 arquivos, 10 MB por arquivo e 25 MB por pedido.</p></div>
      <button class="btn" type="submit">Enviar pedido</button></form>`}
      <div id="pedido-lista"></div>`;
    const form=root.querySelector('form');
    if(form) form.onsubmit=send;
    drawList();
  }
  function drawList() {
    const list=root.querySelector('#pedido-lista'); if(!list) return;
    const admin=user?.email===ADMIN;
    list.innerHTML=pedidos.length ? pedidos.map(p=>`<article class="panel">
      <div class="t"><strong>${esc(p.empresa)}</strong> <span class="badge ${p.status==='pendente'?'h':''}">${p.status==='pendente'?'Novo pedido · aguardando administrador':'Atendido pelo administrador'}</span></div>
      <div class="sub">${esc(p.endereco)}<br>${esc(p.inicio.split('-').reverse().join('/'))} a ${esc(p.fim.split('-').reverse().join('/'))} · ${p.quantidade} caçamba(s)</div>
      ${p.observacoes?`<p class="pedido-observacoes">${esc(p.observacoes)}</p>`:''}
      <div class="pedido-files">${p.anexos.map((f,i)=>`<button class="btn g" data-file="${esc(p.id)}" data-index="${i}">Baixar ${esc(f.nome)}</button>`).join('')}</div>
      ${admin&&p.status==='pendente'?`<button class="btn" data-atender="${esc(p.id)}">Marcar como atendido</button>`:''}
      ${admin&&deletionReady?`<button class="btn d" data-excluir-pedido="${esc(p.id)}">Excluir pedido</button>`:''}
      </article>`).join('') : '<div class="empty">Nenhum pedido recebido.</div>';
    list.querySelectorAll('[data-file]').forEach(button=>button.onclick=async()=>{
      button.disabled=true;
      try {
        const file=pedidos.find(p=>p.id===button.dataset.file).anexos[Number(button.dataset.index)];
        const response=await api('/storage/v1/object/authenticated/'+BUCKET+'/'+pathUrl(file.path));
        const link=document.createElement('a'); const href=URLForBlob(await response.blob());
        link.href=href; link.download=file.nome; document.body.append(link); link.click(); link.remove();
        setTimeout(()=>globalThis.URL.revokeObjectURL(href),60000);
      } catch(e) {message(e.message);} finally {button.disabled=false;}
    });
    list.querySelectorAll('[data-atender]').forEach(button=>button.onclick=async()=>{
      button.disabled=true;
      try {
        const pedido = pedidos.find(p => p.id === button.dataset.atender);
        if (!pedido || user?.email !== ADMIN) return;
        if (typeof criarSolicitacao !== 'function') throw Error('Atualize o aplicativo para atender este pedido.');
        await criarSolicitacao(pedido);
        await api('/rest/v1/pedidos_comercial?id=eq.'+encodeURIComponent(button.dataset.atender), {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'atendido'})});
        await refresh();
        message('Pedido atendido. A solicitação foi criada como aguardando autorização.');
      }catch(e){message(e.message);}finally{button.disabled=false;}
    });
    list.querySelectorAll('[data-excluir-pedido]').forEach(button=>button.onclick=async()=>{
      if(user?.email!==ADMIN || busy) return;
      const pedido=pedidos.find(p=>p.id===button.dataset.excluirPedido);
      if(!pedido || !confirm(`Excluir o pedido de ${pedido.empresa} e seus anexos? Uma solicitação já criada a partir dele será mantida.`)) return;
      busy=true;button.disabled=true;
      try{
        // A função confirma a permissão antes de alterar os arquivos.
        const permission=await api('/rest/v1/rpc/sgc_pode_excluir_pedido',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        if(await permission.json() !== true) throw Error('Exclusão permitida somente ao administrador.');
        if(pedido.anexos.length) await api('/storage/v1/object/'+BUCKET,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:pedido.anexos.map(f=>f.path)})});
        const response=await api('/rest/v1/pedidos_comercial?id=eq.'+encodeURIComponent(pedido.id),{method:'DELETE',headers:{Prefer:'return=representation'}});
        const removed=await response.json();
        if(!removed.length) throw Error('O pedido não foi excluído. Atualize a lista e confira as permissões.');
        message('Pedido e anexos excluídos.');
      }catch(e){message('Não foi possível concluir a exclusão. '+e.message);}
      finally{busy=false;button.disabled=false;await refresh();}
    });
    const count=pedidos.filter(p=>p.status==='pendente').length;
    const heading=root.querySelector('.section-heading>span'); if(heading) heading.textContent=count+' pendente(s)';
    let notice=document.querySelector('#comercial-aviso');
    if(!notice){notice=document.createElement('button');notice.id='comercial-aviso';notice.className='btn comercial-aviso';document.querySelector('#app').before(notice);}
    notice.hidden=!admin||count===0;
    notice.textContent=`Comercial: ${count} pedido(s) aguardando sua atenção. Ver pedidos`;
    notice.onclick=()=>root.scrollIntoView({behavior:'smooth'});
  }
  function URLForBlob(blob) {return globalThis.URL.createObjectURL(blob);}
  async function refresh(){
    if(!user || busy) return;
    const current=sequence;
    try{
      const response=await api('/rest/v1/pedidos_comercial?select=*&order=created_at.desc&limit=200');
      const data=await response.json(); if(current!==sequence) return;
      pedidos=data;drawList();
    }catch(e){if(current===sequence) message(e.message);}
  }
  async function send(event){
    event.preventDefault(); if(busy || !user) return;
    const form=event.currentTarget, data=new FormData(form), files=Array.from(form.elements.anexos.files);
    const inicio=data.get('inicio'),fim=data.get('fim'),quantidade=Number(data.get('quantidade'));
    if(fim<inicio || !Number.isInteger(quantidade)||quantidade<1||quantidade>1000) return message('Confira o período e a quantidade.');
    if(!files.length || files.length>5 || files.some(f=>!['application/pdf','image/jpeg','image/png'].includes(f.type)||f.size===0||f.size>10485760)||files.reduce((n,f)=>n+f.size,0)>26214400) return message('Selecione até 5 PDFs ou imagens, de até 10 MB cada e 25 MB no total.');
    busy=true;const button=form.querySelector('button');button.disabled=true;button.textContent='Enviando documentos…';
    const id=crypto.randomUUID(), owner=user.uid, uploaded=[];let inserting=false;
    try{
      for(const file of files){
        const path=owner+'/'+id+'/'+crypto.randomUUID();
        await api('/storage/v1/object/'+BUCKET+'/'+pathUrl(path),{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
        uploaded.push({path,nome:file.name,tamanho:file.size,tipo:file.type});
      }
      inserting=true;
      await api('/rest/v1/pedidos_comercial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,owner_uid:owner,empresa:data.get('empresa').trim(),endereco:data.get('endereco').trim(),inicio,fim,quantidade,observacoes:data.get('observacoes').trim(),anexos:uploaded,status:'pendente'})});
      form.reset();message('Pedido enviado. O administrador poderá consultar os documentos.');
    }catch(e){
      // A resposta do cadastro pode se perder após a gravação. Não apagar anexos nesse caso.
      if(!inserting && uploaded.length) await api('/storage/v1/object/'+BUCKET,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:uploaded.map(f=>f.path)})}).catch(()=>{});
      message(inserting?'Não foi possível confirmar o cadastro. Confira a lista antes de enviar novamente.':e.message);
    }finally{busy=false;button.disabled=false;button.textContent='Enviar pedido';await refresh();}
  }
  return async function setUser(next){
    sequence++;clearInterval(timer);pedidos=[];deletionReady=false;
    user=next && [ADMIN,COMERCIAL].includes(next.email)?next:null;
    root.hidden=!user;root.innerHTML='';document.querySelector('#comercial-aviso')?.remove();
    if(!user)return;
    const session=sequence;
    draw();await refresh();
    if(user?.email===ADMIN){try{const response=await api('/rest/v1/rpc/sgc_pode_excluir_pedido',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(session===sequence){deletionReady=await response.json()===true;drawList();}}catch{}}
    if(session===sequence)timer=setInterval(refresh,30000);
  };
}
