/** DSH 0.2 navigation adapter. Only the data-attribute lookup depends on chat markup. */
export function navigationHeaderOptions(ctx) {
  const store=ctx.slots.entries('conversation.session.header').find(entry=>entry.store)?.store;
  if(!store)throw new Error('tree-chat: DSH 未提供会话视图存储');
  return {store,inject:(sessionId,actions)=>({ctx,selectView(view){ctx.uiConversation.binding(sessionId).activate(view);actions.setView(view);}})};
}
export function createChatNavigator(ctx, headers) {
  let controller, landing, timer;
  const cancel=()=>controller?.abort();
  const clearLanding=()=>{clearTimeout(timer);landing?.removeAttribute('data-tree-chat-landing');landing=null;};
  const waitFor=async(signal,read,message='无法定位聊天记录，请确认 DSH 已加载该对话')=>{
    const deadline=Date.now()+10000;
    while(!signal.aborted){const value=read();if(value)return value;if(Date.now()>deadline)throw new Error(message);await new Promise(r=>setTimeout(r,32));}
    signal.throwIfAborted();
  };
  async function activateChat(sessionId,signal){
    ctx.sidebarRight.openTabIn?.(sessionId, 'conversation-tree');
    ctx.uiWorkspace.openSession(sessionId);
    const header=await waitFor(signal,()=>headers.get(sessionId));
    if(typeof header.selectView!=='function')throw new Error('此 DSH 版本未提供聊天视图切换能力');
    header.selectView('chat');
    return waitFor(signal,()=>{const b=ctx.sessions.binding(sessionId);return b?.session?.getSnapshot().openState==='open'?b:null;});
  }
  async function compose(sessionId){
    cancel();clearLanding();
    const request=new AbortController();controller=request;const {signal}=request;
    const binding=await activateChat(sessionId,signal);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));signal.throwIfAborted();
    const input=ctx.get?.('conversation')?.input?.for?.(binding.ctx);
    if(typeof input?.focus==='function'){input.focus();return;}
    const scope=`[data-conversation-content][data-conversation-session="${window.CSS.escape(sessionId)}"]`;
    const editor=document.querySelector(`${scope} [contenteditable="true"], ${scope} textarea`)??document.querySelector('[contenteditable="true"], textarea');
    editor?.focus?.();
  }
  async function open(resolve, beforeOpen) {
    cancel();const request=new AbortController();controller=request;const {signal}=request;
    const wait=read=>waitFor(signal,read);
    const target=await resolve(signal);signal.throwIfAborted();beforeOpen(target);
    const {session}=await activateChat(target.sessionId,signal);
    await wait(()=>!session.getSnapshot().loadingOlder);
    await session.loadThrough(target.seq);signal.throwIfAborted();
    const scope=`[data-conversation-content][data-conversation-session="${window.CSS.escape(target.sessionId)}"]`;
    const row=await wait(()=>{
      const root=document.querySelector(scope);if(!root)return null;
      if(target.compactionId){
        const ids=[target.compactionId,target.commandId].filter(Boolean);
        return [...root.querySelectorAll('[data-chat-flow-key]')].find(e=>ids.some(id=>(e.dataset.chatFlowKey??'').includes(id))&&e.getBoundingClientRect().height>0)??null;
      }
      const rows=[...root.querySelectorAll(`[data-chat-turn="${target.turn}"]`)];
      const visible=e=>e.getBoundingClientRect().height>0&&!e.closest('[hidden]');
      return rows.find(e=>e.dataset.chatFlowKind==='user'&&visible(e)) ?? rows.find(visible);
    });
    // Allow the native history render and initial tail restoration to finish first.
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));signal.throwIfAborted();
    row.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
    // Let DSH record this changed scroll position as the reader's new location.
    row.closest('[data-conversation-scroll]')?.dispatchEvent(new Event('scroll'));
    clearLanding();landing=row;row.setAttribute('data-tree-chat-landing','');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)row.animate?.([{backgroundColor:'color-mix(in srgb, var(--dsw-static-deepseek-500, #4c6ef5) 16%, transparent)'},{backgroundColor:'transparent'}],{duration:1000});
    timer=setTimeout(clearLanding,2500);
  }
  return {open,compose,cancel,dispose(){cancel();clearLanding();}};
}
