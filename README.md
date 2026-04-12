# 🌿 AgriSmart: AI-Powered Vegetable Marketplace

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Tooling-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![ML](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org/)

**AgriSmart** is a cutting-edge agricultural platform designed for Andhra Pradesh. It bridges the gap between farmers and consumers by providing real-time price transparency, AI-driven market predictions, and location-aware vegetable sourcing.

---

## ✨ Key Features

-   🧠 **AI Price Prediction**: Utilizes a Random Forest regression model trained on 3 years of historical data to predict vegetable prices with high accuracy (tracked via MAE).
-   🚜 **Farmer Empowerment**: Dedicated portal for farmers to list crops, manage inventory, and connect directly with local buyers without middle-men.
-   📍 **Smart Geolocation**: Interactive map (Leaflet) allowing consumers to find vegetables based on proximity (lat/lon) and district.
-   ⛅ **Seasonal Recommendations**: Intelligent crop scoring based on weather patterns, seasonal peak yields, and regional suitability.
-   🛍️ **Digital Checkout**: Seamless "checkout" process that generates professional PDF receipts for transactions.
-   📊 **Transparency Dashboard**: Real-time metrics on model performance and data distribution.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Asynchronous Python)
- **Data Science**: Pandas, NumPy, Scikit-learn
- **Security**: JWT Authentication, Bcrypt password hashing
- **Storage**: JSON-based persistent storage for users and crops

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS & Framer Motion (Animations)
- **Maps**: React-Leaflet
- **State Management**: Zustand
- **Icons**: Lucide React

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Installation

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend Setup
```bash
cd frontend
npm install
```

### 3. Running the Application

For convenience, you can use the provided batch files:
-   **Run All**: Execute `Run_Project.bat` to start both servers simultaneously.
-   **Manual Start**:
    -   Backend: `cd backend && uvicorn app:app --reload`
    -   Frontend: `cd frontend && npm run dev`

---

## 📂 Project Structure

```text
├── backend/            # FastAPI Application & ML Models
│   ├── data/           # CSV Datasets (Prices, Yields, Weather)
│   ├── routes/         # API Endpoints (Auth, Farmer, Data)
│   ├── ml_model/       # Training Logic & Saved Models
│   └── app.py          # Main Entry Point
├── frontend/           # Vite + React TypeScript Application
│   ├── src/            # Components, Hooks, and State
│   └── public/         # Static Assets
└── README.md
```

Created for the **Digital Transparency Initiative (DTI)** to foster a fairer agricultural economy.

