import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getBusinessByPhone, getOrCreateConversation, updateConversation, createAppointment, updateAppointmentStatus, getLatestAppointmentByPhone } from '../db';
import { runAgent, extractBooking } from '../agent';
import { twimlResponse } from '../sms';
import { Message } from '../types';

const router = Router();

router.post('/sms', async (req: Request, res: Response) => {
  const { From: customerPhone, To: businessPhone, Body: messageBody } = req.body;

  res.set('Content-Type', 'text/xml');

  if (!customerPhone || !businessPhone || !messageBody) {
    res.send(twimlResponse("Sorry, we couldn't process your message."));
    return;
  }

  const business = getBusinessByPhone(businessPhone);
  if (!business) {
    res.send(twimlResponse("This number is not currently active. Please contact support."));
    return;
  }

  const cleanMessage = messageBody.trim();

  // Handle CANCEL keyword
  if (cleanMessage.toUpperCase() === 'CANCEL') {
    const appt = getLatestAppointmentByPhone(customerPhone, business.id) as any;
    if (appt) {
      updateAppointmentStatus(appt.id, 'cancelled');
      res.send(twimlResponse(`Your appointment for ${appt.service_name} on ${appt.scheduled_at} has been cancelled. Reply anytime to book a new appointment.`));
    } else {
      res.send(twimlResponse("We couldn't find an active appointment to cancel. Reply anytime to book a new appointment."));
    }
    return;
  }

  try {
    const conversation = getOrCreateConversation(business.id, customerPhone);
    const messages: Message[] = conversation.messages;

    const agentResponse = await runAgent(business, messages, cleanMessage);

    // Check for booking
    const booking = extractBooking(agentResponse);
    let replyText = agentResponse.replace(/<BOOKING>[\s\S]*?<\/BOOKING>/g, '').trim();

    if (booking) {
      const now = new Date().toISOString();
      const scheduledAt = `${booking.date}T${booking.time}:00`;
      const apptId = uuidv4();

      createAppointment({
        id: apptId,
        business_id: business.id,
        conversation_id: conversation.id,
        customer_phone: customerPhone,
        customer_name: booking.customer_name,
        service_name: booking.service,
        scheduled_at: scheduledAt,
        notes: booking.notes || '',
        status: 'confirmed',
        created_at: now,
      });

      updateConversation(conversation.id, [
        ...messages,
        { role: 'user', content: cleanMessage, timestamp: now },
        { role: 'assistant', content: agentResponse, timestamp: now },
      ], 'completed');

      if (!replyText) {
        replyText = `Your ${booking.service} appointment is confirmed for ${booking.date} at ${booking.time}. See you then! Reply CANCEL to cancel.`;
      } else {
        replyText += '\n\nReply CANCEL to cancel your appointment.';
      }
    } else {
      const now = new Date().toISOString();
      updateConversation(conversation.id, [
        ...messages,
        { role: 'user', content: cleanMessage, timestamp: now },
        { role: 'assistant', content: agentResponse, timestamp: now },
      ]);
    }

    res.send(twimlResponse(replyText));
  } catch (error) {
    console.error('Agent error:', error);
    res.send(twimlResponse("Sorry, I'm having trouble right now. Please try again in a moment."));
  }
});

export default router;
