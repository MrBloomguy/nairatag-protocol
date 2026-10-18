const http = require('http');

const urls = ['/claim', '/agent', '/wallet', '/swap', '/explorer', '/launches', '/bridge', '/about', '/docs', '/faq'];

urls.forEach(u => {
  http.get('http://127.0.0.1:8088' + u, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const hasSidebar = body.includes('class="app-sidebar"') && body.includes('id="sidebar-toggle-btn"');
      const hasHeader = body.includes('class="app-header"') && body.includes('id="header-wallet-btn"');
      const hasBrand = body.includes('₦TAG AGENT');
      const hasHubLinks = body.includes('href="/hub/');
      console.log(u.padEnd(12), `Status: ${res.statusCode} | Sidebar: ${hasSidebar} | Header: ${hasHeader} | Brand: ${hasBrand} | Has /hub/ links: ${hasHubLinks}`);
    });
  });
});
