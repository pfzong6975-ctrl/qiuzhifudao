import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { getApiKeyStatus } from './api';
import Home from './pages/Home';
import ResumeRevision from './pages/ResumeRevision';
import MockInterview from './pages/MockInterview';
import InterviewReview from './pages/InterviewReview';
import CoverLetter from './pages/CoverLetter';
import JDMatch from './pages/JDMatch';
import SelfIntro from './pages/SelfIntro';
import QuestionBank from './pages/QuestionBank';
import CompanyResearch from './pages/CompanyResearch';
import OfferCompare from './pages/OfferCompare';
import KnowledgeBase from './pages/KnowledgeBase';
import ResumeChat from './pages/ResumeChat';
import CareerCoach from './pages/CareerCoach';
import './App.css';

const navSections = [
  { label: '核心功能', items: [
    { path: '/', icon: '🏠', label: '首页', end: true },
    { path: '/career', icon: '🧭', label: '职业规划' },
    { path: '/resume', icon: '📄', label: '简历优化' },
    { path: '/resume-chat', icon: '💬', label: 'AI写简历' },
    { path: '/interview', icon: '🎤', label: '模拟面试' },
    { path: '/review', icon: '📊', label: '面试复盘' },
  ]},
  { label: '求职工具', items: [
    { path: '/jd-match', icon: '🎯', label: '岗位匹配' },
    { path: '/cover-letter', icon: '✉️', label: '求职信生成' },
    { path: '/self-intro', icon: '🎙️', label: '自我介绍' },
    { path: '/question-bank', icon: '📚', label: '面试题库' },
  ]},
  { label: '决策辅助', items: [
    { path: '/company', icon: '🏢', label: '公司调研' },
    { path: '/offer', icon: '💰', label: 'Offer对比' },
    { path: '/knowledge', icon: '🧠', label: '知识库' },
  ]},
];

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('jobseek-theme') || 'dark');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jobseek-theme', theme);
  }, [theme]);

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  useEffect(() => { checkApiKey(); }, []);
  async function checkApiKey() {
    try { const d = await getApiKeyStatus(); setHasApiKey(d.hasKey); if (d.baseUrl) setBaseUrlInput(d.baseUrl); if (d.model) setModelInput(d.model); if (!d.hasKey) setShowApiModal(true); } catch { setHasApiKey(false); setShowApiModal(true); }
  }
  async function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/settings/api-key', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ apiKey:apiKeyInput.trim(), baseUrl:baseUrlInput.trim(), model:modelInput.trim() }) });
      setHasApiKey(true); setShowApiModal(false); setApiKeyInput(''); setBaseUrlInput('');
    } catch(e){}
    setSaving(false);
  }

  const breadcrumb = useMemo(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        const match = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path + (item.path==='/'?'':''));
        if (match) return item.label;
      }
    }
    return '';
  }, [location]);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <div className="sidebar-logo">💼</div>
          <span className="sidebar-title">JobSeek Pro</span>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((sec, si) => (
            <div key={si}>
              <div className="sidebar-section">{sec.label}</div>
              {sec.items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.end}
                  className={({isActive}) => 'sidebar-link' + (isActive?' active':'')}>
                  <span className="sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title="切换深色/浅色模式">
            {theme === 'dark' ? '☀️ 浅色模式' : '🌙 深色模式'}
          </button>
          <div className={`api-key-indicator ${hasApiKey ? 'connected' : 'disconnected'}`}
               onClick={() => setShowApiModal(true)}>
            {hasApiKey ? '🟢' : '🔴'} {hasApiKey ? 'API 已连接' : '设置 API Key'}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-breadcrumb">{breadcrumb}</span>
          </div>
          <div className="topbar-actions">
            <span style={{fontSize:12,color:'var(--text-muted)'}}>DeepSeek / Claude</span>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home hasApiKey={hasApiKey} />} />
            <Route path="/resume" element={<ResumeRevision />} />
            <Route path="/interview" element={<MockInterview />} />
            <Route path="/review" element={<InterviewReview />} />
            <Route path="/jd-match" element={<JDMatch />} />
            <Route path="/cover-letter" element={<CoverLetter />} />
            <Route path="/self-intro" element={<SelfIntro />} />
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/company" element={<CompanyResearch />} />
            <Route path="/offer" element={<OfferCompare />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/resume-chat" element={<ResumeChat />} />
            <Route path="/career" element={<CareerCoach />} />
          </Routes>
        </main>
      </div>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="modal-overlay" onClick={() => { if (hasApiKey) setShowApiModal(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔑 设置 API Key</h2>
            <p className="modal-desc">支持 DeepSeek / MiniMax / Claude</p>
            <label className="label" style={{marginBottom:4}}>API 提供商</label>
            <select className="input" style={{marginBottom:12}} value={
              baseUrlInput.includes('minimax') ? 'minimax' :
              baseUrlInput.includes('anthropic') ? 'claude' :
              baseUrlInput ? 'custom' : 'deepseek'
            } onChange={e => {
              const v = e.target.value;
              if (v==='deepseek') setBaseUrlInput('');
              else if (v==='minimax') setBaseUrlInput('https://api.minimax.chat/v1/chat/completions');
              else if (v==='claude') setBaseUrlInput('');
              else setBaseUrlInput('');
            }}>
              <option value="deepseek">DeepSeek</option>
              <option value="minimax">MiniMax</option>
              <option value="claude">Anthropic Claude</option>
              <option value="custom">自定义</option>
            </select>
            <label className="label">API Key</label>
            <input type="password" className="input" placeholder="sk-..." value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveApiKey()} />
            <label className="label" style={{marginTop:12}}>API 地址（可选）</label>
            <input type="text" className="input" placeholder="默认自动匹配" value={baseUrlInput} onChange={e=>setBaseUrlInput(e.target.value)} />
            <label className="label" style={{marginTop:12}}>模型名称（可选）</label>
            <input type="text" className="input" placeholder="默认自动匹配" value={modelInput} onChange={e=>setModelInput(e.target.value)} />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowApiModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveApiKey} disabled={saving||!apiKeyInput.trim()}>{saving?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
