import { useState } from 'react';
import { researchCompany, getCompanyHistory } from '../api';
import './ToolPage.css';

export default function CompanyResearch() {
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleResearch() {
    if (!name.trim()) { setError('请输入公司名称'); return; }
    setLoading(true); setError('');
    try { setResult(await researchCompany(name.trim())); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  if (result) return (
    <div className="tool-page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setResult(null)}>← 重新搜索</button>
      <div className="card" style={{marginTop:16}}>
        <h2>🏢 {result.company}</h2>
        <p style={{margin:'8px 0 20px',color:'var(--text-secondary)'}}>{result.overview}</p>
        <div className="grid-2">
          <div>
            <h4>🏛 企业文化</h4><p style={{fontSize:14,color:'var(--text-secondary)'}}>{result.culture}</p>
            <h4 style={{marginTop:16}}>🎤 面试风格</h4><p style={{fontSize:14,color:'var(--text-secondary)'}}>{result.interview_style}</p>
          </div>
          <div>
            {result.common_questions?.length>0 && <div><h4>📋 常见面试题</h4><ul style={{fontSize:14}}>{result.common_questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
          </div>
        </div>
        {result.preparation_tips?.length>0 && <div style={{marginTop:20}}><h4>💡 准备建议</h4><ul>{result.preparation_tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>}
        {result.recent_news?.length>0 && <div style={{marginTop:20}}><h4>📰 近期动态</h4><ul>{result.recent_news.map((n,i)=><li key={i}>{n}</li>)}</ul></div>}
      </div>
    </div>
  );

  return (
    <div className="tool-page">
      <div className="page-header"><h1>🏢 公司调研</h1><p>深入了解目标公司文化、面试风格和常见问题</p></div>
      {error && <div className="error-msg">❌ {error}</div>}
      <div className="grid-2">
        <div className="card">
          <label className="label">公司名称</label>
          <input className="input" placeholder="如：字节跳动、Google、腾讯..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleResearch()} />
          <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:16}} onClick={handleResearch} disabled={loading||!name.trim()}>{loading?'调研中...':'🔍 开始调研'}</button>
        </div>
        <div className="card"><h3>💡 调研内容</h3><ul className="info-list"><li>公司概况与文化</li><li>典型面试流程和风格</li><li>常见面试题目</li><li>面试准备建议</li><li>近期公司动态</li></ul></div>
      </div>
    </div>
  );
}
