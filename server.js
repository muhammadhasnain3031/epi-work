const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Project root & File paths
const PROJECT_ROOT = path.join(__dirname);
const DEVICE_CONFIG_FILE = path.join(__dirname, 'device.json');

// Check multiple possible report paths
function getReportFilePath() {
  const possiblePaths = [
    path.join(PROJECT_ROOT, 'report.json'),
    path.join(PROJECT_ROOT, 'reports', 'report.json'),
    path.join(PROJECT_ROOT, 'src', 'reports', 'report.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0]; 
}

// Current running process state
let currentProcess = null;
let isRunning = false;
let sseClients = []; 
let logBuffer = [];  

// SSE: broadcast log line with multiple property aliases
function broadcastLog(line) {
  const logLine = { time: new Date().toISOString(), line };
  logBuffer.push(logLine);
  if (logBuffer.length > 200) logBuffer.shift();

  const payload = JSON.stringify({
    line: line,
    message: line,
    text: line,
    log: line,
    output: line
  });

  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Get device config
function getDeviceConfig() {
  if (fs.existsSync(DEVICE_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DEVICE_CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading device.json:', e);
    }
  }
  return { devices: [], activeDeviceId: '' };
}

function getActiveDevice() {
  const config = getDeviceConfig();
  return config.devices.find(d => d.id === config.activeDeviceId) || null;
}

// Update appConfig.ts when device changes
function updateAppConfig(udid, androidVersion) {
  const configPath = path.join(PROJECT_ROOT, 'src', 'config', 'appConfig.ts');
  if (!fs.existsSync(configPath)) return;
  let content = fs.readFileSync(configPath, 'utf8');
  
  content = content.replace(/'appium:udid':\s*'[^']*'/, `'appium:udid': '${udid}'`);
  content = content.replace(/'appium:platformVersion':\s*'[^']*'/, `'appium:platformVersion': '${androidVersion}'`);
  
  fs.writeFileSync(configPath, content);
}

// Reliable runScript using standard npx ts-node
function runScript(scriptName, fromNumber = null) {
  if (isRunning) return { error: 'Already running' };

  let cmd = 'npx';
  let args = ['ts-node', 'src/main.ts', '--mode', scriptName];
  
  if (fromNumber && fromNumber > 1) {
    args.push('--from', String(fromNumber));
  }

  isRunning = true;
  broadcastLog(`🚀 Starting: ${scriptName}${fromNumber && fromNumber > 1 ? ` (from ${fromNumber})` : ''}`);

  currentProcess = spawn(cmd, args, {
    cwd: PROJECT_ROOT,
    shell: true,
    env: { ...process.env }
  });

  currentProcess.stdout.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim()) broadcastLog(line.trim());
    });
  });

  currentProcess.stderr.on('data', (data) => {
    data.toString().split('\n').forEach(line => {
      if (line.trim() && !line.includes('ERROR webdriver')) {
        broadcastLog(line.trim());
      }
    });
  });

  currentProcess.on('close', (code) => {
    isRunning = false;
    currentProcess = null;
    broadcastLog(`✅ Process finished (exit code: ${code})`);
  });

  return { success: true };
}

