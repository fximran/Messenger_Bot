# 🚀 Messenger Bot - Complete Server Setup Guide

A custom-edited Facebook Messenger bot based on the **CYBER-BOT-COMMUNITY** source project.

---

## 📌 Overview

This repository is a **modified and simplified version** of the original project.  
Unnecessary commands, files, and features have been removed to make it:

- ⚡ Lightweight
- 🧹 Clean & structured
- 🔧 Easy to customize

> This project is mainly intended for **personal use, testing, and learning purposes**.

---

## ✨ Features

- 🛠️ Custom edited bot system
- ⚡ Lightweight & fast setup
- 🧹 Clean project structure
- 🔌 Easy to extend & customize
- 📡 Command-based interaction system
- 🔁 24/7 running support using **PM2**

---

## 📋 Requirements

| Requirement | Version                  |
| ----------- | ------------------------ |
| Node.js     | 20.18.1 or higher        |
| npm         | 10.0.0 or higher         |
| PM2         | Latest version           |
| OS          | Ubuntu / Debian / CentOS |

---

## ⚙️ Complete Installation Guide

### 🔹 Step 1: Install Node.js, Git & PM2

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
npm install -g pm2
```

---

### 🔹 Step 2: Download & Install Bot

```bash
git clone https://github.com/fximran/Messenger_Bot
cd Messenger_Bot
npm install
```

---

### 🔹 Step 3: Configure Bot

```bash
cp config.json.example config.json
nano config.json
```

Edit the following values:

- `ADMINBOT` → Your Facebook User ID
- `BOTNAME` → Your bot name
- `PREFIX` → Command prefix (default: `/`)
- `language` → `en` / `bn` / `hi`

---

### 🔹 Step 4: Run Bot with PM2 (24/7)

```bash
pm2 start Jarvis.js --name messenger-bot
pm2 save
pm2 startup
```

---

## 📊 PM2 Management Commands

| Action       | Command                     |
| ------------ | --------------------------- |
| Check status | `pm2 list`                  |
| View logs    | `pm2 logs messenger-bot`    |
| Stop bot     | `pm2 stop messenger-bot`    |
| Restart bot  | `pm2 restart messenger-bot` |
| Delete bot   | `pm2 delete messenger-bot`  |
| Monitor      | `pm2 monit`                 |

---

## ⚠️ Important Notes

- ✅ Make sure `config.json` is properly configured
- ✅ Ensure your **appstate** is valid and up-to-date
- ❗ Without correct appstate, the bot will not work

---

## 🙏 Credits

- **Base Source:** CYBER-BOT-COMMUNITY
- **Modified By:** fximran

---

## ⚠️ Disclaimer

This project is shared for **educational and personal use only**.  
Use it responsibly. The author is not responsible for misuse or any violation of platform policies.

---

## 💡 Future Improvements (Optional)

- 🤖 AI integration (ChatGPT / local LLM)
- 🧠 Smart auto-reply system
- 🧩 Plugin-based command system
- 📊 User tracking / database system
