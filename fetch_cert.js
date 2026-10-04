const tls = require('tls');
const fs = require('fs');
const socket = tls.connect(6543, 'aws-0-ap-northeast-2.pooler.supabase.com', { rejectUnauthorized: false }, () => {
  const cert = socket.getPeerCertificate(true);
  let current = cert;
  let caPem = '';
  while (current) {
    if (current.raw) {
      const b64 = current.raw.toString('base64');
      caPem += '-----BEGIN CERTIFICATE-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
    }
    if (current.issuerCertificate && current.issuerCertificate !== current) {
      current = current.issuerCertificate;
    } else {
      break;
    }
  }
  fs.writeFileSync('supabase-ca.pem', caPem);
  console.log('Saved CA to supabase-ca.pem');
  socket.end();
});
