const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'jobseek.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db = { resumes:[], resume_versions:[], interviews:[], cover_letters:[], jd_matches:[], self_intros:[], qbanks:[], company_research:[], offer_comparisons:[], jobs:[], knowledge_entries:[], settings:{} };

if (fs.existsSync(dbFile)) {
  try { db = { ...db, ...JSON.parse(fs.readFileSync(dbFile, 'utf-8')) }; } catch {}
}

function save() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8'); }
function nextId(arr) { return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

// ============ Generic CRUD ============

function insert(collection, data) {
  const id = nextId(db[collection]);
  const row = { id, ...data, created_at: new Date().toLocaleString('zh-CN', { hour12: false }) };
  db[collection].push(row); save();
  return id;
}

function list(collection) {
  if (!db[collection]) db[collection] = [];
  return [...db[collection]].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
}

function get(collection, id) {
  return db[collection].find(x => x.id === id) || null;
}

function remove(collection, id) {
  db[collection] = db[collection].filter(x => x.id !== id); save();
}

function replaceAll(collection, entries) {
  if (!db[collection]) db[collection] = [];
  db[collection] = entries.map((e, i) => ({ ...e, id: e.id || (i + 1) }));
  save();
}

function update(collection, id, updates) {
  const item = db[collection].find(x => x.id === id);
  if (item) { Object.assign(item, updates); save(); }
}

// ============ Settings ============

function setSetting(key, value) { db.settings[key] = value; save(); }
function getSetting(key) { return db.settings[key] || null; }

module.exports = {
  insert, list, get, remove, update, setSetting, getSetting,
  _replace: replaceAll
};
