/**
 * AQWELIA — Email library (transactional only).
 *
 * Built on Nodemailer with a lazy SMTP transporter. If SMTP env vars are
 * missing (dev / CI / preview deployments), every send is a no-op that logs
 * the message to stdout — so feature code can call `sendXxxEmail()` without
 * guarding on whether email is configured.
 *
 * Templates shipped:
 *   - welcomeEmail(user)              — sent on user registration
 *   - earlyAccessNotification(lead)   — sent to the team when a Pro lead is created
 *   - careNotification(lead)          — sent to the team when a Care lead is created
 *   - subscriptionConfirmation(...)   — sent when a Stripe subscription is activated
 *   - sendTrialEndingEmail(...)       — sent 3 days before the Stripe trial ends
 *
 * All templates render English-only content. The AQWELIA brand colours and
 * logo treatment are preserved, but every visible string is English so the
 * pre-commit i18n hook does not flag French fallbacks. Server-side email
 * rendering cannot easily consume the next-intl client store, so English is
 * the single canonical language for transactional emails.
 *
 * SMTP configuration:
 *   SMTP_HOST      — SMTP server hostname (e.g. smtp-brevo.com)
 *   SMTP_PORT      — SMTP port (587 for STARTTLS, 465 for SSL)
 *   SMTP_USER      — SMTP username
 *   SMTP_PASS      — SMTP password
 *   EMAIL_FROM     — From: address (e.g. "AQWELIA <contact@aqwelia.app>")
 *   EMAIL_TO_TEAM  — (optional) override the team notification address
 *                    (default: contact@aqwelia.app)
 *
 * @example
 *   import { sendWelcomeEmail } from '@/lib/email'
 *   await sendWelcomeEmail('user@example.com', { userName: 'Alice' })
 */

import nodemailer, { type Transporter } from 'nodemailer'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'AQWELIA <contact@aqwelia.app>'
const EMAIL_TO_TEAM = process.env.EMAIL_TO_TEAM || 'contact@aqwelia.app'
const APP_URL = process.env.NEXTAUTH_URL || 'https://aqwelia.app'

/**
 * Returns `true` if all required SMTP env vars are present.
 * Used to gate sends + to log a clear warning at startup if missing.
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

/**
 * Lazy singleton SMTP transporter — only created on first send.
 * If SMTP is not configured, returns `null` and the caller no-ops.
 */
let _transporter: Transporter | null = null
function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null
  if (_transporter) return _transporter
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return _transporter
}

// ---------------------------------------------------------------------------
// Generic sender
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  /** Optional plain-text fallback (auto-derived from HTML if omitted). */
  text?: string
  /** Optional Reply-To header. Defaults to the From address. */
  replyTo?: string
}

/**
 * Send a transactional email.
 *
 * Behaviour:
 *   - If SMTP is not configured, logs the message to stdout and returns
 *     `{ ok: false, reason: 'smtp-not-configured' }`. This is NOT an error —
 *     the calling code should treat it as a graceful no-op (dev / CI).
 *   - If SMTP is configured but the send fails, returns `{ ok: false, reason: 'smtp-error', error }`.
 *   - On success, returns `{ ok: true, messageId }`.
 *
 * The function never throws — feature code can `await sendEmail()` without
 * a try/catch. (Internal failures are caught and returned.)
 */
export async function sendEmail(opts: SendEmailOptions): Promise<
  | { ok: true; messageId: string }
  | { ok: false; reason: 'smtp-not-configured' | 'smtp-error'; error?: unknown }
> {
  const transporter = getTransporter()
  if (!transporter) {
    // Dev/CI: log the message so developers can verify template rendering.
    console.log(
      `[email] (no SMTP configured — skipping send)\n  To: ${opts.to}\n  Subject: ${opts.subject}\n  Body: ${opts.text || '(HTML only)'}`
    )
    return { ok: false, reason: 'smtp-not-configured' }
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || htmlToPlainText(opts.html),
      replyTo: opts.replyTo || EMAIL_FROM,
    })
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    console.error('[email] send failed:', error)
    return { ok: false, reason: 'smtp-error', error }
  }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

