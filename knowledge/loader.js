// Knowledge base loader - file system + database
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const cache = {};

function loadFile(filePath) {
  if (cache[filePath]) return cache[filePath];
  const full = path.join(dir, filePath);
  if (!fs.existsSync(full)) return '';
  cache[filePath] = fs.readFileSync(full, 'utf-8').trim();
  return cache[filePath];
}

// File-based knowledge
const fileKnowledge = {
  interview: () => [
    loadFile('interview/star-method.md'),
    loadFile('interview/question-types.md'),
  ].filter(Boolean).join('\n\n---\n\n'),

  resume: () => [
    loadFile('resume/best-practices.md'),
  ].filter(Boolean).join('\n\n---\n\n'),

  career: () => [
    loadFile('career/frameworks.md'),
    loadFile('career/product-manager-book.md'),
  ].filter(Boolean).join('\n\n---\n\n'),
};

// Database reference (set by server at startup)
let db = null;
function setDB(database) { db = database; }

// Get merged knowledge: file + user-custom from DB
function getKnowledge(category) {
  const parts = [];
  // File-based knowledge
  const fileContent = fileKnowledge[category] ? fileKnowledge[category]() : '';
  if (fileContent) parts.push(fileContent);

  // User-custom knowledge from database
  if (db) {
    try {
      const entries = db.list('knowledge_entries') || [];
      const relevant = entries.filter(e => {
        if (category === 'interview') return ['面试'].includes(e.category);
        if (category === 'resume') return ['简历'].includes(e.category);
        if (category === 'career') return ['职业'].includes(e.category);
        return false;
      });
      if (relevant.length > 0) {
        const customContent = relevant.map(e => `## ${e.title}\n${e.content}`).join('\n\n---\n\n');
        parts.push('\n\n=== 用户自定义知识 ===\n\n' + customContent);
      }
    } catch {}
  }

  return parts.filter(Boolean).join('\n\n');
}

module.exports = { interview: () => getKnowledge('interview'), resume: () => getKnowledge('resume'), career: () => getKnowledge('career'), setDB };
