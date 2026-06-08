// AI module - supports Anthropic Claude + OpenAI-compatible (DeepSeek, etc.)
// Auto-detects API type based on key prefix
// Knowledge base injection for authoritative responses

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const knowledge = require('./knowledge/loader');

function isAnthropicKey(key) { return key && key.startsWith('sk-ant'); }

// ============ Low-level API calls ============

async function callAnthropic(apiKey, system, userMsg, maxTokens, baseUrl) {
  const res = await fetch(baseUrl || ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMsg }] }),
  });
  const text = await res.text();
  if (!res.ok) {
    let e = text; try { e = JSON.parse(text).error?.message || text; } catch {}
    throw new Error(`API ${res.status}: ${e}`);
  }
  const content = JSON.parse(text)?.content?.[0]?.text;
  if (!content) throw new Error('Unexpected API response');
  return content;
}

async function callOpenAI(apiKey, system, userMsg, maxTokens, baseUrl) {
  const res = await fetch(baseUrl || DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', max_tokens: maxTokens, temperature: 0.7,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }] }),
  });
  const text = await res.text();
  if (!res.ok) {
    let e = text; try { e = JSON.parse(text).error?.message || text; } catch {}
    throw new Error(`API ${res.status}: ${e}`);
  }
  const content = JSON.parse(text)?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected API response');
  return content;
}

async function callAI(apiKey, system, userMsg, maxTokens, baseUrl) {
  if (isAnthropicKey(apiKey)) return callAnthropic(apiKey, system, userMsg, maxTokens, baseUrl);
  return callOpenAI(apiKey, system, userMsg, maxTokens, baseUrl);
}

function safeJson(text) {
  let t = text.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch {}
  return { raw: t };
}

// ============ 1. Resume Analysis (Targeted for a job) ============

function getTargetedResumePrompt(jobTitle, jobDescription) {
  return `You are an expert resume writer. A candidate is applying for "${jobTitle}".

${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}

Rewrite their resume to maximize hiring chances. The optimized_resume field MUST be a fully formatted resume following this EXACT structure:

【个人信息】
姓名 | 电话 | 邮箱 | 所在城市 | 求职意向：${jobTitle}

【个人优势】
一段3-4行的专业自我评价，突出核心竞争力和与目标岗位的匹配度

【工作经历】
公司名称 | 职位 | 时间范围
- 用 STAR 法则描述工作内容，每条以动词开头（负责/主导/搭建/优化/推动）
- 每条必须包含量化数据（提升了X%、节省Y万、带来Z用户）
- 每个经历写3-4条 bullet points

【项目经验】
项目名称 | 角色 | 时间
- 项目简介一句话
- 技术栈/方法论
- 个人贡献和量化成果

【教育背景】
学校名称 | 专业 | 学历 | 毕业时间 | GPA（如果突出）

【技能】
- 技术技能：列出具体技术栈
- 语言能力：列出具体语言和水平
- 证书/资质

Respond ONLY with JSON:
{
  "match_score": <1-100>,
  "optimized_resume": "<the complete formatted resume following the structure above, use real line breaks and proper spacing>",
  "key_changes": ["<what was changed>", ...],
  "keywords_added": ["<keyword>", ...],
  "highlighted_experience": "<most relevant experience>",
  "gap_notes": "<missing elements>"
}`;
}

// ============ 2. General Resume Analysis ============

function getResumePrompt() {
  return `You are an expert resume reviewer with deep knowledge of industry best practices. Use the following authoritative knowledge to guide your analysis:

=== RESUME BEST PRACTICES KNOWLEDGE BASE ===
${knowledge.resume()}
=== END KNOWLEDGE BASE ===

Apply these standards strictly in your review. Respond ONLY with JSON:
{"overall_score":<1-100>,"summary":"...","structure":{"score":<1-100>,"feedback":"...","strengths":[...],"weaknesses":[...]},"content":{"score":<1-100>,"feedback":"...","bullet_points":[{"original":"...","suggestion":"...","reason":"..."}]},"wording":{"score":<1-100>,"feedback":"...","improvements":[{"original":"...","improved":"...","reason":"..."}]},"keywords":{"score":<1-100>,"feedback":"...","missing_keywords":[...],"present_keywords":[...]},"overall_suggestions":[...]}`;
}

