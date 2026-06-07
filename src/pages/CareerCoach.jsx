import { useState } from 'react';
import './ToolPage.css';
import './CareerCoach.css';

const questions = [
  { id:'q1', q:'面对一个复杂问题时，你通常会？', opts:['先收集信息再分析','凭直觉快速判断','找人讨论碰撞想法','拆解成小步骤逐个解决'] },
  { id:'q2', q:'在团队中，你更喜欢什么角色？', opts:['组织者和决策者','创意提出者','执行落地者','协调沟通者'] },
  { id:'q3', q:'你更喜欢什么样的工作环境？', opts:['稳定有规律','自由灵活','竞争激烈','合作和谐'] },
  { id:'q4', q:'学习新东西时，你倾向于？', opts:['看书/文档系统学习','动手实践边做边学','跟人请教讨论','看视频/课程'] },
  { id:'q5', q:'你对哪种类型的任务更感兴趣？', opts:['与人打交道','与数据/逻辑打交道','与创意/设计打交道','与流程/管理打交道'] },
  { id:'q6', q:'面对deadline压力时，你通常？', opts:['提前规划稳步推进','压力越大效率越高','寻求帮助分担','重新评估优先级'] },
  { id:'q7', q:'你更看重工作的哪个方面？', opts:['薪资和福利','成长和学习机会','工作生活平衡','社会影响力'] },
  { id:'q8', q:'三年后你希望自己是什么状态？', opts:['成为某个领域的专家','带团队的管理者','自由职业/创业','还没想清楚'] },
];

export default function CareerCoach() {
  const [step, setStep] = useState('test'); // test | bg | result
  const [answers, setAnswers] = useState({});
  const [bg, setBg] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function selectAnswer(qId, opt) {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
  }

  function handleFinishTest() {
    if (Object.keys(answers).length < questions.length) {
      setError('请回答所有问题'); return;
    }
    setError('');
    setStep('bg');
  }

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/career/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, background: bg.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep('result');
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  // ============ TEST ============
  if (step === 'test') {
    const answered = Object.keys(answers).length;
    return (
      <div className="career-page">
        <div className="page-header"><h1>🧭 职业方向辅导</h1><p>第一步：完成性格测试（{answered}/{questions.length}）</p></div>
        {error && <div className="error-msg">❌ {error}</div>}
        <div className="progress-bar" style={{marginBottom:24}}><div className="progress-fill" style={{width:`${(answered/questions.length)*100}%`}} /></div>
        <div className="test-grid">
          {questions.map((q, i) => (
            <div key={q.id} className="card test-card">
              <div className="test-q-num">Q{i+1}</div>
              <p className="test-q-text">{q.q}</p>
              <div className="test-opts">
                {q.opts.map(opt => (
                  <button key={opt}
                    className={`test-opt ${answers[q.id]===opt?'active':''}`}
                    onClick={() => selectAnswer(q.id, opt)}>
                    {answers[q.id]===opt?'✓ ':''}{opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:20}} onClick={handleFinishTest}>
          完成测试，进入下一步 →
        </button>
      </div>
    );
  }

  // ============ BG INPUT ============
  if (step === 'bg') {
    return (
      <div className="career-page">
        <div className="page-header"><h1>🧭 职业方向辅导</h1><p>第二步：补充你的个人背景（可选，填入后分析更精准）</p></div>
        {error && <div className="error-msg">❌ {error}</div>}
        <div className="card">
          <textarea className="textarea" rows={8}
            placeholder="说说你的情况...&#10;&#10;例如：&#10;- 专业/学历：计算机科学大二在读&#10;- 擅长：Python、数据分析、沟通表达&#10;- 兴趣：人工智能、产品设计&#10;- 实习经历：一段运营实习&#10;- 困惑：不知道适合做技术还是产品"
            value={bg} onChange={e => setBg(e.target.value)} />
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <button className="btn btn-secondary" onClick={() => setStep('test')}>← 返回修改</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? '分析中...' : '🤖 AI 分析并生成报告'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ RESULT ============
  if (step === 'result' && result) {
    return (
      <div className="career-page">
        <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setStep('test'); setAnswers({}); setBg(''); }}>← 重新测试</button>

        <div className="card" style={{marginTop:16}}>
          <div className="tool-result-header">
            <span style={{fontSize:48}}>🧭</span>
            <div><h2>{result.personality_type || '分析结果'}</h2><p>{result.personality_desc}</p></div>
          </div>

          {result.strengths?.length>0 && (
            <div className="career-tags" style={{marginBottom:20}}>
              {result.strengths.map((s,i) => <span key={i} className="career-tag strength">{s}</span>)}
            </div>
          )}

          <p style={{marginBottom:20,color:'var(--text-secondary)',lineHeight:1.8}}>{result.summary}</p>

          {/* Career Directions */}
          <h3 style={{marginBottom:16}}>🎯 推荐职业方向</h3>
          {result.career_directions?.map((d,i) => (
            <div key={i} className="direction-card" style={{borderLeftColor: i===0?'var(--primary)':i===1?'var(--success)':'var(--warning)'}}>
              <div className="direction-header">
                <div>
                  <h4>{d['方向'] || d.direction}</h4>
                  <span className="score-badge" style={{background:i===0?'var(--primary)':undefined,color:i===0?'#fff':undefined}}>匹配度 {(d['匹配度'] || d.score)}%</span>
                </div>
              </div>
              <p style={{fontSize:13,color:'var(--text-secondary)',margin:'8px 0'}}>{d['理由'] || d.reason}</p>
              <div className="direction-detail">
                <strong>推荐岗位：</strong>{(d['推荐岗位'] || d.roles || []).join(' / ')}
              </div>
              <div className="direction-detail">
                <strong>发展路径：</strong>{d['发展路径'] || d.path}
              </div>
              <div className="direction-detail">
                <strong>所需技能：</strong>{(d['所需技能'] || d.skills || []).join('、')}
              </div>
            </div>
          ))}

          <div className="grid-2" style={{marginTop:24}}>
            {result.suitable_industries?.length>0 && (
              <div className="card"><h4>🏭 适合行业</h4><div className="career-tags" style={{marginTop:8}}>{result.suitable_industries.map((s,i)=><span key={i} className="career-tag industry">{s}</span>)}</div></div>
            )}
            {result.skill_gaps?.length>0 && (
              <div className="card"><h4>📚 需要补充</h4><ul>{result.skill_gaps.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
            )}
          </div>

          {result.short_term_plan && (
            <div className="card card-accent" style={{marginTop:16}}><h4>📋 短期计划（1-2年）</h4><p style={{marginTop:8,color:'var(--text-secondary)'}}>{result.short_term_plan}</p></div>
          )}
          {result.long_term_plan && (
            <div className="card card-success" style={{marginTop:16}}><h4>🗺 长期规划（3-5年）</h4><p style={{marginTop:8,color:'var(--text-secondary)'}}>{result.long_term_plan}</p></div>
          )}

          {result.learning_resources?.length>0 && (
            <div className="card" style={{marginTop:16}}><h4>📖 推荐学习资源</h4><ul style={{marginTop:8}}>{result.learning_resources.map((r,i)=><li key={i}>{r}</li>)}</ul></div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
