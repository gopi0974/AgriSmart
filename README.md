# 🌾 AgriSmart — AI-Powered Vegetable Marketplace

> Connecting farmers directly with consumers using AI-driven price intelligence for Andhra Pradesh's Digital Transparency Initiative.

![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.10+-blue)
![React](https://img.shields.io/badge/react-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Price Prediction** | Random Forest ML model trained on 3-year historical data + seasonal yields |
| 🧑‍🌾 **Farmer Portal** | List crops with quantity, district, pricing, and contact info |
| 🛒 **Consumer Marketplace** | Browse, search, and order vegetables from local farmers |
| 🗺️ **Map Search** | Integrated Leaflet map with live lat/lon coordinates |
| ☁️ **Weather-Aware Scoring** | Intelligent recommendations based on seasonal peak yields |
| 📊 **Analytics Dashboard** | Real-time system monitoring, MAE accuracy, and training metrics |
| 🔐 **JWT Auth** | Secure farmer & consumer authentication with bcrypt password hashing |
| 🧾 **PDF Receipts** | Auto-generated order receipts with delivery/pickup details |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Leaflet (Maps) + Zustand (State) + React Router DOM

**Backend**
- Python 3.10+ + FastAPI + Uvicorn
- Pandas + Scikit-learn (Random Forest) + Joblib
- JWT (`python-jose`) + bcrypt (`passlib`)

---

## 📁 Project Structure

```
hackthon/
├── backend/
│   ├── app.py              # FastAPI entrypoint
│   ├── auth.py             # JWT & bcrypt authentication
│   ├── data_loader.py      # ML data pipeline
│   ├── routes/             # API route modules
│   ├── ml_model/           # Trained model artifacts (git-ignored)
│   ├── requirements.txt    # Python dependencies
│   └── data/               # Runtime data (git-ignored)
├── frontend/
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Vite configuration
├── *.csv                   # Dataset files
├── start_backend.bat       # Launch backend (Windows)
├── start_frontend.bat      # Launch frontend (Windows)
└── Run_App.bat             # Launch both simultaneously
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/agrismart.git
cd agrismart
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend runs at: `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

### 4. Quick Start (Windows)
Double-click `Run_App.bat` — launches both backend and frontend automatically.

---

## 🌐 Deployment Guide (Live)

### 1. Frontend (Vercel)
The UI is optimized for [Vercel](https://vercel.com).
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_BASE_URL` (Set this to your live Backend URL, e.g., `https://your-api.onrender.com/api`)

### 2. Backend (Render / Railway)
The API runs anywhere with Python 3.10+.
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Root Directory**: `backend` (if deploying from a monorepo)

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register farmer or consumer |
| `POST` | `/auth/login` | Login and receive JWT |
| `GET` | `/api/crops` | Get all available crops |
| `POST` | `/api/crops` | Farmer: add crop listing |
| `PUT` | `/api/crops/{id}` | Farmer: update crop |
| `DELETE` | `/api/crops/{id}` | Farmer: remove crop |
| `POST` | `/api/order` | Consumer: place order |
| `GET` | `/api/predict` | Get AI price prediction |

---

## 📜 License

MIT License — free for academic and commercial use.

---

*Built for the **Digital Transparency Initiative (DTI)** — Andhra Pradesh, India.*