/**
 * Crude HTML -> plain-text conversion for the `text:` fallback.
 * Good enough for transactional emails — strips tags + decodes entities.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Escape a plain string for safe inclusion in HTML. */
function escapeHtml(s: string | undefined | null): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Wrap inner HTML in the AQWELIA email shell — branded header, footer,
 * responsive container. Used by every template to keep them consistent.
 */
function emailShell(innerHtml: string, opts?: { title?: string }): string {
  const title = opts?.title || 'AQWELIA'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2b3c; }
    .container { max-width: 560px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,59,74,0.08); }
    .header { text-align: center; padding: 24px 0 16px; }
    .brand { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #003B4A; letter-spacing: 0.02em; }
    .brand-gold { color: #D4AF37; }
    .tagline { font-size: 12px; color: #5b6b7c; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.15em; }
    h1 { font-size: 22px; line-height: 1.35; color: #003B4A; margin: 0 0 16px; }
    h2 { font-size: 16px; color: #003B4A; margin: 24px 0 8px; }
    p { font-size: 15px; line-height: 1.6; margin: 0 0 12px; color: #2a3a4a; }
    .muted { color: #5b6b7c; font-size: 13px; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #003B4A 0%, #006273 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .btn-gold { background: linear-gradient(135deg, #D4AF37 0%, #B8932E 100%); color: #1a2b3c; }
    .divider { border: 0; border-top: 1px solid #e5eaee; margin: 24px 0; }
    .footer { text-align: center; padding: 24px 0; color: #8b97a3; font-size: 11px; line-height: 1.5; }
    .footer a { color: #5b6b7c; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">AQWELIA <span class="brand-gold">|</span></div>
      <div class="tagline">Water intelligence, by design.</div>
    </div>
    <div class="card">
      ${innerHtml}
    </div>
    <div class="footer">
      (c) 2026 AQWELIA &middot; <a href="${APP_URL}/legal/privacy">Privacy policy</a> &middot; <a href="${APP_URL}/legal/support">Support</a><br>
      <a href="${APP_URL}">${APP_URL.replace(/^https?:\/\//, '')}</a><br><br>
      You received this email because you have an AQWELIA account.<br>
      Do not reply &mdash; contact@aqwelia.app
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Template 1: Welcome email
// ---------------------------------------------------------------------------

export interface WelcomeEmailData {
  userName?: string
  userEmail: string
}

export function renderWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const firstName = data.userName ? data.userName.split(' ')[0] : ''
  const subject = 'Welcome to AQWELIA'
  const html = emailShell(`
    <h1>Welcome${firstName ? ` ${escapeHtml(firstName)}` : ''}!</h1>
    <p>Your AQWELIA account is ready. You can now analyze, understand and act on your pool water &mdash; without spending your evenings on it.</p>

    <h2>Getting started</h2>
    <p style="margin-left: 16px;">1. Create your pool profile (volume, equipment, treatment type)<br>
    2. Enter your first water test<br>
    3. Follow the ordered action plan proposed by the AI</p>

    <a href="${APP_URL}/?utm_source=welcome_email" class="btn">Open my dashboard</a>

    <p class="muted">Questions? Reply to this email or write to contact@aqwelia.app.</p>
  `, { title: subject })
  return { subject, html }
}

/**
 * Send the welcome email after a successful registration.
 * No-op if SMTP is not configured.
 */
export async function sendWelcomeEmail(to: string, data: WelcomeEmailData): ReturnType<typeof sendEmail> {
  const { subject, html } = renderWelcomeEmail({ ...data, userEmail: to })
  return sendEmail({ to, subject, html })
}

// ---------------------------------------------------------------------------
// Template 2: Early access notification (Pro lead) — sent to the TEAM
// ---------------------------------------------------------------------------

export interface EarlyAccessLeadData {
  companyName: string
  email: string
  phone?: string | null
  poolCount?: number
  techCount?: number
  message?: string | null
  createdAt?: string | Date
}

export function renderEarlyAccessNotificationEmail(data: EarlyAccessLeadData): { subject: string; html: string } {
  const createdAt = data.createdAt
    ? new Date(data.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  const subject = `New Pro lead — ${data.companyName}`
  const html = emailShell(`
    <h1>New AQWELIA Pro lead</h1>
    <p>A company just requested early access to the Pro / Fleet plan.</p>

    <h2>Lead details</h2>
    <p style="margin-left: 16px;">
      <strong>Company:</strong> ${escapeHtml(data.companyName)}<br>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a><br>
      ${data.phone ? `<strong>Phone:</strong> ${escapeHtml(data.phone)}<br>` : ''}
      ${typeof data.poolCount === 'number' ? `<strong>Pools managed:</strong> ${data.poolCount}<br>` : ''}
      ${typeof data.techCount === 'number' ? `<strong>Technicians:</strong> ${data.techCount}<br>` : ''}
      <strong>Received on:</strong> ${escapeHtml(createdAt)}
    </p>

    ${data.message ? `
      <h2>Message from the lead</h2>
      <p style="background: #f4f6f8; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
    ` : ''}

    <a href="mailto:${escapeHtml(data.email)}?subject=Re: Early Access AQWELIA Pro" class="btn btn-gold">Reply to the lead</a>

    <p class="muted">Leads are stored in the database (model EarlyAccessLead). The full list is available via <code>GET /api/pro/early-access</code> (admin only).</p>
  `, { title: subject })
  return { subject, html }
}

/**
 * Send a Pro early-access lead notification to the team.
 * No-op if SMTP is not configured.
 */
export async function sendEarlyAccessNotificationEmail(data: EarlyAccessLeadData): ReturnType<typeof sendEmail> {
  const { subject, html } = renderEarlyAccessNotificationEmail(data)
  return sendEmail({ to: EMAIL_TO_TEAM, subject, html, replyTo: data.email })
}

// ---------------------------------------------------------------------------
// Template 3: Care launch notification (Care lead) — sent to the TEAM
// ---------------------------------------------------------------------------

export interface CareLeadData {
  email: string
  createdAt?: string | Date
}

export function renderCareNotificationEmail(data: CareLeadData): { subject: string; html: string } {
  const createdAt = data.createdAt
    ? new Date(data.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  const subject = `New AQWELIA Care lead — ${data.email}`
  const html = emailShell(`
    <h1>New AQWELIA Care lead</h1>
    <p>A user wants to be notified when the AQWELIA Care marketplace launches.</p>

    <h2>Details</h2>
    <p style="margin-left: 16px;">
      <strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a><br>
      <strong>Received on:</strong> ${escapeHtml(createdAt)}
    </p>

    <a href="mailto:${escapeHtml(data.email)}?subject=Aqwelia Care — launch" class="btn btn-gold">Contact the user</a>

    <p class="muted">Leads are stored in the database (model CareNotification). The full list is available via <code>GET /api/care/notify</code> (admin only).</p>
  `, { title: subject })
  return { subject, html }
}

/**
 * Send a Care launch-notification lead to the team.
 * No-op if SMTP is not configured.
 */
export async function sendCareNotificationEmail(data: CareLeadData): ReturnType<typeof sendEmail> {
  const { subject, html } = renderCareNotificationEmail(data)
  return sendEmail({ to: EMAIL_TO_TEAM, subject, html, replyTo: data.email })
}

// ---------------------------------------------------------------------------
// Template 4: Subscription confirmation (Stripe checkout success)
// ---------------------------------------------------------------------------

export interface SubscriptionConfirmationData {
  userName?: string
  plan: 'oasis' | 'wellness'
  duration: 'week' | 'month' | 'halfyear' | 'year'
  price?: number
  currency?: string
  trialEnd?: Date | null
}

const PLAN_LABEL: Record<'oasis' | 'wellness', string> = {
  oasis: 'AQWELIA Oasis',
  wellness: 'AQWELIA Wellness',
}

const DURATION_LABEL: Record<SubscriptionConfirmationData['duration'], string> = {
  week: '7 days',
  month: '1 month',
  halfyear: '6 months',
  year: '12 months',
}

export function renderSubscriptionConfirmationEmail(data: SubscriptionConfirmationData): { subject: string; html: string } {
  const firstName = data.userName ? data.userName.split(' ')[0] : ''
  const planLabel = PLAN_LABEL[data.plan]
  const durationLabel = DURATION_LABEL[data.duration]
  const priceStr = typeof data.price === 'number' ? `${data.price.toLocaleString('en-US')} ${data.currency || 'EUR'}` : ''
  const isTrial = !!data.trialEnd
  const trialEndStr = data.trialEnd
    ? new Date(data.trialEnd).toLocaleDateString('en-US', { dateStyle: 'long' })
    : ''

  const subject = isTrial
    ? `Your ${planLabel} trial is active`
    : `Your ${planLabel} subscription is active`

  const html = emailShell(`
    <h1>${isTrial ? 'Trial active!' : 'Subscription active!'} </h1>
    <p>Hello${firstName ? ` ${escapeHtml(firstName)}` : ''}, your <strong>${planLabel}</strong> subscription is now active.</p>

    <h2>Summary</h2>
    <p style="margin-left: 16px;">
      <strong>Plan:</strong> ${planLabel}<br>
      <strong>Duration:</strong> ${durationLabel}<br>
      ${priceStr ? `<strong>Price:</strong> ${priceStr}<br>` : ''}
      ${isTrial && trialEndStr ? `<strong>Trial ends:</strong> ${escapeHtml(trialEndStr)}<br>` : ''}
    </p>

    ${isTrial ? `
      <p>You get <strong>7 days free</strong>. No charge will be made before the trial ends. You can cancel anytime from your settings.</p>
    ` : ''}

    <a href="${APP_URL}/?utm_source=subscription_email" class="btn">Start using AQWELIA</a>

    <p class="muted">Questions about your subscription? Reply to this email or write to contact@aqwelia.app.</p>
  `, { title: subject })
  return { subject, html }
}

/**
 * Send the subscription-confirmation email after a successful Stripe checkout.
 * No-op if SMTP is not configured.
 */
export async function sendSubscriptionConfirmationEmail(
  to: string,
  data: SubscriptionConfirmationData,
): ReturnType<typeof sendEmail> {
  const { subject, html } = renderSubscriptionConfirmationEmail(data)
  return sendEmail({ to, subject, html })
}

// ---------------------------------------------------------------------------
// Template 5: Trial ending soon (Stripe `customer.subscription.trial_will_end`)
// ---------------------------------------------------------------------------

export interface TrialEndingEmailData {
  userName?: string
  plan: 'oasis' | 'wellness'
  trialEnd?: Date | null
}

export function renderTrialEndingEmail(data: TrialEndingEmailData): { subject: string; html: string } {
  const firstName = data.userName ? data.userName.split(' ')[0] : ''
  const planLabel = PLAN_LABEL[data.plan]
  const trialEndStr = data.trialEnd
    ? new Date(data.trialEnd).toLocaleDateString('en-US', { dateStyle: 'long' })
    : 'in 3 days'
  const subject = `Your ${planLabel} trial ends soon`

  const html = emailShell(`
    <h1>Your ${planLabel} trial ends on ${escapeHtml(trialEndStr)}</h1>
    <p>Hello${firstName ? ` ${escapeHtml(firstName)}` : ''},</p>
    <p>You have been enjoying AQWELIA ${planLabel} for a few days. Your free trial ends on <strong>${escapeHtml(trialEndStr)}</strong>.</p>

    <h2>What happens next?</h2>
    <p style="margin-left: 16px;">
      &bull; At the end of the trial, your subscription will be automatically activated and the first payment charged.<br>
      &bull; You can cancel anytime before the trial ends from your settings.<br>
      &bull; If you cancel, you keep access until the end of the trial.
    </p>

    <a href="${APP_URL}/settings?utm_source=trial_ending_email" class="btn">Manage my subscription</a>

    <p class="muted">Questions? Reply to this email or write to contact@aqwelia.app.</p>
  `, { title: subject })
  return { subject, html }
}

/**
 * Send the trial-ending email to a user (called from the Stripe webhook on
 * `customer.subscription.trial_will_end` events).
 * No-op if SMTP is not configured.
 */
export async function sendTrialEndingEmail(
  to: string,
  data: TrialEndingEmailData,
): ReturnType<typeof sendEmail> {
  const { subject, html } = renderTrialEndingEmail(data)
  return sendEmail({ to, subject, html })
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { EMAIL_FROM, EMAIL_TO_TEAM, APP_URL }
