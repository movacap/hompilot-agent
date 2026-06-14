import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllBusinesses, getBusinessById, upsertBusiness, getAppointmentsByBusiness, updateAppointmentStatus } from '../db';

const router = Router();

router.get('/businesses', async (_req: Request, res: Response) => {
  res.json(await getAllBusinesses());
});

router.post('/businesses', async (req: Request, res: Response) => {
  const { name, owner_email, twilio_phone, services, business_hours, timezone } = req.body;
  if (!name || !owner_email || !twilio_phone) {
    res.status(400).json({ error: 'name, owner_email, and twilio_phone are required' });
    return;
  }
  const business = {
    id: uuidv4(),
    name,
    owner_email,
    twilio_phone,
    services: services || [],
    business_hours: business_hours || getDefaultHours(),
    timezone: timezone || 'America/New_York',
    active: true,
    created_at: new Date().toISOString(),
  };
  await upsertBusiness(business);
  res.status(201).json(business);
});

router.put('/businesses/:id', async (req: Request, res: Response) => {
  const existing = await getBusinessById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }
  const updated = { ...existing, ...req.body, id: req.params.id };
  await upsertBusiness(updated);
  res.json(updated);
});

router.get('/businesses/:id/appointments', async (req: Request, res: Response) => {
  res.json(await getAppointmentsByBusiness(req.params.id));
});

router.put('/appointments/:id', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  await updateAppointmentStatus(req.params.id, status);
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

export default router;
