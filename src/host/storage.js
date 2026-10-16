import {mkdir, readFile, writeFile, rename, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateGraph} from '../core/graph.js';

export class TreeStorage {
  constructor(directory) { this.directory = directory; this.queue = Promise.resolve(); this.owners = new Map(); }
  serial(action) {
    const next = this.queue.then(action); this.queue = next.catch(() => {}); return next;
  }
  file(id) {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error('无效的会话标识');
    return join(this.directory, `${id}.json`);
  }
  async read(id) {
    try {
      const graph = validateGraph(JSON.parse(await readFile(this.file(id), 'utf8')));
      for (const session of Object.keys(graph.bindings)) this.owners.set(session, graph.id);
      return graph;
    }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async save(graph) {
    validateGraph(graph);
    await mkdir(this.directory, {recursive: true});
    const target = this.file(graph.id), temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(graph), 'utf8');
    await rename(temp, target);
    for (const session of Object.keys(graph.bindings)) this.owners.set(session, graph.id);
  }
  async find(sessionId) {
    if (this.owners.has(sessionId)) return this.read(this.owners.get(sessionId));
    const direct = await this.read(sessionId);
    if (direct) return direct;
    let names;
    try { names = await readdir(this.directory); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const graph = await this.read(name.slice(0, -5));
      if (Object.hasOwn(graph.bindings, sessionId)) return graph;
    }
    return null;
  }
}
