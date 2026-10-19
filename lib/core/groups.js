// groups.js - Pure JavaScript Core for tree-chat 1.0 Node Groups

/**
 * 内部工具：获取从节点到 root 的祖先链（含自身，索引 0 为自身）
 */
function getAncestorChain(nodes, nodeId, rootId = 'root') {
  const chain = [];
  const visited = new Set();
  let curr = nodeId;
  while (curr && nodes[curr] && !visited.has(curr)) {
    visited.add(curr);
    chain.push(curr);
    if (curr === rootId) break;
    curr = nodes[curr].parent;
  }
  return chain;
}

/**
 * 1. Shift 路径选择计算
 * 若 A 是 B 的祖先或反之，返回有向路径；若在不同分支，返回通过 LCA（不含 root）的连通路径
 */
export function getShiftSelectionPath(nodes, anchorId, targetId, rootId = 'root') {
  if (!nodes[anchorId] || !nodes[targetId]) return [];
  if (anchorId === rootId || targetId === rootId) return [];
  if (anchorId === targetId) return [anchorId];

  const chainA = getAncestorChain(nodes, anchorId, rootId);
  const setA = new Set(chainA);
  const chainB = getAncestorChain(nodes, targetId, rootId);

  let lca = null;
  const pathB = [];
  for (const id of chainB) {
    pathB.push(id);
    if (setA.has(id)) {
      lca = id;
      break;
    }
  }
  // 跨分支且最近公共祖先是 root 时，不允许连选（因为集合不能包含 root）
  if (!lca || lca === rootId) return [];

  const pathA = [];
  for (const id of chainA) {
    if (id === lca) break;
    pathA.push(id);
  }
  return [...pathA, ...pathB];
}

/**
 * 2. 校验节点集合是否满足“不含 root、>=2 节点、单入口连通子树（不跨未选中间节点）”
 * 返回 { ok, reason, entryId, orderedNodeIds }
 */
export function validateGroupCandidate(nodes, candidateIds, rootId = 'root') {
  const memberSet = new Set(candidateIds);
  if (memberSet.has(rootId)) {
    return { ok: false, reason: '集合不能包含 root 节点' };
  }
  if (memberSet.size < 2) {
    return { ok: false, reason: '集合至少需要包含 2 个节点' };
  }

  const entries = [];
  for (const id of memberSet) {
    const node = nodes[id];
    if (!node) {
      return { ok: false, reason: `节点 ${id} 不存在` };
    }
    if (!memberSet.has(node.parent)) {
      entries.push(id);
    }
  }

  if (entries.length === 0) {
    return { ok: false, reason: '检测到非法环路，无入口节点' };
  }
  if (entries.length > 1) {
    return {
      ok: false,
      reason: '所选节点不连通，或跨过了未选中的中间分叉节点（存在多个入口）',
      entries
    };
  }

  const entryId = entries[0];

  // 构建原树子表（保持原树兄弟节点的左右顺序：按 position.x 升序，次选 id）
  const childrenMap = new Map();
  for (const id of memberSet) {
    const p = nodes[id].parent;
    if (memberSet.has(p)) {
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p).push(id);
    }
  }
  for (const list of childrenMap.values()) {
    list.sort((a, b) => {
      const ax = nodes[a]?.position?.x ?? 0;
      const bx = nodes[b]?.position?.x ?? 0;
      return ax !== bx ? ax - bx : String(a).localeCompare(String(b));
    });
  }

  // DFS 遍历校验可达性并生成稳定拓扑序
  const orderedNodeIds = [];
  const stack = [entryId];
  const visited = new Set();
  while (stack.length > 0) {
    const curr = stack.pop();
    if (visited.has(curr)) continue;
    visited.add(curr);
    orderedNodeIds.push(curr);
    const ch = childrenMap.get(curr) || [];
    for (let i = ch.length - 1; i >= 0; i--) {
      stack.push(ch[i]);
    }
  }

  if (orderedNodeIds.length !== memberSet.size) {
    return { ok: false, reason: '集合内部存在不可达的孤立环' };
  }

  return { ok: true, entryId, orderedNodeIds };
}

/**
 * 3. 创建集合（支持纯节点选择，若选中了已有集合的成员且开启 absorbExisting，可打散旧集合重组的）
 */
