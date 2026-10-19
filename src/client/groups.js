/** Small native-themed editor for named collections and edge-based splitting. */
function GroupDialog({value,graph,busy,onCancel,onCommit}){
  const group=graph.groups?.[value.id],split=value.type==='split';
  const [name,setName]=React.useState(value.name??(split?`${group?.name??'集合'} 2`:'新集合'));
  const [cutId,setCutId]=React.useState(value.cutId??group?.nodeIds.find(id=>id!==group.entryId)??'');
  return h('form',{className:'st-dialog st-group-dialog',role:'dialog','aria-modal':true,'aria-label':split?'拆分集合':'合并为集合',onSubmit:e=>{
    e.preventDefault();onCommit(split?{type:'group-split',id:value.id,cutId,name}:{type:'group-create',ids:value.ids,name,includeInternal:value.includeInternal});
  }},
    h('strong',null,split?'拆分集合':'合并为集合'),
    split&&h('label',null,'在此节点前拆分',h('select',{'aria-label':'拆分位置',value:cutId,onChange:e=>setCutId(e.target.value)},
      ...(group?.nodeIds??[]).filter(id=>id!==group.entryId).map(id=>h('option',{key:id,value:id},graph.nodes[id]?.label??id)))),
    h('label',null,split?'新集合名称':'集合名称',h('input',{'aria-label':split?'新集合名称':'集合名称',value:name,maxLength:80,autoFocus:true,onChange:e=>setName(e.target.value)})),
    h('div',{className:'st-dialog-actions'},h('button',{type:'button',onClick:onCancel},'取消'),h('button',{type:'submit',disabled:busy||!name.trim()||(split&&!cutId)},split?'拆分':'合并')));
}
