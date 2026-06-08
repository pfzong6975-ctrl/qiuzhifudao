const BASE = '/api';

async function request(url, opts = {}) {
  const res = await fetch(BASE + url, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Settings
export const getApiKeyStatus = () => request('/settings/api-key');

// Resume
export const uploadResume = (file) => fetch(BASE+'/resume/upload', { method:'POST', body: (d=>{ d.append('file',file); return d; })(new FormData()) }).then(r=>r.json());
export const analyzeResume = (content, filename) => request('/resume/analyze', { method:'POST', body: JSON.stringify({content, filename}) });
export const optimizeResumeForJob = (content, jobTitle, jobDescription) => request('/resume/optimize-for-job', { method:'POST', body: JSON.stringify({content, jobTitle, jobDescription}) });
export const getResumeHistory = () => request('/resume/history');
export const getResume = (id) => request('/resume/'+id);
export const deleteResume = (id) => request('/resume/'+id, { method:'DELETE' });

// Resume Versions
export const saveResumeVersion = (name, content, parentId) => request('/resume/versions', { method:'POST', body: JSON.stringify({name, content, parentId}) });
export const getResumeVersions = () => request('/resume/versions/list');
export const getResumeVersion = (id) => request('/resume/versions/'+id);
export const deleteResumeVersion = (id) => request('/resume/versions/'+id, { method:'DELETE' });

// Translation
export const translateResume = (content, targetLang) => request('/resume/translate', { method:'POST', body: JSON.stringify({content, targetLang}) });

// Cover Letter
export const generateCoverLetter = (resumeContent, jdContent, language) => request('/cover-letter/generate', { method:'POST', body: JSON.stringify({resumeContent, jdContent, language}) });
export const getCoverLetterHistory = () => request('/cover-letter/history');

// JD Match
export const matchJD = (resumeContent, jdContent) => request('/jd-match/analyze', { method:'POST', body: JSON.stringify({resumeContent, jdContent}) });
export const getJDMatchHistory = () => request('/jd-match/history');

// Self Intro
export const evaluateSelfIntro = (introText, language) => request('/self-intro/evaluate', { method:'POST', body: JSON.stringify({introText, language}) });
export const getSelfIntroHistory = () => request('/self-intro/history');

// Interview
export const startInterview = (type, language, questionCount, followUpMode, persona, jdContent) => request('/interview/start', { method:'POST', body: JSON.stringify({type, language, questionCount, followUpMode, persona, jdContent}) });
export const submitAnswer = (sessionId, answer) => request('/interview/'+sessionId+'/answer', { method:'POST', body: JSON.stringify({answer}) });
export const getInterviewSessions = () => request('/interview/sessions');
export const getInterviewSession = (id) => request('/interview/'+id);
export const generateReview = (sessionId) => request('/interview/'+sessionId+'/review', { method:'POST' });

// Question Bank
export const generateQuestionBank = (company, role, count) => request('/question-bank/generate', { method:'POST', body: JSON.stringify({company, role, count}) });
export const getQuestionBankHistory = () => request('/question-bank/history');

// Company Research
export const researchCompany = (companyName) => request('/company/research', { method:'POST', body: JSON.stringify({companyName}) });
export const getCompanyHistory = () => request('/company/history');

// Offer Compare
export const compareOffers = (offersText) => request('/offer/compare', { method:'POST', body: JSON.stringify({offersText}) });
