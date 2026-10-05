<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=220&section=header&text=NEXUS%20BOT%20V1&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=The%20Connected%20Light%20⚡&descAlignY=60&descSize=22" width="100%"/>

### _A Powerful Facebook Messenger Bot — 100% Free, No Database, Docker Ready_

<br>

[![Version](https://img.shields.io/badge/version-4.0.0-blue?style=for-the-badge&logo=github)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)
[![Commands](https://img.shields.io/badge/Commands-137+-orange?style=for-the-badge)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)

[![Stars](https://img.shields.io/github/stars/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/stargazers)
[![Forks](https://img.shields.io/github/forks/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/network/members)
[![Watchers](https://img.shields.io/github/watchers/mdshihabhossein777-alt/Nexus-Bot-V1?style=social)](https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1/watchers)

<br>

**[Features](#-features) • [Setup](#-installation--setup) • [Commands](#-commands) • [Deployment](#️-deployment) • [Owner](#-owner--contact) • [License](#-license)**

</div>

---

<div align="center">

## 🌟 Overview

</div>

**NEXUS BOT V1** is a **lightweight**, **fast**, and **feature-rich** Facebook Messenger bot built with **Node.js**. It requires **no external database** — everything is managed with local JSON file storage. With a built-in **keep-alive server**, **AI-powered auto error fix**, **auto-download triggers**, and **137+ commands**, NEXUS BOT V1 is optimized for **free hosting platforms** like **Render** (Docker deployment).

> ⚡ **Owner Prefix-less Mode** · 🎨 **Cloud Storage** · 🤖 **AI Voice Clone** · 🔗 **Auto-Download** · 🛡️ **Advanced AutoMod** · 🎬 **Anime Image Search**

---

<div align="center">

## ✨ Features

</div>

<table>
<tr>
<td width="50%">

### 🎨 **Visual & Creative**
- 🖼️ **Fast Welcome Card** — auto-generated with avatars, group logo & stats
- 💕 **Pair Card** — auto gender detection (FB + AI + Name DB)
- 🏆 **Premium Rank Card** — tiers, XP, progress bar
- ✨ **Prefix Card** — premium canvas design
- 🎬 **Image Edit Tools** — blur, wasted, triggered, jail, wanted, deepfry
- 🎨 **AI Image Gen** — genimg, toanime, tocartoon (no API key)
- 🔍 **Sayo Image Search** — Jikan + AniList + Bing + DDG

</td>
<td width="50%">

### ⚙️ **Functional**
- 🚀 **Owner Prefix-less Mode**
- 🤖 **AI Auto Error Fix** (real-time)
- 🔗 **Auto-Download Triggers** (TikTok/YT/FB)
- 🎵 **Song Downloader** (yt-dlp + iTunes fallback)
- ☁️ **Cloud Storage** (Catbox + fallback)
- 🎙️ **Voice Clone** (multi-API: Fish + MiniMax + HF)
- 🌐 **Multi-Language** (32 languages)

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ **Security & Moderation**
- 🚫 **Anti-Link** (extended URL detection)
- 🤖 **Anti-Bot** — auto-kick bots
- ⚠️ **Anti-Spam** — rate-limit
- 🔇 **Group Mute** — admin-only mode
- ⛔ **Ban System** — with warnings
- 😡 **Angry Emoji Delete** — auto-unsend on 😡
- 🚫 **Blacklist / Whitelist** — user control

</td>
<td width="50%">

### 🔋 **System & Tools**
- 💾 **JSON Storage** — no DB needed
- ⏰ **Keep-Alive Server** — 24/7 uptime
- 📊 **HTTP Endpoints** — `/ping`, `/status`
- 🔄 **Auto Recovery** — global safety nets
- 🎛️ **Makecmd / Editcmd / Delcmd** — runtime command CRUD
- 🌐 **GitHub Auto-Push** — via API
- 🚀 **Render Deploy Hook** — manual `/deploy`

</td>
</tr>
</table>

---

<div align="center">

## 🛠️ Tech Stack

</div>

<div align="center">

| 🧩 Library | 🎯 Purpose |
|:-----------|:-----------|
| **`@dongdev/fca-unofficial`** | Facebook Chat API (unofficial) |
| **`@napi-rs/canvas`** | High-performance image rendering |
| **`ytdlp-nodejs`** | Audio/Video downloader |
| **`fs-extra`** | Enhanced file system |
| **`axios`** | HTTP requests |
| **`node-cache`** | In-memory caching |
| **`edge-tts`** | Text-to-speech (300+ voices) |
| **`form-data`** | Multipart uploads |
| **`dotenv`** | Environment variables |
| **`yt-search`** | YouTube search |

</div>

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js 22](https://img.shields.io/badge/Node.js%2022-339933?style=flat-square&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-000000?style=flat-square&logo=json&logoColor=white)

</div>

---

<div align="center">

## 📦 Installation & Setup

</div>

### 📋 Prerequisites

- ✅ **Node.js** `v22.x` or higher → [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js)
- ✅ **Git** → [Download](https://git-scm.com/)
- ✅ A **Facebook account** with valid **AppState**

<br>

<details>
<summary><b>📥 Click to expand — Installation Steps</b></summary>

<br>

#### **Step 1️⃣ — Clone the Repository**

```bash
git clone https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1.git
cd Nexus-Bot-V1
