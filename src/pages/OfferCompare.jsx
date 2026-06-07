import { useState } from 'react';
import { compareOffers } from '../api';
import './ToolPage.css';

export default function OfferCompare() {
  const [offers, setOffers] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!offers.trim()) { setError('请输入Offer信息'); return; }
    setLoading(true); setError('');
    try { setResult(await compareOffers(offers.trim())); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  function sc(s) { return s>=80?'high':s>=60?'medium':'low'; }

  if (result) return (
    <div className="tool-page">
      <button className="btn btn-ghost btn-sm" onClick={()=>setResult(null)}>← 重新比较</button>
      <div className="card" style={{marginTop:16}}>
        <h2>💰 Offer 对比结果</h2>
        {result.recommendation && <div style={{margin:'12px 0',padding:16,background:'var(--success-light)',borderRadius:'var(--radius)'}}><strong>🏆 推荐：</strong>{result.recommendation}</div>}
        <div className="grid-2">
          {result.offers?.map((o,i)=>(
            <div key={i} className="card" style={{borderLeft:`4px solid ${i===0?'var(--success)':'var(--primary)'}`}}>
              <div className="tool-result-header"><h3>{o.name}</h3><span className={`score-badge ${sc(o.score)}`}>{o.score}分</span></div>
              <div style={{marginTop:8}}><strong style={{color:'#065f46'}}>✅ 优势</strong><ul>{o.pros?.map((p,j)=><li key={j}>{p}</li>)}</ul></div>
              <div style={{marginTop:8}}><strong style={{color:'#991b1b'}}>⚠️ 劣势</strong><ul>{o.cons?.map((c,j)=><li key={j}>{c}</li>)}</ul></div>
            </div>
          ))}
        </div>
        {result.decision_factors && <div style={{marginTop:20,padding:16,background:'var(--bg)',borderRadius:'var(--radius)'}}><h4>📊 决策因素分析</h4>{Object.entries(result.decision_factors).map(([k,v])=><p key={k}><strong>{k}：</strong>{v}</p>)}</div>}
        {result.negotiation_tips?.length>0 && <div style={{marginTop:16}}><h4>💬 谈薪建议</h4><ul>{result.negotiation_tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>}
      </div>
    </div>
  );

  return (
    <div className="tool-page">
      <div className="page-header"><h1>💰 Offer 对比</h1><p>输入多个Offer条件，AI 帮你全面分析和推荐</p></div>
      {error && <div className="error-msg">❌ {error}</div>}
      <div className="grid-2">
        <div className="card">
          <label className="label">Offer 信息</label>
          <textarea className="textarea" rows={14} placeholder="在此描述每个Offer的信息...&#10;&#10;例如：&#10;Offer A：字节跳动-后端开发&#10;薪资：30K×15&#10;地点：北京&#10;...&#10;&#10;Offer B：腾讯-后端开发&#10;薪资：28K×16&#10;..." value={offers} onChange={e=>setOffers(e.target.value)} />
          <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:16}} onClick={handleCompare} disabled={loading||!offers.trim()}>{loading?'分析中...':'🔍 对比分析'}</button>
        </div>
        <div className="card"><h3>💡 使用说明</h3><ul className="info-list"><li>尽可能详细地描述每个Offer</li><li>包括薪资、股票、地点、职级等</li><li>AI 会从多个维度综合评估</li><li>还会提供谈薪建议</li></ul></div>
      </div>
    </div>
  );
}
