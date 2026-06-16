"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const agent_1 = require("../agent");
const sms_1 = require("../sms");
const router = (0, express_1.Router)();
router.post('/sms', async (req, res) => {
    const { From: customerPhone, To: businessPhone, Body: messageBody } = req.body;
    res.set('Content-Type', 'text/xml');
    if (!customerPhone || !businessPhone || !messageBody) {
        res.send((0, sms_1.twimlResponse)("Sorry, we couldn't process your message."));
        return;
    }
    const business = await (0, db_1.getBusinessByPhone)(businessPhone);
    if (!business) {
        res.send((0, sms_1.twimlResponse)("This number is not currently active. Please contact support."));
        return;
    }
    const cleanMessage = messageBody.trim();
    if (cleanMessage.toUpperCase() === 'CANCEL') {
        const appt = await (0, db_1.getLatestAppointmentByPhone)(customerPhone, business.id);
        if (appt) {
            await (0, db_1.updateAppointmentStatus)(appt.id, 'cancelled');
            res.send((0, sms_1.twimlResponse)(`Your appointment for ${appt.service_name} on ${appt.scheduled_at} has been cancelled. Reply anytime to book a new appointment.`));
        }
        else {
            res.send((0, sms_1.twimlResponse)("We couldn't find an active appointment to cancel. Reply anytime to book a new appointment."));
        }
        return;
    }
    try {
        const conversation = await (0, db_1.getOrCreateConversation)(business.id, customerPhone);
        const messages = conversation.messages;
        const agentResponse = await (0, agent_1.runAgent)(business, messages, cleanMessage);
        const booking = (0, agent_1.extractBooking)(agentResponse);
        let replyText = agentResponse.replace(/<BOOKING>[\s\S]*?<\/BOOKING>/g, '').trim();
        if (booking) {
            const now = new Date().toISOString();
            const scheduledAt = `${booking.date}T${booking.time}:00`;
            const apptId = (0, uuid_1.v4)();
            await (0, db_1.createAppointment)({
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
            await (0, db_1.updateConversation)(conversation.id, [
                ...messages,
                { role: 'user', content: cleanMessage, timestamp: now },
                { role: 'assistant', content: agentResponse, timestamp: now },
            ], 'completed');
            if (!replyText) {
                replyText = `Your ${booking.service} appointment is confirmed for ${booking.date} at ${booking.time}. See you then! Reply CANCEL to cancel.`;
            }
            else {
                replyText += '\n\nReply CANCEL to cancel your appointment.';
            }
        }
        else {
            const now = new Date().toISOString();
            await (0, db_1.updateConversation)(conversation.id, [
                ...messages,
                { role: 'user', content: cleanMessage, timestamp: now },
                { role: 'assistant', content: agentResponse, timestamp: now },
            ]);
        }
        res.send((0, sms_1.twimlResponse)(replyText));
    }
    catch (error) {
        console.error('Agent error:', error);
        res.send((0, sms_1.twimlResponse)("Sorry, I'm having trouble right now. Please try again in a moment."));
    }
});
exports.default = router;
