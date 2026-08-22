/**
 * AQWELIA — P0-05: transactional email code paths.
 *
 * Non-production unit coverage for the email library:
 *  - render functions produce valid HTML shells with the expected subject
 *    and content (no SMTP needed);
 *  - escapeHtml prevents user-controlled injection in the rendered HTML;
 *  - sendEmail is a graceful no-op when SMTP is not configured (dev/CI);
 *  - the launch-offer confirmation email renders the two offer variants.
 *
 * No SMTP server is contacted in these tests.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  renderWelcomeEmail,
  renderSubscriptionConfirmationEmail,
  renderTrialEndingEmail,
  renderEarlyAccessNotificationEmail,
  renderCareNotificationEmail,
} from '@/lib/email'
import { renderLaunchOfferConfirmationEmail } from '@/lib/launch-offers/email'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']) {
    delete process.env[key]
  }
})

describe('P0-05 — welcome email', () => {
  it('renders subject + valid HTML shell with the user first name', () => {
    const { subject, html } = renderWelcomeEmail({ userName: 'Alice Martin', userEmail: 'alice@example.com' })
    expect(subject).toBe('Welcome to AQWELIA')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Alice')
    expect(html).not.toContain('Alice Martin') // only first name
  })

  it('omits the name when no userName is provided', () => {
    const { html } = renderWelcomeEmail({ userEmail: 'alice@example.com' })
    expect(html).toContain('Your AQWELIA account is ready')
    expect(html).toContain('Welcome!')
  })
})

describe('P0-05 — subscription confirmation email', () => {
  it('renders the oasis monthly confirmation', () => {
    const { subject, html } = renderSubscriptionConfirmationEmail({ plan: 'oasis', duration: 'month', price: 6.99, currency: 'EUR' })
    expect(subject).toBe('Your AQWELIA Pool subscription is active')
    expect(html).toContain('1 month')
    expect(html).toContain('6.99 EUR')
    expect(html).toContain('AQWELIA Pool')
  })
})

describe('P0-05 — trial ending email', () => {
  it('renders the plan + trial end date', () => {
    const trialEnd = new Date('2026-09-01T00:00:00Z')
    const { subject, html } = renderTrialEndingEmail({ plan: 'oasis', trialEnd })
    expect(subject).toBe('Your AQWELIA Pool trial ends soon')
    expect(html).toContain('Manage my subscription')
    expect(html).toContain('September 1, 2026')
  })

  it('falls back to "in 3 days" without a trial end', () => {
    const { html } = renderTrialEndingEmail({ plan: 'wellness' })
    expect(html).toContain('in 3 days')
  })
})

describe('P0-05 — early access notification email', () => {
  it('renders the Pro lead details', () => {
    const { subject, html } = renderEarlyAccessNotificationEmail({
      companyName: 'AquaPro SARL',
      email: 'contact@aquapro.fr',
      phone: '+33612345678',
      poolCount: 12,
    })
    expect(subject).toBe('New Pro lead — AquaPro SARL')
    expect(html).toContain('AquaPro SARL')
    expect(html).toContain('contact@aquapro.fr')
    expect(html).toContain('+33612345678')
    expect(html).toContain('12')
  })

  it('escapes HTML in the company name and message', () => {
    const { html } = renderEarlyAccessNotificationEmail({
      companyName: '<b>Acme</b>',
      email: 'a@b.fr',
      message: '<script>alert(1)</script>',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;Acme&lt;/b&gt;')
  })
})

describe('P0-05 — care notification email', () => {
  it('renders the care lead details', () => {
    const { subject, html } = renderCareNotificationEmail({ email: 'care@example.com' })
    expect(subject).toBe('New AQWELIA Care lead — care@example.com')
    expect(html).toContain('care@example.com')
    expect(html).toContain('launches')
  })
})

describe('P0-05 — sendEmail graceful no-op without SMTP', () => {
  it('returns smtp-not-configured and logs when SMTP env is absent', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { sendEmail } = await import('@/lib/email')
    const result = await sendEmail({ to: 'x@example.com', subject: 'Test', html: '<p>Hi</p>' })
    expect(result).toEqual({ ok: false, reason: 'smtp-not-configured' })
    expect(logSpy).toHaveBeenCalled()
  })

  it('isEmailConfigured is false without SMTP env vars', async () => {
    const { isEmailConfigured } = await import('@/lib/email')
    expect(isEmailConfigured()).toBe(false)
  })

  it('isEmailConfigured is true with all SMTP env vars', async () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_USER = 'user'
    process.env.SMTP_PASS = 'pass'
    const { isEmailConfigured } = await import('@/lib/email')
    expect(isEmailConfigured()).toBe(true)
  })
})

describe('P0-05 — launch offer confirmation email', () => {
  it('renders the LAUNCH50_MONTHLY variant', () => {
    const { subject, html } = renderLaunchOfferConfirmationEmail({
      planId: 'oasis',
      offerCode: 'LAUNCH50_MONTHLY',
      paidMinor: 349,
      renewalMinor: 699,
      renewalPeriod: 'P1M',
    })
    expect(subject).toBe('Your Pool launch offer is active')
    expect(html).toContain('-50% for the first period')
    expect(html).toContain('3,49 €')
    expect(html).toContain('6,99 €')
    expect(html).toContain('/ month')
  })

  it('renders the LAUNCH3FOR2_QUARTERLY variant', () => {
    const { html } = renderLaunchOfferConfirmationEmail({
      planId: 'oasis',
      offerCode: 'LAUNCH3FOR2_QUARTERLY',
      paidMinor: 1398,
      renewalMinor: 1999,
      renewalPeriod: 'P3M',
    })
    expect(html).toContain('3 months for the price of 2')
    expect(html).toContain('13,98 €')
    expect(html).toContain('19,99 €')
    expect(html).toContain('/ quarter')
  })
})