export function createGroup(state, selectedNodeIds, options = {}) {
  const { nodes, groups = {}, root = 'root' } = state;
  const {
    id = `grp_${Date.now().toString(36)}`,
    name = '未命名集合',
    absorbExisting = false
  } = options;

  // 检查是否与现有集合重叠
  const ownerMap = new Map();
  for (const [gid, g] of Object.entries(groups)) {
    for (const nid of g.nodeIds) ownerMap.set(nid, gid);
  }

  const nextGroups = { ...groups };
  const targetIds = new Set(selectedNodeIds);

  for (const nid of selectedNodeIds) {
    const existingGid = ownerMap.get(nid);
    if (existingGid) {
      if (!absorbExisting) {
        return {
          ok: false,
          reason: `节点 ${nid} 已属于集合 "${groups[existingGid].name}"，不能重叠创建`
        };
      }
      // 若允许吸收合并已有集合，将整个旧集合并入候选并移除旧集合
      for (const m of groups[existingGid].nodeIds) targetIds.add(m);
      delete nextGroups[existingGid];
    }
  }

  const validation = validateGroupCandidate(nodes, targetIds, root);
  if (!validation.ok) return validation;

  const entryNode = nodes[validation.entryId];
  nextGroups[id] = {
    id,
    name: String(name).trim() || '未命名集合',
    nodeIds: validation.orderedNodeIds,
    entryId: validation.entryId,
    collapsed: true,
    position: entryNode?.position ? { ...entryNode.position } : { x: 0, y: 0 }
  };

  return { ok: true, groupId: id, groups: nextGroups };
}

/**
 * 4. 展开 / 折叠 / 重命名 / 取消集合
 */
export function setGroupCollapsed(groups, groupId, collapsed) {
  const g = groups[groupId];
  if (!g) return groups;
  const nextCollapsed = collapsed === undefined ? !g.collapsed : Boolean(collapsed);
  if (g.collapsed === nextCollapsed) return groups;
  return { ...groups, [groupId]: { ...g, collapsed: nextCollapsed } };
}

export function renameGroup(groups, groupId, newName) {
  const g = groups[groupId];
  if (!g) return groups;
  const trimmed = String(newName ?? '').trim();
  if (!trimmed) return groups;
  return { ...groups, [groupId]: { ...g, name: trimmed } };
}

export function dissolveGroup(groups, groupId) {
  if (!groups[groupId]) return groups;
  const next = { ...groups };
  delete next[groupId];
  return next;
}

/**
 * 5. 切开内部边拆分集合（Split Group by Edge Cut）
 * 切断集合内部边 (parent -> cutNodeId)，以 cutNodeId 为界的下半子树成为第 2 个连通分量，其余为第 1 个。
 * 若任一分量节点数 < 2，该分量自动退化为普通未分组节点；>= 2 则形成独立集合。
 */
export function splitGroupAtEdge(state, groupId, cutNodeId, options = {}) {
  const { nodes, groups = {}, root = 'root' } = state;
  const group = groups[groupId];
  if (!group) return { ok: false, reason: '集合不存在' };

  const memberSet = new Set(group.nodeIds);
  if (!memberSet.has(cutNodeId)) {
    return { ok: false, reason: '切点节点不在该集合内' };
  }
  if (cutNodeId === group.entryId) {
    return { ok: false, reason: '不能在集合入口节点的上方切断，请选择集合内部的连接边' };
  }

  // 收集集合内以 cutNodeId 为根的子树节点（下半部分）
  const children = new Map();
  for(const id of group.nodeIds){const p=nodes[id]?.parent,list=children.get(p)??[];list.push(id);children.set(p,list);}
  const lowerSet = new Set([cutNodeId]),queue=[cutNodeId];
  for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])??[])if(!lowerSet.has(id)){lowerSet.add(id);queue.push(id);}

  const upperIds = group.nodeIds.filter(id => !lowerSet.has(id));
  const lowerIds = group.nodeIds.filter(id => lowerSet.has(id));

  const nextGroups = { ...groups };
  delete nextGroups[groupId];

  const createdGroupIds = [];

  // 处理上半部分（保持原 groupId 或可复用）
  if (upperIds.length >= 2) {
    const vUpper = validateGroupCandidate(nodes, upperIds, root);
    if (vUpper.ok) {
      nextGroups[groupId] = {
        ...group,
        nodeIds: vUpper.orderedNodeIds,
        entryId: vUpper.entryId
      };
      createdGroupIds.push(groupId);
    }
  }

  // 处理下半部分
  if (lowerIds.length >= 2) {
    const vLower = validateGroupCandidate(nodes, lowerIds, root);
    if (vLower.ok) {
      const newId = options.newGroupId || `${groupId}_sub_${Date.now().toString(36)}`;
      const entryNode = nodes[vLower.entryId];
      nextGroups[newId] = {
        id: newId,
        name: options.newGroupName || `${group.name} (拆分)`,
        nodeIds: vLower.orderedNodeIds,
        entryId: vLower.entryId,
        collapsed: group.collapsed,
        position: entryNode?.position ? { ...entryNode.position } : { ...group.position }
      };
      createdGroupIds.push(newId);
    }
  }

  return {
    ok: true,
    groups: nextGroups,
    createdGroupIds,
    releasedNodeIds: [
      ...(upperIds.length < 2 ? upperIds : []),
      ...(lowerIds.length < 2 ? lowerIds : [])
    ]
  };
}

