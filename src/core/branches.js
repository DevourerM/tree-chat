/** Read legacy single-branch data alongside persistent empty branches. */
export function draftBranchesOf(graph) {
  const branches = {...graph.draftBranches};
  if (graph.pendingBranch && !branches[graph.pendingBranch.sessionId]) branches[graph.pendingBranch.sessionId] = graph.pendingBranch;
  return branches;
}
export function draftForNode(graph, id) {
  return typeof id === 'string' && id.startsWith('pending:') ? draftBranchesOf(graph)[id.slice(8)] : undefined;
}
export function setDraftBranch(graph, branch) {
  graph.draftBranches = draftBranchesOf(graph);
  graph.draftBranches[branch.sessionId] = branch;
  graph.pendingBranch = branch; // Compatibility with existing persisted graphs and clients.
}
export function removeDraftBranch(graph, sessionId) {
  graph.draftBranches = draftBranchesOf(graph);
  delete graph.draftBranches[sessionId];
  if (graph.pendingBranch?.sessionId === sessionId) delete graph.pendingBranch;
}
