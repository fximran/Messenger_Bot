const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");
const fs = require("fs");

// ==================== Stop file check ====================
const stopFile = path.join(__dirname, "stop.txt");
let isStopping = false;

function checkStopFile() {
    if (isStopping) return;
    if (fs.existsSync(stopFile)) {
        isStopping = true;
        logger("Stop file detected. Shutting down...", "[ STOP ]");
        process.exit(0);
    }
}

// Check every 3 seconds
setInterval(checkStopFile, 3000);

// Handle termination signals
process.on("SIGINT", () => {
    logger("Received SIGINT. Shutting down...", "[ STOP ]");
    process.exit(0);
});
process.on("SIGTERM", () => {
    logger("Received SIGTERM. Shutting down...", "[ STOP ]");
    process.exit(0);
});

// ==================== Load package.json ====================
let pkg = {};
try {
    pkg = require(path.join(__dirname, "package.json"));
} catch (err) {
    logger(`Failed to load package.json: ${err.message}`, "[ Error ]");
}
const BOT_NAME = pkg.name || "Islamick Bot";
const BOT_VERSION = pkg.version || "5.0.0";
const BOT_DESC = pkg.description || "Islamick Chat Bot";

// ==================== Express Server ====================
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/stop", (req, res) => {
    fs.writeFileSync(stopFile, "stopped");
    res.send("Bot stopping...");
});

app.get("/status", (req, res) => {
    const isRunning = !fs.existsSync(stopFile);
    res.json({ status: isRunning ? "running" : "stopped" });
});

app.listen(port, () => {
    logger(`Server is running on port ${port}...`, "[ Starting ]");
}).on("error", (err) => {
    if (err.code === "EACCES") {
        logger(`Permission denied. Cannot bind to port ${port}.`, "[ Error ]");
    } else {
        logger(`Server error: ${err.message}`, "[ Error ]");
    }
});

// ==================== Start Bot ====================
global.countRestart = global.countRestart || 0;

function startBot(message) {
    if (message) logger(message, "[ Starting ]");

    // Remove stop file if exists on fresh start
    if (fs.existsSync(stopFile)) {
        fs.unlinkSync(stopFile);
    }

    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "Cyber.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    child.on("close", (codeExit) => {
        // Check if stopped by user (stop.txt exists)
        if (fs.existsSync(stopFile)) {
            logger("Bot stopped by user command.", "[ STOPPED ]");
            return;
        }
        
        if (codeExit !== 0 && global.countRestart < 5) {
            global.countRestart += 1;
            logger(`Bot exited with code ${codeExit}. Restarting... (${global.countRestart}/5)`, "[ Restarting ]");
            startBot();
        } else {
            logger(`Bot stopped after ${global.countRestart} restarts.`, "[ Stopped ]");
        }
    });

    child.on("error", (error) => {
        logger(`An error occurred: ${JSON.stringify(error)}`, "[ Error ]");
    });
}

// ==================== Log Meta Info ====================
logger(BOT_NAME, "[ NAME ]");
logger(`Version: ${BOT_VERSION}`, "[ VERSION ]");
logger(BOT_DESC, "[ DESCRIPTION ]");

// ==================== GitHub Update Check (Optional) ====================
axios.get("https://raw.githubusercontent.com/cyber-ullash/cyber-bot/main/data.json")
    .then((res) => {
        logger(res.data.name || BOT_NAME, "[ UPDATE NAME ]");
        logger(`Version: ${res.data.version || BOT_VERSION}`, "[ UPDATE VERSION ]");
        logger(res.data.description || BOT_DESC, "[ UPDATE DESCRIPTION ]");
    })
    .catch((err) => {
        logger(`Failed to fetch update info: ${err.message}`, "[ Update Error ]");
    });

// ==================== Start Bot ====================
startBot();