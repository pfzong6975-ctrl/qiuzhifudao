import { useState, useEffect, useRef } from 'react';
import './ToolPage.css';

// Default knowledge entries
const defaultTopics = [
  {
    id: 'star-method', category: '面试', title: 'STAR面试法',
    icon: '⭐',
    content: `# STAR 面试法

## 核心框架
STAR = Situation（情境）+ Task（任务）+ Action（行动）+ Result（结果）

## 评分权重
- S（10%）：清晰描述背景，不超过2句话
- T（10%）：明确你的职责和目标
- A（50%）：重点！详细描述你做了什么、怎么做
- R（30%）：量化结果，用数据说话

## 高分公式
"在[情境]下，我负责[任务]，通过[方法]，实现[量化结果]。这次经历让我学会了[反思]。"

## 各岗位侧重点
- 技术岗：技术选型理由、架构决策、性能指标
- 产品岗：用户洞察、数据驱动、跨团队协调
- 管理岗：团队搭建、冲突解决、目标拆解`,
  },
  {
    id: 'question-types', category: '面试', title: '面试题型策略',
    icon: '📋',
    content: `# 面试题型分类与策略

## 技术面试
- 算法题：先确认需求 → 讨论方案 → 选最优 → 写代码 → 测试
- 系统设计：需求澄清 → 容量估算 → API设计 → 数据库选型 → 架构图
- 项目深挖：你做了什么、最大挑战、如何解决、学到了什么

## 行为面试高频题
1. 领导力：跨团队推动、带新人、主导项目
2. 冲突解决：意见分歧、资源冲突、优先级矛盾
3. 失败反思：最大的失败、如何处理错误
4. 团队协作：跨部门合作、远程协作
5. 主动性：超出职责的贡献、从0到1`,
  },
  {
    id: 'resume-best', category: '简历', title: '简历最佳实践',
    icon: '📄',
    content: `# 简历最佳实践

## ATS 优化
- 使用标准章节标题
- 嵌入JD关键词但不要堆砌
- 避免表格、图片、图标
- 文件格式：PDF优先

## 黄金法则
1. 1页原则：10年以下经验保持1页
2. 倒叙排列：最新经历在前
3. 7秒法则：HR平均看7秒
4. F型浏览：重要信息放前面

## Bullet Point 公式
动作词 + 具体内容 + 量化结果
- 差："负责用户增长"
- 好：通过A/B测试优化注册流程，将转化率从12%提升至18%`,
  },
  {
    id: 'salary', category: '职业', title: '薪资谈判框架',
    icon: '💰',
    content: `# 薪资谈判框架

## 谈判前准备
1. 调研薪资：Levels.fyi、脉脉、Glassdoor
2. 明确底线和期望值
3. 准备3个"必须给高价"的理由
4. 了解薪资结构：base + bonus + 股票 + 签字费

## 谈判话术
- 开场："基于市场调研和我的经验，期望范围是..."
- 被问当前薪资："我更关注这个岗位的价值匹配"
- 被压价："能否在签字费或股票方面补充？"

## 禁区
- 不要第一个出价
- 不要只报一个数字
- 不要撒谎（背调会验证）`,
  },
  {
    id: 'offer-eval', category: '职业', title: 'Offer评估模型',
    icon: '📊',
    content: `# Offer 评估框架

## 评估维度与权重
1. 薪资福利（30%）：base + bonus + 股票 + 福利
2. 职业成长（25%）：技术栈、晋升通道、学习机会
3. 团队与老板（20%）：团队氛围、老板风格
4. 公司前景（15%）：行业、融资、稳定性
5. 工作生活平衡（10%）：加班文化、远程政策

## 红线（直接排除）
- 薪资低于当前30%以上
- 团队流动率>30%
- 最近有大规模裁员`,
  },
];

