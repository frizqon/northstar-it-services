const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

const jobStatus = process.env.JOB_STATUS || 'unknown';
const prNumber = process.env.PR_NUMBER || '';
const prTitle = process.env.PR_TITLE || 'No pull request title';
const actor = process.env.ACTOR || 'unknown';
const repo = process.env.REPO || 'northstar-it-services';
const runId = process.env.RUN_ID || '';
const headSha = process.env.HEAD_SHA ? process.env.HEAD_SHA.slice(0, 7) : 'unknown';
const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
const prUrl = prNumber ? `https://github.com/${repo}/pull/${prNumber}` : '';

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

async function sendTelegram() {
  if (!telegramToken || !telegramChatId) {
    console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured. Skipping CI notification.');
    return;
  }

  const statusEmoji = isSuccess ? '✅' : '🚨';
  const statusLabel = isSuccess ? 'CI PASSED' : 'CI FAILED';
  const safeTitle = escapeHtml(prTitle);
  const safeActor = escapeHtml(actor);
  const safeRunUrl = escapeHtml(runUrl);
  const safePrUrl = escapeHtml(prUrl);

  const lines = [
    `${statusEmoji} <b>${statusLabel}</b> — Northstar IT Services`,
    `👤 @${safeActor}`,
    '',
    `• <b>PR:</b> #${escapeHtml(prNumber)} — ${safeTitle}`,
    `• <b>Commit:</b> <code>${escapeHtml(headSha)}</code>`,
    '',
    `📋 <a href="${safeRunUrl}">Log CI</a>`
  ];

  if (safePrUrl) {
    lines.push(`🔀 <a href="${safePrUrl}">Pull Request</a>`);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error('Failed to send CI Telegram notification:', data);
    } else {
      console.log('CI Telegram notification sent successfully.');
    }
  } catch (err) {
    console.error('Error sending CI Telegram message:', err);
  }
}

sendTelegram();
