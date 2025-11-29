# IdentiFIRE Detection System

A fire detection system with a React frontend and a Python Flask backend. This project uses computer vision libraries to detect fire from images or video streams.

---

## Prerequisites

Before running the project, ensure you have:

- **Node.js** (v18+ recommended) and npm installed for the frontend  
- **Python 3.11** installed for the backend

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/abbypagtalunan/IdentiFIRE-Fire-Detection-System.git
cd IdentiFIRE-Fire-Detection-System
```

---

## Frontend Setup

1. Install dependencies:

```bash
npm install vite@latest @vitejs/plugin-react-swc@latest
npm install --save-dev @types/react @types/react-dom
npm install
```

2. Start the frontend development server:

```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

---

## Backend Setup

1. Install Python 3.11 (macOS):

```bash
brew install python@3.11
```

2. Create and activate a virtual environment:

```bash
python3.11 -m venv venv
source venv/bin/activate
```

3. Install required Python packages:

```bash
pip install -r requirements.txt
```

> Or install packages individually if needed:
```bash
pip install numpy opencv-python flask flask-cors
```

4. Start the backend server:

```bash
python fire_detector_api.py
```

---

## Running the Full System

1. Start the backend first (Flask server).  
2. Then start the frontend (Vite development server).  
3. Access the application through the frontend URL and test the fire detection functionality.

---



