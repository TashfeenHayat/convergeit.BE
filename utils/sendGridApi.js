const https = require('https');

const parseEmails = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/** Supports "email@x.com" or "Display Name <email@x.com>" */
const parseFrom = (from) => {
  const s = String(from || '').trim();
  const m = s.match(/<([^>]+)>/);
  if (m) {
    const email = m[1].trim();
    const name = s.replace(m[0], '').trim().replace(/^["']|["']$/g, '');
    return name ? { email, name } : { email };
  }
  return { email: s };
};

const sendViaSendGridApi = async ({
  apiKey,
  from,
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  attachments,
}) => {
  const normalizeList = (arr) => (arr || []).map((v) => String(v).trim()).filter(Boolean);

  const uniqueAcrossToCcBcc = ({ to: toIn, cc: ccIn, bcc: bccIn }) => {
    const toList = [];
    const toSet = new Set();

    for (const email of normalizeList(toIn)) {
      const key = email.toLowerCase();
      if (toSet.has(key)) continue;
      toSet.add(key);
      toList.push(email);
    }

    const ccList = [];
    const ccSet = new Set();
    for (const email of normalizeList(ccIn)) {
      const key = email.toLowerCase();
      if (toSet.has(key) || ccSet.has(key)) continue;
      ccSet.add(key);
      ccList.push(email);
    }

    const bccList = [];
    const bccSet = new Set();
    for (const email of normalizeList(bccIn)) {
      const key = email.toLowerCase();
      if (toSet.has(key) || ccSet.has(key) || bccSet.has(key)) continue;
      bccSet.add(key);
      bccList.push(email);
    }

    return { to: toList, cc: ccList, bcc: bccList };
  };

  const recipients = uniqueAcrossToCcBcc({ to, cc, bcc });

  if (!recipients.to.length) {
    throw new Error('SendGrid: at least one "to" recipient is required');
  }

  const content = [];
  if (text) content.push({ type: 'text/plain', value: text });
  if (html) content.push({ type: 'text/html', value: html });
  if (content.length === 0) content.push({ type: 'text/plain', value: '' });

  const payload = {
    personalizations: [
      {
        to: recipients.to.map((email) => ({ email })),
        subject,
        ...(recipients.cc.length ? { cc: recipients.cc.map((email) => ({ email })) } : {}),
        ...(recipients.bcc.length ? { bcc: recipients.bcc.map((email) => ({ email })) } : {}),
      },
    ],
    from: parseFrom(from),
    content,
  };

  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      content: a.content,
      filename: a.filename,
      type: a.type || 'application/octet-stream',
      disposition: 'attachment',
    }));
  }

  const body = JSON.stringify(payload);

  const options = {
    hostname: 'api.sendgrid.com',
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`SendGrid API failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

module.exports = { parseEmails, parseFrom, sendViaSendGridApi };
