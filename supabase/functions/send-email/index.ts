import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_URL = 'https://api.resend.com/emails'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingInfo {
  booking_code: string
  customer_name: string
  customer_email: string
  slot_date: string     // YYYY-MM-DD
  slot_time: string     // HH:MM
  location?: string
  package_name?: string
  package_price?: number
  pax_count?: number
  gallery_url?: string
  photographer_name?: string
  photographer_slug?: string
}

type EmailPayload =
  | { type: 'greeting'; to: string; name: string }
  | { type: 'booking_confirmation'; booking: BookingInfo }
  | { type: 'status_change'; booking: BookingInfo; to_status: string; note?: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`
}

// ─── Base HTML layout ─────────────────────────────────────────────────────────

function baseLayout(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${previewText}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#0284c7;border-radius:16px;padding:14px 24px;">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Fotokonvo</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;">
      ${content}
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      © ${new Date().getFullYear()} Fotokonvo · Photography Booking Platform
    </p>
  </div>
</body>
</html>`
}

function infoRow(label: string, value: string): string {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <span style="color:#64748b;font-size:14px;min-width:120px;">${label}</span>
      <span style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${value}</span>
    </div>`
}

function primaryButton(text: string, href: string): string {
  return `
    <div style="text-align:center;margin-top:24px;">
      <a href="${href}" style="display:inline-block;background:#0284c7;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">${text}</a>
    </div>`
}

// ─── Email templates ──────────────────────────────────────────────────────────

function greetingEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  const html = baseLayout(`
    <div style="padding:32px;">
      <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 8px;">Welcome to Fotokonvo, ${firstName}! 📷</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Your photographer account is ready. Let's get your booking page set up!</p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#0369a1;font-size:15px;font-weight:600;margin:0 0 12px;">Here's how to get started:</h2>
        <div style="color:#0c4a6e;font-size:14px;line-height:1.8;">
          <div>1. Complete your <strong>photographer profile</strong> — add your bio and display photo</div>
          <div>2. Set up your <strong>packages</strong> — define your session types and pricing</div>
          <div>3. Configure your <strong>availability</strong> — set the days and hours you're open</div>
          <div>4. Share your <strong>booking link</strong> with students!</div>
        </div>
      </div>

      <p style="color:#64748b;font-size:14px;margin:0 0 4px;">If you have any questions, just reply to this email — we're happy to help.</p>
      <p style="color:#0f172a;font-size:14px;font-weight:600;">Welcome aboard, ${firstName}. Let's capture some memories. 🎞️</p>
    </div>
  `, `Welcome to Fotokonvo, ${firstName}!`)

  return {
    subject: `Welcome to Fotokonvo, ${firstName}! 🎓`,
    html,
  }
}

function bookingConfirmationEmail(b: BookingInfo): { subject: string; html: string } {
  const trackingUrl = `${Deno.env.get('APP_URL') ?? 'https://fotokonvo.com'}/booking/${b.booking_code}`

  const html = baseLayout(`
    <div style="background:#0284c7;padding:24px 32px;">
      <p style="color:#bae6fd;font-size:13px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Booking Received</p>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">${b.booking_code}</h1>
    </div>

    <div style="padding:24px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hi <strong>${b.customer_name}</strong>, your booking has been received! We'll be in touch to confirm your session.</p>

      <div style="margin-bottom:24px;">
        ${b.package_name ? infoRow('Package', `${b.package_name}${b.package_price ? ' — ' + formatCurrency(b.package_price) : ''}`) : ''}
        ${infoRow('Date', formatDate(b.slot_date))}
        ${infoRow('Time', formatTime(b.slot_time))}
        ${b.location ? infoRow('Location', b.location) : ''}
        ${b.pax_count ? infoRow('People', `${b.pax_count} pax`) : ''}
        ${b.photographer_name ? infoRow('Photographer', b.photographer_name) : ''}
      </div>

      ${primaryButton('Track Booking', trackingUrl)}
    </div>
  `, `Booking ${b.booking_code} received`)

  return {
    subject: `Booking Received — ${b.booking_code}`,
    html,
  }
}

function statusChangeEmail(b: BookingInfo, toStatus: string): { subject: string; html: string } {
  const trackingUrl = `${Deno.env.get('APP_URL') ?? 'https://fotokonvo.com'}/booking/${b.booking_code}`

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string; body: string }> = {
    CONFIRMED: {
      label: 'Booking Confirmed',
      color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅',
      body: 'Great news! Your payment has been received and your booking is now confirmed. We look forward to seeing you!',
    },
    RESCHEDULED: {
      label: 'Booking Rescheduled',
      color: '#9a3412', bg: '#fff7ed', border: '#fed7aa', icon: '📅',
      body: 'Your booking has been rescheduled. Please review the updated session details below.',
    },
    CANCELLED: {
      label: 'Booking Cancelled',
      color: '#991b1b', bg: '#fef2f2', border: '#fecaca', icon: '❌',
      body: 'Your booking has been cancelled. If you believe this is a mistake or need to rebook, please contact us.',
    },
    COMPLETED: {
      label: 'Session Completed',
      color: '#0c4a6e', bg: '#f0f9ff', border: '#bae6fd', icon: '🎉',
      body: 'Your session has been marked as completed! Your photos are being prepared. We\'ll notify you once your gallery is ready.',
    },
    DELIVERED: {
      label: 'Gallery Delivered',
      color: '#134e4a', bg: '#f0fdfa', border: '#99f6e4', icon: '📸',
      body: 'Your photos are ready! Click the button below to access your gallery.',
    },
  }

  const cfg = statusConfig[toStatus] ?? {
    label: `Status: ${toStatus}`,
    color: '#374151', bg: '#f9fafb', border: '#e5e7eb', icon: 'ℹ️',
    body: 'Your booking status has been updated.',
  }

  const html = baseLayout(`
    <div style="background:${cfg.bg};border-bottom:1px solid ${cfg.border};padding:24px 32px;">
      <p style="color:${cfg.color};font-size:28px;margin:0 0 4px;">${cfg.icon}</p>
      <h1 style="color:${cfg.color};font-size:20px;font-weight:700;margin:0;">${cfg.label}</h1>
    </div>

    <div style="padding:24px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hi <strong>${b.customer_name}</strong>, ${cfg.body}</p>

      <div style="margin-bottom:20px;">
        ${infoRow('Booking', b.booking_code)}
        ${infoRow('Date', formatDate(b.slot_date))}
        ${infoRow('Time', formatTime(b.slot_time))}
        ${b.location ? infoRow('Location', b.location) : ''}
        ${b.photographer_name ? infoRow('Photographer', b.photographer_name) : ''}
      </div>

      ${toStatus === 'DELIVERED' && b.gallery_url ? primaryButton('View My Photos 📸', b.gallery_url) : primaryButton('Track Booking', trackingUrl)}
    </div>
  `, cfg.label)

  return {
    subject: `${cfg.icon} ${cfg.label} — ${b.booking_code}`,
    html,
  }
}

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendViaResend(to: string, subject: string, html: string, fromName = 'Fotokonvo'): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@fotokonvo.com'

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as EmailPayload

    let subject: string
    let html: string
    let to: string

    if (payload.type === 'greeting') {
      to = payload.to
      ;({ subject, html } = greetingEmail(payload.name))
    } else if (payload.type === 'booking_confirmation') {
      to = payload.booking.customer_email
      ;({ subject, html } = bookingConfirmationEmail(payload.booking))
    } else if (payload.type === 'status_change') {
      to = payload.booking.customer_email
      ;({ subject, html } = statusChangeEmail(payload.booking, payload.to_status))
    } else {
      return new Response(JSON.stringify({ error: 'Unknown email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await sendViaResend(to, subject, html)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