async function analyzeResume(apiKey, resumeText, baseUrl) {
  return safeJson(await callAI(apiKey, getResumePrompt(), `Analyze:\n\n---\n${resumeText}\n---`, 4096, baseUrl));
}

async function optimizeResumeForJob(apiKey, resumeText, jobTitle, jobDescription, baseUrl) {
  return safeJson(await callAI(apiKey, getTargetedResumePrompt(jobTitle, jobDescription),
    `Original Resume:\n\n---\n${resumeText}\n---\n\nTarget Job: ${jobTitle}\n\nPlease rewrite and optimize this resume specifically for the ${jobTitle} position.`, 8192, baseUrl));
}

// ============ 2. Cover Letter ============

const PROMPT_COVER = `You are a professional career coach. Write a compelling cover letter based on the resume and job description. Respond ONLY with JSON:
{"subject":"<email subject>","greeting":"<greeting>","body":["<paragraph1>","<paragraph2>","<paragraph3>"],"closing":"<closing>","signature":"<name>","tips":["<tip1>","<tip2>"],"tone":"<formal/semi-formal/passionate>"}`;

async function generateCoverLetter(apiKey, resumeText, jdText, language, baseUrl) {
  return safeJson(await callAI(apiKey, PROMPT_COVER,
    `Language: ${language}\n\nResume:\n${resumeText}\n\nJob Description:\n${jdText}\n\nWrite a tailored cover letter.`, 3072, baseUrl));
}

// ============ 3. JD Match Analysis ============

const PROMPT_JDMATCH = `Compare a resume against a job description. Respond ONLY with JSON:
{"match_score":<1-100>,"summary":"...","matched_points":["<point>",...],"gap_points":["<gap>",...],"skill_breakdown":{"must_have_matched":["..."],"must_have_missing":["..."],"nice_to_have":["..."]},"resume_improvements":["<specific action>",...],"interview_focus":["<topic to prepare>",...]}`;

async function matchJD(apiKey, resumeText, jdText, baseUrl) {
  return safeJson(await callAI(apiKey, PROMPT_JDMATCH,
    `Resume:\n${resumeText}\n\nJob Description:\n${jdText}\n\nAnalyze match.`, 2048, baseUrl));
}

// ============ 4. Self-Intro Evaluation ============

const PROMPT_INTRO = `Evaluate a self-introduction. Respond ONLY with JSON:
{"score":<1-10>,"duration_feedback":"<too short/just right/too long>","structure_feedback":"...","content_highlights":["..."],"missing_elements":["..."],"delivery_tips":["..."],"improved_version":"<a better version>"}`;

async function evaluateSelfIntro(apiKey, introText, language, baseUrl) {
  return safeJson(await callAI(apiKey, PROMPT_INTRO,
    `Language: ${language}\n\nSelf-introduction:\n${introText}\n\nEvaluate.`, 1024, baseUrl));
}

// ============ 5. Resume Translation ============

const PROMPT_TRANSLATE = `Professional resume translator. Translate the resume while preserving formatting and professional terminology. Respond ONLY with the translated text, no extra content.`;

async function translateResume(apiKey, resumeText, targetLang, baseUrl) {
  return await callAI(apiKey, PROMPT_TRANSLATE,
    `Translate to ${targetLang}:\n\n${resumeText}`, 4096, baseUrl);
}

// ============ 6. Interview Questions ============

function getInterviewPrompt() {
  return `You are a professional interviewer trained in best practices. Use this authoritative knowledge to guide your questioning and evaluation:

=== INTERVIEW KNOWLEDGE BASE ===
${knowledge.interview()}
=== END KNOWLEDGE BASE ===

Apply the STAR method for behavioral questions. Use the scoring criteria from the knowledge base. Respond ONLY with JSON:
First: {"evaluation":null,"next_question":"...","is_last":false}
Middle: {"evaluation":{"score":<1-10>,"feedback":"...","strengths":[...],"improvements":[...]},"next_question":"...","is_last":false}
Last: {"evaluation":{...},"next_question":"<closing>","is_last":true}
For follow-up mode: if answer is weak, ask a follow-up on the SAME topic instead of moving to next question. Set is_last:false and make next_question a deeper probe.`;
}

