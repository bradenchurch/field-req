# FieldReq — SMS Material Outreach Agent

## Problem
Taylor (co-owner, commercial plumbing, 20-30 guys, 3-5 projects, 2 branches in same state) spends several hours/week chasing field workers for material requests. Workers procrastinate — "we're good" on Friday, "can't work until we have XYZ" on Monday.

## Solution
An SMS-based outreach agent that replaces Taylor's chasing. Workers reply to texts (no app install). Taylor gets a consolidated email Friday afternoon. Zero friction.

## V1 Scope

### Worker Flow
- Workers text JOIN to opt in
- Thu 3pm: Agent texts each worker per project with guided questions (categories defined by Taylor)
- Fri 10am: Agent nudges non-responders
- Workers reply anytime with materials needed
- Workers can add more items after replying

### Taylor Flow  
- **Setup**: Text-based onboarding (company name → categories → workers → projects)
- **Management**: Natural language SMS ("Move Mike to Pearson", "Status on Pioneer", "Approve Pearson")
- **Friday summary**: Email with consolidated material list per project
- **Dashboard**: Web (link in email footer) for history/editing — optional, secondary

### Agent Features
- Customizable check-in categories (Taylor-defined, changeable anytime)
- Per-project custom questions (recurring or one-time)
- Weekly auto-reset (Sunday)
- Non-responder flagging
- Opt-in tracking (who joined, who hasn't)
- "Mark ordered" after approval, then quiet until next cycle

## Architecture

### Stack
- **SMS**: Twilio — worker outreach + replies, Taylor alerts
- **Email**: Resend — Friday consolidated summaries (100/day free, 4 emails/month = $0)
- **Backend**: Express.js on Vercel serverless
- **Database**: Supabase (shared project, schema `field_req`)
- **AI**: Gemini — parse worker replies, generate summaries, chat with Taylor
- **Cron**: node-cron (in Express) or Vercel cron — Thu 3pm, Fri 10am, Fri 3pm, Sun 12am
- **Dashboard**: React + Vite (minimal, link in email footer)

| Layer | Channel | When |
|-------|---------|------|
| Worker outreach | SMS (Twilio) | Thu 3pm + Fri 10am |
| Worker replies | SMS (Twilio) | Anytime |
| Taylor summary | Email (Resend) | Fri 3pm |
| Taylor management | SMS to agent | Anytime |
| Dashboard | Web (secondary) | Link in email |
| Weekly reset | Auto (cron) | Sunday |

### Database Schema (namespace `field_req` in shared Supabase)

```
organizations:    id, name, created_at
org_members:      id, org_id, phone, email, role(owner/member), created_at
projects:         id, org_id, name, is_active, created_at
workers:          id, org_id, name, phone, opted_in, created_at
assignments:      id, project_id, worker_id
categories:       id, org_id, label, sort_order
requests:         id, project_id, worker_id, period_start, period_end, status
request_items:    id, request_id, category_id, content, created_at
outreach_log:     id, org_id, worker_id, project_id, sent_at, replied_at, status
```

### Cron Schedule
```
Thu 3pm:   For each active project → text assigned workers with categories
Fri 10am:  Check outreach_log → text non-responders with nudge
Fri 3pm:   Generate consolidated email → send to owners via Resend
Sun 12am:  Reset period, clear request states
```

## Cost
- Twilio: $1.15/mo number + $0.008/msg (~$5-6/mo for 600-800 SMS)
- Resend: $0 (100/day free, 4 emails/month used)
- Vercel: $0
- Supabase: shared project ($0 incremental)
- Gemini: ~$0.50/mo
- **Total: ~$6.50/mo**

## Bootstrap Steps
```
bootstrap-project field-req        # Creates Vercel + GitHub + workspace + registry
                                      # Manually: connect to Jules, add secrets
```

## A2P 10DLC Note
Opt-in flow (workers text JOIN) provides explicit consent. May still need A2P 10DLC registration for business SMS — start registration in parallel with build.

## Development Phases

### V1: Taylor's Instance (Prove It Works)
- Manual Twilio number setup (Braden configures)
- No auth — Taylor's instance is the only one
- No payments — free while testing
- No dashboard — everything via SMS/email
- Goal: Taylor uses it for 2+ weeks, proves value

### V2: Multi-Tenant SaaS (Proven → Scale)
Architecture already supports it (`org_id` on every table). V2 adds:

- **Landing page** with signup flow (email → company → area code → Stripe)
- **Stripe**: 7-day free trial, card required, monthly subscription
- **Twilio auto-provisioning**: selects area code, provisions number, configures webhook
- **Per-org agent isolation**: single Twilio webhook routes by inbound number → org context
- **Lightweight dashboard**: per-org account management, billing portal
- **Welcome SMS**: "Your FieldReq number is (555) XXX-XXXX. Reply to set up..."

### V1.5 (Later)
- ElevenLabs voice agent: Taylor calls for status updates while driving
- Plan data upload: workers query agent about project specs
- Agent as full intermediary: complex questions relayed

## Multi-Tenant Architecture (built for it from day 1)

```
Signup: Landing → "Start Free Trial" → email/company/area-code
        → Stripe checkout (trial, card required) → webhook fires
        → Twilio: provision number → DB: create org + owner
        → Welcome SMS

Per-org isolation:
  • Each org gets one Twilio number (provisioned at signup)
  • Single Twilio webhook → routes by `To` number → maps to org_id
  • Gemini agent context scoped per org (workers, projects, categories)
  • All DB tables keyed by org_id

Revenue model (per org):
  • Platform cost: ~$1.90/mo (Twilio + SMS + Gemini)
  • Charge: $29-49/mo
  • Margin: ~95%
```

## Design Decisions
- No app install for workers (SMS only)
- No required login for Taylor (email is primary, dashboard is secondary)
- Categories are Taylor-defined, not hardcoded
- Per-project custom questions supported
- Voice agent is V1.5, not V1
- Architecture is multi-tenant from day 1 (org_id on every table)
- V1: prove with Taylor. V2: scale to any plumbing company
