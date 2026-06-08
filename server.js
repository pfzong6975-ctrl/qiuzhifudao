const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const ai = require('./ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadsDir));

function getKey() { return db.getSetting('api_key'); }
function getUrl() { return db.getSetting('api_base_url') || null; }
function requireKey(res) { const k = getKey(); if (!k) { res.status(400).json({ error: '请先设置 API Key' }); return null; } return k; }

// ==================== Settings ====================

app.post('/api/settings/api-key', (req, res) => {
  const { apiKey, baseUrl } = req.body;
  if (!apiKey?.trim()) return res.status(400).json({ error: 'API Key is required' });
  db.setSetting('api_key', apiKey.trim());
  if (baseUrl !== undefined) db.setSetting('api_base_url', baseUrl.trim());
  res.json({ success: true });
});

app.get('/api/settings/api-key', (req, res) => {
  const v = db.getSetting('api_key');
  res.json({ hasKey: !!v, maskedKey: v ? v.substring(0,8)+'...'+v.substring(v.length-4) : null, baseUrl: db.getSetting('api_base_url')||'' });
});

// ==================== Resume ====================

app.post('/api/resume/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let content = '';
    if (['.txt','.md'].includes(ext)) content = fs.readFileSync(req.file.path, 'utf-8');
    else if (ext === '.pdf') { const pdf = require('pdf-parse'); content = (await pdf(fs.readFileSync(req.file.path))).text; }
    else if (['.docx','.doc'].includes(ext)) { const m = require('mammoth'); content = (await m.extractRawText({ path: req.file.path })).value; }
    if (!content?.trim()) return res.status(400).json({ error: '无法解析文件内容' });
    res.json({ filename: req.file.originalname, content: content.trim(), charCount: content.trim().length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/resume/analyze', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { content, filename } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容为空' });
  try {
    const analysis = await ai.analyzeResume(k, content.trim(), getUrl());
    const id = db.insert('resumes', { filename: filename||'pasted', content: content.trim(), analysis: JSON.stringify(analysis) });
    res.json({ id, analysis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/resume/optimize-for-job', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { content, jobTitle, jobDescription } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '简历内容为空' });
  if (!jobTitle?.trim()) return res.status(400).json({ error: '岗位名称为空' });
  try {
    const result = await ai.optimizeResumeForJob(k, content.trim(), jobTitle.trim(), jobDescription?.trim()||'', getUrl());
    const id = db.insert('resumes', { filename: jobTitle+'-优化版', content: content.trim(), analysis: JSON.stringify(result) });
    res.json({ id, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/resume/history', (req, res) => res.json(db.list('resumes')));

// ==================== Resume Versions (MUST be before :id route) ====================

app.post('/api/resume/versions', (req, res) => {
  const { name, content, parentId } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content required' });
  const id = db.insert('resume_versions', { name, content, parent_id: parentId || null });
  res.json({ id });
});
app.get('/api/resume/versions/list', (req, res) => res.json(db.list('resume_versions')));
app.get('/api/resume/versions/:id', (req, res) => {
  const v = db.get('resume_versions', parseInt(req.params.id));
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});
app.delete('/api/resume/versions/:id', (req, res) => { db.remove('resume_versions', parseInt(req.params.id)); res.json({ success: true }); });

app.get('/api/resume/:id', (req, res) => {
  const r = db.get('resumes', parseInt(req.params.id));
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (typeof r.analysis === 'string') r.analysis = JSON.parse(r.analysis);
  res.json(r);
});
app.delete('/api/resume/:id', (req, res) => { db.remove('resumes', parseInt(req.params.id)); res.json({ success: true }); });

// ==================== Resume Translation ====================

app.post('/api/resume/translate', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { content, targetLang } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容为空' });
  try {
    const translated = await ai.translateResume(k, content.trim(), targetLang || '英文', getUrl());
    res.json({ translated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Cover Letter ====================

app.post('/api/cover-letter/generate', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { resumeContent, jdContent, language } = req.body;
  if (!resumeContent?.trim()) return res.status(400).json({ error: '简历内容为空' });
  try {
    const result = await ai.generateCoverLetter(k, resumeContent, jdContent||'', language||'中文', getUrl());
    const id = db.insert('cover_letters', { resume_content: resumeContent, jd_content: jdContent||'', language: language||'中文', result: JSON.stringify(result) });
    res.json({ id, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/cover-letter/history', (req, res) => res.json(db.list('cover_letters')));

// ==================== JD Match ====================

app.post('/api/jd-match/analyze', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { resumeContent, jdContent } = req.body;
  if (!resumeContent?.trim() || !jdContent?.trim()) return res.status(400).json({ error: '简历和JD均不能为空' });
  try {
    const result = await ai.matchJD(k, resumeContent, jdContent, getUrl());
    const id = db.insert('jd_matches', { resume_content: resumeContent, jd_content: jdContent, result: JSON.stringify(result) });
    res.json({ id, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/jd-match/history', (req, res) => res.json(db.list('jd_matches')));

// ==================== Self-Intro ====================

app.post('/api/self-intro/evaluate', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { introText, language } = req.body;
  if (!introText?.trim()) return res.status(400).json({ error: '自我介绍内容为空' });
  try {
    const result = await ai.evaluateSelfIntro(k, introText, language||'中文', getUrl());
    const id = db.insert('self_intros', { intro_text: introText, language: language||'中文', result: JSON.stringify(result) });
    res.json({ id, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/self-intro/history', (req, res) => res.json(db.list('self_intros')));

// ==================== Interview ====================

app.post('/api/interview/start', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { type='综合', language='中文', questionCount=5, followUpMode=false, persona, jdContent } = req.body;
  try {
    const r = await ai.generateInterviewQuestion(k, type, language, 1, questionCount, [], followUpMode, persona, jdContent, getUrl());
    const id = db.insert('interviews', {
      type, language, question_count: questionCount, follow_up_mode: followUpMode,
      status:'in_progress', current_question:1, qa_list: JSON.stringify([{question:r.next_question,answer:'',evaluation:null}]), review:null, score:null,
      persona: persona ? JSON.stringify(persona) : null, jd_content: jdContent || ''
    });
    res.json({ sessionId: id, question: r.next_question, questionNumber:1, totalQuestions: followUpMode ? 99 : questionCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/interview/:id/answer', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { answer } = req.body;
  if (!answer?.trim()) return res.status(400).json({ error: '答案不能为空' });
  const s = db.get('interviews', parseInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (s.status === 'completed') return res.status(400).json({ error: '已结束' });

  const qa = typeof s.qa_list === 'string' ? JSON.parse(s.qa_list) : s.qa_list;
  qa[qa.length-1].answer = answer.trim();

  const isLast = !s.follow_up_mode && s.current_question >= s.question_count;

  try {
    const persona = s.persona ? JSON.parse(s.persona) : null;
    const r = await ai.generateInterviewQuestion(k, s.type, s.language,
      isLast ? s.current_question : s.current_question+1, s.question_count, qa, s.follow_up_mode, persona, s.jd_content, getUrl());

    if (r.evaluation) qa[qa.length-1].evaluation = r.evaluation;

    if (r.is_last || (isLast && !s.follow_up_mode)) {
      db.update('interviews', s.id, { status:'completed', qa_list: JSON.stringify(qa) });
      res.json({ isLast:true, evaluation:r.evaluation, closingMessage:r.next_question });
    } else {
      qa.push({ question: r.next_question, answer: '', evaluation: null });
      db.update('interviews', s.id, { current_question: s.current_question+1, qa_list: JSON.stringify(qa) });
      res.json({ isLast:false, evaluation:r.evaluation, nextQuestion:r.next_question, questionNumber:s.current_question+1, totalQuestions: s.follow_up_mode ? '∞' : s.question_count });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/interview/:id/review', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const s = db.get('interviews', parseInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  const qa = typeof s.qa_list === 'string' ? JSON.parse(s.qa_list) : s.qa_list;
  if (s.review) return res.json({ review: typeof s.review==='string' ? JSON.parse(s.review) : s.review, score:s.score, cached:true });
  try {
    const r = await ai.reviewInterview(k, s.type, s.language, qa, getUrl());
    db.update('interviews', s.id, { review: JSON.stringify(r), score: r.overall_score });
    res.json({ review: r, score: r.overall_score });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/interview/sessions', (req, res) => res.json(db.list('interviews')));
app.get('/api/interview/:id', (req, res) => {
  const s = db.get('interviews', parseInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (typeof s.qa_list === 'string') s.qa_list = JSON.parse(s.qa_list);
  if (typeof s.review === 'string') s.review = JSON.parse(s.review);
  res.json(s);
});

// ==================== Question Bank ====================

app.post('/api/question-bank/generate', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { company, role, count=10 } = req.body;
  if (!role) return res.status(400).json({ error: '岗位不能为空' });
  try {
    const r = await ai.generateQuestionBank(k, company||'', role, count, getUrl());
    const id = db.insert('qbanks', { company: company||'', role, count, questions: JSON.stringify(r.questions) });
    res.json({ id, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/question-bank/history', (req, res) => res.json(db.list('qbanks')));

// ==================== Company Research ====================

app.post('/api/company/research', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { companyName } = req.body;
  if (!companyName?.trim()) return res.status(400).json({ error: '公司名不能为空' });
  try {
    const r = await ai.researchCompany(k, companyName, getUrl());
    const id = db.insert('company_research', { company_name: companyName, result: JSON.stringify(r) });
    res.json({ id, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/company/history', (req, res) => res.json(db.list('company_research')));

// ==================== Offer Comparison ====================

app.post('/api/offer/compare', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { offersText } = req.body;
  if (!offersText?.trim()) return res.status(400).json({ error: 'Offer信息不能为空' });
  try {
    const r = await ai.compareOffers(k, offersText, getUrl());
    const id = db.insert('offer_comparisons', { offers_text: offersText, result: JSON.stringify(r) });
    res.json({ id, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Export DOCX ====================

app.post('/api/export/docx', (req, res) => {
  const { content, filename } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容为空' });

  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

    const lines = content.split('\n').filter(l => l.trim());
    const children = lines.map(line => {
      const t = line.trim();
      if (t.startsWith('# ')) return new Paragraph({ text: t.replace('# ',''), heading: HeadingLevel.HEADING_1, spacing: { after: 120 } });
      if (t.startsWith('## ')) return new Paragraph({ text: t.replace('## ',''), heading: HeadingLevel.HEADING_2, spacing: { after: 100 } });
      if (t.startsWith('- ')) return new Paragraph({ text: t.replace('- ',''), bullet: { level: 0 }, spacing: { after: 60 } });
      return new Paragraph({ text: t, spacing: { after: 80 } });
    });

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Microsoft YaHei', size: 22 } } } },
      sections: [{ children }],
    });

    Packer.toBuffer(doc).then(buffer => {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'resume')}.docx"`);
      res.send(buffer);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Job Tracker ====================

app.post('/api/jobs', (req, res) => {
  const { company, link, industry, tags, position, location, status, applied_date, notes } = req.body;
  if (!company?.trim() || !position?.trim()) return res.status(400).json({ error: '公司名和职位必填' });
  const id = db.insert('jobs', { company:company.trim(), link:link?.trim()||'', industry:industry?.trim()||'', tags:tags?.trim()||'', position:position.trim(), location:location?.trim()||'', status:status||'投递', applied_date:applied_date||new Date().toISOString().slice(0,10), notes:notes?.trim()||'' });
  res.json({ id });
});
app.get('/api/jobs', (req, res) => res.json(db.list('jobs')));
app.put('/api/jobs/:id', (req, res) => {
  const job = db.get('jobs', parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: 'Not found' });
  db.update('jobs', job.id, req.body);
  res.json({ success: true });
});
app.delete('/api/jobs/:id', (req, res) => { db.remove('jobs', parseInt(req.params.id)); res.json({ success: true }); });

// ==================== Career Assessment ====================

app.post('/api/career/assess', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { answers, background } = req.body;
  try {
    const result = await ai.careerAssessment(k, answers, background || '', getUrl());
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Resume Chat ====================

app.post('/api/resume-chat', async (req, res) => {
  const k = requireKey(res); if (!k) return;
  const { messages, collectedInfo } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });
  try {
    const result = await ai.resumeChat(k, messages, collectedInfo || {}, getUrl());
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Production static serve ====================

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => { if (!req.path.startsWith('/api')) res.sendFile(path.join(__dirname, 'dist', 'index.html')); });
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ==================== Knowledge Base Upload ====================

app.post('/api/knowledge/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let content = '';
    if (['.txt','.md'].includes(ext)) content = fs.readFileSync(req.file.path, 'utf-8');
    else if (ext === '.pdf') { const pdf = require('pdf-parse'); content = (await pdf(fs.readFileSync(req.file.path))).text; }
    else if (['.docx','.doc'].includes(ext)) { const m = require('mammoth'); content = (await m.extractRawText({ path: req.file.path })).value; }
    else return res.status(400).json({ error: '不支持的文件格式，支持 PDF/DOCX/DOC/TXT/MD' });

    if (!content?.trim()) return res.status(400).json({ error: '无法解析文件内容' });

    const filename = req.file.originalname.replace(ext, '');
    res.json({ filename, content: content.trim(), charCount: content.trim().length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== Knowledge Base CRUD ====================

app.get('/api/knowledge/list', (req, res) => res.json(db.list('knowledge_entries')));

app.post('/api/knowledge/save', (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Invalid format' });
  // Replace all entries
  db._replace('knowledge_entries', entries);
  // Clear loader cache
  Object.keys(require.cache).filter(k => k.includes('knowledge')).forEach(k => delete require.cache[k]);
  res.json({ success: true, count: entries.length });
});

app.listen(PORT, () => {
  // Initialize knowledge DB
  require('./knowledge/loader').setDB(db);
  console.log(`🚀 Server http://localhost:${PORT}`);
});
