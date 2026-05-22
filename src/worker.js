// Cloudflare Worker — Meraki Santier API
// Servește HTML-ul ca static asset via env.ASSETS
// /api/* este gestionat aici, restul cade pe asset-urile statice

const STATE_KEY = 'global-state';
const AUDIT_KEY = 'audit-log';
const AUDIT_MAX = 100;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // API routes
    if (url.pathname === '/api/state' && request.method === 'GET') return handleGetState(env);
    if (url.pathname === '/api/state' && request.method === 'POST') return handlePatchState(request, env);
    if (url.pathname === '/api/audit' && request.method === 'GET') return handleGetAudit(env);
    if (url.pathname === '/api/health') return jsonResponse({ ok: true, ts: Date.now() });

    // Tot ce nu e /api/ → static assets (index.html, etc.)
    return env.ASSETS.fetch(request);
  }
};

async function handleGetState(env) {
  const stateRaw = await env.STATE.get(STATE_KEY);
  const state = stateRaw ? JSON.parse(stateRaw) : defaultState();
  return jsonResponse(state);
}

async function handlePatchState(request, env) {
  let patch;
  try { patch = await request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  if (!patch || typeof patch !== 'object') {
    return jsonResponse({ error: 'Patch must be an object' }, 400);
  }
  if (!Array.isArray(patch.ops)) {
    return jsonResponse({ error: 'patch.ops must be array' }, 400);
  }

  const stateRaw = await env.STATE.get(STATE_KEY);
  const state = stateRaw ? JSON.parse(stateRaw) : defaultState();

  const actor = (patch.actor || 'anonim').toString().slice(0, 40);
  const auditEntries = [];
  const ts = Date.now();

  for (const op of patch.ops) {
    try { applyOp(state, op, actor, ts, auditEntries); }
    catch (e) { console.warn('Bad op:', op, e.message); }
  }

  state.version = (state.version || 0) + 1;
  state.updatedAt = ts;

  await env.STATE.put(STATE_KEY, JSON.stringify(state));

  if (auditEntries.length > 0) {
    const auditRaw = await env.STATE.get(AUDIT_KEY);
    let audit = auditRaw ? JSON.parse(auditRaw) : [];
    audit = audit.concat(auditEntries);
    if (audit.length > AUDIT_MAX) audit = audit.slice(-AUDIT_MAX);
    await env.STATE.put(AUDIT_KEY, JSON.stringify(audit));
  }

  return jsonResponse(state);
}

function defaultState() {
  return {
    done: {}, notes: {}, assignments: {},
    customContacts: [], customCategories: [],
    version: 0, updatedAt: 0
  };
}

function applyOp(state, op, actor, ts, audit) {
  if (!op || typeof op !== 'object' || !op.type) return;

  switch (op.type) {
    case 'toggleDone': {
      if (typeof op.taskId !== 'string') return;
      if (op.value) {
        state.done[op.taskId] = true;
        audit.push({ ts, actor, action: 'bifat', taskId: op.taskId });
      } else {
        delete state.done[op.taskId];
        audit.push({ ts, actor, action: 'debifat', taskId: op.taskId });
      }
      break;
    }
    case 'setNote': {
      if (typeof op.taskId !== 'string') return;
      const val = (op.value || '').toString().slice(0, 1000);
      if (val) {
        state.notes[op.taskId] = val;
        audit.push({ ts, actor, action: 'notă', taskId: op.taskId });
      } else {
        delete state.notes[op.taskId];
      }
      break;
    }
    case 'setAssign': {
      if (typeof op.taskId !== 'string') return;
      if (op.contactId === null || op.contactId === undefined) {
        delete state.assignments[op.taskId];
        audit.push({ ts, actor, action: 'eliminat asignare', taskId: op.taskId });
      } else if (typeof op.contactId === 'string') {
        state.assignments[op.taskId] = op.contactId;
        audit.push({ ts, actor, action: 'asignat', taskId: op.taskId, contactId: op.contactId });
      }
      break;
    }
    case 'addContact': {
      const c = op.contact;
      if (!c || typeof c !== 'object' || !c.id || !c.name) return;
      if (state.customContacts.find(cc => cc.id === c.id)) return;
      state.customContacts.push({
        id: String(c.id).slice(0, 80),
        name: String(c.name).slice(0, 100),
        role: String(c.role || '').slice(0, 100),
        phone: String(c.phone || '').slice(0, 40),
        category: String(c.category || 'Subcontractori').slice(0, 60)
      });
      audit.push({ ts, actor, action: 'contact adăugat', name: c.name });
      break;
    }
    case 'updateContact': {
      const c = op.contact;
      if (!c || !c.id) return;
      const existing = state.customContacts.find(cc => cc.id === c.id);
      if (!existing) return;
      if (c.name !== undefined) existing.name = String(c.name).slice(0, 100);
      if (c.role !== undefined) existing.role = String(c.role).slice(0, 100);
      if (c.phone !== undefined) existing.phone = String(c.phone).slice(0, 40);
      if (c.category !== undefined) existing.category = String(c.category).slice(0, 60);
      audit.push({ ts, actor, action: 'contact editat', name: existing.name });
      break;
    }
    case 'deleteContact': {
      if (typeof op.contactId !== 'string') return;
      const idx = state.customContacts.findIndex(cc => cc.id === op.contactId);
      if (idx === -1) return;
      const name = state.customContacts[idx].name;
      state.customContacts.splice(idx, 1);
      Object.keys(state.assignments).forEach(taskId => {
        if (state.assignments[taskId] === op.contactId) delete state.assignments[taskId];
      });
      audit.push({ ts, actor, action: 'contact șters', name });
      break;
    }
    case 'addCategory': {
      if (typeof op.name !== 'string') return;
      const name = op.name.trim().slice(0, 60);
      if (!name) return;
      if (!state.customCategories.includes(name)) {
        state.customCategories.push(name);
      }
      break;
    }
  }
}

async function handleGetAudit(env) {
  const auditRaw = await env.STATE.get(AUDIT_KEY);
  return jsonResponse(auditRaw ? JSON.parse(auditRaw) : []);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}
