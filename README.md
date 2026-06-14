# HomPilot — SMS Booking Agent Platform

HomPilot is an SMS-based AI appointment booking platform for home services businesses. When customers text your business's Twilio phone number, an AI agent (powered by Claude) handles the entire booking conversation — asking about the service needed, finding a time, collecting their name, and confirming the appointment.

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd hompilot-agent
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run in development
npm run dev

# 4. Or build and run in production
npm run build
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_PATH` | SQLite database file path (default: ./hompilot.db) |
| `BASE_URL` | Your public server URL (e.g. https://your-domain.com) |

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Express Server                  │
├──────────────┬──────────────┬───────────────────┤
│  /webhook    │    /api      │       /           │
│  (Twilio)    │  (REST API)  │   (Dashboard)     │
└──────┬───────┴──────┬───────┴───────────────────┘
       │              │
       ▼              ▼
  ┌─────────┐   ┌──────────┐
  │  Agent  │   │  SQLite  │
  │(Claude) │   │   (DB)   │
  └─────────┘   └──────────┘
```

- **`src/server.ts`** — Express app setup and entry point
- **`src/agent.ts`** — Claude AI agent logic and booking extraction
- **`src/db.ts`** — SQLite database with better-sqlite3
- **`src/sms.ts`** — Twilio client and TwiML response helpers
- **`src/routes/webhook.ts`** — Inbound SMS handler
- **`src/routes/api.ts`** — REST API for dashboard
- **`src/routes/dashboard.ts`** — Serves the HTML dashboard
- **`public/`** — Vanilla HTML/CSS/JS dashboard

## SMS Booking Flow

1. Customer texts the business's Twilio number
2. Twilio POSTs to `POST /webhook/sms`
3. System looks up the business by phone number
4. The Claude agent receives the message + conversation history
5. Agent responds conversationally to collect: service, date/time, name
6. When all info is collected, agent outputs a `<BOOKING>` JSON tag
7. System parses the booking, saves to SQLite, and confirms via SMS
8. Customer can text `CANCEL` at any time to cancel their latest appointment

## Twilio Setup

1. Create a [Twilio account](https://twilio.com) and buy a phone number
2. Go to your phone number settings in the Twilio Console
3. Under "Messaging", set the webhook URL to:
   ```
   https://your-domain.com/webhook/sms
   ```
   Method: `HTTP POST`
4. Save the settings

## Dashboard Usage

Open `http://localhost:3000` to access the dashboard.

**Setup Agent tab**: Register a business with its Twilio phone number, define services (name, duration, price), and set business hours.

**My Businesses tab**: View all registered businesses, edit their details, or activate/deactivate the SMS agent.

**Appointments tab**: Select a business to view all booked appointments. You can manually confirm or cancel appointments from here.