export default function KnowledgeBase() {
  const [topics, setTopics] = useState(defaultTopics);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadFromServer(); }, []);

  async function loadFromServer() {
    try {
      const res = await fetch('/api/knowledge/list');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setTopics(data);
    } catch {}
  }

  async function syncToServer(updated) {
    try {
      await fetch('/api/knowledge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: updated }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','doc','txt','md'].includes(ext)) {
      alert('不支持的文件格式，支持 PDF/DOCX/DOC/TXT/MD');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Create a new knowledge entry from the uploaded content
      const newTopic = {
        id: 'file-' + Date.now(),
        category: '自定义',
        title: data.filename || file.name,
        icon: '📄',
        content: data.content,
      };
      const updated = [...topics, newTopic];
      setTopics(updated);
      syncToServer(updated);
      setSelected(newTopic);
      alert(`✅ 已导入「${newTopic.title}」（${data.charCount} 字符）`);
    } catch (e) {
      alert('上传失败：' + (e.message || '未知错误'));
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function startEdit(topic) {
    setSelected(topic);
    setEditing(true);
    setAdding(false);
    setEditContent(topic.content);
    setEditTitle(topic.title);
    setEditCategory(topic.category);
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    if (adding) {
      const newTopic = {
        id: 'custom-' + Date.now(),
        category: editCategory || '自定义',
        title: editTitle,
        icon: '📝',
        content: editContent,
      };
      const updated = [...topics, newTopic];
      setTopics(updated);
      syncToServer(updated);
      setSelected(newTopic);
    } else if (selected) {
      const updated = topics.map(t => t.id === selected.id ? { ...t, title: editTitle, category: editCategory, content: editContent } : t);
      setTopics(updated);
      syncToServer(updated);
    }
    setEditing(false);
    setAdding(false);
  }

  function deleteTopic(topic) {
    if (confirm(`确定删除「${topic.title}」？`)) {
      const updated = topics.filter(t => t.id !== topic.id);
      setTopics(updated);
      syncToServer(updated);
      if (selected?.id === topic.id) { setSelected(null); setEditing(false); }
    }
  }

  function startAdd() {
    setAdding(true);
    setEditing(true);
    setSelected(null);
    setEditTitle('');
    setEditCategory('自定义');
    setEditContent('');
  }

  function resetDefaults() {
    if (confirm('确定恢复所有知识库到默认状态？你的修改将丢失。')) {
      setTopics(defaultTopics);
      syncToServer(defaultTopics);
      setSelected(null);
      setEditing(false);
    }
  }

  const categories = ['all', ...new Set(topics.map(t => t.category))];
  const filtered = filter === 'all' ? topics : topics.filter(t => t.category === filter);

  // Edit mode
  if (editing) {
    return (
      <div className="tool-page">
        <div className="page-header"><h1>📚 {adding ? '新建知识条目' : '编辑知识条目'}</h1></div>
        <div className="card">
          <div className="form-group"><label className="label">分类</label><input className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="面试/简历/职业/自定义" /></div>
          <div className="form-group"><label className="label">标题</label><input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="知识条目名称" /></div>
          <div className="form-group"><label className="label">内容（Markdown 格式）</label><textarea className="textarea" rows={16} value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="支持 Markdown 格式：# 标题、## 二级标题、- 列表、1. 编号" /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit}>💾 保存</button>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setAdding(false); }}>取消</button>
          </div>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="tool-page">
      <div className="page-header">
        <h1>📚 知识库管理 {saved && <span style={{fontSize:13,color:'var(--success)'}}>✅ 已同步到AI</span>}</h1>
        <p>配置专业知识框架，AI 在简历分析、面试提问、Offer对比时自动引用</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(c)}>
            {c === 'all' ? '全部' : c}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={e => { const f = e.target.files[0]; if (f) handleFileUpload(f); e.target.value = ''; }} hidden />
        <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '解析中...' : '📤 上传文件'}
        </button>
        <button className="btn btn-sm btn-primary" onClick={startAdd}>＋ 新建</button>
        <button className="btn btn-sm btn-ghost" onClick={resetDefaults}>🔄 恢复默认</button>
      </div>

      {/* Upload drop zone */}
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        style={{ marginBottom: 20 }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className="upload-icon-big">📁</div>
        <p className="upload-title">拖拽 PDF / DOCX / TXT / MD 文件到此处上传为知识条目</p>
        <p className="upload-hint">支持书籍、文档、文章等，自动解析文本内容</p>
      </div>

      <div className="grid-2">
        {/* Topic list */}
        <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><div className="icon">📭</div><h3>暂无知识条目</h3></div>
          ) : (
            filtered.map(t => (
              <div key={t.id} className={`kb-item ${selected?.id === t.id ? 'active' : ''}`} onClick={() => setSelected(t)} style={{
                padding: '14px', border: selected?.id === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)', marginBottom: 8, cursor: 'pointer',
                background: selected?.id === t.id ? 'var(--primary-light)' : 'var(--surface)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 10, marginRight: 8 }}>{t.category}</span>
                    <strong>{t.icon} {t.title}</strong>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                  {t.content.substring(0, 120).replace(/#/g, '')}...
                </p>
              </div>
            ))
          )}
        </div>

        {/* Preview */}
        <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selected ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3>{selected.icon} {selected.title}</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => startEdit(selected)}>✏️ 编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTopic(selected)}>🗑</button>
                </div>
              </div>
              <span className="score-badge" style={{ marginBottom: 16 }}>{selected.category}</span>
              <div className="kb-content" style={{ marginTop: 16, lineHeight: 1.8, fontSize: 14 }}
                dangerouslySetInnerHTML={{ __html: selected.content
                  .replace(/^### (.+)$/gm, '<h4 style="margin-top:16px;color:var(--primary)">$1</h4>')
                  .replace(/^## (.+)$/gm, '<h3 style="margin-top:20px">$1</h3>')
                  .replace(/^# (.+)$/gm, '<h2 style="margin-top:24px">$1</h2>')
                  .replace(/^- (.+)$/gm, '<li>$1</li>')
                  .replace(/(\d+)\. (.+)/g, '<li>$2</li>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^(.+)$/gm, '<p>$1</p>')
                }} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">👈</div>
              <h3>选择一条知识</h3>
              <p>左侧点击查看详情，或新建自定义知识</p>
              <div style={{ marginTop: 16, padding: 16, background: 'var(--primary-light)', borderRadius: 'var(--radius)', fontSize: 13, textAlign: 'left' }}>
                <strong>💡 知识库的作用</strong>
                <p style={{ marginTop: 8 }}>AI 在简历分析、模拟面试、Offer对比等场景中会自动引用这些专业知识，让回答更权威、更有依据。你可以添加行业特定的面试题、你的专业领域知识等。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
