import {TreeError} from '../core/graph.js';

export function isCompactionReplacement(event, events) {
  return event.type==='user/message'&&event.surfaceOp?.op==='replace'&&
    (['compact-checkpoint','compact-basic'].includes(event.data?.source?.kind)||
      event.sourceEventSeqs?.some(seq=>events[seq]?.type==='compaction/summary'));
}
/** Native compaction is a transaction, not an ordinary conversation turn. */
export function compactionsOf(events) {
  const active=new Map(),completed=[];
  for(const event of events){
    const id=event.data?.compactionId;
    if(event.type==='compaction/start')active.set(id,{start:event});
    else if(event.type==='compaction/summary'&&active.has(id))active.get(id).summary=event;
    else if(isCompactionReplacement(event,events)){
      const summary=event.sourceEventSeqs?.map(seq=>events[seq]).find(e=>e?.type==='compaction/summary');
      const transaction=active.get(event.data?.source?.compactionId??summary?.data.compactionId);
      if(transaction)transaction.replacement=event;
    }else if(event.type==='compaction/end'){
      const transaction=active.get(id);active.delete(id);
      if(typeof id==='string'&&id&&transaction?.summary&&transaction.replacement&&!event.data.error){
        const {start,summary,replacement}=transaction;
        completed.push({start:start.seq,end:event.seq,kind:'compaction',label:'上下文压缩',createdAt:event.time,
          compaction:{id,summarySeq:summary.seq,replacementSeq:replacement.seq,endSeq:event.seq}});
      }
    }
  }
  return completed;
}
export function compactionBusy(events){
  const active=new Set();
  for(const event of events){if(event.type==='compaction/start')active.add(event.data.compactionId);else if(event.type==='compaction/end')active.delete(event.data.compactionId);}
  return active.size>0;
}
export function conversationEntries(events,turns){
  const entries=[...turns],closed=[];let start;
  for(const event of events){if(event.type==='turn/start')start=event.seq;if(event.type==='turn/end'&&start!==undefined){closed.push({start,end:event.seq});start=undefined;}}
  let index=0;
  for(const checkpoint of compactionsOf(events)){
    while(index<closed.length&&closed[index].end<checkpoint.start)index++;
    const enclosing=closed[index];
    if(enclosing&&enclosing.start<=checkpoint.start){checkpoint.end=enclosing.end;}
    else if(start!==undefined&&checkpoint.start>=start)continue; // Wait for the automatic turn to commit.
    entries.push(checkpoint);
  }
  return entries.sort((a,b)=>a.end-b.end||(a.kind==='compaction'?1:0)-(b.kind==='compaction'?1:0));
}
const messageOf=event=>event.type==='user/message'?event.data:event.data?.message;
export function messageRoots(event,source,origins){
  const ids=new Set();
  for(const seq of origins.get(event.seq)??[event.seq]){const id=messageOf(source.events[seq]??{})?.id;if(id)ids.add(id);}
  const id=messageOf(event)?.id;if(!ids.size&&id)ids.add(id);
  return ids;
}
/** Replace precisely the messages represented by this checkpoint, across native session boundaries. */
export function applyCheckpoint(rows,node,source,projection,group){
  const record=node.compaction,summary=source.events[record.summarySeq],replacement=source.events[record.replacementSeq];
  const start=source.events[node.source.start],end=source.events[record.endSeq];
  if(start?.type!=='compaction/start'||start.data.compactionId!==record.id||end?.type!=='compaction/end'||end.data.compactionId!==record.id||end.data.error||summary?.type!=='compaction/summary'||summary.data.compactionId!==record.id||!replacement||!isCompactionReplacement(replacement,source.events)||!replacement.sourceEventSeqs?.includes(summary.seq))throw new TreeError('压缩节点缺少对应的原生摘要记录');
  const historical=projection(source.events.slice(0,node.source.end+1),e=>!isCompactionReplacement(e,source.events)||e.seq<replacement.seq);
  const material=event=>{const m=messageOf(event);return m&&['user','assistant','tool'].includes(m.role)&&m.source?.kind!=='user-approval';};
  const expectedPrefix=historical.nodes.map(seq=>source.events[seq]).filter(material),actualPrefix=rows.filter(row=>material(row.event));
  const matches=(row,event)=>{const a=messageOf(row.event),b=messageOf(event);if(a.role!==b.role)return false;if(a.id&&a.id===b.id)return true;const roots=messageRoots(event,source,historical.origins);return roots.size===row.roots.size&&[...roots].every(id=>row.roots.has(id));};
  if(expectedPrefix.length!==actualPrefix.length||expectedPrefix.some((event,i)=>!matches(actualPrefix[i],event)))throw new TreeError('压缩前的完整历史与当前路径不一致，请移除压缩节点后重新建立分支');
  const before=projection(source.events.slice(0,replacement.seq)),first=before.nodes.indexOf(replacement.surfaceOp.startSeq),last=before.nodes.indexOf(replacement.surfaceOp.endSeq);
  if(first<0||last<first)throw new TreeError('压缩记录的历史范围无法定位');
  const expected=new Set();
  for(const seq of before.nodes.slice(first,last+1))for(const id of messageRoots(source.events[seq],source,before.origins))expected.add(id);
  const indices=[],covered=new Set();
  for(let i=0;i<rows.length;i++){
    const row=rows[i],id=messageOf(row.event)?.id,own=expected.has(id),overlap=[...row.roots].filter(root=>expected.has(root));
    if(!own&&!overlap.length)continue;
    if(!own&&overlap.length!==row.roots.size)throw new TreeError('压缩摘要只覆盖了当前历史的一部分，请移除压缩节点后重新建立分支');
    indices.push(i);if(own)covered.add(id);for(const root of overlap)covered.add(root);
  }
  if(!expected.size||[...expected].some(id=>!covered.has(id))||indices.some((n,i)=>i&&n!==indices[i-1]+1))throw new TreeError('压缩摘要与当前历史不一致，请移除压缩节点后重新建立分支');
  const roots=new Set();for(const i of indices)for(const id of rows[i].roots)roots.add(id);
  rows.splice(indices[0],indices.length,{event:replacement,source,roots,group});
}