async function generateInterviewQuestion(apiKey, type, language, qNum, total, qaList, followUpMode, persona, jdContent, baseUrl) {
  const isFirst = !qaList || qaList.length === 0;
  const isLast = !followUpMode && qNum >= total;
  const ctx = isFirst ? 'First question.' : qaList.map((q,i) => `Q${i+1}: ${q.question}\nA${i+1}: ${q.answer}`).join('\n');
  const mode = followUpMode ? 'FOLLOW-UP MODE: If the answer is weak or shallow, ask a probing follow-up instead of moving on.' : 'STANDARD MODE.';
  const personaPrompt = persona?.prompt ? `\n\nINTERVIEWER PERSONA: ${persona.prompt}\nAdapt your tone, style, and question selection to match this persona exactly.` : '';
  const jdPrompt = jdContent ? `\n\nJOB DESCRIPTION:\n${jdContent}\n\nTailor all interview questions to this specific job. Ask about the required skills, responsibilities, and scenarios mentioned in the JD.` : '';
  return safeJson(await callAI(apiKey, getInterviewPrompt(),
    `${mode}\n${type} | ${language} | Q${qNum}/${total}\n\n${ctx}${jdPrompt}${personaPrompt}\n\n${isFirst?'Generate Q1.':isLast?'Evaluate (FINAL question).':'Evaluate + next question.'}`, 2048, baseUrl));
}

// ============ 7. Interview Review ============

function getReviewPrompt() {
  return `Expert interview coach using authoritative evaluation frameworks:

=== INTERVIEW EVALUATION KNOWLEDGE ===
${knowledge.interview()}
=== END KNOWLEDGE ===

Evaluate and respond ONLY with JSON:
{"overall_score":<1-100>,"summary":"...","strengths":[...],"weaknesses":[...],"question_reviews":[{"question_number":1,"question":"...","answer":"...","score":<1-10>,"feedback":"...","improved_answer":"..."}],"improvement_plan":{"short_term":[...],"long_term":[...]},"key_takeaways":[...],"skill_radar":{"communication":<1-100>,"technical":<1-100>,"leadership":<1-100>,"problem_solving":<1-100>,"cultural_fit":<1-100>}}`;
}

async function reviewInterview(apiKey, type, language, qaList, baseUrl) {
  const qaText = qaList.map((q,i) => `Q${i+1}: ${q.question}\nA: ${q.answer}`).join('\n---\n');
  return safeJson(await callAI(apiKey, getReviewPrompt(),
    `${type} | ${language} | ${qaList.length} questions\n\n${qaText}\n\nComprehensive review.`, 8192, baseUrl));
}

// ============ 8. Question Bank ============

const PROMPT_QBANK = `Generate interview questions for a specific company/role. Respond ONLY with JSON:
{"company":"...","role":"...","questions":[{"category":"<technical/behavioral/general>","question":"...","difficulty":"<easy/medium/hard>","tips":["..."]}]}`;

async function generateQuestionBank(apiKey, company, role, count, baseUrl) {
  return safeJson(await callAI(apiKey, PROMPT_QBANK,
    `Company: ${company || 'General'}\nRole: ${role}\nGenerate ${count} interview questions.`, 2048, baseUrl));
}

// ============ 9. Company Research ============

const PROMPT_COMPANY = `Company research assistant. Respond ONLY with JSON:
{"company":"...","overview":"<2-3 sentences>","culture":"...","interview_style":"<typical interview approach>","common_questions":["...",..."],"preparation_tips":["..."],"recent_news":["..."]}`;

async function researchCompany(apiKey, companyName, baseUrl) {
  return safeJson(await callAI(apiKey, PROMPT_COMPANY,
    `Research: ${companyName}`, 2048, baseUrl));
}

// ============ 10. Offer Comparison ============

function getOfferPrompt() {
  return `Expert career advisor. Use this authoritative knowledge to guide your analysis:

=== CAREER & NEGOTIATION KNOWLEDGE ===
${knowledge.career()}
=== END KNOWLEDGE ===

Compare multiple job offers using the frameworks above. Respond ONLY with JSON:
{"offers":[{"name":"...","score":<1-100>,"pros":["..."],"cons":["..."]}],"recommendation":"<which offer and why>","negotiation_tips":["..."],"decision_factors":{"salary":"...","growth":"...","culture":"...","wlb":"...","location":"..."}}`;
}

async function compareOffers(apiKey, offersText, baseUrl) {
  return safeJson(await callAI(apiKey, getOfferPrompt(),
    `Compare these offers:\n${offersText}`, 2048, baseUrl));
}

