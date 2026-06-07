import { useState } from 'react';
import { matchJD, getResumeHistory } from '../api';
import './ToolPage.css';

export default function JDMatch() {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleMatch() {
    if (!resume.trim() || !jd.trim()) { setError('简历和JD均不能为空'); return; }
    setLoading(true); setError('');
    try { setResult(await matchJD(resume.trim(), jd.trim())); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  function sc(s) { return s>=80?'high':s>=60?'medium':'low'; }

  if (result) return (
    <div className="tool-page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setResult(null)}>← 返回</button>
      <div className="card" style={{marginTop:16}}>
        <div className="tool-result-header">
          <div className={`score-circle ${sc(result.match_score)}`}>{result.match_score}</div>
          <div><h2>岗位匹配度</h2><p>{result.summary}</p></div>
        </div>
        <div className="grid-2" style={{marginTop:20}}>
          <div>
            <h4 style={{color:'#065f46'}}>✅ 已匹配</h4>
            <ul className="match-list">{result.matched_points?.map((p,i)=><li key={i}>{p}</li>)}</ul>
          </div>
          <div>
            <h4 style={{color:'#991b1b'}}>⚠️ 缺口</h4>
            <ul className="match-list bad">{result.gap_points?.map((p,i)=><li key={i}>{p}</li>)}</ul>
          </div>
        </div>
        {result.skill_breakdown && (
          <div style={{marginTop:16,padding:16,background:'var(--bg)',borderRadius:'var(--radius)'}}>
            <h4>技能分析</h4>
            <div className="grid-2">
              <div><strong style={{color:'#065f46'}}>必须技能（已有）</strong><ul>{result.skill_breakdown.must_have_matched?.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
              <div><strong style={{color:'#991b1b'}}>必须技能（缺失）</strong><ul>{result.skill_breakdown.must_have_missing?.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
            </div>
          </div>
        )}
        {result.resume_improvements?.length>0 && <div style={{marginTop:16}}><h4>📝 简历改进建议</h4><ul>{result.resume_improvements.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
        {result.interview_focus?.length>0 && <div style={{marginTop:16}}><h4>🎯 面试准备重点</h4><ul>{result.interview_focus.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
      </div>
    </div>
  );

  return (
    <div className="tool-page">
      <div className="page-header"><h1>🎯 岗位匹配分析</h1><p>输入目标岗位JD，AI 对比你的简历，分析匹配度和差距</p></div>
      {error && <div className="error-msg">❌ {error}</div>}
      <div className="grid-2">
        <div className="card">
          <label className="label">你的简历</label>
          <textarea className="textarea" rows={12} placeholder="粘贴简历内容..." value={resume} onChange={e=>setResume(e.target.value)} />
        </div>
        <div className="card">
          <label className="label">目标岗位 JD</label>
          <textarea className="textarea" rows={10} placeholder="粘贴岗位描述..." value={jd} onChange={e=>setJd(e.target.value)} />
          <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:16}} onClick={handleMatch} disabled={loading||!resume.trim()||!jd.trim()}>
            {loading?'分析中...':'🔍 分析匹配度'}
          </button>
        </div>
      </div>
    </div>
  );
}
