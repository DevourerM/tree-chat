// Isolated test profile only. Never included in the distributable package.
import {fixture,automationFixture} from '../test/fixtures.mjs';
import {newGraph} from '../src/core/graph.js';
import {turnsOf} from '../src/host/context.js';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pluginRoot, resolveArtifactsDir, importDshPackage} from './_env.mjs';

const {LlmAdapter} = await importDshPackage('@deepseek-ai/dsh-llm/lib/index.js');
const artifactsDir = resolveArtifactsDir();

export const inject=['llm','agents','workspaceRegistry','agentPresets','sessionQuery'];
class LocalAdapter extends LlmAdapter {
  async listModels(provider) { return [{provider,id:'test',name:'Tree test model',context:{contextWindow:100000}}]; }
  async *stream(options) {
    const users=options.messages.filter(m=>m.role==='user').map(m=>(m.content??[]).filter(b=>b.type==='text').map(b=>b.text).join(''));
    await mkdir(artifactsDir, {recursive: true});
    await writeFile(join(artifactsDir, 'last-model-request.json'),JSON.stringify({users,messages:options.messages},null,2));
    const text='上下文验证：'+users.filter(t=>t.startsWith('问题')).join(' → ');
    yield {type:'text-delta',index:0,text};
    yield {type:'finish',reason:{kind:'stop'}};
  }
}
export async function apply(ctx) {
  ctx.llm.registerAdapter(['test'],new LocalAdapter());
  let exists=!!ctx.agents.get('session-tree-demo');
  try { await ctx.sessionQuery.readSession('session-tree-demo'); exists=true; } catch(e) { if(e.code!=='SESSION_QUERY_SESSION_NOT_FOUND')throw e; }
  if(!exists){
  const data=process.env.TREE_AUTOMATION_FIXTURE?automationFixture():fixture(Number(process.env.TREE_FIXTURE_TURNS)||4); const preset=await ctx.agentPresets.resolve('minimal');
  if(process.env.TREE_COMPACTION_FIXTURE)for(const event of data.events)if(event.type==='assistant/message')event.data.message.content.push({type:'text',text:' Completed research details and verified intermediate results.'.repeat(160)});
  if(process.env.TREE_MEDIA_FIXTURE){
    const attachments=ctx.get('attachments'),last=data.events.findLast(e=>e.type==='user/message');
    const image=await attachments.saveImage({data:await readFile(join(pluginRoot,'docs/images/tree-chat-1.1.png')),mediaType:'image/png',name:'sample.png'});
    const file=await attachments.saveFile({data:Buffer.from('Project attachment fixture'),name:'notes.txt'});
    last.data.content.push({type:'image',attachment:image},{type:'file',attachment:file});
  }
  await ctx.agents.create({sessionId:'session-tree-demo',seed:data.events,meta:{cwd:pluginRoot,agentPreset:preset.id},agentOptions:{provider:'test',model:'test'},setup:async(agentCtx,agent)=>{
    await ctx.agentPresets.mount(agentCtx,preset.id);
    agent.session.append('model/selection',{provider:'test',model:'test'});
    agent.session.append('session/title',{title:'tree-chat交互验证',messageSeqs:[],source:{kind:'user'}});
  }});
  if(process.env.TREE_AUTOMATION_FIXTURE) {
    // Simulate 0.1.0 data: every raw user/message became a card, without source metadata.
    const graph=newGraph('session-tree-demo');let head='root';
    for(const t of turnsOf(data.events)){const id=`session-tree-demo:${t.end}`;graph.nodes[id]={id,parent:head,label:t.legacyLabel,createdAt:t.createdAt,source:{sessionId:graph.id,start:t.start,end:t.end}};head=id;}
    graph.active=head;graph.bindings[graph.id]={head,key:Object.keys(graph.nodes).join('/'),seen:data.events.at(-1).seq};
    const directory=join(process.env.DSH_HOME,'plugins/conversation-tree/graphs');await mkdir(directory,{recursive:true});await writeFile(join(directory,'session-tree-demo.json'),JSON.stringify(graph));
  }
  }
  const workspace=await ctx.workspaceRegistry.resolveByPath(pluginRoot) ?? await ctx.workspaceRegistry.create(pluginRoot,'tree-chat测试');await workspace.attachSession('session-tree-demo');
}
