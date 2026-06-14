import Anthropic from '@anthropic-ai/sdk';
import { Business, Message, BookingData } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function formatServices(services: Business['services']): string {
  return services.map(s => `- ${s.name} (${s.duration_minutes} min, $${s.price})`).join('\n');
}

function formatHours(hours: Business['business_hours']): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.map(day => {
    const h = (hours as any)[day];
    if (!h || h.closed) return `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
    return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} - ${h.close}`;
  }).join('\n');
}

function buildSystemPrompt(business: Business): string {
  return `You are a friendly scheduling assistant for ${business.name}, a home services company.

Your ONLY job is to help customers book appointments. Keep all messages SHORT (1-3 sentences) since this is SMS.

Steps to book:
1. Greet warmly and ask what service they need
2. Confirm the service from the available list
3. Ask for their preferred date and time
4. Ask for their name
5. Confirm all details with them
6. When confirmed, output EXACTLY this on its own line: <BOOKING>{"service":"SERVICE_NAME","date":"YYYY-MM-DD","time":"HH:MM","customer_name":"FULL_NAME","notes":"any notes"}</BOOKING>

Available services:
${formatServices(business.services)}

Business hours (${business.timezone}):
${formatHours(business.business_hours)}

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Rules:
- Only schedule during business hours
- Be friendly but concise - this is SMS
- If they say something unrelated to booking, gently redirect
- Do NOT make up services not in the list
- For cancellations, tell them to reply CANCEL`;
}

export function extractBooking(text: string): BookingData | null {
  const match = text.match(/<BOOKING>([\s\S]*?)<\/BOOKING>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export async function runAgent(business: Business, conversationHistory: Message[], customerMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: customerMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: buildSystemPrompt(business),
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') return "I'm sorry, I couldn't process that. Please try again.";
  return content.text;
}
