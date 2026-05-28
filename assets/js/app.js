// ==================== ROUTING ====================
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  if (pageId === 'dashboard' && !dashboardStarted) {
    startDashboard();
  }
}

// ==================== DASHBOARD LOGIC ====================
let dashboardStarted = false;
let tempHistory = [28, 27, 29, 28, 30, 27, 28, 29, 28, 28];
let chartInstance = null;

function now() {
  const d = new Date();
  return d.toTimeString().slice(0,8);
}

function addLog(msg, type = 'info') {
  const list = document.getElementById('log-list');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="ldot ${type}"></div><div class="ltime">${now()}</div><div class="lmsg">${msg}</div>`;
  list.insertBefore(entry, list.firstChild);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function updateDashboard(temp, smoke) {
  // ================== LOGIKA SESUAI ARDUINO ==================
  // Buzzer: ON jika smoke >= 350
  const buzzer = smoke >= 350;
  
  // Pompa: ON jika kebakaran (smoke > 500 && temp > 36)
  const pump = (smoke > 500 && temp > 36);
  
  // Kipas: ON jika suhu > 36 (tapi OFF jika kebakaran)
  const fan = (temp > 36 && !(smoke > 500 && temp > 36));
  
  // ================== STATUS DETERMINATION ==================
  let status, statusClass, statusIcon, statusMsg;

  if (smoke > 500 && temp > 36) {
    status = 'FIRE'; statusClass = 'danger';
    statusIcon = '🔥'; statusMsg = 'KEBAKARAN — Pompa & Buzzer Aktif!';
  } else if (temp > 36) {
    status = 'WARNING'; statusClass = 'warning';
    statusIcon = '⚠️'; statusMsg = 'PANAS — Kipas & Buzzer Aktif';
  } else if (smoke >= 350) {
    status = 'WARNING'; statusClass = 'warning';
    statusIcon = '⚠️'; statusMsg = 'ASAP RINGAN — Buzzer Aktif';
  } else {
    status = 'SAFE'; statusClass = 'safe';
    statusIcon = '✅'; statusMsg = 'AMAN — Kondisi Normal';
  }

  // Update sensor values
  document.getElementById('temp-val').textContent = Math.round(temp);
  document.getElementById('smoke-val').textContent = Math.round(smoke);

  // Update bars
  const tempPct = Math.min(100, (temp / 50) * 100);
  const smokePct = Math.min(100, (smoke / 1000) * 100);
  const tempColor = temp > 36 ? 'var(--danger)' : temp > 28 ? 'var(--warning)' : 'var(--safe)';
  const smokeColor = smoke > 500 ? 'var(--danger)' : smoke > 350 ? 'var(--warning)' : 'var(--safe)';
  document.getElementById('temp-bar').style.cssText = `width:${tempPct}%;background:${tempColor}`;
  document.getElementById('smoke-bar').style.cssText = `width:${smokePct}%;background:${smokeColor}`;

  // Update status
  const si = document.getElementById('status-icon');
  si.textContent = statusIcon;
  si.className = `si ${statusClass}`;
  document.getElementById('status-val').textContent = statusMsg;
  document.getElementById('status-val').className = `st-val ${statusClass}`;
  const dot = document.getElementById('status-dot');
  dot.className = `sdot ${statusClass}`;

  // Badge
  const badge = document.getElementById('dash-badge');
  const badgeMap = { SAFE: '🟢 SAFE', WARNING: '⚠️ WARNING', FIRE: '🔥 FIRE' };
  badge.textContent = badgeMap[status];
  badge.className = `badge badge-${statusClass}`;

  // Devices
  const devBadge = (el, on) => {
    el.textContent = on ? 'ON' : 'OFF';
    el.className = `badge ${on ? 'badge-on' : 'badge-off'} drow-badge`;
  };
  devBadge(document.getElementById('dev-buzzer'), buzzer);
  devBadge(document.getElementById('dev-fan'), fan);
  devBadge(document.getElementById('dev-pump'), pump);
}

function initChart() {
  const canvas = document.getElementById('tempChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const labels = tempHistory.map((_, i) => `T-${9-i}`);
  labels[labels.length - 1] = 'Now';

  chartInstance = {
    canvas, ctx,
    draw: function(data) {
      const w = canvas.offsetWidth || 300;
      const h = 140;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      const padding = { top: 16, right: 16, bottom: 24, left: 32 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;
      const min = Math.min(...data) - 2;
      const max = Math.max(...data) + 2;

      // Grid
      ctx.strokeStyle = '#f3f4f4';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        const val = Math.round(max - ((max-min)/4)*i);
        ctx.fillStyle = '#9ca3af'; ctx.font = '9px Poppins, sans-serif';
        ctx.textAlign = 'right'; ctx.fillText(val + '°', padding.left - 4, y + 3);
      }

      // Line gradient
      const grad = ctx.createLinearGradient(padding.left, 0, w - padding.right, 0);
      grad.addColorStop(0, '#853953');
      grad.addColorStop(1, '#ef4444');

      // Area fill
      const areaGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      areaGrad.addColorStop(0, 'rgba(133,57,83,0.15)');
      areaGrad.addColorStop(1, 'rgba(133,57,83,0)');

      const pts = data.map((v, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartW,
        y: padding.top + ((max - v) / (max - min)) * chartH
      }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cp1x = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cp1x, pts[i-1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.lineTo(pts[pts.length-1].x, h - padding.bottom);
      ctx.lineTo(pts[0].x, h - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = areaGrad; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cp1x = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cp1x, pts[i-1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round'; ctx.stroke();

      // Dots
      pts.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, i === pts.length-1 ? 5 : 3, 0, Math.PI*2);
        ctx.fillStyle = i === pts.length-1 ? '#853953' : '#fda4af';
        ctx.fill();
        if (i === pts.length-1) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(133,57,83,0.25)';
          ctx.lineWidth = 2; ctx.stroke();
        }
      });

      // X labels
      pts.forEach((pt, i) => {
        if (i === 0 || i === pts.length-1 || i % 3 === 0) {
          ctx.fillStyle = '#9ca3af'; ctx.font = '9px Poppins, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(i === pts.length-1 ? 'Now' : `T-${9-i}`, pt.x, h - 4);
        }
      });
    }
  };
  chartInstance.draw(tempHistory);
}

function startDashboard() {
  dashboardStarted = true;
  addLog('Menghubungkan ke MQTT Broker...', 'info');

  setTimeout(() => {
    initChart();
    updateDashboard(28, 120);
    addLog('Menunggu data nyata dari perangkat...', 'info');
  }, 100);

  // ==================== MQTT LOGIC ====================
  const broker = "broker.emqx.io";
  const port = 8083; // Websockets port
  const clientId = "smarthall_web_" + Math.random().toString(16).substr(2, 8);
  
  const client = new Paho.MQTT.Client(broker, port, clientId);
  
  client.onConnectionLost = function(responseObject) {
    if (responseObject.errorCode !== 0) {
      addLog("Koneksi MQTT terputus: " + responseObject.errorMessage, "danger");
      console.log("Koneksi terputus: " + responseObject.errorMessage);
    }
  };
  
  client.onMessageArrived = function(message) {
    console.log("Data diterima pada topik " + message.destinationName + ": " + message.payloadString);
    
    try {
      const lastTemp = parseFloat(document.getElementById('temp-val').textContent);
      const lastSmoke = parseFloat(document.getElementById('smoke-val').textContent);
      
      let temp = lastTemp;
      let smoke = lastSmoke;
      
      if (message.destinationName === "smarthall/sensor/suhu") {
        temp = parseFloat(message.payloadString);
      } else if (message.destinationName === "smarthall/sensor/asap") {
        smoke = parseFloat(message.payloadString);
      } else if (message.destinationName === "smarthall/sensor/data") {
        // Alternative: jika ESP32 mengirim JSON { "temp": 30.5, "smoke": 120 }
        const data = JSON.parse(message.payloadString);
        if (data.temp !== undefined) temp = parseFloat(data.temp);
        if (data.smoke !== undefined) smoke = parseFloat(data.smoke);
      }
      
      const tempR = Math.round(temp * 10) / 10;
      const smokeR = Math.round(smoke);

      tempHistory.push(tempR);
      if (tempHistory.length > 10) tempHistory.shift();
      if (chartInstance) chartInstance.draw(tempHistory);

      updateDashboard(tempR, smokeR);

      // Warning Logs
      if (smoke > 500 && temp > 36) {
        addLog(`🔥 KEBAKARAN! Suhu ${tempR}°C, Asap ${smokeR}ppm`, 'danger');
      } else if (temp > 36 || smoke > 350) {
        addLog(`⚠️ Peringatan: Suhu ${tempR}°C, Asap ${smokeR}ppm`, 'warning');
      }
    } catch(e) {
      console.log("Error parsing MQTT data", e);
    }
  };
  
  client.connect({
    onSuccess: function() {
      addLog("Terhubung ke server MQTT! Siap menerima data.", "safe");
      
      client.subscribe("smarthall/sensor/suhu");
      client.subscribe("smarthall/sensor/asap");
      client.subscribe("smarthall/sensor/data");
    },
    onFailure: function(e) {
      addLog("Gagal terhubung ke MQTT Broker.", "danger");
      console.log("Koneksi gagal", e);
    }
  });
}

// Redraw chart on resize
window.addEventListener('resize', () => {
  if (chartInstance && document.getElementById('dashboard').classList.contains('active')) {
    chartInstance.draw(tempHistory);
  }
});
