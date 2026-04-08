# Messenger Bot - Complete Server Setup Guide

A custom edited Facebook Messenger bot based on the **CYBER-BOT-COMMUNITY** source project.

## Overview

This repository is not the full original version. It has been edited and simplified by removing many unnecessary commands, files, and features.

The purpose of this repo is personal use, testing, and customization.

## Features

- Custom edited bot system
- Lightweight setup
- Removed unnecessary commands
- Simplified project structure
- Ready for further customization
- PM2 process manager support for 24/7 operation

---

## Requirements

| Requirement | Version                  |
| ----------- | ------------------------ |
| Node.js     | 20.18.1 or higher        |
| npm         | 10.0.0 or higher         |
| PM2         | Latest                   |
| OS          | Ubuntu / Debian / CentOS |

---

## Complete Installation (Copy & Paste All Commands)

### Step 1: Install Node.js, Git and PM2

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
npm install -g pm2



```

Step 2: Download and Install Bot
git clone https://github.com/fximran/Messenger_Bot
cd Messenger_Bot
npm install

Step 3: Configure Bot
cp config.json.example config.json
nano config.json

Edit these values in config.json:
ADMINBOT: Add your Facebook ID
BOTNAME: Your bot name
PREFIX: Command prefix (default: /)
language: en/bn/hi

Step 4: Run Bot with PM2
pm2 start Jarvis.js --name messenger-bot
pm2 save
pm2 startup

Step 5: PM2 Management Commands
Action Command
Check status pm2 list
View logs pm2 logs messenger-bot
Stop bot pm2 stop messenger-bot
Restart bot pm2 restart messenger-bot
Delete bot pm2 delete messenger-bot
Monitor pm2 monit

Important
Before running the bot, make sure your configuration and appstate are set correctly.

Credits
Base source: CYBER-BOT-COMMUNITY

Modified by: fximran

Warning
This project is shared as a modified version for personal/educational purposes only. Use it carefully and responsibly.
