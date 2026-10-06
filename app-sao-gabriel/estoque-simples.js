import {doc,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {diaSP} from './estoque-core.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataBR=d=>d?d.split('-').reverse().join('/'):'Não informada';
export function iniciarEstoque(db,auth,fontes){
  const root=document.createElement('section');root.className='wrap estoque-area';root.hidden=true;document.querySelector('#app').after(root);
  let locais=[],ready=false,erro='',selecionado=null,busy=false,busca='',ordem='nome',usuario,tela='clientes',novoId=null;
  let resumo={},resumoReady=false;
  const quantidadeUsina=()=>Number.isInteger(resumo.quantidadeUsina)?resumo.quantidadeUsina:locais.filter(l=>l.tipo==='usina').reduce((n,l)=>n+(Number(l.saldo)||0),0);
  const dataConferencia=()=>resumo.confirmadoEm?.toDate?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(resumo.confirmadoEm.toDate()):'Ainda não confirmada';
  async function salvarResumo(changes){await runTransaction(db,async tx=>{const ref=doc(db,'controle_caixas','resumo'),snap=await tx.get(ref);tx.set(ref,{...(snap.exists()?snap.data():{}),...changes});});}
  const admin=()=>auth.currentUser?.email==='kewen.allan.nave@gmail.com';
  const quantidade=e=>Number.isInteger(e.qtdCaixas)?e.qtdCaixas:locais.filter(l=>l.tipo==='obra'&&l.empresa===e.id).reduce((n,l)=>n+(Number(l.saldo)||0),0);
  const diasSemTroca=e=>{const data=e.ultimaTrocaCaixas;if(!data)return null;const dias=Math.round((Date.parse(diaSP()+'T00:00:00Z')-Date.parse(data+'T00:00:00Z'))/86400000);return Number.isFinite(dias)&&dias>=0?dias:null;};
  function lista(){
    const target=root.querySelector('#caixas-lista');if(!target)return;
    const empresas=fontes().empresas.filter(e=>!e.arquivada&&quantidade(e)>0&&(e.nome+' '+(e.endereco||'')).toLocaleLowerCase().includes(busca.toLocaleLowerCase()));
    empresas.sort((a,b)=>(ordem==='tempo'?((diasSemTroca(b)??-1)-(diasSemTroca(a)??-1)):0)||a.nome.localeCompare(b.nome,'pt-BR'));
    target.innerHTML=empresas.length?empresas.map(e=>`<${admin()?'button type="button"':'article'} class="item cliente-caixas" ${admin()?`data-cliente="${esc(e.id)}"`:''}><div class="m"><div class="t">${esc(e.nome)}</div><div class="s">${esc(e.endereco||'')}<br>Última troca: ${esc(dataBR(e.ultimaTrocaCaixas))}</div></div><div class="qtd"><b>${quantidade(e)}</b><span>caçambas</span></div></${admin()?'button':'article'}>`).join(''):'<div class="empty">Nenhum cliente com caçambas encontrado.</div>';
    target.querySelectorAll('.cliente-caixas .s').forEach((el,index)=>{const dias=diasSemTroca(empresas[index]);const span=document.createElement('div');span.textContent=dias===null?'Sem data de troca informada':dias===0?'Troca realizada hoje':`${dias} dia${dias===1?'':'s'} sem troca`;el.append(span);});
    target.querySelectorAll('[data-cliente]').forEach(b=>b.onclick=()=>{selecionado=b.dataset.cliente;draw();});
  }
  function draw(){
    const empresa=fontes().empresas.find(e=>e.id===selecionado);
    root.innerHTML=`<div class="section-heading"><h2>Controle de caixas</h2><span>Caçambas por cliente</span></div><p class="sub">${admin()?'Clique no cliente para informar a quantidade e a data da última troca.':'Consulte a quantidade de caçambas e a última troca de cada cliente.'}</p><div id="caixas-msg" role="status" class="sub">${esc(erro||(!ready?'Carregando…':''))}</div>${ready?empresa&&admin()?`<form id="caixas-form" class="panel"><h3>${esc(empresa.nome)}</h3><label for="caixas-qtd">Quantidade de caçambas no cliente</label><input id="caixas-qtd" name="quantidade" type="number" min="0" max="100000" step="1" required value="${quantidade(empresa)}"><label for="caixas-data">Data da última troca</label><input id="caixas-data" name="data" type="date" max="${diaSP()}" value="${esc(empresa.ultimaTrocaCaixas||'')}"><div class="est-actions"><button class="btn" type="submit">Salvar</button><button class="btn g" id="caixas-voltar" type="button">Voltar</button></div></form>`:`<input id="caixas-busca" aria-label="Buscar cliente" placeholder="Buscar cliente…" value="${esc(busca)}"><div id="caixas-lista"></div>`:''}`;
    const clientes=fontes().empresas.filter(e=>!e.arquivada).reduce((n,e)=>n+quantidade(e),0);
    const veiculos=locais.filter(l=>l.tipo==='veiculo').reduce((n,l)=>n+(Number(l.saldo)||0),0);
    const usina=quantidadeUsina();
    root.querySelector('.section-heading').insertAdjacentHTML('afterend',`<div class="panel"><div id="caixas-conferencia">Última atualização confirmada: <strong>${resumoReady?esc(dataConferencia()):'Carregando…'}</strong><span class="sub"> · horário de Brasília</span></div>${admin()?`<button type="button" class="btn g" id="caixas-confirmar" ${!ready||!resumoReady||selecionado||busy?'disabled':''}>OK — confirmar atualização</button>`:''}<div id="conferencia-msg" role="status"></div></div><div class="stats estoque-stats">${[['Nos clientes',clientes,'clientes'],['Nos veículos',veiculos,'veiculos'],['Na usina',usina,'usina'],['Total de caixas',clientes+veiculos+usina]].map(([nome,total,alvo])=>alvo?`<button type="button" class="stat" data-caixas-tela="${alvo}" aria-label="${nome}: ${total} caixas"><b>${ready&&resumoReady?total:'—'}</b><span>${nome}</span></button>`:`<div class="stat"><b>${ready&&resumoReady?total:'—'}</b><span>${nome}</span></div>`).join('')}</div>`);
    root.querySelector('#caixas-confirmar')?.addEventListener('click',async event=>{if(busy||!admin()||!resumoReady||selecionado)return;busy=true;event.currentTarget.disabled=true;try{await salvarResumo({confirmadoEm:serverTimestamp()});erro='';}catch(e){erro='Não foi possível confirmar a atualização. Tente novamente.';}finally{busy=false;draw();}});
    root.querySelectorAll('[data-caixas-tela]').forEach(b=>b.onclick=()=>{if(busy)return;tela=b.dataset.caixasTela;selecionado=null;draw();});
    if(tela==='veiculos'){drawVeiculos();return;}
    if(tela==='usina'){drawUsina();return;}
    const semCaixas=fontes().empresas.filter(e=>!e.arquivada&&quantidade(e)===0);
    if(admin()&&ready&&!empresa&&semCaixas.length){
      root.querySelector('#caixas-busca').insertAdjacentHTML('beforebegin',`<details class="panel"><summary>+ Incluir cliente com caçambas</summary><label for="caixas-incluir">Cliente</label><select id="caixas-incluir"><option value="">Selecione o cliente</option>${semCaixas.map(e=>`<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('')}</select></details>`);
      root.querySelector('#caixas-incluir').onchange=event=>{if(!event.target.value)return;selecionado=event.target.value;draw();};
    }
    const campoBusca=root.querySelector('#caixas-busca');
    if(campoBusca){
      campoBusca.insertAdjacentHTML('afterend','<div style="margin:14px 0"><label for="caixas-ordem">Ordenar clientes</label><select id="caixas-ordem"><option value="nome">Nome do cliente</option><option value="tempo">Há mais tempo sem troca</option></select></div>');
      const select=root.querySelector('#caixas-ordem');select.value=ordem;select.onchange=()=>{ordem=select.value;lista();};
    }
    lista();
    const search=root.querySelector('#caixas-busca');if(search)search.oninput=()=>{busca=search.value;lista();};
    const form=root.querySelector('#caixas-form');if(form){
      const anteriorQtd=quantidade(empresa),anteriorData=empresa.ultimaTrocaCaixas||'';
      root.querySelector('#caixas-voltar').onclick=()=>{if(busy)return;selecionado=null;draw();};
      form.onsubmit=async event=>{
        event.preventDefault();if(busy||!admin())return;
        const qtd=Number(form.elements.quantidade.value),data=form.elements.data.value;
        const msg=root.querySelector('#caixas-msg');
        if(!Number.isInteger(qtd)||qtd<0||qtd>100000||data>diaSP()){msg.textContent='Informe uma quantidade válida e uma data até hoje.';return;}
        busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{
          const updates={};if(qtd!==anteriorQtd||!Number.isInteger(empresa.qtdCaixas))updates.qtdCaixas=qtd;
          if(data!==anteriorData)updates.ultimaTrocaCaixas=data;
          if(Object.keys(updates).length)await runTransaction(db,async tx=>{const ref=doc(db,'empresas',empresa.id),snap=await tx.get(ref);if(!snap.exists())throw Error('Cliente não encontrado.');tx.update(ref,updates);});
          selecionado=null;erro='';draw();root.querySelector('#caixas-msg').textContent='Dados salvos.';
        }catch(e){msg.textContent='Não foi possível salvar. Verifique sua conexão e tente novamente.';}
        finally{busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);const confirmar=root.querySelector('#caixas-confirmar');if(confirmar)confirmar.disabled=!ready||!resumoReady||!!selecionado;}
      };
    }
  }
  function drawUsina(){
    const cards=root.querySelector('.estoque-stats');while(cards.nextElementSibling)cards.nextElementSibling.remove();
    cards.insertAdjacentHTML('afterend',`<div class="panel"><h3>Caixas no chão da usina</h3><div id="usina-msg" role="status">${esc(erro)}</div>${ready&&resumoReady?admin()?`<form id="usina-form"><label for="usina-qtd">Quantidade total no chão da usina</label><input id="usina-qtd" type="number" min="0" max="100000" step="1" required value="${quantidadeUsina()}"><p class="sub">Informe o total atual de caixas no chão, sem contar as que estão nos caminhões.</p><button class="btn" type="submit">Salvar quantidade</button></form>`:`<p>${quantidadeUsina()} caixas no chão da usina.</p>`:'Carregando…'}<button class="btn g" id="usina-voltar" type="button">Voltar aos clientes</button></div>`);
    root.querySelector('#usina-voltar').onclick=()=>{if(busy)return;selecionado=null;tela='clientes';draw();};
    const form=root.querySelector('#usina-form');if(form){
      form.oninput=()=>{selecionado='usina-edicao';const b=root.querySelector('#caixas-confirmar');if(b)b.disabled=true;};
      form.onsubmit=async event=>{event.preventDefault();if(busy||!admin())return;const qtd=Number(root.querySelector('#usina-qtd').value);if(!Number.isInteger(qtd)||qtd<0||qtd>100000)return;busy=true;form.querySelector('button').disabled=true;try{await salvarResumo({quantidadeUsina:qtd});selecionado=null;erro='';draw();root.querySelector('#usina-msg').textContent='Quantidade salva. Confirme a atualização no botão OK acima.';}catch(e){root.querySelector('#usina-msg').textContent='Não foi possível salvar. Tente novamente.';}finally{busy=false;form.querySelector('button').disabled=false;const b=root.querySelector('#caixas-confirmar');if(b)b.disabled=!!selecionado;}};
    }
  }
  function drawVeiculos(){
    const cards=root.querySelector('.estoque-stats');while(cards.nextElementSibling)cards.nextElementSibling.remove();
    cards.insertAdjacentHTML('afterend',`<div class="section-heading"><h3>Caixas nos caminhões</h3><button type="button" class="btn g" id="veiculos-voltar">Voltar aos clientes</button></div><div id="caixas-msg" role="status">${esc(erro||(!ready?'Carregando…':''))}</div><div id="veiculos-conteudo"></div>`);
    root.querySelector('#veiculos-voltar').onclick=()=>{if(busy)return;tela='clientes';selecionado=null;draw();};
    if(!ready)return;
    const conteudo=root.querySelector('#veiculos-conteudo'),v=locais.find(l=>'veiculo:'+l.id===selecionado&&l.tipo==='veiculo');
    if(selecionado&&admin()){
      conteudo.innerHTML=`<form class="panel" id="veiculo-form"><h3>${v?'Editar caminhão':'Cadastrar caminhão'}</h3><label for="veiculo-placa">Placa / identificação do caminhão</label><input id="veiculo-placa" name="placa" maxlength="80" required value="${esc(v?.nome||'')}"><label for="veiculo-local">Onde está / observação</label><input id="veiculo-local" name="local" maxlength="300" placeholder="Ex.: no pátio, com 2 caixas vazias" value="${esc(v?.localizacao||'')}"><label for="veiculo-qtd">Quantidade de caixas no caminhão</label><input id="veiculo-qtd" name="quantidade" type="number" min="0" max="100000" step="1" required value="${v?.saldo||0}"><p class="sub">Informe a quantidade atual no caminhão.</p><div class="est-actions"><button class="btn" type="submit">Salvar caminhão</button><button class="btn g" type="button" id="veiculo-cancelar">Cancelar</button></div></form>`;
      root.querySelector('#veiculo-cancelar').onclick=()=>{if(busy)return;selecionado=null;draw();};
      root.querySelector('#veiculo-form').onsubmit=async event=>{
        event.preventDefault();if(busy||!admin())return;const f=event.currentTarget,nome=f.elements.placa.value.trim().toUpperCase(),localizacao=f.elements.local.value.trim(),saldo=Number(f.elements.quantidade.value),id=v?.id||novoId;
        if(!nome||!id||!Number.isInteger(saldo)||saldo<0||saldo>100000)return;
        busy=true;f.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{await runTransaction(db,async tx=>{const ref=doc(db,'estoque','atual'),snap=await tx.get(ref),ls=snap.exists()?snap.data().locais:[];
          const atual=ls.find(l=>l.id===id);if(v&&!atual)throw Error('Caminhão não encontrado.');
          const normalize=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
          if(ls.some(l=>l.tipo==='veiculo'&&l.id!==id&&normalize(l.nome)===normalize(nome)))throw Error('Este caminhão já está cadastrado.');
          if(!atual&&ls.length>=400)throw Error('Limite de cadastros atingido.');
          const changes={};if(!v||nome!==v.nome)changes.nome=nome;if(!v||localizacao!==(v.localizacao||''))changes.localizacao=localizacao;if(!v||saldo!==v.saldo)changes.saldo=saldo;
          if(atual)Object.assign(atual,changes,{ativo:true});else ls.push({id,tipo:'veiculo',nome,localizacao,saldo,ativo:true,inicializado:true,ultima:'',empresa:'',endereco:''});
          tx.set(ref,{locais:ls,atualizadoEm:serverTimestamp()});
        });selecionado=null;erro='';draw();root.querySelector('#caixas-msg').textContent='Caminhão salvo.';
        }catch(e){root.querySelector('#caixas-msg').textContent=e.message||'Não foi possível salvar.';}finally{busy=false;f.querySelectorAll('button').forEach(b=>b.disabled=false);const confirmar=root.querySelector('#caixas-confirmar');if(confirmar)confirmar.disabled=!ready||!resumoReady||!!selecionado;}
      };return;
    }
    const caminhoes=locais.filter(l=>l.tipo==='veiculo'&&(l.ativo!==false||l.saldo>0)).sort((a,b)=>a.nome.localeCompare(b.nome));
    conteudo.innerHTML=`${admin()?'<button type="button" class="btn" id="veiculo-novo">+ Cadastrar caminhão</button>':''}<p class="sub">Caixas agrupadas por caminhão. ${admin()?'Clique em um caminhão para atualizar.':''}</p>${caminhoes.length?caminhoes.map(l=>`<${admin()?'button type="button"':'article'} class="item cliente-caixas" ${admin()?`data-veiculo="${esc(l.id)}"`:''}><div class="m"><div class="t">${esc(l.nome)}</div><div class="s">Caixas neste caminhão<br>${esc(l.localizacao||'Localização não informada')}</div></div><div class="qtd"><b>${l.saldo}</b><span>caixas</span></div></${admin()?'button':'article'}>`).join(''):'<div class="empty">Nenhum caminhão cadastrado.</div>'}`;
    root.querySelector('#veiculo-novo')?.addEventListener('click',()=>{novoId=crypto.randomUUID();selecionado='novo-veiculo';draw();});
    conteudo.querySelectorAll('[data-veiculo]').forEach(b=>b.onclick=()=>{selecionado='veiculo:'+b.dataset.veiculo;draw();});
  }
  onSnapshot(doc(db,'estoque','atual'),s=>{locais=s.exists()?s.data().locais:[];ready=true;erro='';if(!root.hidden&&!selecionado)draw();},()=>{ready=false;erro='Não foi possível carregar as quantidades. Verifique a conexão.';if(!root.hidden)draw();});
  onSnapshot(doc(db,'controle_caixas','resumo'),s=>{resumo=s.exists()?s.data():{};resumoReady=true;if(!root.hidden&&!selecionado)draw();},()=>{resumoReady=false;erro='Não foi possível carregar a usina e a última confirmação. Verifique a conexão.';if(!root.hidden)draw();});
  return {mostrar(visible){const changed=root.hidden===visible||usuario!==auth.currentUser?.uid;root.hidden=!visible;if(usuario!==auth.currentUser?.uid){usuario=auth.currentUser?.uid;selecionado=null;}if(visible){if(changed||!selecionado)draw();}},pronto:()=>ready,locais:()=>locais,temEmpresa:id=>locais.some(l=>l.empresa===id),atualizar(){if(!root.hidden&&!selecionado)draw();}};
}
