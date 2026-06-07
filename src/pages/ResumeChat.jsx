import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResumeChat.css';

export default function ResumeChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState({});
  const [phase, setPhase] = useState('');
  const [done, setDone] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { startChat(); }, []);

  async function exportDocx(text) {
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, filename: '我的简历' }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = '我的简历.docx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('导出失败: ' + e.message); }
  }

  function printResume(text) {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>简历</title>
      <style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#333}
      h1{font-size:24px;border-bottom:2px solid #333;padding-bottom:8px} h2{font-size:18px;border-bottom:1px solid #ddd;padding-bottom:6px}
      @media print{body{margin:0;padding:20px}}</style></head><body>
      ${text.split('\\n').map(l => l.startsWith('# ') ? '<h1>'+l.slice(2)+'</h1>' : l.startsWith('## ') ? '<h2>'+l.slice(3)+'</h2>' : l.startsWith('- ') ? '<li>'+l.slice(2)+'</li>' : '<p>'+l+'</p>').join('')}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  async function startChat() {
    setLoading(true);
    try {
      const res = await fetch('/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], collectedInfo: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const msg = data.message || data.raw || '开始对话...';
      setMessages([{ role: 'assistant', content: msg }]);
      if (data.collected) setCollected(data.collected);
      if (data.phase) setPhase(data.phase);
      if (data.is_complete) setDone(true);
    } catch (e) {
      setMessages([{ role: 'assistant', content: '❌ 启动失败：' + e.message }]);
    }
    setLoading(false);
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!input.trim() || loading || done) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, collectedInfo: collected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const msg = data.message || data.raw || '';
      if (msg) {
        setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      }
      if (data.collected) setCollected(data.collected);
      if (data.phase) setPhase(data.phase);
      if (data.is_complete) {
        setDone(true);
        if (data.resume) {
          setMessages(prev => [...prev, { role: 'assistant', content: '✅ 简历已生成！\n\n' + data.resume, isResume: true }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + e.message }]);
    }
    setLoading(false);
  }

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const phases = ['personal', 'education', 'experience', 'projects', 'skills'];
  const phaseLabels = { personal:'👤 个人信息', education:'🎓 教育背景', experience:'💼 工作经历', projects:'🚀 项目经验', skills:'🛠 技能' };
  const currentPhaseIdx = phases.indexOf(phase);

  return (
    <div className="resume-chat-page">
      {/* Sidebar - collected info */}
      <div className="rc-sidebar">
        <div className="rc-sidebar-header">
          <h3>📋 已采集信息</h3>
        </div>
        <div className="rc-progress">
          {phases.map((p, i) => (
            <div key={p} className={`rc-phase ${i < currentPhaseIdx ? 'done' : i === currentPhaseIdx ? 'active' : ''}`}>
              <div className="rc-phase-dot">{i < currentPhaseIdx ? '✓' : i === currentPhaseIdx ? '●' : '○'}</div>
              <span>{phaseLabels[p]}</span>
            </div>
          ))}
        </div>
        <div className="rc-collected">
          {Object.keys(collected).length > 0 ? (
            <pre>{JSON.stringify(collected, null, 2)}</pre>
          ) : (
            <p className="rc-empty">对话开始后将自动采集...</p>
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="rc-main">
        <div className="rc-topbar">
          <h2>🤖 AI 简历生成助手</h2>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>通过对话，一步步生成你的第一份简历</span>
        </div>

        <div className="rc-chat" ref={chatRef}>
          {messages.map((m, i) => (
            <div key={i} className={`rc-msg ${m.role}`}>
              <div className="rc-avatar">{m.role === 'assistant' ? '🤖' : '👤'}</div>
              <div className={`rc-bubble ${m.isResume ? 'resume' : ''}`}>
                {m.content.split('\n').map((line, j) => <p key={j}>{line || ' '}</p>)}
                {m.isResume && (
                  <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/resume')}>
                      📄 去简历页编辑 →
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => exportDocx(m.content.replace('✅ 简历已生成！\n\n',''))}>
                      📥 下载 Word
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => printResume(m.content.replace('✅ 简历已生成！\n\n',''))}>
                      🖨 打印 PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="rc-msg assistant">
              <div className="rc-avatar">🤖</div>
              <div className="rc-bubble typing"><span/><span/><span/></div>
            </div>
          )}
          {done && (
            <div style={{textAlign:'center',padding:20}}>
              <button className="btn btn-primary" onClick={() => { setMessages([]); setCollected({}); setDone(false); startChat(); }}>
                🔄 重新开始
              </button>
            </div>
          )}
        </div>

        {!done && (
          <form className="rc-input-bar" onSubmit={handleSend}>
            <input
              ref={inputRef}
              className="rc-input"
              placeholder={loading ? 'AI 正在回复...' : '输入你的回答... (输入"跳过"可跳过当前环节)'}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
              {loading ? '...' : '发送'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
