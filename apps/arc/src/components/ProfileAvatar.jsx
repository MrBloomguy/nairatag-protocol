export default function ProfileAvatar({ tag = '', email = '', size = 40, className = '' }) {
  const identity = String(tag || email || '').replace(/^[$₦@#]/, '').trim();
  const seed = identity || 'user';
  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <span
      className={`naira-profile-avatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0
      }}
      role="img"
      aria-label={identity ? `Profile avatar for ${identity}` : 'NairaTag profile avatar'}
    >
      <img
        src={avatarUrl}
        alt={identity ? `Avatar for ${identity}` : 'User avatar'}
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    </span>
  );
}
