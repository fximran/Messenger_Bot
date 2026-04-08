cat << 'EOF' > README.md

# 🚀 Messenger Bot - Complete Server Setup Guide

A custom-edited Facebook Messenger bot based on the CYBER-BOT-COMMUNITY source project.

---

## 📌 Overview

This repository is a modified and simplified version of the original project.  
Unnecessary commands, files, and features have been removed to make it:

- Lightweight
- Clean & structured
- Easy to customize

This project is mainly intended for personal use, testing, and learning purposes.

---

## ✨ Features

- Custom edited bot system
- Lightweight & fast setup
- Clean project structure
- Easy to extend & customize
- Command-based interaction system
- 24/7 running support using PM2

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

cp config.json.example config.json  
nano config.json

Edit:  
ADMINBOT → Your Facebook ID  
BOTNAME → Bot name  
PREFIX → Command prefix  
language → en / bn / hi

---

# 🔁 Run Methods

## 🚫 Method 1: Without Keepalive (Manual)

Step 1: Generate Appstate  
Browser থেকে cookie নিয়ে appstate.json বানান

Step 2: Start Bot  
pm2 start Jarvis.js --name messenger-bot

Step 3: Session Expire হলে  
নতুন cookie দিয়ে appstate.json আপডেট করুন

pm2 restart messenger-bot

---

## 🔁 Method 2: With Keepalive (Auto Refresh)

Step 1: Create Keepalive File  
nano keepalive.js

Email & Password দিন

Step 2: Start Keepalive  
pm2 start keepalive.js --name session-keepalive

Step 3: Start Bot  
pm2 start Jarvis.js --name messenger-bot

এরপর আর কিছু করার দরকার নেই (auto refresh হবে)

---

# 📊 PM2 Commands

Start  
pm2 start Jarvis.js --name messenger-bot  
pm2 start keepalive.js --name session-keepalive

Restart  
pm2 restart messenger-bot  
pm2 restart session-keepalive

Stop  
pm2 stop messenger-bot  
pm2 stop session-keepalive

Delete  
pm2 delete messenger-bot  
pm2 delete session-keepalive

Status  
pm2 list

Logs  
pm2 logs messenger-bot  
pm2 logs session-keepalive

---

## ⚠️ Important Notes

- appstate.json ছাড়া bot চলবে না
- Keepalive ব্যবহার করলে auto session refresh হবে
- Login info secure রাখুন

---

## 🙏 Credits

CYBER-BOT-COMMUNITY  
Modified by fximran

---

## ⚠️ Disclaimer

Educational purpose only. Use at your own risk.

EOF
