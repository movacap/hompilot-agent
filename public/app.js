// ── PAGE NAVIGATION ─────────────────────────
function showPage(name) {
  ['dashboard', 'businesses', 'setup', 'appointments'].forEach(p => {
    document.getElementById('page-' + p).style.display = p === name ? 'block' : 'none';
  });

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');

  if (name === 'dashboard') loadDashboard();
  if (name === 'businesses') loadBusinesses();
  if (name === 'appointments') loadAppointments();
}

// ── SERVICES ────────────────────────────────
let services = [];

function renderServices() {
  const tbody = document.getElementById('services-tbody');
  if (!services.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted-fg);padding:20px;font-size:13px">No services yet — click "Add Service" below</td></tr>';
    return;
  }
  tbody.innerHTML = services.map((s, i) => `
    <tr>
      <td><input type="text" value="${s.name}" onchange="services[${i}].name = this.value" placeholder="e.g. House Cleaning" /></td>
      <td><input type="number" value="${s.duration_minutes}" onchange="services[${i}].duration_minutes = parseInt(this.value)||60" placeholder="60" /></td>
      <td><input type="number" value="${s.price}" onchange="services[${i}].price = parseFloat(this.value)||0" placeholder="120" /></td>
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

// ── BUSINESS HOURS ───────────────────────────
const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
let businessHours = {};
days.forEach(day => {
  businessHours[day] = { open: '09:00', close: '17:00', closed: ['saturday','sunday'].includes(day) };
});

function renderHours() {
  const container = document.getElementById('hours-grid');
  container.innerHTML = days.map(day => `
    <div class="day-row">
      <span class="day-label">${day.charAt(0).toUpperCase()+day.slice(1)}</span>
      <input type="checkbox" id="open-check-${day}" ${businessHours[day].closed ? '' : 'checked'}
        onchange="businessHours['${day}'].closed=!this.checked;updateDayRow('${day}')" />
      <label for="open-check-${day}" style="font-size:12px;font-weight:500;color:var(--muted-fg);cursor:pointer">Open</label>
      <input type="time" id="time-open-${day}" value="${businessHours[day].open}"
        ${businessHours[day].closed?'disabled':''} onchange="businessHours['${day}'].open=this.value"
        style="${businessHours[day].closed?'opacity:0.3':''}"/>
      <span style="font-size:12px;color:var(--muted-fg)">–</span>
      <input type="time" id="time-close-${day}" value="${businessHours[day].close}"
        ${businessHours[day].closed?'disabled':''} onchange="businessHours['${day}'].close=this.value"
        style="${businessHours[day].closed?'opacity:0.3':''}"/>
    </div>
  `).join('');
}

function updateDayRow(day) {
  const closed = businessHours[day].closed;
  document.getElementById(`time-open-${day}`).disabled = closed;
  document.getElementById(`time-close-${day}`).disabled = closed;
  document.getElementById(`time-open-${day}`).style.opacity = closed ? '0.3' : '1';
  document.getElementById(`time-close-${day}`).style.opacity = closed ? '0.3' : '1';
}

// ── FORM EDIT STATE ──────────────────────────
let editingBusinessId = null;

function cancelEdit() {
  editingBusinessId = null;
  document.getElementById('setup-form').reset();
  services = [];
  renderServices();
  renderHours();
  document.getElementById('setup-page-title').textContent = 'Activate New SMS Agent';
  document.getElementById('submit-btn').innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
    Activate Agent`;
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

function editBusiness(b) {
  editingBusinessId = b.id;
  document.getElementById('business-name').value = b.name;
  document.getElementById('owner-email').value = b.owner_email;
  document.getElementById('twilio-phone').value = b.twilio_phone;
  document.getElementById('timezone').value = b.timezone;
  services = [...(b.services || [])];
  if (b.business_hours) {
    businessHours = b.business_hours;
  }
  renderServices();
  renderHours();
  document.getElementById('setup-page-title').textContent = 'Edit SMS Agent';
  document.getElementById('submit-btn').textContent = 'Save Changes';
  document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
  showPage('setup');
}

async function toggleActive(id, currentActive) {
  await fetch(`/api/businesses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !currentActive }),
  });
  loadBusinesses();
  loadDashboard();
}

// ── FORM SUBMIT ──────────────────────────────
document.getElementById('setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  const originalHTML = submitBtn.innerHTML;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  const data = {
    name: document.getElementById('business-name').value,
    owner_email: document.getElementById('owner-email').value,
    twilio_phone: document.getElementById('twilio-phone').value,
    timezone: document.getElementById('timezone').value,
    services,
    business_hours: businessHours,
    active: true,
  };

  const url = editingBusinessId ? `/api/businesses/${editingBusinessId}` : '/api/businesses';
  const method = editingBusinessId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      showToast(editingBusinessId ? '✓ Agent updated successfully' : '✓ SMS Agent activated!');
      cancelEdit();
      showPage('businesses');
    } else {
      let errMsg = `Server error (${res.status})`;
      try { const e = await res.json(); errMsg = e.error || errMsg; } catch { try { errMsg = await res.text(); } catch {} }
      alert('Error: ' + errMsg);
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }

  submitBtn.innerHTML = originalHTML;
  submitBtn.disabled = false;
});

// ── LOAD DASHBOARD ───────────────────────────
async function loadDashboard() {
  try {
    const businesses = await fetch('/api/businesses').then(r => r.json());
    const active = businesses.filter(b => b.active);

    document.getElementById('stat-agents').textContent = active.length;

    let totalAppts = 0, weekAppts = 0, confirmedAppts = 0;
    const weekAgo = new Date(Date.now() - 7*24*60*60*1000);

    for (const b of businesses) {
      const appts = await fetch(`/api/businesses/${b.id}/appointments`).then(r => r.json());
      totalAppts += appts.length;
      confirmedAppts += appts.filter(a => a.status === 'confirmed').length;
      weekAppts += appts.filter(a => new Date(a.created_at) > weekAgo).length;
    }

    document.getElementById('stat-appointments').textContent = totalAppts;
    document.getElementById('stat-week').textContent = weekAppts;
    document.getElementById('stat-rate').textContent = totalAppts ? Math.round(confirmedAppts/totalAppts*100)+'%' : '—';

    const list = document.getElementById('dashboard-businesses-list');
    if (!active.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📱</span><h3>No agents yet</h3><p>Activate your first SMS agent to get started</p></div>`;
    } else {
      list.innerHTML = active.map(b => `
        <div class="business-card">
          <div class="business-card-info">
            <div class="business-card-name">${b.name} <span class="badge badge-active">Active</span></div>
            <div class="business-card-meta">
              <span>📞 ${b.twilio_phone}</span>
              <span>🛠 ${b.services.length} service${b.services.length!==1?'s':''}</span>
              <span>🕐 ${b.timezone}</span>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="editBusiness(${JSON.stringify(b).replace(/"/g,'&quot;')})">Edit</button>
        </div>
      `).join('');
    }
  } catch(e) {
    console.error('Dashboard load error:', e);
  }
}

