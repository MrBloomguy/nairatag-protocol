export default function ProfileAvatar({ tag = '', email = '', size = 40, className = '' }) {
  const identity = String(tag || email || '').replace(/^[$₦@#]/, '').trim();
  const initial = identity ? Array.from(identity)[0].toUpperCase() : 'N';

  return (
    <span
      className={`naira-profile-avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.43) }}
      role="img"
      aria-label={identity ? `Profile avatar for ${identity}` : 'NairaTag profile avatar'}
    >
      <span className="naira-profile-avatar-initial">{initial}</span>
      <span className="naira-profile-avatar-mark" aria-hidden="true">₦</span>
    </span>
  );
}
