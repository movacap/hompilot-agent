"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/businesses', async (_req, res) => {
    res.json(await (0, db_1.getAllBusinesses)());
});
router.post('/businesses', async (req, res) => {
    const { name, owner_email, twilio_phone, services, business_hours, timezone } = req.body;
    if (!name || !owner_email || !twilio_phone) {
        res.status(400).json({ error: 'name, owner_email, and twilio_phone are required' });
        return;
    }
    const business = {
        id: (0, uuid_1.v4)(),
        name,
        owner_email,
        twilio_phone,
        services: services || [],
        business_hours: business_hours || getDefaultHours(),
        timezone: timezone || 'America/New_York',
        active: true,
        created_at: new Date().toISOString(),
    };
    await (0, db_1.upsertBusiness)(business);
    res.status(201).json(business);
});
router.put('/businesses/:id', async (req, res) => {
    const existing = await (0, db_1.getBusinessById)(req.params.id);
    if (!existing) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }
    const updated = { ...existing, ...req.body, id: req.params.id };
    await (0, db_1.upsertBusiness)(updated);
    res.json(updated);
});
router.get('/businesses/:id/appointments', async (req, res) => {
    res.json(await (0, db_1.getAppointmentsByBusiness)(req.params.id));
});
router.put('/appointments/:id', async (req, res) => {
    const { status } = req.body;
    if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
    }
    await (0, db_1.updateAppointmentStatus)(req.params.id, status);
    res.json({ success: true });
});
function getDefaultHours() {
    const weekday = { open: '09:00', close: '17:00', closed: false };
    return {
        monday: weekday,
        tuesday: weekday,
        wednesday: weekday,
        thursday: weekday,
        friday: weekday,
        saturday: { open: '10:00', close: '14:00', closed: true },
        sunday: { open: '10:00', close: '14:00', closed: true },
    };
}
exports.default = router;
