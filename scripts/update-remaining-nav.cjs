const fs = require('fs');
const path = require('path');

const hubDir = path.resolve(__dirname, '../hub');

// 1. Sidebar navigation is unified canonically across all hub pages without Wallet in sidebar
// See scratch/sync-sidebars.cjs and scripts/unify-navigation.cjs

// 3. Update minipay.html button
const minipayPath = path.join(hubDir, 'minipay.html');
if (fs.existsSync(minipayPath)) {
  let content = fs.readFileSync(minipayPath, 'utf8');
  content = content.replace(/💬\s*Agent Chat/g, '💬 Chat');
  fs.writeFileSync(minipayPath, content, 'utf8');
  console.log('✓ Updated minipay.html');
}

// 4. Update wallet.html pill button
const walletPath = path.join(hubDir, 'wallet.html');
if (fs.existsSync(walletPath)) {
  let content = fs.readFileSync(walletPath, 'utf8');
  content = content.replace(/💬\s*Agent Chat ↗/g, '💬 Chat ↗');
  fs.writeFileSync(walletPath, content, 'utf8');
  console.log('✓ Updated wallet.html');
}

// 5. Update faq.html inline text
const faqPath = path.join(hubDir, 'faq.html');
if (fs.existsSync(faqPath)) {
  let content = fs.readFileSync(faqPath, 'utf8');
  content = content.replace(/>Agent Chat<\/a>/g, '>Chat</a>');
  fs.writeFileSync(faqPath, content, 'utf8');
  console.log('✓ Updated faq.html');
}

// 6. Update claim.html button
const claimPath = path.join(hubDir, 'claim.html');
if (fs.existsSync(claimPath)) {
  let content = fs.readFileSync(claimPath, 'utf8');
  content = content.replace(/title="Open Agent Chat">Agent 💬<\/a>/g, 'title="Open Chat">Chat 💬</a>');
  fs.writeFileSync(claimPath, content, 'utf8');
  console.log('✓ Updated claim.html');
}

// 7. Update about.html button
const aboutPath = path.join(hubDir, 'about.html');
if (fs.existsSync(aboutPath)) {
  let content = fs.readFileSync(aboutPath, 'utf8');
  content = content.replace(/💬\s*Launch Agent Chat/g, '💬 Launch Chat');
  fs.writeFileSync(aboutPath, content, 'utf8');
  console.log('✓ Updated about.html');
}
