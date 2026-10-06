export const TIPOS = { inicial:'Saldo inicial', entrega:'Entrega', retirada:'Retirada', carregamento:'Carregamento', descarregamento:'Descarregamento', troca:'Troca', entrada:'Entrada de caixas', baixa:'Baixa de caixas', ajuste:'Correção de contagem', estorno:'Estorno' };
export function diaSP() {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function totais(locais) {
  const t={obra:0,veiculo:0,usina:0,total:0};
  for(const l of locais){t[l.tipo]+=l.saldo;t.total+=l.saldo;}
  return t;
}
export function movimentar(locais, input, original=null) {
  const next=structuredClone(locais), tipo=input.tipo, q=Number(input.quantidade);
  const data=input.data, motivo=String(input.motivo||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(Date.parse(data+'T12:00:00Z'))||new Date(data+'T12:00:00Z').toISOString().slice(0,10)!==data||data>diaSP()) throw Error('Informe uma data válida, até hoje.');
  const get=id=>{const l=next.find(x=>x.id===id);if(!l||!l.ativo)throw Error('Selecione um local ativo.');return l;};
  let deltas={}, ids=[], origem='',destino='';
  if(tipo==='estorno'){
    if(!original||original.tipo==='estorno'||original.estornadoPor)throw Error('Este movimento não pode ser estornado.');
    if(!motivo)throw Error('Informe o motivo do estorno.');
    if(data<original.data)throw Error('O estorno não pode ser anterior ao movimento.');
    for(const [id,delta] of Object.entries(original.deltas)){get(id);deltas[id]=-delta;}
    ids=Object.keys(deltas);origem=original.destino||'';destino=original.origem||'';
  }else{
    if(!Number.isSafeInteger(q)||q<0||q>100000||(q===0&&!['inicial','ajuste'].includes(tipo)))throw Error('Informe uma quantidade inteira válida.');
    const pares={entrega:['veiculo','obra'],retirada:['obra','veiculo'],carregamento:['usina','veiculo'],descarregamento:['veiculo','usina'],troca:['veiculo','obra']};
    if(pares[tipo]){
      const a=get(input.origem),b=get(input.destino);origem=a.id;destino=b.id;
      if(a.id===b.id||a.tipo!==pares[tipo][0]||b.tipo!==pares[tipo][1])throw Error('Origem e destino incompatíveis com esta movimentação.');
      if(a.saldo<q || (tipo==='troca'&&b.saldo<q))throw Error('Não há caixas suficientes para esta movimentação.');
      deltas={[a.id]:tipo==='troca'?0:-q,[b.id]:tipo==='troca'?0:q};ids=[a.id,b.id];
    }else if(['inicial','ajuste','entrada','baixa'].includes(tipo)){
      const l=get(input.destino);destino=l.id;ids=[l.id];
      if(!motivo)throw Error('Informe o motivo ou a referência da contagem.');
      if(tipo==='inicial'&&l.inicializado)throw Error('Este local já possui movimentação. Use correção de contagem.');
      deltas[l.id]=tipo==='ajuste'?q-l.saldo:tipo==='baixa'?-q:q;
    }else throw Error('Tipo de movimentação inválido.');
  }
  for(const id of ids){
    const l=get(id),saldo=l.saldo+deltas[id];
    if(!Number.isSafeInteger(saldo)||saldo<0)throw Error('A operação deixaria um local com saldo negativo.');
    // Evita alterar retroativamente uma posição já movimentada.
    if(l.ultima&&data<l.ultima)throw Error('Use uma data igual ou posterior à última movimentação dos locais envolvidos.');
    l.saldo=saldo;l.ultima=data;l.inicializado=true;
  }
  return {locais:next,movimento:{tipo,data,quantidade:tipo==='estorno'?original.quantidade:q,motivo,origem,destino,deltas,
    locais:ids.map(id=>{const l=get(id);return {id,nome:l.nome,tipo:l.tipo,empresa:l.empresa||'',endereco:l.endereco||'',antes:locais.find(x=>x.id===id).saldo,depois:l.saldo};})}};
}
export function posicaoEm(movimentos, data) {
  const saldos={};
  for(const m of movimentos)if(m.data<=data)for(const [id,delta]of Object.entries(m.deltas))saldos[id]=(saldos[id]||0)+delta;
  return saldos;
}
export function alertaObra(local,solicitacoes,data=diaSP()){
  if(local.tipo!=='obra'||local.saldo===0)return '';
  const vinculadas=solicitacoes.filter(s=>s.obraId===local.id);
  if(!vinculadas.length)return 'Sem autorização vinculada a esta obra';
  const qtd=vinculadas.filter(s=>s.autorizada&&s.situacao!=='aguardando'&&s.inicio<=data&&s.fim>=data).reduce((n,s)=>n+(Number(s.qtd)||0),0);
  return qtd===0?'Sem autorização vigente':local.saldo>qtd?`${local.saldo-qtd} caixa(s) acima da quantidade autorizada`:'';
}
