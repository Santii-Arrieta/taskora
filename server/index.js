import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'admin@taskora.webexperiencepro.com';
const SMTP_PASS = process.env.SMTP_PASS || '#Adm1nT4sk0r4#';
const FROM_EMAIL = process.env.FROM_EMAIL || 'admin@taskora.webexperiencepro.com';
const FROM_NAME = process.env.FROM_NAME || 'Taskora';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text, fromEmail, fromName } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing 'to', 'subject' or 'html'" });
    }

    const info = await transporter.sendMail({
      from: `${fromName || FROM_NAME} <${fromEmail || FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`SMTP service running on http://localhost:${PORT}`);
});


