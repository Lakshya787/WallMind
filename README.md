# WallMind 🏢

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r183-black.svg)](https://threejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg)](https://nodejs.org/)

**WallMind** is an intelligent engineering platform that converts 2D floor plan images into interactive, structured 3D models with detailed material analysis and cost estimation.

## 🚀 The Vision
Bridging the gap between a simple sketch and engineering reality. WallMind uses computer vision and deterministic geometry logic to reconstruct floor plans into 3D environments, helping users visualize spaces and understand material requirements before a single brick is laid.

## ✨ Key Features
- **🖼️ Image to 3D**: Upload a PNG/JPG floor plan and get a reconstructed 3D model in seconds.
- **🏗️ Structural Intelligence**: Automatically classifies load-bearing vs. partition walls.
- **💎 Material Recommendations**: Detailed suggestions for wall materials based on strength, durability, and cost.
- **🎮 Interactive Viewer**: Explore your reconstructed model in a high-performance Three.js environment.
- **🌐 Web3 Integration**: Manage credits and features via the Stellar blockchain (Freighter Wallet).
- **🔒 Secure Auth**: robust authentication flow with JWT and email verification via Brevo.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **3D Engine**: Three.js, React Three Fiber, React Three Drei
- **Styling**: Tailwind CSS v4 + Lucide React
- **Web3**: Stellar SDK, Freighter API
- **Animations**: Lottie / Framer Motion

### Backend
- **Server**: Node.js + Express
- **Database**: MongoDB (Atlas)
- **Processing Engine**: Python (OpenCV/NumPy logic)
- **Communication**: Brevo API (Transactional Emails)
- **Security**: JWT (JSON Web Tokens) & Cookie-based sessions

## 🏗️ Project Structure
```bash
wallmind/
├── backend/            # Express server & Python processing engine
│   ├── src/            # Backend source code (Auth, Analysis, Payments)
│   ├── parser.py       # Core CV engine for floor plan parsing
│   └── temp/           # Temporary processing cache
├── frontend/           # React dashboard & 3D visualization
│   ├── src/            # Components, Hooks, Contexts, Pages
│   └── public/         # Static assets & icons
└── README.md           # You are here!
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.x
- MongoDB Atlas account
- Freighter Wallet (for blockchain features)

### 1. Setup Backend
```bash
cd backend
npm install
# Setup .env file with MONGODB_URI, BREVO_API_KEY, JWT_SECRET, etc.
npm run dev
```

### 2. Setup Frontend
```bash
cd frontend
npm install
# Setup .env with VITE_API_BASE_URL (http://localhost:5010/api/v1)
npm run dev
```

## ⚙️ Core Logic (How it works)
1. **Input**: A floor plan image is uploaded.
2. **Parsing**: The Python engine detects pixel-perfect wall segments and room boundaries.
3. **Reconstruction**: Geometry is converted into a structured graph (nodes and edges).
4. **Classification**: Walls are analyzed for their structural role (load-bearing vs. partition).
5. **Output**: A comprehensive JSON report containing 3D coordinates and material scores is sent to the frontend.
6. **Rendering**: Three.js extrudes 2D coordinates into a navigable 3D world.

---

Built with ❤️ by the WallMind Team | [Live Demo](https://wall-mind.vercel.app/)
