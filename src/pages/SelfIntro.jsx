import { useState, useRef } from 'react';
import { evaluateSelfIntro } from '../api';
import './ToolPage.css';

export default function SelfIntro() {
  const [intro, setIntro] = useState('');
  const [lang, setLang] = useState('中文');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [timing, setTiming] = useState(false);
  const timerRef = useRef(null);

  function startTimer() { setTiming(true); setTimer(0); timerRef.current = setInterval(() => setTimer(t=>t+1), 100); }
  function stopTimer() { setTiming(false); clearInterval(timerRef.current); }

  async function handleEvaluate() {
    if (!intro.trim()) { setError('请输入自我介绍内容'); return; }
    setLoading(true); setError('');
    try { setResult(await evaluateSelfIntro(intro.trim(), lang)); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  function sc(s) { return s>=8?'high':s>=5?'medium':'low'; }

  if (result) return (
    <div className="tool-page">
      <button className="btn btn-ghost btn-sm" onClick={()=>{setResult(null);setIntro('');stopTimer();setTimer(0);}}>← 重新练习</button>
      <div className="card" style={{marginTop:16}}>
        <div className="tool-result-header">
          <div className={`score-circle ${sc(result.score)}`}>{result.score}</div>
          <div><h2>自我介绍评估</h2><p>{result.duration_feedback} · {result.structure_feedback}</p></div>
        </div>
        <div className="grid-2" style={{marginTop:20}}>
          <div><h4 style={{color:'#065f46'}}>✅ 亮点</h4><ul>{result.content_highlights?.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
          <div><h4 style={{color:'#991b1b'}}>⚠️ 缺失</h4><ul>{result.missing_elements?.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
        </div>
        {result.improved_version && <div style={{marginTop:20,padding:16,background:'var(--success-light)',borderRadius:'var(--radius)'}}><h4>🌟 改进版本</h4><p>{result.improved_version}</p></div>}
        {result.delivery_tips?.length>0 && <div style={{marginTop:16}}><h4>🎤 表达建议</h4><ul>{result.delivery_tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>}
      </div>
    </div>
  );

  return (
    <div className="tool-page">
      <div className="page-header"><h1>🎙️ 自我介绍练习</h1><p>练习1-2分钟自我介绍，AI 评估结构和内容</p></div>
      {error && <div className="error-msg">❌ {error}</div>}
      <div className="grid-2">
        <div className="card">
          <div className="tool-topbar">
            <span>{['中文','英文'].map(l=><button key={l} className={`btn btn-sm ${lang===l?'btn-primary':'btn-secondary'}`} style={{marginRight:8}} onClick={()=>setLang(l)}>{l}</button>)}</span>
            <span className="timer-display">⏱ {(timer/10).toFixed(1)}s</span>
            <span>{timing ? <button className="btn btn-sm btn-danger" onClick={stopTimer}>⏹ 停止</button> : <button className="btn btn-sm btn-success" onClick={startTimer}>▶ 开始计时</button>}</span>
          </div>
          <textarea className="textarea" rows={14} placeholder="在此撰写或练习你的自我介绍...&#10;&#10;建议结构：&#10;1. 我是谁（背景概述）&#10;2. 我的亮点（核心成就）&#10;3. 我为什么适合（与岗位关联）" value={intro} onChange={e=>setIntro(e.target.value)} />
          <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:16}} onClick={handleEvaluate} disabled={loading||!intro.trim()}>{loading?'评估中...':'🤖 AI 评估'}</button>
        </div>
        <div className="card">
          <h3>💡 自我介绍框架</h3>
          <div className="tool-tips">
            <div className="tip-item"><span className="tip-num">1</span><div><strong>开场 (10s)</strong><p>姓名 + 专业背景 + 一句话定位</p></div></div>
            <div className="tip-item"><span className="tip-num">2</span><div><strong>亮点 (40s)</strong><p>2-3个核心成就，用数据说话</p></div></div>
            <div className="tip-item"><span className="tip-num">3</span><div><strong>收尾 (10s)</strong><p>为什么投这个岗位 + 期待</p></div></div>
          </div>
          <div style={{marginTop:20,padding:16,background:'var(--primary-light)',borderRadius:'var(--radius)',fontSize:13}}>
            <strong>🎯 目标：</strong>1-2分钟，简洁有力，让人记住你
          </div>
        </div>
      </div>
    </div>
  );
}