// ============ 11. Conversational Resume Builder ============

function getResumeChatPrompt(collectedInfo) {
  const hasData = collectedInfo && Object.keys(collectedInfo).length > 0;
  const dataStr = hasData ? `\n目前已采集：${JSON.stringify(collectedInfo)}\n根据还缺少什么来问下一个问题。` : '这是第一条消息，用一个友好的中文问候开始，问第一个问题。';

  return `你是友好的职业规划师，帮助一位学生通过对话创建简历。每次只问一个问题，保持鼓励的语气。

采集阶段（按顺序）：
1. personal(个人信息): 姓名、电话、邮箱、城市、求职意向
2. education(教育): 学校、专业、学历、毕业时间、GPA
3. experience(经历): 实习/兼职/志愿活动/校园组织
4. projects(项目): 课程项目/个人项目/比赛
5. skills(技能): 技术栈、语言、证书

规则：每次一问、口语化简短。学生说"跳过"进入下一阶段。关键信息追问细节。

${dataStr}

必须严格用JSON格式回复，不要输出任何其他文字：
{"message":"你的回复和下一个问题","collected":{},"phase":"personal","is_complete":false,"resume":""}
全部阶段完成后设is_complete为true，resume字段放完整简历文本，必须包含以下格式：
【个人信息】姓名 | 电话 | 邮箱 | 城市 | 求职意向
【个人优势】3-4行专业自我评价
【工作经历】公司 | 职位 | 时间 + 3-4条STAR法则bullet points（动词开头、量化数据）
【项目经验】项目名 | 角色 | 时间 + 技术栈 + 个人贡献和量化成果
【教育背景】学校 | 专业 | 学历 | 毕业时间
【技能】技术栈、语言、证书`;
}

async function resumeChat(apiKey, messages, collectedInfo, baseUrl) {
  const systemPrompt = getResumeChatPrompt(collectedInfo);
  const msgs = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  if (isAnthropicKey(apiKey)) {
    const res = await fetch(baseUrl || ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, messages: msgs.filter(m => m.role !== 'system') }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`API ${res.status}`);
    return safeJson(JSON.parse(text)?.content?.[0]?.text || '');
  } else {
    const res = await fetch(baseUrl || DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 4096, temperature: 0.7, messages: msgs }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`API ${res.status}`);
    return safeJson(JSON.parse(text)?.choices?.[0]?.message?.content || '');
  }
}

// ============ 12. Career Assessment ============

function getCareerPrompt() {
  return `你是一位资深职业规划师。根据用户的性格测试结果、教育背景、个人兴趣和经历，提供专业的职业方向建议。

请全面分析并严格用JSON回复：
{
  "personality_type": "<判断的性格类型，如 INTJ/ENFP 或 实干型/创新型>",
  "personality_desc": "<2-3句话描述用户的性格特点>",
  "strengths": ["优势1","优势2","优势3"],
  "career_directions": [
    {"方向": "<职业方向1>", "匹配度": <1-100>, "理由": "<为什么适合>", "推荐岗位": ["岗位1","岗位2"], "发展路径": "<从初级到高级的路径>", "所需技能": ["技能1","技能2"]}
  ],
  "suitable_industries": ["行业1","行业2"],
  "short_term_plan": "<未来1-2年的具体建议>",
  "long_term_plan": "<3-5年的发展规划>",
  "skill_gaps": ["需要补充的技能1","技能2"],
  "learning_resources": ["推荐书籍/课程1","资源2"],
  "summary": "<200字的总结建议>"
}`;
}

async function careerAssessment(apiKey, answers, background, baseUrl) {
  const qText = answers ? `\n性格测试答案：\n${JSON.stringify(answers)}` : '';
  const bgText = background ? `\n个人背景：\n${background}` : '';
  return safeJson(await callAI(apiKey, getCareerPrompt(),
    `请分析以下用户：${qText}${bgText}\n\n请给出全面的职业方向建议。`, 4096, baseUrl));
}

module.exports = {
  analyzeResume, optimizeResumeForJob, generateCoverLetter, matchJD, evaluateSelfIntro,
  translateResume, generateInterviewQuestion, reviewInterview,
  generateQuestionBank, researchCompany, compareOffers, resumeChat, careerAssessment
};
