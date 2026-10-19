import {createGroup,validateGroupCandidate,setGroupCollapsed,renameGroup,dissolveGroup,splitGroupAtEdge,reconcileGroupsAfterGraphChange} from './groups.js';
import {conversationBaseView} from './presentation.js';
import {layoutGraph} from './layout.js';

export function validateGroups(nodes,groups){
  if(groups===undefined)return;
  if(!groups||typeof groups!=='object'||Array.isArray(groups))throw Error('无效的节点集合');
  const claimed=new Set();
  for(const [id,g]of Object.entries(groups)){
    if(!/^group:[A-Za-z0-9_-]{1,160}$/.test(id)||g?.id!==id||Object.hasOwn(nodes,id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>80||typeof g.collapsed!=='boolean'||!Array.isArray(g.nodeIds)||new Set(g.nodeIds).size!==g.nodeIds.length)throw Error('无效的节点集合');
    if(g.nodeIds.some(n=>typeof n!=='string'||claimed.has(n)))throw Error('节点不能同时属于多个集合');
    const valid=validateGroupCandidate(nodes,g.nodeIds);
    if(!valid.ok||valid.entryId!==g.entryId)throw Error(valid.reason??'集合入口无效');
    if(!g.position||!Number.isFinite(g.position.x)||!Number.isFinite(g.position.y)||Math.abs(g.position.x)>1000000||Math.abs(g.position.y)>1000000)throw Error('无效的集合位置');
    for(const n of g.nodeIds)claimed.add(n);
  }
}

export function moveGroupState(graph,id,position){
  const group=graph.groups[id],dx=position.x-group.position.x,dy=position.y-group.position.y;
  if(group.nodeIds.some(n=>!graph.nodes[n].position)){
    const positions=layoutGraph({...graph,nodes:graph.nodes}).positions;
    for(const nid of group.nodeIds)if(!graph.nodes[nid].position){const p=positions.get(nid);graph.nodes[nid].position={x:p.cx,y:p.cy};}
  }
  for(const nid of group.nodeIds){const node=graph.nodes[nid];node.position={x:node.position.x+dx,y:node.position.y+dy};}
  group.position={x:position.x,y:position.y};
}

export function applyGroupEdit(graph,operation){
  const groups=graph.groups??{};
  if(operation.type==='group-create'){
    if(!Array.isArray(operation.ids)||operation.ids.length<2||operation.ids.length>20000)throw Error('请至少选择两个连通节点');
    const base=conversationBaseView(graph,operation.includeInternal===true),selected=new Set(),absorbed=new Set();
    for(const id of operation.ids){
      if(Object.hasOwn(groups,id)){absorbed.add(id);for(const n of groups[id].nodeIds)selected.add(n);}
      else if(Object.hasOwn(graph.nodes,id))selected.add(id);
      else throw Error('空分支产生首条消息后才可加入集合');
    }
    for(const [id,owner]of base.owners)if(selected.has(owner))selected.add(id);
    for(const [id,g]of Object.entries(groups))if(!absorbed.has(id)&&g.nodeIds.some(n=>selected.has(n)))throw Error('所选节点已属于集合，请先拆分或取消原集合');
    const name=typeof operation.name==='string'?operation.name.trim():'';
    if(!name||name.length>80)throw Error('集合名称需为 1–80 个字符');
    const positions=layoutGraph({...graph,nodes:graph.nodes}).positions;
    for(const id of selected){const node=graph.nodes[id],p=positions.get(id);if(node&&!node.position)node.position={x:p.cx,y:p.cy};}
    const remaining={...groups};for(const id of absorbed)delete remaining[id];
    const result=createGroup({...graph,groups:remaining},[...selected],{id:`group:${crypto.randomUUID()}`,name});
    if(!result.ok)throw Error(result.reason);
    graph.groups=result.groups;return result.groupId;
  }
  if(!Object.hasOwn(groups,operation.id))throw Error('集合不存在');
  if(operation.type==='group-toggle')graph.groups=setGroupCollapsed(groups,operation.id,operation.collapsed);
  else if(operation.type==='group-dissolve')graph.groups=dissolveGroup(groups,operation.id);
  else if(operation.type==='group-split'){
    const name=typeof operation.name==='string'?operation.name.trim():'';
    if(!name||name.length>80)throw Error('集合名称需为 1–80 个字符');
    const result=splitGroupAtEdge(graph,operation.id,operation.cutId,{newGroupId:`group:${crypto.randomUUID()}`,newGroupName:name});
    if(!result.ok)throw Error(result.reason);graph.groups=result.groups;
  }else if(operation.type==='group-rename'){
    if(typeof operation.name!=='string'||!operation.name.trim()||operation.name.trim().length>80)throw Error('集合名称需为 1–80 个字符');
    graph.groups=renameGroup(groups,operation.id,operation.name);
  }else throw Error('未知的集合操作');
}

export function reconcileGroupState(graph){
  if(Object.keys(graph.groups??{}).length)graph.groups=reconcileGroupsAfterGraphChange(graph.nodes,graph.groups);
}
