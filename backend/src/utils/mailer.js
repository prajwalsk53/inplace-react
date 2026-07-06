const nodemailer = require('nodemailer');

const MAIL_HOST = process.env.SMTP_HOST || '';
const MAIL_PORT = +(process.env.SMTP_PORT || 587);
const MAIL_USER = process.env.SMTP_USER || '';
const MAIL_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.SMTP_FROM || `InPlace <${MAIL_USER}>`;
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5175';

const transporter = MAIL_HOST
  ? nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_PORT === 465,
      auth: MAIL_USER ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
    })
  : null;

async function sendEmail(toEmail, toName, subject, html) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping email to ${toEmail}: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: MAIL_FROM, to: `${toName} <${toEmail}>`, subject, html });
    return true;
  } catch (err) {
    console.error('InPlace Mail: send failed —', err.message);
    return false;
  }
}

function mailTemplate(title, body, ctaLabel = '', ctaUrl = '') {
  const cta = ctaLabel
    ? `<div style="text-align:center;margin:28px 0;"><a href="${ctaUrl}" style="background:#0F4C81;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${ctaLabel}</a></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:Segoe UI,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#0A2540;border-radius:12px 12px 0 0;padding:24px 32px;">
        <div style="font-size:20px;font-weight:800;color:#fff;">InPlace</div>
        <div style="font-size:11px;color:rgba(255,255,255,.65);letter-spacing:1px;text-transform:uppercase;">Placement Management</div>
        <h1 style="margin:16px 0 0;font-size:20px;font-weight:700;color:#fff;">${title}</h1>
      </td></tr>
      <tr><td style="background:#fff;padding:32px;">
        ${body}
        ${cta}
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
        <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">
          This email was sent by InPlace. Do not reply to this email.<br>
          <a href="${APP_URL}" style="color:#0F4C81;">${APP_URL}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const p = (text) => `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px;">${text}</p>`;

function mailWelcome(email, name, role) {
  const body = p(`Welcome to InPlace, <strong>${name}</strong>! Your <strong>${role}</strong> account has been created.`)
    + p('Once your account is approved you will be able to sign in and access your dashboard.');
  return sendEmail(email, name, 'Welcome to InPlace', mailTemplate('Welcome to InPlace', body, 'Sign In', `${APP_URL}/login`));
}

function mailAccountApproved(email, name) {
  const body = p(`Good news, <strong>${name}</strong> — your InPlace account has been approved.`)
    + p('You can now sign in using your registered email address and password.');
  return sendEmail(email, name, 'InPlace — Account Approved', mailTemplate('Account Approved', body, 'Sign In', `${APP_URL}/login`));
}

function mailAccountRejected(email, name, reason) {
  const body = p(`We're sorry, <strong>${name}</strong> — your InPlace application was not approved.`)
    + p(`Reason: ${reason || 'Not specified'}`);
  return sendEmail(email, name, 'InPlace — Application Decision', mailTemplate('Application Not Approved', body));
}

function mailOtp(email, name, code) {
  const body = p(`Hi <strong>${name}</strong>, your verification code is:`)
    + `<div style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#0A2540;margin:20px 0;">${code}</div>`
    + p('This code expires in 10 minutes.');
  return sendEmail(email, name, 'InPlace — Verification Code', mailTemplate('Verify Your Email', body));
}

function mailPasswordReset(email, name, resetUrl) {
  const body = p(`Hi <strong>${name}</strong>, a password reset was requested for your InPlace account.`)
    + p('If you did not request this, you can safely ignore this email.');
  return sendEmail(email, name, 'InPlace — Reset Your Password', mailTemplate('Reset Your Password', body, 'Reset Password', resetUrl));
}

function mailProviderConfirm(email, name, placementTitle, studentName, confirmUrl) {
  const body = p(`Hi <strong>${name}</strong>, ${studentName} has been proposed for a placement with your organisation:`)
    + p(`<strong>${placementTitle}</strong>`)
    + p('Please review and confirm or reject this placement using the secure link below. No account or login is required.');
  return sendEmail(email, name, `InPlace — Confirm Placement for ${studentName}`, mailTemplate('Placement Confirmation Requested', body, 'Review Placement', confirmUrl));
}

function mailNewMessage(email, name, senderName, preview) {
  const trimmed = preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;
  const body = p(`You have a new message from <strong>${senderName}</strong>:`)
    + `<div style="background:#F8FAFF;border-radius:8px;padding:14px 16px;margin:14px 0;font-size:14px;color:#374151;border:1px solid #E2E8F0;"><em>"${trimmed}"</em></div>`;
  return sendEmail(email, name, `New Message from ${senderName} — InPlace`, mailTemplate('New Message', body, 'View Message', `${APP_URL}/messages`));
}

function mailVisitScheduled(email, name, scheduledAt, visitType) {
  const body = p(`A placement visit has been scheduled for <strong>${new Date(scheduledAt).toLocaleString('en-GB')}</strong> (${visitType.replace('_', ' ')}).`);
  return sendEmail(email, name, 'InPlace — Visit Scheduled', mailTemplate('Visit Scheduled', body, 'View Details', `${APP_URL}/visits`));
}

function mailPlacementRequestSubmitted(email, name, companyName, roleTitle, startDate, endDate) {
  const body = p(`Your placement request has been successfully submitted, <strong>${name}</strong>. The placement provider has been notified and will review your request shortly.`)
    + `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin:16px 0;">
        <tr><td style="padding:10px 16px;background:#F8FAFF;font-weight:600;width:40%;">Company</td><td style="padding:10px 16px;">${companyName}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:600;">Role</td><td style="padding:10px 16px;">${roleTitle}</td></tr>
        <tr><td style="padding:10px 16px;background:#F8FAFF;font-weight:600;">Start Date</td><td style="padding:10px 16px;">${startDate}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:600;">End Date</td><td style="padding:10px 16px;">${endDate}</td></tr>
      </table>`
    + p('You will receive another email once the provider has reviewed your request. You can also track the status of your placement in your dashboard.');
  return sendEmail(email, name, `InPlace — Your Placement Request at ${companyName} Has Been Submitted`, mailTemplate('Placement Request Submitted', body, 'View My Dashboard', `${APP_URL}/student/dashboard`));
}

function mailChangeRequestSubmitted(email, name, studentName, companyName, changeTypeLabel, justification, proposedDetails) {
  const body = p(`A student has submitted a <strong>change request</strong> for their placement at <strong>${companyName}</strong> and requires your approval before it can proceed.`)
    + `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin:16px 0;">
        <tr><td style="padding:10px 16px;background:#F8FAFF;font-weight:600;width:40%;">Student</td><td style="padding:10px 16px;">${studentName}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:600;">Change Type</td><td style="padding:10px 16px;">${changeTypeLabel}</td></tr>
        <tr><td style="padding:10px 16px;background:#F8FAFF;font-weight:600;">Justification</td><td style="padding:10px 16px;">${justification.replace(/\n/g, '<br>')}</td></tr>
        ${proposedDetails ? `<tr><td style="padding:10px 16px;font-weight:600;">Proposed Details</td><td style="padding:10px 16px;">${proposedDetails.replace(/\n/g, '<br>')}</td></tr>` : ''}
      </table>`;
  return sendEmail(email, name, `InPlace — Placement Change Request from ${studentName}`, mailTemplate('Placement Change Request', body, 'Review Change Request', `${APP_URL}/tutor/requests`));
}

module.exports = {
  sendEmail, mailTemplate, p,
  mailWelcome, mailAccountApproved, mailAccountRejected,
  mailOtp, mailPasswordReset, mailProviderConfirm, mailNewMessage, mailVisitScheduled,
  mailPlacementRequestSubmitted, mailChangeRequestSubmitted,
};
