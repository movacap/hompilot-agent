"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessByPhone = getBusinessByPhone;
exports.getBusinessById = getBusinessById;
exports.getAllBusinesses = getAllBusinesses;
exports.upsertBusiness = upsertBusiness;
exports.getOrCreateConversation = getOrCreateConversation;
exports.updateConversation = updateConversation;
exports.createAppointment = createAppointment;
exports.getAppointmentsByBusiness = getAppointmentsByBusiness;
exports.updateAppointmentStatus = updateAppointmentStatus;
exports.getLatestAppointmentByPhone = getLatestAppointmentByPhone;
const supabase_js_1 = require("@supabase/supabase-js");
const uuid_1 = require("uuid");
let _supabase;
function getSupabase() {
    if (!_supabase) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key)
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        _supabase = (0, supabase_js_1.createClient)(url, key);
    }
    return _supabase;
}
function parseServices(services) {
    if (Array.isArray(services))
        return services;
    if (typeof services === 'string') {
        try {
            return JSON.parse(services);
        }
        catch {
            return [];
        }
    }
    return services || [];
}
function parseHours(hours) {
    if (typeof hours === 'object' && hours !== null && !Array.isArray(hours))
        return hours;
    if (typeof hours === 'string') {
        try {
            return JSON.parse(hours);
        }
        catch {
            return {};
        }
    }
    return hours || {};
}
async function getBusinessByPhone(phone) {
    const sb = getSupabase();
    const { data, error } = await sb
        .from('businesses')
        .select('*')
        .eq('twilio_phone', phone)
        .eq('active', true)
        .single();
    if (error || !data)
        return null;
    return { ...data, services: parseServices(data.services), business_hours: parseHours(data.business_hours) };
}
async function getBusinessById(id) {
    const sb = getSupabase();
    const { data, error } = await sb.from('businesses').select('*').eq('id', id).single();
    if (error || !data)
        return null;
    return { ...data, services: parseServices(data.services), business_hours: parseHours(data.business_hours) };
}
async function getAllBusinesses() {
    const sb = getSupabase();
    const { data, error } = await sb.from('businesses').select('*').order('created_at', { ascending: false });
    if (error || !data)
        return [];
    return data.map(row => ({ ...row, services: parseServices(row.services), business_hours: parseHours(row.business_hours) }));
}
async function upsertBusiness(business) {
    const sb = getSupabase();
    const payload = {
        ...business,
        services: typeof business.services === 'string' ? business.services : JSON.stringify(business.services),
        business_hours: typeof business.business_hours === 'string' ? business.business_hours : JSON.stringify(business.business_hours),
    };
    const { error } = await sb.from('businesses').upsert(payload);
    if (error)
        throw error;
}
async function getOrCreateConversation(businessId, customerPhone) {
    const sb = getSupabase();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await sb
        .from('conversations')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_phone', customerPhone)
        .eq('status', 'active')
        .gt('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
    if (existing) {
        return { ...existing, messages: typeof existing.messages === 'string' ? JSON.parse(existing.messages) : existing.messages };
    }
    const now = new Date().toISOString();
    const id = (0, uuid_1.v4)();
    const newConvo = { id, business_id: businessId, customer_phone: customerPhone, messages: '[]', status: 'active', created_at: now, updated_at: now };
    const { error } = await sb.from('conversations').insert(newConvo);
    if (error)
        throw error;
    return { ...newConvo, messages: [] };
}
async function updateConversation(id, messages, status) {
    const sb = getSupabase();
    const updates = { messages: JSON.stringify(messages), updated_at: new Date().toISOString() };
    if (status)
        updates.status = status;
    const { error } = await sb.from('conversations').update(updates).eq('id', id);
    if (error)
        throw error;
}
async function createAppointment(appt) {
    const sb = getSupabase();
    const { error } = await sb.from('appointments').insert(appt);
    if (error)
        throw error;
}
async function getAppointmentsByBusiness(businessId) {
    const sb = getSupabase();
    const { data, error } = await sb
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('scheduled_at', { ascending: false });
    if (error)
        return [];
    return data || [];
}
async function updateAppointmentStatus(id, status) {
    const sb = getSupabase();
    const { error } = await sb.from('appointments').update({ status }).eq('id', id);
    if (error)
        throw error;
}
async function getLatestAppointmentByPhone(customerPhone, businessId) {
    const sb = getSupabase();
    const { data } = await sb
        .from('appointments')
        .select('*')
        .eq('customer_phone', customerPhone)
        .eq('business_id', businessId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    return data || null;
}
