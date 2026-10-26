import React, { useEffect, useState } from 'react';
import { Brain, Check, ChevronLeft, LoaderCircle, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  clearPersonalMemories, confirmPersonalMemory, createPersonalGoal, createPersonalMemory, deletePersonalGoal,
  deletePersonalMemory, getPersonalAgent, updatePersonalAgent, updatePersonalGoal, updatePersonalMemory,
} from '../../services/personalAgent.js';
import { AGENT_LANGUAGES, normalizeAgentLanguage, saveAgentLanguagePreference } from '../../services/agentLanguage.js';
import './personal-agent.css';

const EMPTY_PROFILE = { agent_name: '', communication_style: 'balanced', response_length: 'balanced', language_preference: 'auto', custom_instructions: '', personalization_enabled: true, memory_enabled: true, auto_memory_enabled: true };

export default function PersonalAgentPanel({ open, onClose, walletAddress, tag }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [memories, setMemories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [memoryDraft, setMemoryDraft] = useState({ category: 'profile', title: '', content: '', is_sensitive: false });
  const [goalDraft, setGoalDraft] = useState({ title: '', description: '', next_action: '', status: 'active', target_date: '' });

  const load = async () => {
    if (!walletAddress || !tag) return;
    setLoading(true); setError('');
    try {
      const data = await getPersonalAgent({ walletAddress, tag });
      const loadedProfile = {
        ...EMPTY_PROFILE,
        ...data.profile,
        language_preference: normalizeAgentLanguage(data.profile?.language_preference),
      };
      setProfile(loadedProfile);
      saveAgentLanguagePreference(walletAddress, loadedProfile.language_preference);
      setMemories(data.memories || []); setGoals(data.goals || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open, walletAddress, tag]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;
  const run = async (operation, success) => {
    setSaving(true); setError(''); setNotice('');
    try { await operation(); await load(); setNotice(success); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const saveProfile = (event) => {
    event.preventDefault();
    run(async () => {
      await updatePersonalAgent({ walletAddress, tag, profile });
      saveAgentLanguagePreference(walletAddress, profile.language_preference);
    }, 'Your agent settings are saved.');
  };
  const addMemory = (event) => {
    event.preventDefault();
    if (!memoryDraft.title.trim() || !memoryDraft.content.trim()) return;
    run(async () => {
      if (memoryDraft.id) await updatePersonalMemory({ walletAddress, tag, memory: memoryDraft });
      else await createPersonalMemory({ walletAddress, tag, memory: memoryDraft });
      setMemoryDraft({ category: 'profile', title: '', content: '', is_sensitive: false });
    }, memoryDraft.id ? 'Memory updated.' : 'Memory saved.');
  };
  const addGoal = (event) => {
    event.preventDefault();
    if (!goalDraft.title.trim()) return;
    run(async () => { await createPersonalGoal({ walletAddress, tag, goal: goalDraft }); setGoalDraft({ title: '', description: '', next_action: '', status: 'active', target_date: '' }); }, 'Goal saved.');
  };

  return <div className="pa-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="pa-panel" role="dialog" aria-modal="true" aria-labelledby="pa-title">
      <header className="pa-header">
        <div className="pa-mark"><Brain size={19} /></div>
        <div className="pa-heading"><h2 id="pa-title">Your personal agent</h2><span>For ₦{String(tag || '').replace(/^[₦$@#]/, '')}</span></div>
        <button className="pa-icon-button" type="button" aria-label="Close" onClick={onClose}><X size={19} /></button>
      </header>
      <nav className="pa-tabs" aria-label="Personal agent settings">
        {[['profile', 'Profile'], ['memories', `Memory${memories.length ? ` · ${memories.length}` : ''}`], ['goals', `Goals${goals.length ? ` · ${goals.filter((goal) => goal.status === 'active').length}` : ''}`]].map(([key, label]) =>
          <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setError(''); setNotice(''); }}>{label}</button>)}
      </nav>
      <div className="pa-content">
        {error && <div className="pa-message error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
        {notice && <div className="pa-message success" role="status"><Check size={15} />{notice}</div>}
        {loading && <div className="pa-loading"><LoaderCircle className="pa-spin" size={20} />Loading your saved agent…</div>}
        {!loading && tab === 'profile' && <form className="pa-form" onSubmit={saveProfile}>
          <div className="pa-intro"><Sparkles size={17} /><span>This agent learns your preferences from settings and memories you choose to save.</span></div>
          <label>Agent name<input maxLength="48" value={profile.agent_name} placeholder="For example, Ada" onChange={(e) => setProfile({ ...profile, agent_name: e.target.value })} /></label>
          <div className="pa-fields-two">
            <label>Communication<select value={profile.communication_style} onChange={(e) => setProfile({ ...profile, communication_style: e.target.value })}><option value="balanced">Balanced</option><option value="direct">Direct</option><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="playful">Playful</option></select></label>
            <label>Answer length<select value={profile.response_length} onChange={(e) => setProfile({ ...profile, response_length: e.target.value })}><option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select></label>
          </div>
          <label>Language preference<select value={profile.language_preference} onChange={(e) => setProfile({ ...profile, language_preference: e.target.value })}>{AGENT_LANGUAGES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select><small>This preference follows you across your NairaTag agents. Chat supports all listed languages; live voice currently supports English, Yoruba, and Hausa.</small></label>
          <label>Additional preferences<textarea maxLength="1200" rows="3" value={profile.custom_instructions} placeholder="What should your agent keep in mind when helping you?" onChange={(e) => setProfile({ ...profile, custom_instructions: e.target.value })} /><small>{profile.custom_instructions.length}/1200</small></label>
          <div className="pa-switch-row"><div><strong>Personalized replies</strong><span>Use your saved style and preferences in Arc chat.</span></div><input aria-label="Personalized replies" type="checkbox" checked={profile.personalization_enabled} onChange={(e) => setProfile({ ...profile, personalization_enabled: e.target.checked })} /></div>
          <div className="pa-switch-row"><div><strong>Use saved memories and goals</strong><span>Relevant items can help Arc chat continue your work.</span></div><input aria-label="Use saved memories and goals" type="checkbox" checked={profile.memory_enabled} onChange={(e) => setProfile({ ...profile, memory_enabled: e.target.checked })} /></div>
          <div className="pa-switch-row"><div><strong>Suggest memories from chat</strong><span>Arc may suggest useful details for you to review. Suggestions stay out of replies until you approve them.</span></div><input aria-label="Suggest memories from chat" type="checkbox" checked={profile.auto_memory_enabled} onChange={(e) => setProfile({ ...profile, auto_memory_enabled: e.target.checked })} /></div>
          <button className="pa-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
        </form>}
        {!loading && tab === 'memories' && <div className="pa-form">
          <p className="pa-copy">Only items you add here are saved. Sensitive memories are excluded from chat context.</p>
          <form className="pa-create-card" onSubmit={addMemory}>
            <strong><Plus size={16} />{memoryDraft.id ? 'Edit memory' : 'Add a memory'}</strong>
            <label>Type<select value={memoryDraft.category} onChange={(e) => setMemoryDraft({ ...memoryDraft, category: e.target.value })}><option value="profile">About me</option><option value="working">Work or project</option><option value="episodic">Useful detail</option></select></label>
            <label>Title<input maxLength="96" value={memoryDraft.title} onChange={(e) => setMemoryDraft({ ...memoryDraft, title: e.target.value })} placeholder="e.g. Current project" required /></label>
            <label>What should Arc remember?<textarea maxLength="1200" rows="3" value={memoryDraft.content} onChange={(e) => setMemoryDraft({ ...memoryDraft, content: e.target.value })} required /></label>
            <label className="pa-check-label"><input type="checkbox" checked={memoryDraft.is_sensitive} onChange={(e) => setMemoryDraft({ ...memoryDraft, is_sensitive: e.target.checked })} />Mark sensitive (stored for you but never used in replies)</label>
            <div className="pa-form-actions"><button type="submit" className="pa-primary" disabled={saving}>{memoryDraft.id ? 'Update memory' : 'Save memory'}</button>{memoryDraft.id && <button type="button" className="pa-secondary" onClick={() => setMemoryDraft({ category: 'profile', title: '', content: '', is_sensitive: false })}>Cancel</button>}</div>
          </form>
          <div className="pa-list-heading"><strong>Saved memories</strong>{memories.length > 0 && <button type="button" disabled={saving} onClick={() => { if (window.confirm('Delete all saved memories for this NairaTag?')) run(() => clearPersonalMemories({ walletAddress, tag }), 'All memories deleted.'); }}>Clear all</button>}</div>
          {!memories.length && <div className="pa-empty">Your saved memories will appear here.</div>}
          {memories.map((memory) => <article className={`pa-item ${memory.status === 'pending_confirmation' ? 'pa-pending' : memory.status === 'superseded' || memory.status === 'archived' ? 'muted' : ''}`} key={memory.id}><div><span className="pa-kicker">{memory.status === 'pending_confirmation' ? 'Suggested · review before use' : memory.is_sensitive ? 'Sensitive · excluded from replies' : memory.status === 'superseded' ? 'Replaced' : memory.category}</span><strong>{memory.title}</strong><p>{memory.content}</p>{memory.sources?.length > 0 && <small className="pa-source-note">From a chat · {new Date(memory.sources[0].created_at).toLocaleDateString()}</small>}</div><div className="pa-item-actions">{memory.status === 'pending_confirmation' && <button type="button" title="Approve and use this memory" disabled={saving} onClick={() => run(() => confirmPersonalMemory({ walletAddress, tag, id: memory.id }), 'Memory confirmed and available in Arc chat.')}><Check size={16} /></button>}<button type="button" aria-label={`Edit ${memory.title}`} disabled={saving} onClick={() => setMemoryDraft({ id: memory.id, category: memory.category, title: memory.title, content: memory.content, is_sensitive: memory.is_sensitive })}><span>Edit</span></button><button type="button" aria-label={`Delete ${memory.title}`} disabled={saving} onClick={() => run(() => deletePersonalMemory({ walletAddress, tag, id: memory.id }), 'Memory deleted.')}><Trash2 size={16} /></button></div></article>)}
        </div>}
        {!loading && tab === 'goals' && <div className="pa-form">
          <p className="pa-copy">Keep an active project visible to Arc chat. Goals never authorize external actions.</p>
          <form className="pa-create-card" onSubmit={addGoal}>
            <strong><Plus size={16} />Add a goal</strong>
            <label>Goal<input maxLength="120" value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} placeholder="What are you working toward?" required /></label>
            <label>Details<textarea maxLength="1200" rows="2" value={goalDraft.description} onChange={(e) => setGoalDraft({ ...goalDraft, description: e.target.value })} /></label>
            <label>Next action<input maxLength="500" value={goalDraft.next_action} onChange={(e) => setGoalDraft({ ...goalDraft, next_action: e.target.value })} placeholder="A useful next step" /></label>
            <button type="submit" className="pa-primary" disabled={saving}>Save goal</button>
          </form>
          {!goals.length && <div className="pa-empty">Your goals and next steps will appear here.</div>}
          {goals.map((goal) => <article className={`pa-item ${goal.status !== 'active' ? 'muted' : ''}`} key={goal.id}><div><span className="pa-kicker">{goal.status}</span><strong>{goal.title}</strong>{goal.description && <p>{goal.description}</p>}{goal.next_action && <p className="pa-next">Next: {goal.next_action}</p>}</div><div className="pa-item-actions"><button type="button" title={goal.status === 'completed' ? 'Reopen goal' : 'Mark complete'} disabled={saving} onClick={() => run(() => updatePersonalGoal({ walletAddress, tag, goal: { ...goal, status: goal.status === 'completed' ? 'active' : 'completed' } }), goal.status === 'completed' ? 'Goal reopened.' : 'Goal completed.')}><Check size={16} /></button><button type="button" aria-label={`Delete ${goal.title}`} disabled={saving} onClick={() => run(() => deletePersonalGoal({ walletAddress, tag, id: goal.id }), 'Goal deleted.')}><Trash2 size={16} /></button></div></article>)}
        </div>}
      </div>
      <footer className="pa-footer">Your data is tied to your wallet and NairaTag. Never save passwords or recovery phrases.</footer>
    </section>
  </div>;
}
