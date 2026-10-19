/** Keep the user's effective tree permission selection through native policy owners. */
export class PermissionBridge {
  constructor(ctx, setters = {}) { this.ctx = ctx; this.setters = setters; }
  capture(session) {
    const presets=this.ctx.get('permissionPresets');
    if(!presets)return null;
    const state=presets.permissionState(session),preset=presets.current(session);
    if(state.preset==='auto'&&preset!=='auto')throw new Error('自动审查模式当前不可用，请先在 DSH 中选择可用权限');
    const sandbox=state.sandbox??this.ctx.get('shell')?.sandboxMode??this.ctx.get('sandboxPolicy')?.defaultMode;
    const approval=state.approval??this.ctx.get('approval')?.config.policy??'ask';
    if(!['read-only','workspace-write','danger-full-access'].includes(sandbox)||!['ask','never'].includes(approval))throw new Error('无法读取当前 DSH 权限设置');
    return {preset,sandbox,approval};
  }
  apply(session, selection) {
    if(!selection)return;
    const presets=this.ctx.get('permissionPresets');
    if(!presets)throw new Error('DSH 未提供权限预设接口');
    // resolve/set performs native Auto admission; never synthesize its identity.
    if(selection.preset!=='custom')presets.set(session,selection.preset);
    const current=this.capture(session);
    if(current.sandbox!==selection.sandbox){
      if(!this.setters.setSandboxMode)throw new Error('DSH 未提供沙箱模式写入接口');
      this.setters.setSandboxMode(session,selection.sandbox);
    }
    if(current.approval!==selection.approval){
      if(!this.setters.setApprovalPolicy)throw new Error('DSH 未提供审批策略写入接口');
      this.setters.setApprovalPolicy(session,selection.approval);
    }
  }
}
