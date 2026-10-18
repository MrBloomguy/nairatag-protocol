const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');
const body = fs.readFileSync('body.html', 'utf8');
const page = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>TagProtocol Scan - Block Explorer Chain 901</title>\n    <meta name="description" content="Real-time block explorer for TagProtocol Network Chain 901">\n    <style>\n@font-face {\n  font-family: \'Poppins Rounded\';\n  src: url(\'/hub/PoppinsRounded-Rounded.ttf\') format(\'truetype\');\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: swap;\n}\n' + css + '</style>\n</head>\n<body>' + body + '\n</body>\n</html>';
fs.writeFileSync('index.html', page, 'utf8');
console.log('Generated index.html, ' + page.length + ' bytes');
