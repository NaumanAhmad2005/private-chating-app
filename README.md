# 💬 Blur Talk - Anonymous Ephemeral Chat

![Blur Talk](https://blur-talk.onrender.com/vite.svg)

**Blur Talk** is a beautifully crafted, fully anonymous real-time chat application. Connect instantly, chat freely, and leave no trace behind. Designed with a mobile-first philosophy, it features a premium "floating bubble" user interface, seamless dark/light modes, and buttery-smooth real-time interactions.

🔗 **Live Demo:** [https://blur-talk.onrender.com](https://blur-talk.onrender.com)

---

## ✨ Features

* **Complete Anonymity:** No accounts, no passwords, no logs. You are assigned a randomly generated username and unique avatar upon joining.
* **Global & Private Chat:** Participate in the global room, or click on any online user to start a seamless private Direct Message (DM).
* **Stunning UI/UX:** Built with Tailwind CSS, featuring deeply rounded "floating panels", glassmorphism modals, and smooth CSS transitions.
* **Mobile-First Excellence:**
  * Native-feeling **Swipe-to-Reply** gestures on mobile devices.
  * Bulletproof virtual keyboard handling using the modern `interactive-widget` web standard—say goodbye to input jumping!
  * Beautiful responsive slide-out sidebar.
* **Desktop Enhancements:**
  * Custom **Emoji Picker** fully integrated into the input bar.
  * Hover-to-reply message actions.
* **Smart Notifications:** In-app toast banners alert you of incoming private messages, sticking around just long enough to let you jump straight into the conversation.
* **Dark & Light Mode:** Toggle instantly between a sleek dark theme and a clean light theme.

---

## 🛠️ Tech Stack

**Frontend:**
* React (via Vite)
* Tailwind CSS (for rapid, responsive, highly-customized styling)
* Socket.io-Client (for real-time duplex communication)

**Backend:**
* Node.js & Express
* Socket.io (WebSocket handling, broadcasting, and room management)
* In-Memory Store (Ensuring true ephemerality—messages vanish when the server restarts)

**External APIs:**
* [DiceBear](https://www.dicebear.com/) (For generating beautiful, unique SVGs avatars automatically)

---

## 🚀 Running Locally

Want to run Blur Talk on your own machine? It's easy!

### 1. Clone the repository
```bash
git clone https://github.com/NaumanAhmad2005/private-chating-app.git
cd private-chating-app
```

### 2. Setup the Backend
```bash
cd server
npm install
npm run dev
```
*The server will start on `http://localhost:3001`*

### 3. Setup the Frontend
Open a new terminal window:
```bash
cd client
npm install
npm run dev
```
*The client will start and typically be accessible at `http://localhost:5173`*

---

## 💡 How It Works (Ephemerality)

Blur Talk uses a strict in-memory data store on the Node.js server. 
* There is **no database** (no MongoDB, Postgres, etc.).
* All messages, active rooms, and usernames are kept purely in RAM.
* If the server restarts, everything is wiped clean forever, ensuring absolute privacy.

## 📱 Mobile Keyboard Handling

Blur Talk implements cutting-edge web standards to handle the notoriously tricky mobile virtual keyboard. By utilizing `interactive-widget=resizes-content` in the viewport meta tag combined with `window.visualViewport` synchronization, the app maintains a rigid layout that cleanly pushes the input box above the keyboard without allowing the browser to forcefully scroll or pan the interface out of bounds.

---

*Built with ❤️ for private, seamless communication.*