/**
 * 6. 底层节点删除/结构变更后的失效集合自愈（Reconcile / Repair）
 * 当底层删除了节点并完成 parent 桥接后调用此函数：
 * 自动剔除不存在的节点，并将断裂的集合按单根连通分量拆分为合法子集合，不足 2 个节点的自动解散。
 */
export function reconcileGroupsAfterGraphChange(nodes, groups = {}, rootId = 'root') {
  const nextGroups = {};
  const globallyClaimed = new Set();
  const reserved=new Set(Object.keys(groups));let suffix=0;

  for (const [gid, group] of Object.entries(groups)) {
    const surviving = (group.nodeIds || []).filter(
      id => id !== rootId && Boolean(nodes[id]) && !globallyClaimed.has(id)
    );
    if (surviving.length < 2) continue;

    const memberSet = new Set(surviving);
    // 找出当前存活节点中所有 parent 不在 memberSet 内的入口点
    // 每个入口点自然引导一棵极大的单入口连通子树！
    const entries = surviving.filter(id => !memberSet.has(nodes[id].parent));
    const children=new Map();
    for(const id of surviving){const p=nodes[id].parent,list=children.get(p)??[];list.push(id);children.set(p,list);}

    let partIndex = 0;
    for (const entryId of entries) {
      // 收集属于该 entryId 的连通分量
      const comp = new Set([entryId]);
      const queue=[entryId];
      for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])??[])if(!comp.has(id)){comp.add(id);queue.push(id);}

      if (comp.size >= 2) {
        const check = validateGroupCandidate(nodes, comp, rootId);
        if (check.ok) {
          let targetGid=gid;
          if(partIndex>0){do{targetGid=`group:repaired-${++suffix}`;}while(reserved.has(targetGid));reserved.add(targetGid);}
          const entryPos = nodes[check.entryId]?.position;
          nextGroups[targetGid] = {
            ...group,
            id: targetGid,
            name: partIndex === 0 ? group.name : `${group.name.slice(0,72)} (${partIndex + 1})`,
            nodeIds: check.orderedNodeIds,
            entryId: check.entryId,
            position: partIndex === 0
              ? group.position
              : (entryPos ? { ...entryPos } : { ...group.position })
          };
          for (const id of check.orderedNodeIds) globallyClaimed.add(id);
          partIndex++;
        }
      }
    }
  }

  return nextGroups;
}

/**
 * 7. 视图投影映射（无缝对接现有 conversationView 的 owners / targets 机制）
 * - 绝不修改底层 nodes，只产出视图层可见节点、虚拟边、高亮与会话绑定映射。
 */