// ── LOAD BUSINESSES ───────────────────────────
async function loadBusinesses() {
  try {
    const businesses = await fetch('/api/businesses').then(r => r.json());
    const list = document.getElementById('businesses-list');

    // Update selector
    const sel = document.getElementById('business-selector');
    sel.innerHTML = '<option value="">All businesses</option>' +
      businesses.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    if (!businesses.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🏢</span><h3>No businesses yet</h3><p>Click "Add Agent" to get started</p></div>`;
      return;
    }

    list.innerHTML = businesses.map(b => `
      <div class="business-card">
        <div class="business-card-info">
          <div class="business-card-name">
            ${b.name}
            <span class="badge ${b.active ? 'badge-active' : 'badge-inactive'}">${b.active ? 'Active' : 'Inactive'}</span>
          </div>
          <div class="business-card-meta">
            <span>📧 ${b.owner_email}</span>
            <span>📞 ${b.twilio_phone}</span>
            <span>🛠 ${b.services.length} service${b.services.length!==1?'s':''}</span>
          </div>
        </div>
        <div class="business-card-actions">
          <button class="btn btn-secondary" onclick="editBusiness(${JSON.stringify(b).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn ${b.active ? 'btn-danger' : 'btn-success'}" onclick="toggleActive('${b.id}', ${b.active})">
            ${b.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    console.error('Businesses load error:', e);
  }
}

// ── LOAD APPOINTMENTS ─────────────────────────
async function loadAppointments() {
  const businessId = document.getElementById('business-selector').value;
  const container = document.getElementById('appointments-table-container');

  try {
    let businesses = [];
    if (businessId) {
      businesses = [{ id: businessId }];
    } else {
      businesses = await fetch('/api/businesses').then(r => r.json());
    }

    let allAppts = [];
    for (const b of businesses) {
      const appts = await fetch(`/api/businesses/${b.id}/appointments`).then(r => r.json());
      allAppts = allAppts.concat(appts.map(a => ({...a, _businessName: b.name})));
    }

    allAppts.sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

    if (!allAppts.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📅</span><h3>No appointments yet</h3><p>Appointments booked via SMS will appear here</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Phone</th><th>Service</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${allAppts.map(a => `
              <tr>
                <td><strong>${a.customer_name}</strong></td>
                <td style="color:var(--muted-fg)">${a.customer_phone}</td>
                <td>${a.service_name}</td>
                <td style="color:var(--muted-fg);font-size:13px">${new Date(a.scheduled_at).toLocaleString()}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td style="display:flex;gap:6px">
                  ${a.status !== 'cancelled' ? `<button class="btn btn-danger" onclick="updateAppt('${a.id}','cancelled')">Cancel</button>` : ''}
                  ${a.status === 'pending' ? `<button class="btn btn-success" onclick="updateAppt('${a.id}','confirmed')">Confirm</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Error loading appointments</h3><p>${e.message}</p></div>`;
  }
}

async function updateAppt(id, status) {
  if (status === 'cancelled' && !confirm('Cancel this appointment?')) return;
  await fetch(`/api/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  loadAppointments();
  showToast(status === 'confirmed' ? '✓ Appointment confirmed' : '✓ Appointment cancelled');
}

// ── TOAST ─────────────────────────────────────
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── INIT ──────────────────────────────────────
renderServices();
renderHours();
loadDashboard();
