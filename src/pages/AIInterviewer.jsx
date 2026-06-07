import { useState } from 'react';
import './AIInterviewer.css';

const avatarPresets = [
  { id: 1, emoji: '👩‍💼', name: 'Olivia', role: 'HR Director', gender: 'female', age: 'young', accent: '#6366f1', bg: 'linear-gradient(135deg, #6366f1, #a855f7)' },
  { id: 2, emoji: '👨‍💻', name: 'Marcus', role: 'Tech Lead', gender: 'male', age: 'young', accent: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  { id: 3, emoji: '👩‍💼', name: 'Sarah', role: 'Senior VP', gender: 'female', age: 'middle', accent: '#8b5cf6', bg: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  { id: 4, emoji: '👨‍💼', name: 'David', role: 'Engineering Mgr', gender: 'male', age: 'middle', accent: '#0891b2', bg: 'linear-gradient(135deg, #0e7490, #06b6d4)' },
  { id: 5, emoji: '👩‍🏫', name: 'Margaret', role: 'Career Coach', gender: 'female', age: 'senior', accent: '#d97706', bg: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  { id: 6, emoji: '👨‍🏫', name: 'Robert', role: 'CTO Advisor', gender: 'male', age: 'senior', accent: '#475569', bg: 'linear-gradient(135deg, #334155, #64748b)' },
];

const personaPresets = [
  { id: 'standard', icon: '⚖️', name: '标准面试官', desc: '专业、客观、不偏不倚，标准面试节奏', prompt: 'You are a standard professional interviewer. Be fair and objective. Ask balanced questions. Maintain a neutral but professional tone.' },
  { id: 'strict', icon: '🔥', name: '压力面试官', desc: '咄咄逼人、追问细节、制造压力，模拟高压面试', prompt: 'You are a strict, high-pressure interviewer. Challenge every answer. Push for specifics. Interrupt with follow-ups. Be skeptical. Create real interview pressure. Ask: "Why?" "Give a concrete example." "That\'s not specific enough."' },
  { id: 'friendly', icon: '😊', name: '温和面试官', desc: '鼓励型、耐心引导、让人放松，适合初练者', prompt: 'You are a warm, encouraging interviewer. Be supportive and patient. Give gentle guidance. Build the candidate\'s confidence while still assessing them. Offer small encouragement like "good point" before probing deeper.' },
  { id: 'expert', icon: '🧠', name: '技术专家', desc: '深挖技术细节、追问架构设计、考察底层原理', prompt: 'You are a senior technical architect conducting a deep technical interview. Dive into system design, algorithms, coding patterns, architecture trade-offs. Ask about specific technologies. Challenge technical decisions. Expect detailed technical answers.' },
  { id: 'foreign', icon: '🌍', name: '外企风格', desc: '英文为主、行为面试法、关注领导力和文化契合', prompt: 'You are an interviewer at a multinational company. Focus on behavioral questions using the STAR method. Assess leadership, cross-cultural communication, and collaboration. Use English primarily. Ask about handling ambiguity and working across time zones.' },
  { id: 'startup', icon: '🚀', name: '创业公司', desc: '关注创业心态、多面手能力、快速迭代思维', prompt: 'You are a startup founder/CTO interviewing. Focus on entrepreneurial mindset, ability to wear multiple hats, comfort with ambiguity, fast iteration. Ask about ownership, initiative, scrappiness. Value impact over process.' },
];

export default function AIInterviewer({ config, state, persona, onConfigChange, onPersonaChange, showPicker }) {
  const [selectedAvatar, setSelectedAvatar] = useState(config ? avatarPresets.findIndex(p=>p.id===config.id) : 0);
  const [selectedPersona, setSelectedPersona] = useState(personaPresets.findIndex(p=>p.id===persona?.id) || 0);
  const [customPersona, setCustomPersona] = useState(persona?.customText || '');
  const [useCustom, setUseCustom] = useState(!!persona?.customText);

  const current = config || avatarPresets[selectedAvatar];
  const activePersona = useCustom
    ? { id: 'custom', icon: '✏️', name: '自定义', desc: customPersona.substring(0, 40) || '输入你的人设...' }
    : personaPresets[selectedPersona];

  function applyAvatar(idx) {
    setSelectedAvatar(idx);
    onConfigChange?.(avatarPresets[idx]);
  }

  function applyPersona(idx) {
    setSelectedPersona(idx);
    setUseCustom(false);
    onPersonaChange?.({ ...personaPresets[idx], customText: '' });
  }

  function applyCustomPersona() {
    if (!customPersona.trim()) return;
    setUseCustom(true);
    onPersonaChange?.({ id: 'custom', icon: '✏️', name: '自定义人设', desc: customPersona.trim().substring(0, 40), prompt: customPersona.trim(), customText: customPersona.trim() });
  }

  return (
    <div className="aiw-container">
      {/* Avatar */}
      <div className={`aiw-avatar ${state || 'idle'}`} style={{ background: current.bg }}>
        <div className="aiw-emoji">{current.emoji}</div>
        {state === 'speaking' && <div className="aiw-ring speaking" />}
        {state === 'thinking' && <div className="aiw-ring thinking" />}
      </div>

      <div className="aiw-info">
        <div className="aiw-name">{current.name}</div>
        <div className="aiw-role">{current.role}</div>
        {activePersona && <div className="aiw-persona-tag">{activePersona.icon} {activePersona.name}</div>}
        <div className="aiw-status">
          {state === 'speaking' && <><span className="aiw-dot speaking" />正在提问...</>}
          {state === 'thinking' && <><span className="aiw-dot thinking" />分析你的回答...</>}
          {state === 'idle' && <><span className="aiw-dot idle" />等待你的回答</>}
        </div>
      </div>

      {state === 'speaking' && (
        <div className="aiw-bars">{[...Array(7)].map((_, i) => <span key={i} className="aiw-bar" style={{ animationDelay: `${i*0.07}s`, height: `${12+Math.random()*20}px` }} />)}</div>
      )}

      {/* Picker */}
      {showPicker && (
        <div className="aiw-picker">
          {/* Avatar selection */}
          <div className="aiw-picker-title">🎨 选择形象</div>
          <div className="aiw-picker-grid">
            {avatarPresets.map((p, i) => (
              <button key={p.id} className={`aiw-pick ${selectedAvatar===i?'active':''}`} onClick={()=>applyAvatar(i)} style={{'--accent':p.accent}}>
                <span className="aiw-pick-emoji">{p.emoji}</span>
                <span className="aiw-pick-name">{p.name}</span>
                <span className="aiw-pick-role">{p.role}</span>
              </button>
            ))}
          </div>

          {/* Persona selection */}
          <div className="aiw-picker-title" style={{ marginTop: 24 }}>🎭 选择人设风格</div>
          <div className="persona-grid">
            {personaPresets.map((p, i) => (
              <button key={p.id}
                className={`persona-pick ${!useCustom && selectedPersona===i ? 'active' : ''}`}
                onClick={() => applyPersona(i)}
              >
                <span className="persona-icon">{p.icon}</span>
                <div className="persona-info">
                  <strong>{p.name}</strong>
                  <span>{p.desc}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Custom persona */}
          <div className="aiw-picker-title" style={{ marginTop: 24 }}>✏️ 或自定义人设（用文字描述面试官风格）</div>
          <textarea
            className="textarea"
            rows={3}
            placeholder={`例如：你是一位来自字节跳动的资深后端面试官，面试风格犀利直接，喜欢深挖项目细节，对系统设计特别关注。你会用中文提问但偶尔穿插英文术语...`}
            value={customPersona}
            onChange={e => setCustomPersona(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 8 }}
            onClick={applyCustomPersona}
            disabled={!customPersona.trim()}
          >
            {useCustom ? '✅ 已应用自定义人设' : '应用自定义人设'}
          </button>
        </div>
      )}
    </div>
  );
}
