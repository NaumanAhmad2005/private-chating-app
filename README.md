<div align="center">
  <img src="https://blur-talk.onrender.com/logo-192.png" alt="Blur Talk Logo" width="100" height="100" style="border-radius:24px;" />
  <h1>Blur Talk</h1>
  <p><strong>Anonymous · Ephemeral · Encrypted</strong></p>
  <p>
    <a href="https://blur-talk.onrender.com">🔗 blur-talk.onrender.com</a> &nbsp;·&nbsp;
    <a href="#-running-locally">Run Locally</a> &nbsp;·&nbsp;
    <a href="#%EF%B8%8F-tech-stack">Tech Stack</a>
  </p>
</div>

---

**Blur Talk** is a beautifully crafted, fully anonymous real-time chat application. Connect instantly, chat freely, and leave no trace behind. No accounts, no passwords, no logs — just a random identity and a secure conversation.

> 🌐 **Live at:** [https://blur-talk.onrender.com](https://blur-talk.onrender.com)  
> 📲 **Install as an app** — open the link on any mobile or desktop browser and tap *"Add to Home Screen"*

---

## ✨ Features

### 🔒 Privacy & Security
- **Complete Anonymity** — No accounts, emails, or passwords. A random username and unique avatar are generated on every visit.
- **End-to-End Encryption (E2EE)** — DM conversations use ECDH key exchange + AES-GCM encryption via the Web Crypto API. Messages are encrypted on-device; the server only ever sees ciphertext.
- **Encrypted Global Chat** — The global room uses a shared AES-GCM key so messages are encrypted in transit.
- **Zero Persistence** — No database. All messages and sessions live in RAM only. Everything is wiped when the server restarts.

### 💬 Chat
- **Global Room** — Join an always-on public chat room shared with all online users.
- **Private DMs** — Click any online user to start an end-to-end encrypted private conversation.
- **Image Sharing** — Send images in both global chat and DMs (base64 encoded, up to 5 MB).
- **Reply to Messages** — Inline reply threading with quoted message previews.
- **Reply Privately** — Reply to a global message directly in a private DM with one tap.
- **Typing Indicators** — See when someone is typing in real time.
- **DM Persistence** — DM conversations survive temporary disconnects and are restored on reconnect.

### 📱 Progressive Web App (PWA)
- **Installable** — Works as a native-feeling app on Android, iOS, and desktop (Chrome, Edge, Safari).
- **Offline Shell** — Service worker caches the app shell for instant subsequent loads.
- **Custom Splash Screen** — Animated Blur Talk logo with a gradient title and spinner on first load.
- **Theme Color** — Purple system UI bar on Android Chrome.
- **App Icons** — Full icon set: 512 × 512, 192 × 192, Apple Touch Icon (180 × 180), and favicons.

### 🎨 UI/UX
- **Dark & Light Mode** — Toggle instantly; preference is saved in `localStorage`.
- **Mobile-First** — Bulletproof virtual keyboard handling via `interactive-widget=resizes-content` + `visualViewport` sync.
- **Swipe-to-Reply** — Native swipe gestures on mobile for inline replies.
- **Slide-out Sidebar** — Responsive drawer on mobile, always-visible panel on desktop.
- **Emoji Picker** — Full emoji picker integrated into the message input bar.
- **Toast Notifications** — In-app banner alerts for incoming DMs with a one-tap *Open* action.
- **Browser Push Notifications** — Optional native notifications for new DMs (when permission is granted).
- **Glassmorphism Design** — Frosted-glass panels, smooth gradients, rounded corners, and subtle animations throughout.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 (via Vite) |
| **Styling** | Tailwind CSS v3 |
| **Real-time** | Socket.io-Client |
| **Encryption** | Web Crypto API (ECDH + AES-GCM) |
| **PWA** | Custom Service Worker + Web App Manifest |
| **Backend Runtime** | Node.js + Express |
| **WebSockets** | Socket.io |
| **Storage** | In-Memory (ephemeral, no database) |
| **Security** | `xss-clean`, `express-rate-limit` |
| **Avatars** | [DiceBear Avataaars](https://www.dicebear.com/) API |
| **Deployment** | [Render](https://render.com) |

---

## 🚀 Running Locally

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### 1. Clone the repository
```bash
git clone https://github.com/NaumanAhmad2005/private-chating-app.git
cd private-chating-app
```

### 2. Start the Backend
```bash
cd server
npm install
npm run dev
```
> Server starts on `http://localhost:3001`

### 3. Start the Frontend
Open a **new terminal**:
```bash
cd client
npm install
npm run dev
```
> Client starts on `http://localhost:3000`

Open `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
.
├── client/                  # React frontend (Vite)
│   ├── public/
│   │   ├── manifest.webmanifest   # PWA manifest
│   │   ├── sw.js                  # Service worker
│   │   ├── logo-512.png           # App icon (512×512)
│   │   ├── logo-192.png           # App icon (192×192)
│   │   └── apple-touch-icon.png   # iOS home screen icon
│   └── src/
│       ├── components/      # UI components (ChatPanel, MessageInput, etc.)
│       ├── context/         # ChatContext (global state)
│       ├── hooks/           # useSocket
│       ├── utils/
│       │   ├── encryption.js      # ECDH + AES-GCM Web Crypto helpers
│       │   └── usernameGenerator.js
│       ├── App.jsx          # Root app component & socket event wiring
│       └── main.jsx         # React entry point + SW registration trigger
│
└── server/                  # Node.js backend
    └── src/
        ├── socket/
        │   └── handlers.js  # All Socket.io event handlers
        └── store/
            └── inMemoryStore.js   # Ephemeral in-RAM data store
```

---

## 🔐 How Encryption Works

### Direct Messages (E2EE)
1. On load, each client generates an **ECDH P-256 key pair** in the browser.
2. The public key is shared with the server when joining.
3. When a DM is created, both parties exchange public keys.
4. Each client derives a **shared AES-GCM secret** locally — the server never sees it.
5. All DM messages are encrypted before sending and decrypted after receiving.

### Global Chat
- A deterministic **shared AES-GCM key** is derived from a fixed passphrase using PBKDF2.
- All global messages are encrypted in transit, providing transport-layer confidentiality.

---

## 💡 Ephemerality

Blur Talk uses a strict **in-memory data store** on the Node.js server:
- ❌ No database (no MongoDB, Postgres, Redis, etc.)
- ✅ All messages, users, and DM rooms live purely in RAM
- ✅ Server restart = complete wipe — absolute privacy guaranteed

---

## 📱 Mobile Keyboard Handling

Blur Talk uses cutting-edge web standards to handle the notoriously tricky mobile virtual keyboard:
- `interactive-widget=resizes-content` in the viewport meta tag
- `window.visualViewport` resize + scroll listeners
- Rigid layout that pushes the input bar above the keyboard without any scroll jumping

---

*Built with ❤️ for private, seamless, trace-free communication.*
