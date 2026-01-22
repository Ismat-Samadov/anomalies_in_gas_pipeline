async function loadData() {
  const res = await fetch('anomaly_results.json');
  const data = await res.json();
  data.forEach(d => d.timestamp = new Date(d.timestamp));
  const locations = Array.from(new Set(data.map(d => d.location))).sort();
  const locSelect = document.getElementById('locationSelect');
  locations.forEach(l=> {
    const o = document.createElement('option');
    o.value = l; o.textContent = l; locSelect.appendChild(o);
  });
  locSelect.addEventListener('change', ()=> render(data, locSelect.value));
  render(data, 'all');
}

function render(data, location='all') {
  const filtered = location === 'all' ? data : data.filter(d=>d.location===location);
  filtered.sort((a,b)=> new Date(a.timestamp) - new Date(b.timestamp));
  const labels = filtered.map(d=> new Date(d.timestamp).toLocaleString());
  const pressures = filtered.map(d=> Number(d.pressure_kpa));
  const anomalies = filtered.map((d,i)=> d.anomaly_label==1 ? {x: labels[i], y: pressures[i]} : null).filter(x=>x!==null);

  const ctx = document.getElementById('pressureChart').getContext('2d');
  if (window._chart) window._chart.destroy();
  window._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Pressure (kPa)', data: pressures, fill:false, tension:0.1 },
        { label: 'Anomalies (pressure)', data: anomalies.map(a=>a.y), type:'scatter', pointRadius:5, showLine:false }
      ]
    },
    options: {
      plugins: { legend: { display: true } },
      scales: { x: { display: true, title: { display: true, text: 'Time' } } }
    }
  });

  const tbody = document.querySelector('#anomalyTable tbody');
  tbody.innerHTML = '';
  const anoms = filtered.filter(d=>d.anomaly_label==1);
  const normals = filtered.filter(d=>d.anomaly_label==0).slice(-50);
  const rows = anoms.concat(normals);
  rows.forEach(r=> {
    const tr = document.createElement('tr');
    if (r.anomaly_label==1) tr.classList.add('anom');
    tr.innerHTML = `<td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.location}</td><td>${r.pressure_kpa}</td><td>${r.temperature_c}</td><td>${r.hourly_flow_m3}</td><td>${r.anomaly_label==1 ? 'YES' : ''}</td>`;
    tbody.appendChild(tr);
  });
}

loadData();