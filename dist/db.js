"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
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
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_PATH = process.env.DATABASE_PATH || './hompilot.db';
let _db;
function getDb() {
    if (!_db) {
        _db = new better_sqlite3_1.default(path_1.default.resolve(DB_PATH));
        _db.pragma('journal_mode = WAL');
        initSchema(_db);
    }
    return _db;
}
function initSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      twilio_phone TEXT UNIQUE NOT NULL,
      services TEXT NOT NULL DEFAULT '[]',
      business_hours TEXT NOT NULL DEFAULT '{}',
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      service_name TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  `);
}
function getBusinessByPhone(phone) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM businesses WHERE twilio_phone = ? AND active = 1').get(phone);
    if (!row)
        return null;
    return {
        ...row,
        services: JSON.parse(row.services),
        business_hours: JSON.parse(row.business_hours),
    };
}
function getBusinessById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (!row)
        return null;
    return {
        ...row,
        services: JSON.parse(row.services),
        business_hours: JSON.parse(row.business_hours),
    };
}
function getAllBusinesses() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();
    return rows.map(row => ({
        ...row,
        services: JSON.parse(row.services),
        business_hours: JSON.parse(row.business_hours),
    }));
}
function upsertBusiness(business) {
    const db = getDb();
    db.prepare(`
    INSERT INTO businesses (id, name, owner_email, twilio_phone, services, business_hours, timezone, active, created_at)
    VALUES (@id, @name, @owner_email, @twilio_phone, @services, @business_hours, @timezone, @active, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      owner_email = excluded.owner_email,
      twilio_phone = excluded.twilio_phone,
      services = excluded.services,
      business_hours = excluded.business_hours,
      timezone = excluded.timezone,
      active = excluded.active
  `).run({
        ...business,
        services: JSON.stringify(business.services),
        business_hours: JSON.stringify(business.business_hours),
    });
}
function getOrCreateConversation(businessId, customerPhone) {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const existing = db.prepare(`
    SELECT * FROM conversations
    WHERE business_id = ? AND customer_phone = ? AND status = 'active' AND updated_at > ?
    ORDER BY updated_at DESC LIMIT 1
  `).get(businessId, customerPhone, cutoff);
    if (existing) {
        return { ...existing, messages: JSON.parse(existing.messages) };
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
    INSERT INTO conversations (id, business_id, customer_phone, messages, status, created_at, updated_at)
    VALUES (?, ?, ?, '[]', 'active', ?, ?)
  `).run(id, businessId, customerPhone, now, now);
    return { id, business_id: businessId, customer_phone: customerPhone, messages: [], status: 'active', created_at: now, updated_at: now };
}
function updateConversation(id, messages, status) {
    const db = getDb();
    const now = new Date().toISOString();
    if (status) {
        db.prepare('UPDATE conversations SET messages = ?, status = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(messages), status, now, id);
    }
    else {
        db.prepare('UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(messages), now, id);
    }
}
function createAppointment(appt) {
    const db = getDb();
    db.prepare(`
    INSERT INTO appointments (id, business_id, conversation_id, customer_phone, customer_name, service_name, scheduled_at, notes, status, created_at)
    VALUES (@id, @business_id, @conversation_id, @customer_phone, @customer_name, @service_name, @scheduled_at, @notes, @status, @created_at)
  `).run(appt);
}
function getAppointmentsByBusiness(businessId) {
    const db = getDb();
    return db.prepare('SELECT * FROM appointments WHERE business_id = ? ORDER BY scheduled_at DESC').all(businessId);
}
function updateAppointmentStatus(id, status) {
    const db = getDb();
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
}
function getLatestAppointmentByPhone(customerPhone, businessId) {
    const db = getDb();
    return db.prepare(`
    SELECT * FROM appointments WHERE customer_phone = ? AND business_id = ? AND status != 'cancelled'
    ORDER BY created_at DESC LIMIT 1
  `).get(customerPhone, businessId);
}
