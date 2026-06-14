// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'appointments') loadAppointments();
    if (btn.dataset.tab === 'businesses') loadBusinesses();
  });
});

// Services management
let services = [];

function renderServices() {
  const tbody = document.getElementById('services-tbody');
  tbody.innerHTML = services.map((s, i) => `
    <tr>
      <td><input type="text" value="${s.name}" onchange="services[${i}].name = this.value" placeholder="e.g. House Cleaning" /></td>
      <td><input type="number" value="${s.duration_minutes}" onchange="services[${i}].duration_minutes = parseInt(this.value)" placeholder="60" /></td>
      <td><input type="number" value="${s.price}" onchange="services[${i}].price = parseFloat(this.value)" placeholder="120" /></td>
      <td><button class="btn btn-danger" onclick="removeService(${i})">Remove</button></td>
    </tr>
  `).join('');
}

function addService() {
  services.push({ name: '', duration_minutes: 60, price: 0 });
  renderServices();
}

function removeService(i) {
  services.splice(i, 1);
  renderServices();
}

// Business hours management
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
let businessHours = {};
days.forEach(day => {
  businessHours[day] = { open: '09:00', close: '17:00', closed: day === 'sunday' };
});

function renderHours() {
  const container = document.getElementById('hours-grid');
  container.innerHTML = days.map(day => `
    <div class="day-row">
      <span class="day-label">${day.charAt(0).toUpperCase() + day.slice(1)}</span>
      <input type="checkbox" id="closed-${day}" ${businessHours[day].closed ? '' : 'checked'} onchange="businessHours['${day}'].closed = !this.checked; updateDayRow('${day}')" />
      <label for="closed-${day}" style="font-size:0.8rem">Open</label>
      <input type="time" id="open-${day}" value="${businessHours[day].open}" ${businessHours[day].closed ? 'disabled' : ''} onchange="businessHours['${day}'].open = this.value" />
      <span style="font-size:0.8rem">to</span>
      <input type="time" id="close-${day}" value="${businessHours[day].close}" ${businessHours[day].closed ? 'disabled' : ''} onchange="businessHours['${day}'].close = this.value" />
    </div>
  `).join('');
}

function updateDayRow(day) {
  document.getElementById(`open-${day}`).disabled = businessHours[day].closed;
  document.getElementById(`close-${day}`).disabled = businessHours[day].closed;
}

// Load existing businesses for edit
let editingBusinessId = null;

async function loadBusinesses() {
  const res = await fetch('/api/businesses');
  const businesses = await res.json();
  const container = document.getElementById('businesses-list');
  if (!businesses.length) {
    container.innerHTML = '<div class="empty-state">No businesses yet. Create one above!</div>';
    return;
  }
  container.innerHTML = businesses.map(b => `
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${b.name}</strong> &nbsp;
          <span class="badge ${b.active ? 'badge-confirmed' : 'badge-cancelled'}">${b.active ? 'Active' : 'Inactive'}</span>
          <div style="font-size:0.85rem;color:#6c757d;margin-top:0.25rem">${b.twilio_phone} &bull; ${b.owner_email} &bull; ${b.services.length} service(s)</div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary" onclick="editBusiness(${JSON.stringify(b).replace(/"/g, '&quot;')})">Edit</button>
          <button class="btn btn-${b.active ? 'danger' : 'success'}" onclick="toggleActive('${b.id}', ${b.active})">
            ${b.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Also update the business selector in appointments tab
  const selector = document.getElementById('business-selector');
  selector.innerHTML = '<option value="">Select a business</option>' +
    businesses.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

function editBusiness(b) {
  editingBusinessId = b.id;
  document.getElementById('business-name').value = b.name;
  document.getElementById('owner-email').value = b.owner_email;
  document.getElementById('twilio-phone').value = b.twilio_phone;
  document.getElementById('timezone').value = b.timezone;
  services = b.services;
  businessHours = b.business_hours;
  renderServices();
  renderHours();
  document.getElementById('form-title').textContent = 'Edit Business';
  document.getElementById('submit-btn').textContent = 'Update Business';
  document.getElementById('cancel-edit-btn').style.display = 'inline-block';
  document.getElementById('setup-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingBusinessId = null;
  document.getElementById('setup-form').reset();
  services = [];
  renderServices();
  document.getElementById('form-title').textContent = 'Activate New SMS Agent';
  document.getElementById('submit-btn').textContent = 'Activate Agent';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function toggleActive(id, currentActive) {
  await fetch(`/api/businesses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: currentActive ? 0 : 1 }),
  });
  loadBusinesses();
}

// Form submission
document.getElementById('setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('business-name').value,
    owner_email: document.getElementById('owner-email').value,
    twilio_phone: document.getElementById('twilio-phone').value,
    timezone: document.getElementById('timezone').value,
    services,
    business_hours: businessHours,
    active: 1,
  };

  const url = editingBusinessId ? `/api/businesses/${editingBusinessId}` : '/api/businesses';
  const method = editingBusinessId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    showToast(editingBusinessId ? 'Business updated!' : 'Agent activated successfully!');
    cancelEdit();
    loadBusinesses();
    // Switch to businesses tab
    document.querySelector('[data-tab="businesses"]').click();
  } else {
    const err = await res.json();
    alert('Error: ' + err.error);
  }
});

// Appointments
async function loadAppointments() {
  const businessId = document.getElementById('business-selector').value;
  if (!businessId) {
    document.getElementById('appointments-table-container').innerHTML = '<div class="empty-state">Select a business to view appointments.</div>';
    return;
  }
  const res = await fetch(`/api/businesses/${businessId}/appointments`);
  const appts = await res.json();
  if (!appts.length) {
    document.getElementById('appointments-table-container').innerHTML = '<div class="empty-state">No appointments yet.</div>';
    return;
  }
  document.getElementById('appointments-table-container').innerHTML = `
    <table class="appointments-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Service</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${appts.map(a => `
          <tr>
            <td>${a.customer_name}</td>
            <td>${a.customer_phone}</td>
            <td>${a.service_name}</td>
            <td>${new Date(a.scheduled_at).toLocaleString()}</td>
            <td><span class="badge badge-${a.status}">${a.status}</span></td>
            <td>
              ${a.status !== 'cancelled' ? `<button class="btn btn-danger" onclick="cancelAppt('${a.id}')">Cancel</button>` : ''}
              ${a.status === 'pending' ? `<button class="btn btn-success" style="margin-left:0.25rem" onclick="confirmAppt('${a.id}')">Confirm</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  await fetch(`/api/appointments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
  loadAppointments();
}

async function confirmAppt(id) {
  await fetch(`/api/appointments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) });
  loadAppointments();
}

// Toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// Init
renderServices();
renderHours();
loadBusinesses();
