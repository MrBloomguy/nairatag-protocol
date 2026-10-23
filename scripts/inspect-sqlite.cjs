const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('c:/Users/olusegun/.gemini/antigravity-ide/scratch/nairatag-network/bots/nairatag-claim/data/notifications.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in notifications.sqlite:', tables.map(t => t.name));

try {
  const earnings = db.prepare('SELECT * FROM agent_earnings').all();
  console.log('agent_earnings in sqlite:');
  console.table(earnings);
} catch (e) {
  console.log('Error querying agent_earnings:', e.message);
}

try {
  const bounties = db.prepare('SELECT id, creator, title, reward, token, status FROM bounties LIMIT 5').all();
  console.log('Sample bounties in sqlite:');
  console.table(bounties);
} catch (e) {
  console.log('Error querying bounties:', e.message);
}

try {
  const points = db.prepare('SELECT * FROM user_points LIMIT 5').all();
  console.log('Sample user_points in sqlite:');
  console.table(points);
} catch (e) {
  console.log('Error querying user_points:', e.message);
}
