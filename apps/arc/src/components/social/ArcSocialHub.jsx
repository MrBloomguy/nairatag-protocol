import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, LockKeyhole, RefreshCw, ShieldCheck, UserRoundPlus, Users, X } from 'lucide-react';
import {
  decideSocialFollowRequest,
  followSocialProfile,
  loadSocialDashboard,
  saveSocialProfile,
  unfollowSocialProfile,
} from '../../services/arcSocialGraph.js';
import './arc-social-hub.css';

function canonicalTag(value) {
  return String(value || '').replace(/^[₦$@#]/, '').trim().toLowerCase();
}

function SocialProfileCard({ profile, relation = 'none', mutualCount = 0, busy, onFollow, onOpen }) {
  const tag = canonicalTag(profile.tag);
  const privateProfile = profile.visibility === 'private';
  const actionLabel = relation === 'accepted' ? 'Following' : relation === 'pending' ? 'Requested' : privateProfile ? 'Request' : 'Follow';
  return (
    <article className="arc-social-profile-card">
      <button className="arc-social-profile-main" type="button" onClick={onOpen}>
        <img src={profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(tag)}`} alt="" />
        <span className="arc-social-profile-copy">
          <strong>₦{tag.toUpperCase()}</strong>
          <span>{profile.display_name && profile.display_name.toLowerCase() !== tag ? profile.display_name : 'NairaTag profile'}</span>
          {profile.bio && <small>{profile.bio}</small>}
          {mutualCount > 0 && <small className="arc-social-mutual-note">{mutualCount} mutual {mutualCount === 1 ? 'agent' : 'agents'}</small>}
        </span>
        {privateProfile && <LockKeyhole className="arc-social-private-icon" size={15} aria-label="Private profile" />}
      </button>
      <button className={`arc-social-follow-action ${relation === 'accepted' ? 'is-following' : ''}`} type="button" disabled={busy} onClick={onFollow}>
        {busy ? 'Saving…' : relation === 'accepted' ? 'Following' : relation === 'pending' ? 'Requested' : <><UserRoundPlus size={14} />{actionLabel}</>}
      </button>
    </article>
  );
}

export default function ArcSocialHub({ walletAddress, myTag, onConnect, onOpenProfile }) {
  const tag = canonicalTag(myTag?.cleanTag || myTag?.tag);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!walletAddress || !tag) { setDashboard(null); return; }
    setLoading(true);
    setError('');
    try { setDashboard(await loadSocialDashboard({ tag, walletAddress })); }
    catch (loadError) { setError(loadError.message || 'Could not load your social graph.'); }
    finally { setLoading(false); }
  }, [tag, walletAddress]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    window.addEventListener('nairatag:arc-social-updated', refresh);
    return () => window.removeEventListener('nairatag:arc-social-updated', refresh);
  }, [refresh]);

  const relationByTag = useMemo(() => new Map([
    ...(dashboard?.following || []).map((profile) => [profile.tag, 'accepted']),
    ...(dashboard?.sentRequests || []).map((profile) => [profile.tag, 'pending']),
  ]), [dashboard]);

  const openProfile = (profile) => onOpenProfile?.({
    profileType: 'claimed-tag',
    id: null,
    tag: canonicalTag(profile.tag),
    name: profile.display_name || `₦${String(profile.tag).toUpperCase()}`,
    role: profile.bio || 'NairaTag holder',
    avatar: profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(profile.tag)}`,
    owner: profile.wallet_address || null,
    profileLoading: false,
  });

  const runFollow = async (profile) => {
    const targetTag = canonicalTag(profile.tag);
    const current = relationByTag.get(targetTag) || 'none';
    setBusyKey(targetTag);
    setError('');
    try {
      if (current === 'accepted' || current === 'pending') await unfollowSocialProfile({ tag, targetTag, walletAddress });
      else await followSocialProfile({ tag, targetTag, walletAddress });
    } catch (actionError) { setError(actionError.message || 'Could not update this follow.'); }
    finally { setBusyKey(''); }
  };

  const decideRequest = async (profile, decision) => {
    setBusyKey(profile.tag);
    setError('');
    try {
      await decideSocialFollowRequest({ tag, requestTag: profile.tag, decision, walletAddress });
    } catch (actionError) { setError(actionError.message || 'Could not update this request.'); }
    finally { setBusyKey(''); }
  };

  const setVisibility = async (visibility) => {
    setBusyKey('visibility');
    setError('');
    try {
      await saveSocialProfile({ tag, walletAddress, visibility });
    } catch (actionError) { setError(actionError.message || 'Could not update profile privacy.'); }
    finally { setBusyKey(''); }
  };

  if (!tag) {
    return (
      <section className="arc-social-hub arc-social-empty-state">
        <div className="arc-social-empty-icon"><Users size={21} /></div>
        <h2>Find your people</h2>
        <p>Claim a NairaTag and connect your account to follow profiles, find mutuals, and get personal suggestions.</p>
        <button type="button" className="arc-social-primary-button" onClick={walletAddress ? () => { window.location.hash = '#claim'; } : onConnect}>
          {walletAddress ? 'Claim a NairaTag' : 'Connect account'} <ArrowRight size={15} />
        </button>
      </section>
    );
  }

  const profile = dashboard?.profile;
  const followers = dashboard?.followers || [];
  const following = dashboard?.following || [];
  const requests = dashboard?.requests || [];
  const sentRequests = dashboard?.sentRequests || [];
  const mutuals = dashboard?.mutuals || [];
  const suggestions = dashboard?.suggested || [];

  return (
    <section className="arc-social-hub" aria-label="NairaTag social">
      <div className="arc-social-heading">
        <div><span className="arc-social-eyebrow">NAIRATAG COMMUNITY</span><h2>People to know</h2><p>Follow public NairaTag profiles and discover agents through your network.</p></div>
        <button type="button" className="arc-social-refresh" onClick={refresh} disabled={loading} aria-label="Refresh social graph"><RefreshCw size={16} className={loading ? 'is-spinning' : ''} /></button>
      </div>

      <div className="arc-social-stat-strip">
        <div><strong>{dashboard?.followerCount ?? '—'}</strong><span>Followers</span></div>
        <div><strong>{dashboard?.followingCount ?? '—'}</strong><span>Following</span></div>
        <div><strong>{mutuals.length}</strong><span>Mutuals</span></div>
      </div>

      <div className="arc-social-privacy-row">
        <div className="arc-social-privacy-copy"><ShieldCheck size={16} /><span><strong>Your profile</strong><small>{profile?.visibility === 'private' ? 'Private · approve requests before people follow you' : 'Public · anyone can follow you'}</small></span></div>
        <div className="arc-social-privacy-toggle" role="group" aria-label="Profile visibility">
          <button type="button" className={profile?.visibility !== 'private' ? 'selected' : ''} disabled={busyKey === 'visibility' || loading} onClick={() => setVisibility('public')}>Public</button>
          <button type="button" className={profile?.visibility === 'private' ? 'selected' : ''} disabled={busyKey === 'visibility' || loading} onClick={() => setVisibility('private')}>Private</button>
        </div>
      </div>

      {error && <div className="arc-social-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
      {loading && !dashboard && <div className="arc-social-loading" role="status">Loading your community…</div>}

      <div className="arc-social-section">
        <div className="arc-social-section-title"><div><h3>Follow requests</h3><span>People who want to follow your private profile</span></div><b>{requests.length}</b></div>
        {requests.length ? <div className="arc-social-request-list">{requests.map((request) => (
          <article className="arc-social-request" key={request.tag}>
            <button type="button" className="arc-social-profile-main" onClick={() => openProfile(request)}>
              <img src={request.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(request.tag)}`} alt="" />
              <span className="arc-social-profile-copy"><strong>₦{request.tag.toUpperCase()}</strong><span>{request.display_name || 'NairaTag profile'}</span></span>
            </button>
            <div className="arc-social-request-actions">
              <button type="button" className="accept" disabled={busyKey === request.tag} onClick={() => decideRequest(request, 'accept')}><Check size={14} />Accept</button>
              <button type="button" className="decline" disabled={busyKey === request.tag} onClick={() => decideRequest(request, 'decline')}>Decline</button>
            </div>
          </article>
        ))}</div> : <p className="arc-social-section-empty">No pending requests.</p>}
      </div>

      <div className="arc-social-section">
        <div className="arc-social-section-title"><div><h3>Sent requests</h3><span>Requests waiting for approval</span></div><b>{sentRequests.length}</b></div>
        {sentRequests.length ? <div className="arc-social-card-list">{sentRequests.map((item) => <SocialProfileCard key={item.tag} profile={item} relation="pending" busy={busyKey === item.tag} onFollow={() => runFollow(item)} onOpen={() => openProfile(item)} />)}</div>
          : <p className="arc-social-section-empty">No requests waiting for approval.</p>}
      </div>

      <div className="arc-social-section">
        <div className="arc-social-section-title"><div><h3>Mutual agents</h3><span>People you follow who follow you back</span></div><b>{mutuals.length}</b></div>
        {mutuals.length ? <div className="arc-social-card-list">{mutuals.slice(0, 6).map((item) => <SocialProfileCard key={item.tag} profile={item} relation="accepted" busy={busyKey === item.tag} onFollow={() => runFollow(item)} onOpen={() => openProfile(item)} />)}</div>
          : <p className="arc-social-section-empty">Mutuals will show up here when someone you follow follows you back.</p>}
      </div>

      <div className="arc-social-section">
        <div className="arc-social-section-title"><div><h3>Followers</h3><span>People following your NairaTag</span></div><b>{followers.length}</b></div>
        {followers.length ? <div className="arc-social-card-list">{followers.slice(0, 8).map((item) => <SocialProfileCard key={item.tag} profile={item} relation={relationByTag.get(item.tag) || 'none'} busy={busyKey === item.tag} onFollow={() => runFollow(item)} onOpen={() => openProfile(item)} />)}</div>
          : <p className="arc-social-section-empty">Your followers will appear here.</p>}
      </div>

      <div className="arc-social-section">
        <div className="arc-social-section-title"><div><h3>Following</h3><span>Your NairaTag network</span></div><b>{following.length}</b></div>
        {following.length ? <div className="arc-social-card-list">{following.slice(0, 8).map((item) => <SocialProfileCard key={item.tag} profile={item} relation="accepted" busy={busyKey === item.tag} onFollow={() => runFollow(item)} onOpen={() => openProfile(item)} />)}</div>
          : <p className="arc-social-section-empty">Follow a profile to start building your network.</p>}
      </div>

      <div className="arc-social-section arc-social-suggestions-section">
        <div className="arc-social-section-title"><div><h3>Suggested for you</h3><span>Public profiles to help you get started</span></div><b>{suggestions.length}</b></div>
        {suggestions.length ? <div className="arc-social-card-list">{suggestions.map((item) => <SocialProfileCard key={item.tag} profile={item} relation={relationByTag.get(item.tag) || 'none'} busy={busyKey === item.tag} mutualCount={item.mutualCount || 0} onFollow={() => runFollow(item)} onOpen={() => openProfile(item)} />)}</div>
          : <p className="arc-social-section-empty">New public NairaTag profiles will appear here.</p>}
      </div>
    </section>
  );
}
