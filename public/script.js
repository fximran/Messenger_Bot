// Load bot status
async function loadStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success) {
            const hours = Math.floor(data.uptime / 3600);
            const minutes = Math.floor((data.uptime % 3600) / 60);
            const seconds = Math.floor(data.uptime % 60);
            
            document.getElementById('status').innerHTML = `
                <div class="status-item"><strong>🤖 Name:</strong> ${data.botName}</div>
                <div class="status-item"><strong>🔧 Prefix:</strong> ${data.prefix}</div>
                <div class="status-item"><strong>🌐 Language:</strong> ${data.language}</div>
                <div class="status-item"><strong>👑 Admins:</strong> ${data.adminCount}</div>
                <div class="status-item"><strong>🔑 Appstate:</strong> ${data.appstateExists ? '✅ Exists' : '❌ Missing'}</div>
                <div class="status-item"><strong>⏱️ Uptime:</strong> ${hours}h ${minutes}m ${seconds}s</div>
            `;
        } else {
            document.getElementById('status').innerHTML = `<p class="loading">❌ Error: ${data.error}</p>`;
        }
    } catch (error) {
        document.getElementById('status').innerHTML = `<p class="loading">❌ Connection error!</p>`;
    }
}

// Load config
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('configEditor').value = JSON.stringify(data.config, null, 2);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Connection error!');
    }
}

// Update config
async function updateConfig() {
    try {
        const newConfig = JSON.parse(document.getElementById('configEditor').value);
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Config updated successfully!');
            loadStatus();
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        alert('❌ Invalid JSON format!');
    }
}

// Load appstate
async function loadAppstate() {
    try {
        const response = await fetch('/api/appstate');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('appstateEditor').value = JSON.stringify(data.appstate, null, 2);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Connection error!');
    }
}

// Update appstate
async function updateAppstate() {
    try {
        const newAppstate = JSON.parse(document.getElementById('appstateEditor').value);
        const response = await fetch('/api/appstate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAppstate)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Appstate updated successfully!');
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        alert('❌ Invalid JSON format!');
    }
}

// Restart bot
async function restartBot() {
    if (confirm('Are you sure you want to RESTART the bot?')) {
        const response = await fetch('/api/restart', { method: 'POST' });
        const data = await response.json();
        alert(data.message);
        setTimeout(() => { window.location.reload(); }, 3000);
    }
}

// Shutdown bot
async function shutdownBot() {
    if (confirm('Are you sure you want to SHUTDOWN the bot?')) {
        const response = await fetch('/api/shutdown', { method: 'POST' });
        const data = await response.json();
        alert(data.message);
    }
}

// Load logs
async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('logs').textContent = data.logs;
        } else {
            document.getElementById('logs').textContent = 'Error: ' + data.error;
        }
    } catch (error) {
        document.getElementById('logs').textContent = 'Connection error!';
    }
}

// Load all data on page load
loadStatus();
loadConfig();
loadAppstate();
loadLogs();

// Auto refresh every 30 seconds
setInterval(() => {
    loadStatus();
    loadLogs();
}, 30000);