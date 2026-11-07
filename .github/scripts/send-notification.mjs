const apiKey = process.env.RESEND_API_KEY;
const recipient = process.env.NOTIFICATION_EMAIL;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

const jobStatus = process.env.JOB_STATUS || 'success';
const commitMsg = process.env.COMMIT_MESSAGE || 'No commit message';
const commitSha = process.env.COMMIT_SHA ? process.env.COMMIT_SHA.slice(0, 7) : 'unknown';
const actor = process.env.ACTOR || 'unknown';
const repo = process.env.REPO || 'northstar-it-services';
const runId = process.env.RUN_ID || '';
const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
const liveUrl = process.env.LIVE_URL || 'https://northstar-it-services.frizqon.workers.dev';

const isSuccess = jobStatus.toLowerCase() === 'success';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

async function sendResend() {
  if (!apiKey || !recipient) {
    console.log('RESEND_API_KEY or NOTIFICATION_EMAIL is not set. Skipping email notification.');
    return;
  }

  const safeCommitMsg = escapeHtml(commitMsg);
  const safeActor = escapeHtml(actor);
  const safeLiveUrl = escapeHtml(liveUrl);
  const safeRunUrl = escapeHtml(runUrl);

  const subject = isSuccess
    ? `✅ [Deploy Success] Northstar IT Services (${commitSha})`
    : `❌ [Deploy Failed] Northstar IT Services (${commitSha})`;

  const statusColor = isSuccess ? '#baf478' : '#f87171';
  const statusBg = isSuccess ? '#1b2a22' : '#2d1818';
  const statusBadge = isSuccess ? 'DEPLOY SUCCESSFUL' : 'DEPLOY FAILED';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c1514; color: #ecf0e9; padding: 24px; margin: 0; }
    .card { background: #17221d; border: 1px solid #2a3d34; border-radius: 8px; max-width: 580px; margin: 0 auto; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}40; margin-bottom: 16px; }
    h2 { margin: 0 0 14px; font-size: 22px; color: #ecf0e9; }
    p { color: #a5b0a7; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #22332a; }
    .info-table td.label { color: #7f8f84; width: 120px; font-weight: 500; }
    .info-table td.value { color: #dbe5db; font-family: monospace; }
    .actions { margin-top: 24px; padding-top: 18px; border-top: 1px solid #22332a; }
    .btn { display: inline-block; padding: 10px 18px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 600; margin-right: 10px; margin-bottom: 8px; }
    .btn-live { background: #baf478; color: #0c1514; }
    .btn-run { background: #22332a; color: #dbe5db; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${statusBadge}</div>
    <h2>Northstar IT Services — Deployment</h2>
    <p>Pemberitahuan otomatis dari GitHub Actions setelah pembaruan cabang <code>main</code>.</p>
    
    <table class="info-table">
      <tr>
        <td class="label">Status</td>
        <td class="value" style="color: ${statusColor}; font-weight: bold;">${jobStatus.toUpperCase()}</td>
      </tr>
      <tr>
        <td class="label">Commit</td>
        <td class="value">${safeCommitMsg}</td>
      </tr>
      <tr>
        <td class="label">Hash</td>
        <td class="value">${commitSha}</td>
      </tr>
      <tr>
        <td class="label">Pelaksana</td>
        <td class="value">@${safeActor}</td>
      </tr>
    </table>

    <div class="actions">
      <a class="btn btn-live" href="${safeLiveUrl}">↗ Buka Website Live</a>
      <a class="btn btn-run" href="${safeRunUrl}">↗ Lihat Log GitHub Actions</a>
    </div>
  </div>
</body>
</html>
`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Northstar Deploy <onboarding@resend.dev>',
        to: [recipient],
        subject,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Failed to send email via Resend:', data);
    } else {
      console.log('Notification email sent successfully! ID:', data.id);
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

async function sendTelegram() {
  if (!telegramToken || !telegramChatId) {
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured. Skipping Telegram notification.');
    return;
  }

  const statusEmoji = isSuccess ? '🚀' : '❌';
  const statusText = isSuccess ? '<b>SUCCESSFUL</b>' : '<b>FAILED</b>';
  const safeMsg = escapeHtml(commitMsg);
  const safeActor = escapeHtml(actor);
  const safeLiveUrl = escapeHtml(liveUrl);
  const safeRunUrl = escapeHtml(runUrl);

  const text =
    `${statusEmoji} <b>Northstar Deployment Alert</b>\n\n` +
    `• <b>Status:</b> ${statusText}\n` +
    `• <b>Commit:</b> <code>${safeMsg}</code>\n` +
    `• <b>Hash:</b> <code>${commitSha}</code>\n` +
    `• <b>Author:</b> @${safeActor}\n\n` +
    `🌐 <a href="${safeLiveUrl}">Buka Website Live</a>\n` +
    `📋 <a href="${safeRunUrl}">Log GitHub Actions</a>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error('Failed to send Telegram notification:', data);
    } else {
      console.log('Telegram notification sent successfully to group!');
    }
  } catch (err) {
    console.error('Error sending Telegram message:', err);
  }
}

async function main() {
  await Promise.allSettled([sendResend(), sendTelegram()]);
}

main();