// Count SUCCESS/FAILED/PENDING from Excel
function getExcelStatus() {
  try {
    const filePath = path.join(PROJECT_ROOT, 'data', 'users.xlsx');
    if (!fs.existsSync(filePath)) {
      return { total: 0, success: 0, failed: 0, skipped: 0, pending: 0 };
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    let total = 0, success = 0, failed = 0, skipped = 0, pending = 0, failedLogin = 0;

    rows.forEach(row => {
      const username = String(row['Username'] || row['username'] || row['USERNAME'] || '').trim();
      const password = String(row['Password'] || row['password'] || row['PASSWORD'] || '').trim();
      if (!username || !password) return;

      total++;
      const status = String(row['Status'] || row['status'] || '').trim().toUpperCase();
      if (status === 'SUCCESS' || status === 'CHECKIN_OK' || status === 'CHECKOUT_OK' || status === 'OK') {
        success++;
      } else if (status.startsWith('FAILED') || status === 'FAIL' || status.includes('ERR') || status.includes('FAIL')) {
        failed++;
        if (status === 'FAILED_LOGIN') failedLogin++;
      } else if (status === 'SKIPPED') {
        skipped++;
      } else {
        pending++;
      }
    });

    return { total, success, failed, skipped, pending, failedLogin };
  } catch (err) {
    return { total: 0, success: 0, failed: 0, skipped: 0, pending: 0, error: err.message };
  }
}

// --- API Endpoints ---
app.get('/api/status', (req, res) => {
  res.json({ isRunning, activeDevice: getActiveDevice() });
});

app.post('/api/checkin', (req, res) => {
  const from = req.body.from || null;
  const result = runScript('checkin', from);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/checkout', (req, res) => {
  const from = req.body.from || null;
  const result = runScript('checkout', from);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/reset', (req, res) => {
  const result = runScript('reset');
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// PRECISE STOP ENDPOINT (Kills only automation script & chromedriver, leaves Express server safe)
app.post('/api/stop', (req, res) => {
  broadcastLog('⏹ Stopping automation process instantly...');
  
  isRunning = false;
  if (currentProcess) {
    try { currentProcess.kill('SIGKILL'); } catch (e) {}
    currentProcess = null;
  }

  if (process.platform === 'win32') {
    // Targets ONLY processes running src/main.ts, leaving server.js untouched
    exec(`powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*src/main.ts*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, () => {});
    exec('taskkill /f /im chromedriver.exe', () => {});
  } else {
    exec('pkill -f src/main.ts', () => {});
    exec('pkill -f chromedriver', () => {});
  }

  broadcastLog('✅ Automation stopped successfully.');
  res.json({ success: true, message: 'Stopped successfully' });
});

app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logBuffer.forEach(log => {
    const payload = JSON.stringify({ line: log.line, message: log.line, text: log.line });
    res.write(`data: ${payload}\n\n`);
  });

  const client = res;
  sseClients.push(client);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== client);
  });
});

app.get('/api/device', (req, res) => {
  const config = getDeviceConfig();
  res.json({ devices: config.devices, activeDeviceId: config.activeDeviceId, activeDevice: getActiveDevice() });
});

app.post('/api/device', (req, res) => {
  const { name, udid, androidVersion } = req.body;
  if (!name || !udid || !androidVersion) return res.status(400).json({ error: 'Missing parameters' });

  const config = getDeviceConfig();
  let device = config.devices.find(d => d.udid === udid);
  if (!device) {
    device = { id: 'device_' + Date.now(), name, udid, androidVersion, addedAt: new Date().toISOString(), isActive: true };
    config.devices.forEach(d => d.isActive = false);
    config.devices.push(device);
  } else {
    device.name = name;
    device.androidVersion = androidVersion;
    config.devices.forEach(d => d.isActive = (d.id === device.id));
  }
  config.activeDeviceId = device.id;
  fs.writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  updateAppConfig(udid, androidVersion);
  res.json({ success: true, activeDevice: device, devices: config.devices });
});

app.post('/api/device/switch', (req, res) => {
  const { id } = req.body;
  const config = getDeviceConfig();
  const device = config.devices.find(d => d.id === id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  config.devices.forEach(d => d.isActive = (d.id === id));
  config.activeDeviceId = id;
  fs.writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  updateAppConfig(device.udid, device.androidVersion);
  res.json({ success: true, activeDevice: device, devices: config.devices });
});

app.delete('/api/device/:id', (req, res) => {
  const { id } = req.params;
  const config = getDeviceConfig();
  config.devices = config.devices.filter(d => d.id !== id);
  if (config.activeDeviceId === id && config.devices.length > 0) {
    config.activeDeviceId = config.devices[0].id;
    config.devices[0].isActive = true;
    updateAppConfig(config.devices[0].udid, config.devices[0].androidVersion);
  } else if (config.devices.length === 0) {
    config.activeDeviceId = '';
  }
  fs.writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  res.json({ success: true, devices: config.devices });
});

// ROBUST REPORT API
app.get('/api/report', (req, res) => {
  const reportPath = getReportFilePath();
  if (fs.existsSync(reportPath)) {
    try {
      const rawData = fs.readFileSync(reportPath, 'utf8');
      if (!rawData.trim()) {
        return res.json({ totalProcessed: 0, success: 0, failedLogin: 0, failedStep: 0, skipped: 0, results: [] });
      }
      const data = JSON.parse(rawData);
      
      if (Array.isArray(data)) {
        return res.json({
          totalProcessed: data.length,
          success: data.filter(r => String(r.status || r.Status).includes('OK') || String(r.status || r.Status) === 'SUCCESS').length,
          results: data
        });
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse report file', results: [] });
    }
  } else {
    res.json({ totalProcessed: 0, success: 0, failedLogin: 0, failedStep: 0, skipped: 0, results: [] });
  }
});

app.get('/api/excel-status', (req, res) => {
  res.json(getExcelStatus());
});

// --- COMPATIBILITY ALIASES FOR FRONTEND ---
app.post('/api/check-in', (req, res) => {
  const from = req.body.fromNumber || req.body.from || null;
  const result = runScript('checkin', from);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/check-out', (req, res) => {
  const from = req.body.fromNumber || req.body.from || null;
  const result = runScript('checkout', from);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/stats', (req, res) => {
  res.json(getExcelStatus());
});

app.get('/report.json', (req, res) => {
  const reportPath = getReportFilePath();
  if (fs.existsSync(reportPath)) {
    try {
      const rawData = fs.readFileSync(reportPath, 'utf8');
      if (!rawData.trim()) return res.json([]);
      const data = JSON.parse(rawData);
      
      if (data && Array.isArray(data.results)) {
        res.json(data.results);
      } else if (Array.isArray(data)) {
        res.json(data);
      } else {
        res.json([]);
      }
    } catch (err) {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});
// ------------------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});