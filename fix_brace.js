const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');
const lines = content.split('\n');
if (lines[621].trim() === '}') {
  lines.splice(621, 1);
  fs.writeFileSync('backend/server.js', lines.join('\n'), 'utf8');
  console.log('Removed line 622');
} else {
  console.log('Line 622 is not just }, it is: ' + lines[621]);
}
