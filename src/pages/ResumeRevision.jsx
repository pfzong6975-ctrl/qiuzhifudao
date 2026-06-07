import { useState, useRef, useEffect } from 'react';
import { uploadResume, analyzeResume, optimizeResumeForJob, getResumeHistory, getResume, translateResume, saveResumeVersion } from '../api';
import './ResumeRevision.css';

const popularJobs = [
  '前端工程师', '后端工程师', '全栈工程师', '算法工程师', '数据分析师',
  '产品经理', 'UI/UX设计师', '运营经理', '市场专员', '人力资源',
  '财务分析师', '销售经理', '项目经理', '测试工程师', '架构师',
];

export default function ResumeRevision() {
  // Job selection
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showCustomJob, setShowCustomJob] = useState(false);

  // Resume input
  const [mode, setMode] = useState('upload'); // 'upload' | 'paste' | 'history'
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('');
  const [history, setHistory] = useState([]);
  const [mode2, setMode2] = useState('targeted'); // 'targeted' | 'general'

  // Result extras
  const [translated, setTranslated] = useState('');
  const [translating, setTranslating] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try { setHistory(await getResumeHistory()); } catch {}
  }

  async function handleOptimize() {
    setError('');
    // Validate job
    if (mode2 === 'targeted' && !jobTitle.trim()) {
      setError('请选择或输入目标岗位'); return;
    }
    // Validate resume
    if (mode === 'upload' && !file) { setError('请选择简历文件'); return; }
    if (mode === 'paste' && !text.trim()) { setError('请粘贴简历内容'); return; }

    setLoading(true);
    try {
      let c, n;
      if (mode === 'upload') {
        const r = await uploadResume(file); c = r.content; n = r.filename;
        if (!c?.trim()) { setError('文件解析失败'); setLoading(false); return; }
      } else {
        c = text.trim(); n = 'pasted-resume.txt';
      }

      setContent(c); setFilename(n);

      let analysis;
      if (mode2 === 'targeted') {
        // Targeted optimization for a specific job
        analysis = await optimizeResumeForJob(c, jobTitle.trim(), jobDescription.trim());
      } else {
        // General analysis
        const r = await analyzeResume(c, n);
        analysis = r.analysis;
      }

      setResult(analysis);
      await loadHistory();
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    }
    setLoading(false);
  }

  async function loadFromHistory(id) {
    setLoading(true); setError('');
    try {
      const r = await getResume(id);
      setContent(r.content); setFilename(r.filename);
      setResult(typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis);
    } catch { setError('加载失败'); }
    setLoading(false);
  }

  async function handleTranslate() {
    if (!content) return;
    setTranslating(true);
    try { const r = await translateResume(content, '英文'); setTranslated(r.translated); }
    catch (e) { setError('翻译失败: ' + e.message); }
    setTranslating(false);
  }

  async function handleSaveVersion() {
    const name = prompt('给这个版本起个名字：', filename || '简历版本');
    if (!name) return;
    try { await saveResumeVersion(name, content); alert('✅ 版本已保存'); }
    catch (e) { setError('保存失败: ' + e.message); }
  }

  function sc(score) { return score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'; }

  // ============ RESULT VIEW ============
  if (result) {
    const isTargeted = result.optimized_resume;

    return (
      <div className="resume-page">
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setFile(null); setText(''); setContent(''); }}>
            ← 返回
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨 打印/导出PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={handleTranslate} disabled={translating}>{translating?'翻译中...':'🌐 翻译成英文'}</button>
          <button className="btn btn-secondary btn-sm" onClick={handleSaveVersion}>💾 保存版本</button>
        </div>

        {translated && (
          <div className="card" style={{marginBottom:16,background:'var(--success-bg)',border:'1px solid rgba(52,211,153,0.2)'}}>
            <h4>🌐 翻译结果</h4>
            <pre style={{whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.7,marginTop:8}}>{translated}</pre>
            <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>setTranslated('')}>关闭</button>
          </div>
        )}

        {isTargeted ? (
          // Targeted result
          <>
            <div className="card card-accent" style={{marginBottom:20}}>
              <div className="tool-result-header">
                <div className={`score-circle ${sc(result.match_score)}`}>{result.match_score}</div>
                <div>
                  <h2>岗位匹配度</h2>
                  <p style={{color:'var(--text-secondary)',fontSize:14}}>针对「{jobTitle}」的简历优化结果</p>
                </div>
              </div>

              {result.gap_notes && (
                <div style={{padding:14,background:'var(--warning-bg)',borderRadius:'var(--radius-sm)',marginBottom:16}}>
                  <strong>⚠️ 简历缺口：</strong>{result.gap_notes}
                </div>
              )}
              {result.highlighted_experience && (
                <div style={{padding:14,background:'var(--success-bg)',borderRadius:'var(--radius-sm)',marginBottom:16}}>
                  <strong>✅ 亮点经验：</strong>{result.highlighted_experience}
                </div>
              )}
            </div>

            {/* Optimized Resume */}
            <div className="card card-success" style={{marginBottom:20}}>
              <h3 style={{marginBottom:12}}>🌟 优化后的简历</h3>
              <pre style={{whiteSpace:'pre-wrap',fontSize:14,lineHeight:1.8,fontFamily:'inherit',color:'var(--text)'}}>
                {result.optimized_resume}
              </pre>
            </div>

            {/* Changes + Keywords */}
            <div className="grid-2">
              {result.key_changes?.length>0 && (
                <div className="card">
                  <h4 style={{marginBottom:10,color:'var(--primary)'}}>🔧 关键修改</h4>
                  <ul style={{paddingLeft:18}}>{result.key_changes.map((c,i)=><li key={i} style={{marginBottom:6,fontSize:14,color:'var(--text-secondary)'}}>{c}</li>)}</ul>
                </div>
              )}
              {result.keywords_added?.length>0 && (
                <div className="card">
                  <h4 style={{marginBottom:10,color:'var(--success)'}}>🏷 新增关键词</h4>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {result.keywords_added.map((k,i)=><span key={i} style={{padding:'4px 12px',background:'var(--success-bg)',color:'var(--success)',borderRadius:20,fontSize:12,fontWeight:600}}>{k}</span>)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // General analysis result (same as before)
          <div className="resume-result-layout">
            <div className="card resume-analysis-panel">
              <div className="resume-score-header">
                <div className={`score-circle ${sc(result.overall_score)}`}>{result.overall_score}</div>
                <div><h2>综合评分</h2><p>{result.summary}</p><span className="resume-meta">{filename}</span></div>
              </div>
              {/* ... rest of analysis tabs ... */}
              <p style={{color:'var(--text-muted)',textAlign:'center',padding:40}}>通用分析模式已废弃，建议使用岗位针对性优化</p>
            </div>
            <div className="card resume-original-panel">
              <h3>📋 原始简历</h3>
              <pre>{content}</pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ INPUT VIEW ============
  return (
    <div className="resume-page">
      <div className="page-header">
        <h1>📄 简历优化</h1>
        <p>选择目标岗位，AI 针对性优化你的简历，大幅提升面试邀约率</p>
      </div>

      {error && <div className="error-msg">❌ {error}</div>}

      {loading ? (
        <div className="card"><div className="spinner-container"><div className="spinner"/><p className="spinner-text">AI 正在针对性优化简历...</p><p style={{color:'var(--text-muted)',fontSize:13}}>预计需要 15-30 秒</p></div></div>
      ) : (
        <div className="grid-2">
          {/* Left: Job Selection + Mode */}
          <div className="card">
            <h3 style={{marginBottom:16}}>🎯 第一步：选择目标岗位</h3>

            <div className="tabs" style={{marginBottom:16}}>
              <button className={`tab ${mode2==='targeted'?'active':''}`} onClick={()=>{setMode2('targeted');setError('');}}>🎯 针对性优化</button>
              <button className={`tab ${mode2==='general'?'active':''}`} onClick={()=>{setMode2('general');setError('');}}>📋 通用分析</button>
            </div>

            {mode2 === 'targeted' ? (
              <>
                <label className="label">常见岗位（点击选择）</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                  {popularJobs.map(j=>(
                    <button key={j}
                      className={`btn btn-sm ${jobTitle===j?'btn-primary':'btn-secondary'}`}
                      onClick={()=>{setJobTitle(j);setShowCustomJob(false);}}>
                      {jobTitle===j?'✓ ':''}{j}
                    </button>
                  ))}
                  <button className={`btn btn-sm ${showCustomJob?'btn-primary':'btn-secondary'}`}
                    onClick={()=>{setShowCustomJob(true);setJobTitle('');}}>
                    ✏️ 自定义
                  </button>
                </div>

                {showCustomJob && (
                  <div className="form-group">
                    <label className="label">自定义岗位名称</label>
                    <input className="input" placeholder="输入目标岗位，如：字节跳动-高级前端工程师"
                      value={jobTitle} onChange={e=>setJobTitle(e.target.value)} />
                  </div>
                )}

                <div className="form-group">
                  <label className="label">岗位描述 JD（可选，填入后优化更精准）</label>
                  <textarea className="textarea" rows={4}
                    placeholder="粘贴目标岗位的JD描述，AI 会根据JD要求来优化简历..."
                    value={jobDescription} onChange={e=>setJobDescription(e.target.value)} />
                </div>
              </>
            ) : (
              <p style={{color:'var(--text-muted)',fontSize:13}}>通用分析模式：AI 从结构、内容、措辞、关键词四个维度进行分析，不针对特定岗位。</p>
            )}
          </div>

          {/* Right: Resume Input */}
          <div className="card">
            <h3 style={{marginBottom:16}}>📄 第二步：上传简历</h3>

            <div className="tabs" style={{marginBottom:16}}>
              <button className={`tab ${mode==='upload'?'active':''}`} onClick={()=>{setMode('upload');setError('');}}>📤 上传文件</button>
              <button className={`tab ${mode==='paste'?'active':''}`} onClick={()=>{setMode('paste');setError('');}}>📝 粘贴文本</button>
            </div>

            {mode === 'upload' ? (
              <div
                className={`upload-zone ${dragOver?'dragover':''}`}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f){setFile(f);setError('');}}}
              >
                <div className="upload-icon-big">{file?'✅':'📁'}</div>
                {file ? (
                  <><p className="upload-name">{file.name}</p><p className="upload-hint">{(file.size/1024).toFixed(1)} KB</p></>
                ) : (
                  <><p className="upload-title">拖拽文件或点击选择</p><p className="upload-hint">PDF · DOCX · TXT · MD (≤10MB)</p></>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setError('');}}} hidden />
              </div>
            ) : (
              <div>
                <textarea className="textarea" rows={12}
                  placeholder="在此粘贴你的简历文本...&#10;&#10;建议包含：个人信息、教育背景、工作经历、项目经验、技能等"
                  value={text} onChange={e=>{setText(e.target.value);setError('');}} />
                <div className="char-count" style={{textAlign:'right',fontSize:12,color:'var(--text-muted)',marginTop:4}}>{text.length} 字符</div>
              </div>
            )}

            <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:20}}
              onClick={handleOptimize} disabled={loading||(mode==='upload'?!file:!text.trim())||(mode2==='targeted'&&!jobTitle.trim())}>
              {mode2==='targeted' ? `🚀 针对「${jobTitle||'...'}」优化简历` : '🔍 开始分析'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
