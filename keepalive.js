const fs = require('fs');
const login = require('cyber-bot-fca');
const { exec } = require('child_process');

// আপনার ফেসবুক লগইন তথ্য দিন
const EMAIL = "your_email@example.com";
const PASSWORD = "your_password";

const appStatePath = __dirname + '/appstate.json';

function refreshSession() {
    const now = new Date();
    console.log(`[${now.toLocaleString()}] 🔄 Refreshing session...`);
    
    login({ email: EMAIL, password: PASSWORD }, (err, api) => {
        if (err) {
            console.log(`[${now.toLocaleString()}] ❌ Login failed:`, err.message || err);
            return;
        }
        
        const newAppState = api.getAppState();
        fs.writeFileSync(appStatePath, JSON.stringify(newAppState, null, 2));
        console.log(`[${now.toLocaleString()}] ✅ appstate.json refreshed!`);
        
        exec('pm2 restart messenger-bot', (error) => {
            if (error) console.log(`[${now.toLocaleString()}] ❌ Restart error:`, error.message);
            else console.log(`[${now.toLocaleString()}] 🔄 Bot restarted`);
        });
    });
}

// 6 ঘন্টা = 21600000 ms
const intervalTime = 6 * 60 * 60 * 1000;

console.log(`🔄 Keepalive started. Refresh every 6 hours`);
refreshSession();
setInterval(refreshSession, intervalTime);