export function projectConversationView(state) {
  const {
    nodes,
    groups = {},
    root = 'root',
    bindings = {},
    activeNodeId = null
  } = state;

  // owners: realNodeId -> viewItemId (折叠态下指向 groupId，展开或未分组指向自身 realNodeId)
  // groupMembership: realNodeId -> groupId (无论展开还是折叠，用于渲染展开态外框或角标)
  // targets: viewItemId -> { entryNodeId, primaryExitNodeId, nodeIds } (供双击或操作定位底层节点)
  const owners = new Map();
  const groupMembership = new Map();
  const targets = new Map();

  for (const [gid, g] of Object.entries(groups)) {
    for (const nid of g.nodeIds) {
      if (!nodes[nid]) continue;
      groupMembership.set(nid, gid);
      if (g.collapsed) {
        owners.set(nid, gid);
      } else {
        owners.set(nid, nid);
      }
    }
  }
  for (const nid of Object.keys(nodes)) {
    if (!owners.has(nid)) owners.set(nid, nid);
    targets.set(nid, {
      entryNodeId: nid,
      primaryExitNodeId: nid,
      nodeIds: [nid]
    });
  }

  // 构建原树子列表以保持严格的左右顺序
  const rawChildren = new Map();
  for (const [nid, node] of Object.entries(nodes)) {
    const p = node.parent;
    if (p && nodes[p]) {
      if (!rawChildren.has(p)) rawChildren.set(p, []);
      rawChildren.get(p).push(nid);
    }
  }
  for (const list of rawChildren.values()) {
    list.sort((a, b) => {
      const ax = nodes[a]?.position?.x ?? 0;
      const bx = nodes[b]?.position?.x ?? 0;
      return ax !== bx ? ax - bx : String(a).localeCompare(String(b));
    });
  }

  const viewItems = {};
  const viewChildren = new Map();
  const viewChildSets = new Map();

  // 登记所有折叠集合为代理视图节点，并计算其多出口、内部是否含分叉
  for (const [gid, g] of Object.entries(groups)) {
    const memberSet = new Set(g.nodeIds);
    const exitNodeIds = [];
    let hasInternalBranching = false;

    for (const nid of g.nodeIds) {
      const ch = rawChildren.get(nid) || [];
      const internalCh = ch.filter(c => memberSet.has(c));
      const externalCh = ch.filter(c => !memberSet.has(c));
      if (internalCh.length > 1) hasInternalBranching = true;
      if (internalCh.length === 0 || externalCh.length > 0) {
        exitNodeIds.push(nid);
      }
    }

    const primaryExitNodeId =
      (activeNodeId && memberSet.has(activeNodeId) ? activeNodeId : null) ||
      exitNodeIds[exitNodeIds.length - 1] ||
      g.entryId;

    targets.set(gid, {
      entryNodeId: g.entryId,
      primaryExitNodeId,
      nodeIds: g.nodeIds
    });

    if (g.collapsed) {
      const entryParent = nodes[g.entryId]?.parent ?? null;
      const viewParent = entryParent ? owners.get(entryParent) : null;
      viewItems[gid] = {
        id: gid,
        kind: 'group',
        label: g.name,
        count: g.nodeIds.length,
        parent: viewParent,
        position: g.position || nodes[g.entryId]?.position || { x: 0, y: 0 },
        hasInternalBranching,
        exitCount: exitNodeIds.length,
        nodeIds: g.nodeIds,
        entryId: g.entryId,
        primaryExitNodeId
      };
    }
  }

  // 登记所有可见的普通节点
  for (const [nid, node] of Object.entries(nodes)) {
    if (owners.get(nid) !== nid) continue; // 已被折叠进集合
    const viewParent = node.parent ? owners.get(node.parent) : null;
    viewItems[nid] = {
      ...node,
      viewKind: 'node',
      parent: viewParent,
      groupId: groupMembership.get(nid) || null
    };
  }

  // 按原树先序 DFS 扫描，组装每个视图节点的有序子节点列表（天然保留多出口分叉的左右相对顺序！）
  const visitedRaw = new Set();
  const stack=[...Object.keys(nodes).filter(id=>nodes[id].parent===null)].reverse();
  while(stack.length){
    const rawId=stack.pop();
    if (!nodes[rawId] || visitedRaw.has(rawId)) continue;
    visitedRaw.add(rawId);

    const vId = owners.get(rawId);
    const vParent = viewItems[vId]?.parent;
    if (vParent && vParent !== vId) {
      if (!viewChildren.has(vParent)) viewChildren.set(vParent, []);
      const list = viewChildren.get(vParent);
      const seen=viewChildSets.get(vParent)??new Set();
      if(!seen.has(vId)){list.push(vId);seen.add(vId);viewChildSets.set(vParent,seen);}
    }

    const ch = rawChildren.get(rawId) || [];
    for(let i=ch.length-1;i>=0;i--)stack.push(ch[i]);
  }

  // 投影活动高亮与 Session bindings
  const activeViewId = activeNodeId ? (owners.get(activeNodeId) || null) : null;
  const projectedBindings = {};
  for (const [sessionId, binding] of Object.entries(bindings)) {
    const headNodeId=typeof binding==='string'?binding:binding.head;
    projectedBindings[sessionId] = owners.get(headNodeId) || headNodeId;
  }

  return {
    viewItems,
    viewChildren,
    owners,
    targets,
    groupMembership,
    activeViewId,
    projectedBindings
  };
}

/**
 * 8. 辅助动作：搜索命中/跳转内部节点时自动展开对应集合
 * 以及：拖动折叠集合卡时同步平移其内部所有节点坐标
 */
export function revealNodeInGroups(groups, targetNodeId) {
  let nextGroups = groups;
  for (const [gid, g] of Object.entries(groups)) {
    if (g.collapsed && g.nodeIds.includes(targetNodeId)) {
      nextGroups = setGroupCollapsed(nextGroups, gid, false);
    }
  }
  return nextGroups;
}

export function moveGroupWithMembers(state, groupId, newPosition) {
  const { nodes, groups = {} } = state;
  const g = groups[groupId];
  if (!g) return state;

  const oldPos = g.position || nodes[g.entryId]?.position || { x: 0, y: 0 };
  const dx = newPosition.x - oldPos.x;
  const dy = newPosition.y - oldPos.y;

  const nextNodes = { ...nodes };
  for (const nid of g.nodeIds) {
    if (!nextNodes[nid]) continue;
    const p = nextNodes[nid].position || { x: 0, y: 0 };
    nextNodes[nid] = {
      ...nextNodes[nid],
      position: { x: p.x + dx, y: p.y + dy }
    };
  }

  const nextGroups = {
    ...groups,
    [groupId]: { ...g, position: { ...newPosition } }
  };

  return { ...state, nodes: nextNodes, groups: nextGroups };
}
