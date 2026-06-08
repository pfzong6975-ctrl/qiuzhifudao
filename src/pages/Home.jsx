import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getResumeHistory, getInterviewSessions } from '../api';
import './Home.css';

export default function Home({ hasApiKey }) {
  const navigate = useNavigate();
  const [recentResumes, setRecentResumes] = useState([]);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [stats, setStats] = useState({ resumes:0, interviews:0, completed:0, avgScore:0 });

  useEffect(() => { loadStats(); }, []);
  async function loadStats() {
    try {
      const [resumes, interviews] = await Promise.allSettled([getResumeHistory(), getInterviewSessions()]);
      if (resumes.status === 'fulfilled' && Array.isArray(resumes.value)) setRecentResumes(resumes.value.slice(0, 3));
      if (interviews.status === 'fulfilled' && Array.isArray(interviews.value)) {
        setRecentInterviews(interviews.value.slice(0, 3));
        const completed = interviews.value.filter(i => i.status==='completed');
        const avg = completed.length>0 ? Math.round(completed.reduce((s,i)=>s+(i.score||0),0)/completed.length) : 0;
        setStats({ resumes: resumes.status==='fulfilled'&&Array.isArray(resumes.value)?resumes.value.length:0, interviews: interviews.value.length, completed: completed.length, avgScore: avg });
      }
    } catch {}
  }

  const features = [
    { icon:'📄', title:'简历优化', desc:'AI 四维度分析 + 逐条修改建议', color:'#6c72ff', path:'/resume' },
    { icon:'🎤', title:'模拟面试', desc:'AI 面试官 + 即时评分反馈', color:'#a78bfa', path:'/interview' },
    { icon:'📊', title:'面试复盘', desc:'深度分析 + 提升计划', color:'#34d399', path:'/review' },
    { icon:'🎯', title:'岗位匹配', desc:'JD对比 + 缺口分析', color:'#fbbf24', path:'/jd-match' },
    { icon:'✉️', title:'求职信', desc:'AI 自动生成专业求职信', color:'#f87171', path:'/cover-letter' },
    { icon:'💰', title:'Offer对比', desc:'多维度评估决策', color:'#38bdf8', path:'/offer' },
  ];

  return (
    <div className="home">
      {/* Welcome */}
      <div className="home-hero">
        <div>
          <h1 className="home-title">你好，准备开始练习了吗？</h1>
          <p className="home-sub">AI 驱动的全流程求职助手 — 从简历到面试再到决策</p>
        </div>
        {!hasApiKey && (
          <div className="home-warning">⚡ 点击左下角设置 API Key 以解锁全部功能</div>
        )}
      </div>

      {/* Stats */}
      <div className="home-stats">
        {[
          { v:stats.resumes, l:'简历分析', icon:'📄' },
          { v:stats.interviews, l:'模拟面试', icon:'🎤' },
          { v:stats.completed, l:'完成复盘', icon:'📊' },
          { v:stats.avgScore||'--', l:'平均得分', icon:'⭐' },
        ].map((s,i)=>(
          <div key={i} className="stat-card">
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="home-section-title">快速开始</h2>
      <div className="home-grid">
        {features.map((f,i)=>(
          <div key={i} className="feature-card" onClick={()=>navigate(f.path)}>
            <div className="feature-top">
              <span className="feature-icon" style={{background:`${f.color}20`,color:f.color}}>{f.icon}</span>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent */}
      {(recentResumes.length>0 || recentInterviews.length>0) && (
        <>
          <h2 className="home-section-title" style={{marginTop:36}}>最近活动</h2>
          <div className="grid-2">
            {recentResumes.length>0 && (
              <div className="card"><h3 style={{marginBottom:12,fontSize:15}}>📄 简历分析记录</h3>
                {recentResumes.map(r=>(<div key={r.id} className="recent-item" onClick={()=>navigate('/resume')}><span>{r.filename}</span><span className="recent-date">{r.created_at}</span></div>))}
              </div>
            )}
            {recentInterviews.length>0 && (
              <div className="card"><h3 style={{marginBottom:12,fontSize:15}}>🎤 面试记录</h3>
                {recentInterviews.map(iv=>(<div key={iv.id} className="recent-item" onClick={()=>navigate('/review')}><span>{iv.type}面试 · {iv.language}{iv.status==='in_progress'?' 🔄':''}</span><span className="recent-date">{iv.created_at}</span></div>))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
