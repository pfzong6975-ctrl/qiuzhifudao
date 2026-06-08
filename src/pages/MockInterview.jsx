import { useState, useRef, useEffect, useCallback } from 'react';
import { startInterview, submitAnswer } from '../api';
import { useNavigate } from 'react-router-dom';
import AIInterviewer from './AIInterviewer';
import './MockInterview.css';

// ============ Camera Hook ============
function useCamera() {
  const [stream, setStream] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const videoRef = useRef(null);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s); setEnabled(true);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setEnabled(false); }
  }

  function stop() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setEnabled(false);
  }

  useEffect(() => () => stop(), []);

  return { videoRef, enabled, start, stop };
}

// ============ Speech Recognition Hook ============
function useSpeechRecognition(language) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language === '英文' ? 'en-US' : 'zh-CN';
      recognitionRef.current = rec;
    }
  }, [language]);

  const startListening = useCallback((onResult) => {
    if (!recognitionRef.current) return;
    const rec = recognitionRef.current;
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      onResult(transcript);
    };
    rec.onerror = (e) => {
      console.error('Speech error:', e.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    try { rec.start(); setListening(true); } catch {}
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setListening(false);
  }, []);

  return { listening, supported, startListening, stopListening };
}

// ============ Main Component ============
export default function MockInterview() {
  const navigate = useNavigate();
  const [step, setStep] = useState('setup');
  const [type, setType] = useState('综合');
  const [language, setLanguage] = useState('中文');
  const [questionCount, setQuestionCount] = useState(5);
  const [sessionId, setSessionId] = useState(null);
  const [currentQ, setCurrentQ] = useState('');
  const [qNum, setQNum] = useState(1);
  const [total, setTotal] = useState(5);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [closing, setClosing] = useState('');
  const [avatarState, setAvatarState] = useState('idle');
  const [interviewerConfig, setInterviewerConfig] = useState(null);
  const [interviewerPersona, setInterviewerPersona] = useState(null);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [jdContent, setJdContent] = useState('');
  const answerRef = useRef(null);

  const { listening, supported, startListening, stopListening } = useSpeechRecognition(language);
  const { videoRef, enabled: camEnabled, start: startCam, stop: stopCam } = useCamera();

  // Read question aloud using TTS
  function speakQuestion(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === '英文' ? 'en-US' : 'zh-CN';
    u.rate = 0.9;
    u.pitch = 1.0;
    u.onstart = () => setAvatarState('speaking');
    u.onend = () => setAvatarState('idle');
    window.speechSynthesis.speak(u);
  }

  async function handleStart() {
    setLoading(true); setError('');
    try {
      const d = await startInterview(type, language, questionCount, followUpMode, interviewerPersona, jdContent);
      setSessionId(d.sessionId); setCurrentQ(d.question);
      setQNum(1); setTotal(d.totalQuestions);
      setHistory([]); setFeedback(null);
      setStep('interview'); setAvatarState('speaking');
      setTimeout(() => speakQuestion(d.question), 500);
    } catch (e) { setError(e.message || '启动失败，请检查 API Key'); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!answer.trim() || loading) return;

    stopListening();
    setLoading(true); setError(''); setAvatarState('thinking');
    try {
      const d = await submitAnswer(sessionId, answer);
      const newQa = { question: currentQ, answer: answer.trim(), evaluation: d.evaluation };
      setHistory(prev => [...prev, newQa]);

      if (d.isLast) {
        setFeedback(null); setClosing(d.closingMessage || d.message);
        setAvatarState('idle'); setStep('complete');
      } else {
        setFeedback(d.evaluation); setCurrentQ(d.nextQuestion);
        setQNum(d.questionNumber); setAnswer('');
        setAvatarState('speaking');
        setTimeout(() => speakQuestion(d.nextQuestion), 300);
      }
    } catch (e) { setError(e.message || '提交失败'); setAvatarState('idle'); }
    setLoading(false);
  }

  function handleVoiceResult(text) {
    setAnswer(prev => {
      const sep = prev ? ' ' : '';
      return prev + sep + text;
    });
  }

  function sc(score) { return score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low'; }

  // ---- SETUP ----
  if (step === 'setup') {
    return (
      <div className="interview-page">
        <div className="page-header"><h1>🎯 模拟面试</h1><p>选择面试类型与语言，AI 面试官将进行逼真模拟并即时反馈</p></div>

        <div className="grid-2">
          <div className="card setup-card">
            <h2>面试设置</h2>

            <div className="form-group">
              <label className="label">面试类型</label>
              <div className="option-row">
                {[
                  {v:'技术',icon:'💻',desc:'算法、系统设计、编码实践'},
                  {v:'行为',icon:'🤝',desc:'领导力、团队协作、冲突处理'},
                  {v:'综合',icon:'🎯',desc:'技术+行为交替考察'},
                ].map(o => (
                  <button key={o.v} className={`option-btn ${type===o.v?'active':''}`} onClick={()=>setType(o.v)}>
                    <span className="opt-icon">{o.icon}</span>
                    <span className="opt-title">{o.v}面试</span>
                    <span className="opt-desc">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">面试语言</label>
              <div className="option-row small">
                {['中文','英文'].map(l => (
                  <button key={l} className={`option-btn ${language===l?'active':''}`} onClick={()=>setLanguage(l)}>
                    {l==='中文'?'🇨🇳 中文':'🌍 English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">题目数量：<strong>{questionCount} 题</strong></label>
              <input type="range" min="3" max="10" value={questionCount}
                onChange={e=>setQuestionCount(Number(e.target.value))} className="range-input" />
              <div className="range-labels"><span>3</span><span>5</span><span>7</span><span>10</span></div>
            </div>

            <div className="form-group">
              <label className="label">岗位描述 JD（可选，粘贴后 AI 针对性提问）</label>
              <textarea className="textarea" rows={4} placeholder="粘贴目标岗位的完整 JD，AI 会根据职责要求、技能要求等定制面试题..."
                value={jdContent} onChange={e=>setJdContent(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="label">追问模式</label>
              <div className="option-row small">
                <button type="button" className={`option-btn ${!followUpMode?'active':''}`} onClick={()=>setFollowUpMode(false)}>📋 标准模式</button>
                <button type="button" className={`option-btn ${followUpMode?'active':''}`} onClick={()=>setFollowUpMode(true)}>🔍 追问模式</button>
              </div>
              <p style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>
                {followUpMode ? 'AI 会根据你的回答质量动态追问，直到答到位为止' : '每题只问一次，固定题数'}
              </p>
            </div>

            <button className="btn btn-primary btn-lg start-btn" onClick={handleStart} disabled={loading}>
              {loading ? '准备中...' : '🚀 开始面试'}
            </button>
          </div>

          <div className="card setup-desc">
            <h3>📋 面试流程</h3>
            <div className="flow-list">
              {['选择面试类型和语言','AI 面试官语音提问','语音输入或文字作答','每题即时评分反馈','结束后查看深度复盘'].map((s,i)=>(
                <div key={i} className="flow-item">
                  <div className="flow-num">{i+1}</div>
                  <p>{s}</p>
                </div>
              ))}
            </div>
            <div className="setup-tip">
              <strong>💡 提示：</strong>面试中可使用 🎤 语音输入回答，AI 面试官也会语音播报题目。需使用 Chrome/Edge 浏览器。
            </div>

            {/* Avatar Preview + Picker */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <AIInterviewer
                config={interviewerConfig}
                persona={interviewerPersona}
                state="idle"
                onConfigChange={setInterviewerConfig}
                onPersonaChange={setInterviewerPersona}
                showPicker={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- INTERVIEW ----
  if (step === 'interview') {
    return (
      <div className="interview-page active">
        {/* AI Interviewer Avatar */}
        <AIInterviewer config={interviewerConfig} persona={interviewerPersona} state={avatarState} />

        {/* Camera self-view */}
        <div className="camera-area">
          {!camEnabled ? (
            <button className="btn btn-sm btn-secondary" onClick={startCam}>📹 开启摄像头</button>
          ) : (
            <div className="camera-preview">
              <video ref={videoRef} autoPlay muted playsInline className="camera-video" />
              <button className="btn btn-sm btn-danger camera-off" onClick={stopCam}>✕</button>
            </div>
          )}
        </div>

        <div className="interview-topbar">
          <div className="interview-progress-info">
            <span className="prog-text">第 {qNum} / {total} 题</span>
            <div className="progress-bar"><div className="progress-fill" style={{width:`${(qNum/total)*100}%`}} /></div>
          </div>
          <span className="interview-tag">{type}面试 · {language}</span>
        </div>

        <div className="card question-card-main">
          <span className="q-label">Q{qNum}</span>
          <p className="q-text">{currentQ}</p>
          <button className="btn-replay" onClick={() => speakQuestion(currentQ)} title="重新播报">
            🔊 重播
          </button>
        </div>

        {error && <div className="error-msg">❌ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card answer-card-main">
            <div className="answer-label-row">
              <label className="label">你的回答</label>
              {supported && (
                <button
                  type="button"
                  className={`btn-voice ${listening ? 'recording' : ''}`}
                  onClick={() => listening ? stopListening() : startListening(handleVoiceResult)}
                  title={listening ? '停止录音' : '语音输入'}
                >
                  <span className="mic-icon">{listening ? '🔴' : '🎤'}</span>
                  {listening ? '录音中...点击停止' : '语音输入'}
                </button>
              )}
            </div>
            <textarea ref={answerRef} className="textarea answer-area"
              placeholder={listening ? '🎤 正在聆听，请说话...' : '在此输入回答，或点击 🎤 语音输入...\n\n💡 建议：思考后再作答，条理清晰，用具体例子支撑观点'}
              value={answer} onChange={e => setAnswer(e.target.value)} rows={8} disabled={loading} />
            <div className="answer-bottom">
              <span className="char-count">{answer.length} 字符</span>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !answer.trim()}>
                {loading ? '提交中...' : '📤 提交回答'}
              </button>
            </div>
          </div>
        </form>

        {feedback && (
          <div className="card feedback-card-new">
            <div className="fb-header">
              <h3>📊 上一题反馈</h3>
              <span className={`score-badge ${sc(feedback.score)}`}>{feedback.score}/10</span>
            </div>
            <p className="fb-text">{feedback.feedback}</p>
            {feedback.strengths?.length>0 && (
              <div className="fb-block good"><strong>✅ 优点</strong><ul>{feedback.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
            )}
            {feedback.improvements?.length>0 && (
              <div className="fb-block improve"><strong>💡 改进</strong><ul>{feedback.improvements.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- COMPLETE ----
  if (step === 'complete') {
    const avg = history.length>0 ? (history.reduce((s,qa)=>s+(qa.evaluation?.score||0),0)/history.length).toFixed(1) : '0';
    return (
      <div className="interview-page complete">
        <div className="card complete-hero-card">
          <div className="complete-icon-wrap">🎉</div>
          <h1>面试完成！</h1>
          <p>{closing || '恭喜完成模拟面试！'}</p>
          <div className={`score-circle ${parseFloat(avg)>=7?'high':parseFloat(avg)>=5?'medium':'low'}`} style={{margin:'24px auto'}}>
            {avg}
          </div>
          <p className="avg-label">平均得分 (满分10分)</p>
        </div>

        <div className="card">
          <h3 style={{marginBottom:20}}>📋 问答回顾</h3>
          {history.map((qa,i)=>(
            <div key={i} className="review-qa-item">
              <div className="rqa-header">
                <span className="rqa-num">Q{i+1}</span>
                <span className="rqa-q">{qa.question}</span>
                {qa.evaluation && <span className={`score-badge ${sc(qa.evaluation.score)}`}>{qa.evaluation.score}/10</span>}
              </div>
              <div className="rqa-a"><strong>你的回答：</strong><p>{qa.answer}</p></div>
              {qa.evaluation && <div className="rqa-fb">{qa.evaluation.feedback}</div>}
            </div>
          ))}
        </div>

        <div className="complete-actions">
          <button className="btn btn-secondary" onClick={()=>{setStep('setup');setHistory([]);setFeedback(null);}}>🔄 再来一次</button>
          <button className="btn btn-primary" onClick={()=>navigate('/review')}>📊 查看深度复盘 →</button>
        </div>
      </div>
    );
  }

  return null;
}
