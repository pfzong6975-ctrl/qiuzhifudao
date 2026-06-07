import { useState } from 'react';
import { generateQuestionBank } from '../api';
import './ToolPage.css';

export default function QuestionBank() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [count, setCount] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  async function handleGenerate() {
    if (!role.trim()) { setError('请输入目标岗位'); return; }
    setLoading(true); setError('');
    try { setResult(await generateQuestionBank(company.trim(), role.trim(), count)); setExpanded({}); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  function toggle(i) { setExpanded(prev=>({...prev,[i]:!prev[i]})); }

  if (result) return (
    <div className="tool-page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setResult(null)}>← 重新生成</button>
      <div className="card" style={{marginTop:16}}>
        <h2>📚 {result.company || '通用'} - {result.role} 面试题库</h2>
        <p className="text-secondary" style={{marginBottom:20}}>{result.questions?.length || 0} 道题目</p>
        {result.questions?.map((q,i) => (
          <div key={i} className="qbank-item" onClick={()=>toggle(i)}>
            <div className="qbank-header">
              <span className="qbank-num">{i+1}</span>
              <span className="qbank-q">{q.question}</span>
              <span className={`qbank-diff ${(q.difficulty||'').toLowerCase()}`}>{q.difficulty||'medium'}</span>
              <span className="qbank-cat">{q.category}</span>
            </div>
            {expanded[i] && q.tips?.length>0 && <div className="qbank-tips"><ul>{q.tips.map((t,j)=><li key={j}>{t}</li>)}</ul></div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="tool-page">
      <div className="page-header"><h1>📚 面试题库</h1><p>按公司/岗位生成针对性的面试题目和答题提示</p></div>
      {error && <div className="error-msg">❌ {error}</div>}
      <div className="grid-2">
        <div className="card">
          <div className="form-group"><label className="label">目标公司（可选）</label><input className="input" placeholder="如：字节跳动、Google..." value={company} onChange={e=>setCompany(e.target.value)} /></div>
          <div className="form-group"><label className="label">目标岗位 *</label><input className="input" placeholder="如：前端工程师、产品经理..." value={role} onChange={e=>setRole(e.target.value)} /></div>
          <div className="form-group"><label className="label">题目数量：{count}</label><input type="range" min="5" max="30" value={count} onChange={e=>setCount(Number(e.target.value))} className="range-input" /></div>
          <button className="btn btn-primary btn-lg" style={{width:'100%'}} onClick={handleGenerate} disabled={loading||!role.trim()}>{loading?'生成中...':'🤖 生成题库'}</button>
        </div>
        <div className="card"><h3>💡 使用说明</h3><ul className="info-list"><li>输入目标公司获取针对性的面试题</li><li>不填公司则生成通用面试题</li><li>点击题目可展开查看答题提示</li><li>包含技术/行为/综合多种题型</li></ul></div>
      </div>
    </div>
  );
}
