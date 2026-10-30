import {createHash} from 'node:crypto';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import {validateGraph} from '../core/graph.js';

export const PROJECT_FORMAT='tree-chat-project';
export const digest=data=>createHash('sha256').update(data).digest('hex');
export const json=data=>JSON.stringify(data,null,2)+'\n';
export const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(id);
export function portableCwd(cwd,root){
  if(!cwd)return '.';const p=relative(root,cwd);
  return !p||p.startsWith('..')||isAbsolute(p)?'.':p.split(sep).join('/');
}
export function localCwd(cwd,root){
  if(typeof cwd!=='string'||isAbsolute(cwd)||cwd.split(/[\\/]/).includes('..')||cwd.includes(':'))throw Error('记录中的项目相对目录无效');
  return resolve(root,cwd);
}
/** Identity translation is limited to structural fields; chat text and historical tool arguments remain intact. */
export function mapGraph(input,sessions){
  const g=structuredClone(input),sid=id=>sessions[id]??id;
  const nid=id=>{
    if(typeof id!=='string')return id;
    if(id.startsWith('pending:'))return `pending:${sid(id.slice(8))}`;
    const colon=id.indexOf(':');return colon>0?`${sid(id.slice(0,colon))}${id.slice(colon)}`:id;
  };
  g.id=sid(g.id);g.active=nid(g.active);g.revision=0;g.undo=[];g.redo=[];
  g.nodes=Object.fromEntries(Object.values(g.nodes).map(n=>{n.id=nid(n.id);n.parent=nid(n.parent);if(n.source)n.source.sessionId=sid(n.source.sessionId);if(n.compaction?.prefixKey)n.compaction.prefixKey=n.compaction.prefixKey.split('/').map(nid).join('/');return [n.id,n];}));
  g.bindings=Object.fromEntries(Object.entries(g.bindings).map(([id,b])=>{delete b.autoArchived;delete b.compactionRecoveryVersion;b.head=nid(b.head);b.key=b.key.split('/').map(nid).join('/');return [sid(id),b];}));
  for(const group of Object.values(g.groups??{})){group.entryId=nid(group.entryId);group.nodeIds=group.nodeIds.map(nid);}
  if(g.draftBranches)g.draftBranches=Object.fromEntries(Object.entries(g.draftBranches).map(([id,d])=>{d.sessionId=sid(id);d.parent=nid(d.parent);d.returnSessionId=sid(d.returnSessionId);return [d.sessionId,d];}));
  if(g.pendingBranch){const d=g.pendingBranch;d.sessionId=sid(d.sessionId);d.parent=nid(d.parent);d.returnSessionId=sid(d.returnSessionId);g.pendingBranch=g.draftBranches?.[d.sessionId]??d;}
  return validateGraph(g);
}
export function archiveSession(data,id,root){
  const header={...structuredClone(data.header),id,cwd:portableCwd(data.header.cwd,root)};
  delete header.parentSession; // Local lineage is represented by tree.json, not external native agents.
  const events=structuredClone(data.events);
  for(const e of events)if(e.type==='working-directory/change')e.data.cwd=portableCwd(e.data.cwd,root);
  return JSON.stringify({format:'tree-chat-session',version:1,header,inheritedEventCount:data.inheritedEventCount??0})+'\n'+events.map(e=>JSON.stringify(e)).join('\n')+'\n';
}
export function parseSession(text,id){
  const lines=text.trimEnd().split('\n'),first=JSON.parse(lines.shift());
  if(first.format!=='tree-chat-session'||first.version!==1||first.header?.version!==4||first.header.id!==id||!Number.isSafeInteger(first.inheritedEventCount)||first.inheritedEventCount<0)throw Error('不支持的项目会话格式');
  const events=lines.filter(Boolean).map(line=>JSON.parse(line));
  if(first.inheritedEventCount>events.length||events.some((e,i)=>e.seq!==i||typeof e.type!=='string'))throw Error('项目会话序号不完整');
  return {...first,events};
}
export function attachmentRefs(events){
  const refs=new Map(),stack=[events];
  while(stack.length){const v=stack.pop();if(!v||typeof v!=='object')continue;
    if(['image','file'].includes(v.type)&&v.attachment?.attachmentId){const ref=v.attachment,key=`${v.type}:${ref.attachmentId}:${ref.name??''}`;refs.set(key,{kind:v.type,ref:structuredClone(ref)});}
    for(const child of Object.values(v))if(child&&typeof child==='object')stack.push(child);
  }
  return refs;
}
export function localizeSession(data,id,root,model,attachmentMap={}){
  const events=structuredClone(data.events);
  for(const e of events){
    if(e.type==='working-directory/change')e.data.cwd=localCwd(e.data.cwd,root);
    if(e.type==='permission/preset')e.data.preset='workspace-write';
    if(e.type==='sandbox/mode')e.data.mode='workspace-write';
    if(e.type==='approval/policy')e.data.policy='ask';
    if(e.type==='model/selection')e.data={...model};
    // Delivery markers record which native Session accepted the log tail. A copied session must
    // claim its own identity; otherwise the host refuses the imported log as corrupt when it is
    // next read from disk.
    if(e.type==='session-log-deepseek/delivery-accepted'&&e.data&&typeof e.data==='object')e.data.sessionId=id;
    const stack=[e];while(stack.length){const v=stack.pop();if(!v||typeof v!=='object')continue;
      if(v.source?.replayState)delete v.source.replayState;
      if(['image','file'].includes(v.type)&&v.attachment){const key=`${v.type}:${v.attachment.attachmentId}:${v.attachment.name??''}`;if(attachmentMap[key])v.attachment=structuredClone(attachmentMap[key]);}
      for(const c of Object.values(v))if(c&&typeof c==='object')stack.push(c);
    }
  }
  return {header:{...data.header,id,cwd:root},events,inheritedEventCount:data.inheritedEventCount};
}
export function markdownTree(graph,sources){
  const lines=[`# ${graph.title.replace(/[\r\n]/g,' ')}`,'','由 tree-chat 保存。tree.json 保留树与集合，sessions/ 保留完整会话事件，assets/ 保留附件。','', '## 结构',''];
  for(const n of Object.values(graph.nodes))lines.push(`- \`${n.id}\` ← \`${n.parent??'—'}\` ${n.label.replace(/[\r\n]/g,' ')}`);
  for(const group of Object.values(graph.groups??{}))lines.push(`- 集合「${group.name}」：${group.nodeIds.map(id=>'`'+id+'`').join(', ')}`);
  for(const n of Object.values(graph.nodes))if(n.source){
    lines.push('',`## ${n.label.replace(/[\r\n]/g,' ')}`,'',`节点：\`${n.id}\``,'');
    const source=sources.get(n.source.sessionId);
    const records=n.kind==='compaction'?[source?.events[n.compaction.replacementSeq]].filter(Boolean):(source?.events??[]).filter(e=>e.seq>=n.source.start&&e.seq<=n.source.end&&e.surfaceOp==='append');
    for(const e of records){
      const m=e.type==='user/message'?e.data:e.data?.message;if(!m?.content)continue;
      lines.push(`### ${m.role??e.type}`,'');
      for(const b of m.content){
        if(b.type==='text'){const fence='`'.repeat((b.text.match(/`+/g)??[]).reduce((n,s)=>Math.max(n,s.length+1),3));lines.push(fence+'text',b.text,fence,'');}
        else if(b.type==='tool-call')lines.push(`工具：${b.name}`,'',JSON.stringify(b,null,2),'');
        else if(b.attachment)lines.push(`附件：${b.attachment.name??b.type} (${b.attachment.attachmentId})`,'');
      }
    }
  }
  return lines.join('\n')+'\n';
}
