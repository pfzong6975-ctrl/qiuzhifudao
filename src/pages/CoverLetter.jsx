import { useState } from 'react';
import { generateCoverLetter, getCoverLetterHistory } from '../api';
import './ToolPage.css';

export default function CoverLetter() {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [lang, setLang] = useState('中文');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!resume.trim()) { setError('请粘贴简历内容'); return; }
    setLoading(true); setError('');
    try { setResult(await generateCoverLetter(resume.trim(), jd.trim(), lang)); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="tool-page">
      <div className="page-header"><h1>✉️ 求职信生成</h1><p>AI 根据你的简历和目标岗位，自动生成专业求职信</p></div>

      {error && <div className="error-msg">❌ {error}</div>}

      {!result ? (
        <div className="grid-2">
          <div className="card">
            <label className="label">简历内容</label>
            <textarea className="textarea" rows={10} placeholder="粘贴你的简历..." value={resume} onChange={e => setResume(e.target.value)} />
            <div style={{marginTop:16}}>
              <label className="label">目标岗位 JD（可选，填入后求职信更精准）</label>
              <textarea className="textarea" rows={6} placeholder="粘贴岗位描述..." value={jd} onChange={e => setJd(e.target.value)} />
            </div>
          </div>
          <div className="card">
            <label className="label">语言</label>
            <div className="option-row small">
              {['中文','英文'].map(l => <button key={l} className={`option-btn ${lang===l?'active':''}`} onClick={()=>setLang(l)}>{l}</button>)}
            </div>
            <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:20}} onClick={handleGenerate} disabled={loading||!resume.trim()}>
              {loading?'生成中...':'🤖 生成求职信'}
            </button>
            <div className="tool-tips">
              <h4>💡 提示</h4>
              <ul><li>填入目标JD能让求职信更精准匹配</li><li>生成后可复制到邮件或文档中使用</li><li>支持中英文两种语言</li></ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="tool-result">
          <div className="card">
            <div className="tool-result-header"><h2>📧 {result.subject || '求职信'}</h2><span className="score-badge high">{result.tone || 'professional'}</span></div>
            <div className="cover-letter-preview">
              <p className="cl-greeting">{result.greeting}</p>
              {result.body?.map((p,i) => <p key={i}>{p}</p>)}
              <p className="cl-closing">{result.closing}<br/>{result.signature}</p>
            </div>
            {result.tips?.length > 0 && <div className="tool-extra"><h4>💡 优化建议</h4><ul>{result.tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>}
            <button className="btn btn-secondary" onClick={()=>setResult(null)}>↩ 重新生成</button>
          </div>
        </div>
      )}
    </div>
  );
}
