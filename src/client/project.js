function ProjectDialog({sessionId,ctx,onClose,onImported,onStatus}){
  const [directory,setDirectory]=React.useState(''),[status,setStatus]=React.useState(null),[selected,setSelected]=React.useState('');
  const [working,setWorking]=React.useState(false),[loading,setLoading]=React.useState(true),[error,setError]=React.useState('');
  const locked=loading||working;
  async function inspect(path){const data=await api({action:'project-status',sessionId,...(path?{directory:path}:{})});setStatus(data);setDirectory(data.root);setSelected(old=>data.records.some(r=>r.id===old&&!r.error)?old:data.records.find(r=>!r.error)?.id??'');onStatus({enabled:data.enabled,error:data.error});}
  React.useEffect(()=>{let disposed=false;setLoading(true);api({action:'project-status',sessionId}).then(data=>{if(disposed)return;setStatus(data);setDirectory(data.root);setSelected(data.records.find(r=>!r.error)?.id??'');onStatus({enabled:data.enabled,error:data.error});}).catch(e=>{if(!disposed)setError(e.message);}).finally(()=>{if(!disposed)setLoading(false);});return()=>{disposed=true;};},[sessionId]);
  async function perform(action){if(locked)return;setWorking(true);setError('');try{await action();}catch(e){setError(e.message);}finally{setWorking(false);}}
  async function configure(enabled,asCopy=false){const data=await api({action:'project-set',sessionId,directory,enabled,asCopy});setStatus(data);onStatus({enabled:data.enabled,error:data.error});await inspect(directory);}
  return h('div',{className:'st-dialog st-project-dialog',role:'dialog','aria-modal':true,'aria-label':'项目同步','aria-busy':locked,onKeyDown:e=>{if(e.key==='Escape'&&!working){e.stopPropagation();onClose();}}},
    h('div',{className:'st-project-heading'},h('strong',null,'项目同步'),h(Button,{icon:'close',label:'关闭项目同步',disabled:working,onClick:onClose})),
    h('label',null,'项目目录',h('div',{className:'st-project-path'},h('input',{'aria-label':'项目目录',value:directory,onChange:e=>{setDirectory(e.target.value);setStatus(null);setSelected('');setError('');},disabled:locked,placeholder:'项目文件夹的完整路径'}),h('button',{type:'button',disabled:locked,onClick:()=>perform(async()=>{const path=await ctx.uiWorkspace.pickDirectory();if(path)await inspect(path);})},'选择…'),h('button',{type:'button',disabled:locked||!directory.trim(),onClick:()=>perform(()=>inspect(directory))},'读取'))),
    h('p',{className:'st-project-note'},'保存到 .tree-chat/，包含对话、工具结果与附件，可随 Git 管理。'),
    status?.waiting&&h('p',{className:'st-project-note'},'当前生成完成后自动同步。'),
    (error||status?.error)&&h('div',{role:'alert',className:'st-project-warning'},error||status.error),
    h('div',{className:'st-dialog-actions'},h('button',{type:'button',disabled:locked||!directory.trim(),onClick:()=>perform(()=>configure(!status?.enabled))},status?.enabled?'停止同步':'开启同步'),
      status?.enabled&&h('button',{type:'button',disabled:locked,onClick:()=>perform(()=>configure(true))},'立即同步'),
      (error||status?.error)&&h('button',{type:'button',disabled:locked||!directory.trim(),onClick:()=>perform(()=>configure(true,true))},'另存副本')),
    h('hr'),h('label',null,'项目中的对话树',h('select',{'aria-label':'项目中的对话树',value:selected,onChange:e=>setSelected(e.target.value),disabled:locked||!status?.records.length},
      h('option',{value:''},'选择记录'),...(status?.records??[]).map(r=>h('option',{key:r.id,value:r.id,disabled:Boolean(r.error)},r.error?`${r.title} · 无法读取`:`${r.title} · ${r.nodes} 节点`)))),
    status?.records.some(r=>r.error)&&h('div',{className:'st-project-warning'},status.records.filter(r=>r.error).map(r=>r.error).join('；')),
    h('div',{className:'st-dialog-actions'},h('button',{type:'button',disabled:locked||!selected,onClick:()=>perform(async()=>{const result=await api({action:'project-read',sessionId,directory,treeId:selected});onImported(result);})},working?'处理中…':'读取为新对话')));
}
