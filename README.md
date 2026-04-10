# 🚀 Messenger Bot - Complete Server Setup Guide

A custom-edited Facebook Messenger bot based on the CYBER-BOT-COMMUNITY source project, now with a Web Admin Panel.

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
- Web Admin Panel (Control bot, edit config, manage users)
- Activity Log & Bot Logs Viewer
- Secure Login System with permission levels

---

## 📋 Requirements

- Node.js → 20.18.1 or higher
- npm → 10.0.0 or higher
- PM2 → Latest version
- OS → Ubuntu / Debian / CentOS

---

## ⚙️ Installation

sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
npm install -g pm2

git clone https://github.com/fximran/Messenger_Bot
cd Messenger_Bot
npm install

---

## ⚙️ Configure Bot

1. Copy example config:
   cp config.json.example config.json

2. Edit config.json:
   nano config.json
   - ADMINBOT → Your Facebook ID
   - BOTNAME → Bot name
   - PREFIX → Command prefix
   - language → en / bn / hi

3. Add appstate.json (Facebook cookies) in the root directory.

---

## 🖥️ Web Admin Panel (New!)

The bot includes a web-based control panel accessible at:
http://your-server-ip:3000

### Default Login

- Email: owner@example.com
- Password: owner123

⚠️ Change the default password immediately after first login!

### Panel Features

- Bot Status & Control: Start / Stop / Restart the bot via PM2.
- Config Editor: Edit config.json directly from browser.
- AppState Editor: Update Facebook session cookies easily.
- User Management: Add / Edit / Delete panel users with permission levels.
- Activity Log: Track who did what and when.
- Bot Logs Viewer: See live PM2 logs of the bot.

---

# 🔁 Run Methods

## 🚀 Method 1: Standard Run (Recommended for production)

Use PM2 to keep the bot and panel alive 24/7.

pm2 start Cyber.js --name messenger-bot
pm2 start Jarvis.js --name messenger-panel
pm2 save
pm2 startup

## 🛠️ Method 2: Development Run (Without PM2)

Terminal 1 (Bot): node Cyber.js
Terminal 2 (Panel): node Jarvis.js

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
| Status        | pm2 list                                   |
| Logs (Bot)    | pm2 logs messenger-bot                     |
| Logs (Panel)  | pm2 logs messenger-panel                   |

---

## 🔒 Security Notes

- The web panel is protected by login. Only authorized users can access.
- Keep appstate.json and config.json secure. Do not commit them to public repositories.
- Change the default owner@example.com password immediately.
- Use a firewall to restrict access to port 3000 if needed.

---

## 🙏 Credits

- Original source: CYBER-BOT-COMMUNITY
- Modified & Enhanced by: fximran

---

## ⚠️ Disclaimer

This project is for educational purposes only. Use at your own risk.
The developer is not responsible for any account restrictions or bans caused by misuse.
