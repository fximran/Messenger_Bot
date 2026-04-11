# 🚀 Messenger Bot - Complete Server Setup Guide

A custom-edited Facebook Messenger bot based on the CYBER-BOT-COMMUNITY source project, now with a **Web Admin Panel** using EJS templates.

---

## 📌 Overview

This repository is a modified and simplified version of the original project.  
Unnecessary commands, files, and features have been removed to make it:

- Lightweight
- Clean & structured
- Easy to customize
- Manageable via Web Panel

This project is mainly intended for personal use, testing, and learning purposes.

---

## ✨ Features

- Custom edited bot system
- Lightweight & fast setup
- Clean project structure
- Easy to extend & customize
- Command-based interaction system
- 24/7 running support using PM2
- **Web Admin Panel** (Control bot, edit config, manage users)
- **Activity Log & Bot Logs Viewer**
- **Auto-clean old activity logs (30 days)**
- **Secure Login System** with permission levels

---

## 📋 Requirements

- Node.js → 20.18.1 or higher
- npm → 10.0.0 or higher
- PM2 → Latest version
- OS → Ubuntu / Debian / CentOS

---

## ⚙️ Installation

1. Update system and install Node.js:
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git

1. Clone the repository and install dependencies:
   git clone https://github.com/fximran/Messenger_Bot
   cd Messenger_Bot

1. Install npm:
   npm install

1. Install PM2 globally:
   npm install -g pm2

1. Install PM2 globally:
   npm install -g pm2

1. Install PM2 globally:
   npm install bcrypt express-session sqlite3 node-cron multer

1. Install PM2 globally:
   npm install ejs

1. Install PM2 globally:
   npm install archiver

1. **IMPORTANT: Install additional required packages for the Web Panel:**
   npm install bcrypt express-session sqlite3 node-cron ejs

   _Explanation of these packages:_
   - `bcrypt` : For password hashing (security)
   - `express-session` : For user login sessions
   - `sqlite3` : For storing user data and activity logs
   - `node-cron` : For auto-cleaning old logs daily
   - `ejs` : Template engine for rendering dynamic web pages

---

## ⚙️ Configure Bot

1. Copy example config:
   cp config.json.example config.json

1. Copy example appstate:
   cp appstate.json.example appstate.json

1. Edit `config.json`:
   nano config.json

   Modify these fields:
   - `ADMINBOT` : Your Facebook user ID(s) as an array
   - `NDH` : Your Bot's Facebook ID (first ID in array)
   - `BOTNAME` : The name of your bot
   - `PREFIX` : Command prefix (e.g., "/")
   - `language` : "en", "bn", or "hi"
   - `DEBUG_MODE`: true or false

1. Add `appstate.json` (Facebook cookies) in the root directory.
   Without this, the bot cannot log in.

---

## 🖥️ Web Admin Panel

The bot includes a **web-based control panel** accessible at:

### 🔑 Default Login

- **Email:** `owner@example.com`
- **Password:** `owner123`

⚠️ **Change the default password immediately after first login!**
(Go to Members Management -> Edit User)

### 📊 Panel Features

- **Bot Status & Control:** Start / Stop / Restart the bot via PM2.
- **Quick Settings:** Edit `BOTNAME`, `PREFIX`, `language`, `DEBUG_MODE`, `ADMINBOT`, `NDH`.
- **Config Editor:** Edit `config.json` directly from your browser.
- **AppState Editor:** Update Facebook session cookies easily.
- **User Management:** Add / Edit / Delete panel users with permission levels (0=Member, 1=Mod, 2=Admin, 3=Owner).
- **Activity Log:** Track who did what and when.
- **Bot Logs Viewer:** See live PM2 logs of the bot.

---

# 🔁 Run Methods

## 🚀 Method 1: Standard Run (Recommended for 24/7)

Use PM2 to keep both the bot and the panel alive.

1. Start the bot (main process):
   pm2 start Cyber.js --name messenger-bot

2. Start the web panel:
   pm2 start Jarvis.js --name messenger-panel

3. Save PM2 process list for auto-start on reboot:
   pm2 save
   pm2 startup

## 🛠️ Method 2: Development Run (Without PM2)

Open two terminal windows/tabs:

- **Terminal 1 (Bot):** `node Cyber.js`
- **Terminal 2 (Panel):** `node Jarvis.js`

---

# 📊 PM2 Commands

| Action        | Command                                    |
| ------------- | ------------------------------------------ |
| Start Bot     | pm2 start Cyber.js --name messenger-bot    |
| Start Panel   | pm2 start Jarvis.js --name messenger-panel |
| Restart Bot   | pm2 restart messenger-bot                  |
| Restart Panel | pm2 restart messenger-panel                |
| Stop Bot      | pm2 stop messenger-bot                     |
| Stop Panel    | pm2 stop messenger-panel                   |
| Delete Bot    | pm2 delete messenger-bot                   |
| Delete Panel  | pm2 delete messenger-panel                 |
| List all      | pm2 list                                   |
| Bot Logs      | pm2 logs messenger-bot                     |
| Panel Logs    | pm2 logs messenger-panel                   |

---

## 🔒 Security Notes

- The web panel is protected by login. Only authorized users can access.
- Keep `appstate.json` and `config.json` secure. **NEVER** commit them to public repositories.
- Change the default `owner@example.com` password immediately.
- Use a firewall (`ufw`) to restrict access to port `3000` if needed.

---

## 🙏 Credits

- Original source: CYBER-BOT-COMMUNITY
- Modified & Enhanced by: **fximran**

---

## ⚠️ Disclaimer

This project is for educational purposes only. Use at your own risk.
The developer is not responsible for any account restrictions or bans caused by misuse.
