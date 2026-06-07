import { useState, useEffect } from 'react';
import { getInterviewSessions, getInterviewSession, generateReview } from '../api';
import RadarChart from './RadarChart';
import './InterviewReview.css';

export default function InterviewReview() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    try { setSessions(await getInterviewSessions()); } catch {}
  }

  async function loadSession(id) {
    setLoading(true); setError('');
    try { setSelected(await getInterviewSession(id)); } catch { setError('加载失败'); }
    setLoading(false);
  }

  async function handleReview() {
    if (!selected) return;
    setReviewLoading(true); setError('');
    try {
      const d = await generateReview(selected.id);
      setSelected(prev => ({ ...prev, review: d.review, score: d.score }));
      await loadSessions();
    } catch (e) { setError('复盘生成失败: ' + (e.message || '未知错误')); }
    setReviewLoading(false);
  }

  function sc(score) { return score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'; }
  function scSmall(score) { return score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low'; }

  const filtered = sessions.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="review-page">
      <div className="page-header">
        <h1>📊 面试复盘</h1>
        <p>回顾模拟面试记录，查看 AI 深度分析和个性化提升方案</p>
      </div>

      {error && <div className="error-msg">❌ {error}</div>}

      {!selected && (
        <div className="review-browse">
          <div className="card review-list-card">
            <div className="review-list-header">
              <h2>面试记录</h2>
              <div className="filter-tabs">
                {[{k:'all',l:'全部'},{k:'completed',l:'已完成'},{k:'in_progress',l:'进行中'}].map(f=>(
                  <button key={f.k} className={`ftab ${filter===f.k?'active':''}`} onClick={()=>setFilter(f.k)}>{f.l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state"><div className="icon">📭</div><h3>暂无面试记录</h3><p>完成模拟面试后这里会显示记录</p></div>
            ) : (
              <div className="review-list">
                {filtered.map(s => (
                  <div key={s.id} className={`review-item ${s.status}`} onClick={()=>loadSession(s.id)}>
                    <div className="ri-top">
                      <span className="ri-type">{s.type==='技术'?'💻':s.type==='行为'?'🤝':'🎯'} {s.type}面试</span>
                      <span className={`ri-status ${s.status}`}>{s.status==='completed'?'✅ 已完成':'🔄 进行中'}</span>
                    </div>
                    <div className="ri-meta">
                      <span>🌐 {s.language}</span>
                      <span>📝 {s.question_count}题</span>
                      {s.score!=null && <span className={`score-badge ${sc(s.score)}`}>{s.score}分</span>}
                      <span className="ri-date">{s.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card review-empty-hint">
            <div className="empty-state"><div className="icon">👈</div><h3>选择一条记录</h3><p>点击左侧面试记录查看详细复盘</p></div>
          </div>
        </div>
      )}

      {loading && <div className="card"><div className="spinner-container"><div className="spinner"/><p className="spinner-text">加载中...</p></div></div>}

      {selected && !loading && (
        <div className="review-detail">
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}>← 返回列表</button>

          {/* Header */}
          <div className="card detail-header-card">
            <div className="dh-row">
              <div>
                <h2>{selected.type==='技术'?'💻':selected.type==='行为'?'🤝':'🎯'} {selected.type}面试</h2>
                <p className="dh-meta">{selected.language} · {selected.question_count}题 · {selected.created_at}</p>
              </div>
              <span className={`status-badge ${selected.status}`}>
                {selected.status==='completed'?'✅ 已完成':'🔄 进行中'}
              </span>
            </div>
          </div>

          {/* Generate review button */}
          {selected.status==='completed' && !selected.review && (
            <div className="card gen-review-card">
              <h3>🔍 生成深度复盘</h3>
              <p>AI 将分析全部问答，给出逐题评价、参考回答和个性化提升方案</p>
              <button className="btn btn-primary btn-lg" onClick={handleReview} disabled={reviewLoading}>
                {reviewLoading?'分析中...':'🤖 生成复盘分析'}
              </button>
            </div>
          )}

          {/* Review content */}
          {selected.review && (
            <div className="review-content">
              {/* Score */}
              <div className="card score-card">
                <div className="score-row">
                  <div className={`score-circle ${sc(selected.review.overall_score)}`}>{selected.review.overall_score}</div>
                  <div><h2>综合评分</h2><p>{selected.review.summary}</p></div>
                </div>
              </div>

              {/* Radar Chart */}
              {selected.review.skill_radar && (
                <div className="card">
                  <h3 className="rc-title">📊 能力雷达</h3>
                  <RadarChart data={[
                    { label: '沟通表达', value: selected.review.skill_radar.communication || 0 },
                    { label: '技术能力', value: selected.review.skill_radar.technical || 0 },
                    { label: '领导力', value: selected.review.skill_radar.leadership || 0 },
                    { label: '解决问题', value: selected.review.skill_radar.problem_solving || 0 },
                    { label: '文化契合', value: selected.review.skill_radar.cultural_fit || 0 },
                  ]} size={260} color="#6366f1" />
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid-2">
                <div className="card"><h3 className="rc-title">✅ 优势</h3><ul className="rc-list good">{selected.review.strengths?.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
                <div className="card"><h3 className="rc-title">⚠️ 待改进</h3><ul className="rc-list bad">{selected.review.weaknesses?.map((w,i)=><li key={i}>{w}</li>)}</ul></div>
              </div>

              {/* Per-question review */}
              <div className="card">
                <h3 className="rc-title">📋 逐题分析</h3>
                {selected.review.question_reviews?.map((qr,i)=>(
                  <div key={i} className="qr-item">
                    <div className="qr-top">
                      <span className="qr-num">Q{qr.question_number||i+1}</span>
                      <span className="qr-qtext">{qr.question}</span>
                      <span className={`score-badge ${scSmall(qr.score)}`}>{qr.score}/10</span>
                    </div>
                    <div className="qr-ans"><strong>你的回答</strong><p>{qr.answer}</p></div>
                    <div className="qr-eval"><strong>💡 评价</strong><p>{qr.feedback}</p></div>
                    {qr.improved_answer && <div className="qr-model"><strong>🌟 参考回答</strong><p>{qr.improved_answer}</p></div>}
                  </div>
                ))}
              </div>

              {/* Improvement plan */}
              <div className="grid-2">
                <div className="card"><h3 className="rc-title">🎯 短期提升</h3><ul className="imp-list">{selected.review.improvement_plan?.short_term?.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
                <div className="card"><h3 className="rc-title">📈 长期发展</h3><ul className="imp-list long">{selected.review.improvement_plan?.long_term?.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
              </div>

              {/* Takeaways */}
              <div className="card">
                <h3 className="rc-title">🔑 关键要点</h3>
                <div className="takeaways">
                  {selected.review.key_takeaways?.map((t,i)=>(
                    <div key={i} className="takeaway"><span className="ta-num">{i+1}</span><p>{t}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raw QA list */}
          <div className="card" style={{marginTop:24}}>
            <h3 className="rc-title">📝 完整问答记录</h3>
            {selected.qa_list?.map((qa,i)=>(
              <div key={i} className="raw-qa">
                <div className="raw-q"><strong>Q{i+1}:</strong> {qa.question}</div>
                <div className="raw-a"><strong>A:</strong> {qa.answer||'(未回答)'}</div>
                {qa.evaluation && <div className="raw-eval"><span className={`score-badge ${scSmall(qa.evaluation.score)}`}>{qa.evaluation.score}/10</span> {qa.evaluation.feedback}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
