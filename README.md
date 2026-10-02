<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=NEXUS%20BOT%20V1&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=The%20Connected%20Light%20⚡&descAlignY=58&descSize=20" width="100%"/>

# 🚀 NEXUS BOT V1

### _The Connected Light — A Powerful Facebook Messenger Bot_

<br>

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge&logo=github)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)
[![Node.js](https://img.shields.io/badge/Node.js-18.x+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)

[![Stars](https://img.shields.io/github/stars/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/stargazers)
[![Forks](https://img.shields.io/github/forks/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/network/members)
[![Watchers](https://img.shields.io/github/watchers/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/watchers)

<br>

**[Features](#-features) • [Installation](#-installation--setup) • [Commands](#-commands) • [Deployment](#️-deployment) • [Owner](#-owner--contact) • [License](#-license)**

</div>

---

<div align="center">

## 🌟 Overview

</div>

**NEXUS BOT V1** is a **lightweight**, **fast**, and **feature-rich** Facebook Messenger bot built on **Node.js**. It requires **no external database** — everything is managed with local JSON file storage. With a powerful built-in **keep-alive server**, an **AI-powered auto error fix system**, and **auto-download triggers**, NEXUS BOT V1 is optimized for free hosting platforms like **Render**.

> ⚡ **Owner Prefix-less Mode** · 🎨 **Fast Welcome Card** · 🤖 **Auto Error Fix** · 🔗 **Auto-Download** · 🛡️ **Advanced AutoMod**

---

<div align="center">

## ✨ Features

</div>

<table>
<tr>
<td width="50%">

### 🎨 **Visual Features**
- 🖼️ **Fast Welcome Card** — Auto-generates beautiful cards with user avatars, group logo & member stats
- 🔒 **Nickname Lock** — Locks group members' nicknames
- 🏷️ **Auto Bot Nickname** — Auto-changes bot nickname on join
- 💬 **DND Auto-Reply** — Users can set "Do Not Disturb"

</td>
<td width="50%">

### ⚙️ **Functional Features**
- 🚀 **Owner Prefix-less Mode** — Owner can skip `/` prefix
- 🤖 **AI Auto Error Fix** — Real-time command debugging
- 🔗 **Auto-Download Triggers** — Auto-download from links (TikTok/YT/FB)
- 🎵 **Song Downloader** — MP3 with `yt-dlp` + iTunes fallback

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ **Security & Moderation**
- 🚫 **Anti-Link** — Blocks unwanted URLs
- 🤖 **Anti-Bot** — Detects & removes bots
- ⚠️ **Anti-Spam** — Rate-limits spammers
- 🔇 **Group Mute** — Admin-only mode
- ⛔ **Ban System** — Remove & ban users

</td>
<td width="50%">

### 🔋 **System Features**
- 💾 **JSON Storage** — No MongoDB/MySQL required
- ⏰ **Keep-Alive Server** — Prevents sleep on free hosts
- 📊 **HTTP Status Endpoint** — Monitor uptime
- 🔄 **Global Safety Nets** — Auto error recovery

</td>
</tr>
</table>

---

<div align="center">

## 🛠️ Tech Stack

</div>

<div align="center">

| 🧩 Library | 🎯 Purpose | 🔗 Link |
|:-----------|:-----------|:--------|
| **`@dongdev/fca-unofficial`** | Facebook Chat API | [npm](https://www.npmjs.com/package/@dongdev/fca-unofficial) |
| **`ytdlp-nodejs`** | Audio/Video Downloader | [npm](https://www.npmjs.com/package/ytdlp-nodejs) |
| **`fs-extra`** | Enhanced File System | [npm](https://www.npmjs.com/package/fs-extra) |
| **`axios`** | HTTP Client | [npm](https://www.npmjs.com/package/axios) |
| **`node-cache`** | In-Memory Caching | [npm](https://www.npmjs.com/package/node-cache) |
| **`dotenv`** | Env Variables | [npm](https://www.npmjs.com/package/dotenv) |
| **`@denzy-official/youtube_scraper`** | YouTube Scraper | [npm](https://www.npmjs.com/package/@denzy-official/youtube_scraper) |

</div>

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-000000?style=flat-square&logo=json&logoColor=white)

</div>

---

<div align="center">

## 📦 Installation & Setup

</div>

### 📋 Prerequisites

Before running the bot, make sure you have:

- ✅ **Node.js** `v18.x` or higher → [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js)
- ✅ **Git** → [Download](https://git-scm.com/)
- ✅ A **Facebook account** with a valid **AppState/Cookie**

<br>

### 🔧 Step-by-Step Setup

<details>
<summary><b>📥 Click to expand — Installation Steps</b></summary>

<br>

#### **Step 1️⃣ — Clone the Repository**

```bash
git clone https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1.git
cd Nexus-Bot-V1
