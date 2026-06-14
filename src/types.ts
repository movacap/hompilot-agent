export interface Service {
  name: string;
  duration_minutes: number;
  price: number;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface Business {
  id: string;
  name: string;
  owner_email: string;
  twilio_phone: string;
  services: Service[];
  business_hours: BusinessHours;
  timezone: string;
  active: number;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_phone: string;
  messages: Message[];
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string;
  service_name: string;
  scheduled_at: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface BookingData {
  service: string;
  date: string;
  time: string;
  customer_name: string;
  notes?: string;
}
