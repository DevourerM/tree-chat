import {surfaceOrigins} from '../src/host/context.js';

/** Append the same durable transaction and replacement shape as DSH compact-basic. */
export function compactFixture(data,{throughTurn=2,id=`compaction-${data.events.length}`,cancelled=false}={}){
  const events=data.events,{nodes}=surfaceOrigins(events);
  const first=nodes.findIndex(seq=>events[seq].type==='user/message');
  const last=nodes.findLastIndex(seq=>events[seq].type==='assistant/message'&&events[seq].data.turn===throughTurn);
  if(first<0||last<first)throw Error('Fixture has no compactable range');
  const selected=nodes.slice(first,last+1),add=(type,body,extra={})=>{const e={type,data:body,seq:events.length,time:2000+events.length,...extra};events.push(e);return e;};
  const start=add('compaction/start',{compactionId:id,turn:null});
  if(cancelled){add('compaction/end',{compactionId:id,turn:null,error:[{name:'AbortError',message:'cancelled'}]});return data;}
  const summary=add('compaction/summary',{compactionId:id,summary:`摘要 ${id}`,shadowedRange:{start:selected[0],end:selected.at(-1)},shadowedSeqs:selected,shadowedTokenCount:100,provider:'test',model:'test'});
  add('user/message',{id:`summary-${id}`,role:'user',source:{kind:'compact-checkpoint',compactionId:id},content:[{type:'text',text:`摘要 ${id}`}]},{surfaceOp:{op:'replace',startSeq:selected[0],endSeq:selected.at(-1)},sourceEventSeqs:[start.seq,summary.seq,...selected]});
  add('compaction/end',{compactionId:id,turn:null});
  data.surface=surfaceOrigins(events).nodes.map(seq=>events[seq]);return data;
}
export function fixture(count = 4, tools = false) {
  const events = []; let serial = 0;
  const message = (role, text) => ({id: `msg-${++serial}`, role, source: {kind: role === 'assistant' ? 'model' : role === 'system' ? 'system-prompt' : 'user', ...(role === 'assistant' ? {provider: 'test', model: 'test'} : {})}, content: [{type:'text',text}]});
  const add = (type, data, surface) => { const event = {type, data, seq:events.length, time:1000+events.length}; if (surface) event.surfaceOp='append'; events.push(event); return event; };
  for (let turn=1;turn<=count;turn++) {
    add('turn/start',{turn});
    add('step/start',{turn,step:1});
    if(turn===1){
      add('system/message', {turn:1,step:1,message:message('system','System instructions')}, true);
      add('request/header', {turn:1,step:1,reason:'initial',header:{config:{provider:'test',model:'test'}}});
    }
    add('user/message',message('user',`问题 ${turn}`),true);
    if (tools && turn===3) {
      const m=message('assistant',`工具 ${turn}`);m.content.push({type:'tool-call',id:'call-3',name:'read_file',arguments:'{"path":"test.txt"}'});
      add('assistant/message',{turn,step:1,message:m,stream:[]},true);
      add('tool/call',{turn,step:1,callId:'call-3',name:'read_file',arguments:'{"path":"test.txt"}'});
      add('tool/result',{turn,step:1,message:{id:`msg-${++serial}`,role:'tool',source:{kind:'tool',callId:'call-3'},toolCallId:'call-3',isError:false,content:[{type:'text',text:'tool result 3'}]}},true);
    }
    add('assistant/message',{turn,step:1,message:message('assistant',`回答 ${turn}`),stream:[]},true);
    add('step/end',{turn,step:1});
    add('turn/end',{turn,reason:{kind:'completed'}});
  }
  return {events, surface:events.filter(e=>e.surfaceOp), header:{version:4,id:'session-fixture',cwd:process.cwd(),createdAt:1000,isSeeded:false}};
}
export function automationFixture() {
  const data=fixture(6,true), inputs=data.events.filter(e=>e.type==='user/message');
  const texts=['研究第一个问题','The approval policy changed from "ask" to "never" (changed by the user).','<goal_round>Objective: research; Round: 1/4</goal_round>','<goal_round>Objective: research; Round: 2/4</goal_round>','继续研究第二个问题','<goal_round>Objective: research; Round: 3/4</goal_round>'];
  const kinds=['user','user-approval','goal','goal','user','goal'];
  let round=0;
  inputs.forEach((e,i)=>{e.data.source=kinds[i]==='goal'?{kind:'goal',goalId:'goal-fixture',revision:1,round:++round}:{kind:kinds[i]};e.data.content=[{type:'text',text:texts[i]}];});
  const fifth=inputs[4], before={...structuredClone(inputs[1]),data:{...structuredClone(inputs[1].data),id:'msg-extra-policy'}};
  data.events.splice(fifth.seq,0,before);
  data.events.forEach((e,i)=>{e.seq=i;});data.surface=data.events.filter(e=>e.surfaceOp);
  return data;
}
