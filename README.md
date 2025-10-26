# PreseGuide 🎤

**An AI-Powered Automated Presentation Coach**

Transform your presentations with real-time analysis, personalized coaching, gamification, and progressive improvement tracking.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![Django](https://img.shields.io/badge/Django-5.0-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

Youtube Video: https://youtu.be/GxdjJFgtiBk

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 About

PreseGuide is an intelligent presentation coaching platform that helps users deliver better presentations through AI-powered analysis and feedback. It analyzes recorded practice sessions for filler words, pacing, clarity, and provides actionable coaching tips to improve presentation skills.

### **The Problem**
Delivering effective presentations is challenging. Most people struggle with filler words, inconsistent pacing, and unclear messaging. Traditional coaching is expensive and time-consuming.

### **Our Solution**
PreseGuide combines AI analysis with gamification to provide:
- **Instant feedback** on presentation performance
- **Iterative improvement** through multiple practice sessions
- **Context-aware coaching** using your actual presentation materials
- **Gamified learning** with XP, levels, and badges
- **Progress tracking** to visualize improvement over time

---

## ✨ Features

### **Core Features**

#### 🎙️ **Audio Analysis Engine**
- Speech-to-text transcription using Whisper AI
- Filler word detection (um, uh, like, you know, etc.)
- Pacing analysis with words-per-minute calculation
- Clarity assessment for sentence structure
- Real-time scoring (0-100)

#### 📄 **Document Context Integration**
- Upload presentations as PDF or PowerPoint
- AI extracts key points and structure
- Content coverage analysis
- Identifies missed key points
- Slide-by-slide guidance

#### 🤖 **AI Coaching System**
- Personalized feedback powered by Google Gemini
- Actionable improvement suggestions
- Context-aware coaching based on your materials
- Iteration-based recommendations

#### 🎮 **Gamification System**
- **5 Levels**: First Words → Finding Voice → Building Confidence → Commanding Presence → Presentation Master
- **XP System**: Earn points for uploads, improvements, and completions
- **8 Badge Types**: First Recording, Perfectionist, Level Up, Max Level, and more
- Visual progress bars and feedback

#### 📈 **Progressive Improvement Tracking**
- Multiple recording iterations per presentation
- Automatic improvement percentage calculation
- Score history visualization
- Trend analysis (improving/declining/stable)
- Performance metrics dashboard

#### ❓ **Q&A Generator**
- AI-generated audience questions
- Difficulty levels (easy, medium, hard)
- Answer frameworks for preparation
- Based on presentation content

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 14+ (React with App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Hooks

### **Backend**
- **Framework**: Django 5.0 with Django REST Framework
- **Language**: Python 3.11
- **AI/ML**: 
  - Whisper AI (speech-to-text)
  - Google Gemini API (AI coaching)
  - LangChain (AI pipeline)
- **Audio Processing**: LibROSA
- **Document Processing**: PyMuPDF, python-pptx

### **Database**
- **Development**: SQLite3
- **Production**: PostgreSQL (Neon)

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Python 3.11** ([Download](https://www.python.org/downloads/release/python-3119/))
  - ⚠️ **Important**: Use Python 3.11, not 3.13 (compatibility issues with Whisper)
- **Node.js 18+** and npm ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

### **Required API Keys**

1. **Google Gemini API Key** (Free tier available)
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the generated key

---

## 🚀 Installation

### **1. Clone the Repository**

```

git clone https://github.com/yourusername/preseguide.git
cd preseguide

```

### **2. Backend Setup**

```


# Navigate to backend directory

cd backend

# Create virtual environment with Python 3.11

py -3.11 -m venv venv

# Activate virtual environment

# Windows:

venv\Scripts\activate

# macOS/Linux:

source venv/bin/activate

# Install dependencies

pip install -r requirements.txt

# Create .env file

copy .env.example .env  \# Windows

# or

cp .env.example .env    \# macOS/Linux

# Edit .env file with your API keys

```

### **3. Frontend Setup**

```


# Open new terminal window

cd frontend

# Install dependencies

npm install

# Create .env.local file

copy .env.local.example .env.local  \# Windows

# or

cp .env.local.example .env.local    \# macOS/Linux

```

---

## ⚙️ Configuration

### **Backend Environment Variables** (`backend/.env`)

```


# Django Settings

SECRET_KEY=your-generated-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Google Gemini API Key (REQUIRED)

GEMINI_API_KEY=your-gemini-api-key-here

# CORS Settings

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

```

**Generate Django Secret Key:**
```

python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

```

### **Frontend Environment Variables** (`frontend/.env.local`)

```


# Backend API URL

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api

```

---

## 🏃 Running the Application

### **Step 1: Start Backend Server**

```

cd backend
venv\Scripts\activate  \# Windows

# or

source venv/bin/activate  \# macOS/Linux

# Run migrations (first time only)

python manage.py migrate

# Start Django server

python manage.py runserver

```

Backend runs at: **http://127.0.0.1:8000/**

### **Step 2: Start Frontend Server**

```

cd frontend
npm run dev

```

Frontend runs at: **http://localhost:3000/**

### **Step 3: Access the Application**

Open your browser and navigate to: **http://localhost:3000**

---

## 📁 Project Structure

```

preseguide/
├── backend/                    \# Django backend
│   ├── config/                 \# Project configuration
│   │   ├── settings.py         \# Django settings
│   │   └── urls.py             \# Root URL configuration
│   ├── presentations/          \# Main app
│   │   ├── models.py           \# Database models
│   │   ├── serializers.py      \# API serializers
│   │   ├── views.py            \# API endpoints
│   │   ├── services/           \# Business logic
│   │   │   ├── audio_analyzer.py      \# Whisper integration
│   │   │   ├── ai_coach.py            \# LangChain + Gemini
│   │   │   ├── document_processor.py  \# PDF/PPT processing
│   │   │   ├── qa_generator.py        \# Q\&A generation
│   │   │   └── gamification.py        \# XP and badges
│   │   └── urls.py             \# App routes
│   ├── media/                  \# User uploads
│   ├── .env                    \# Environment variables
│   ├── requirements.txt        \# Python dependencies
│   └── manage.py               \# Django CLI
│
├── frontend/                   \# Next.js frontend
│   ├── app/                    \# App Router pages
│   │   ├── page.tsx            \# Home page
│   │   └── presentation/
│   │       └── [id]/page.tsx   \# Presentation detail page
│   ├── lib/                    \# Utilities
│   │   └── api.ts              \# API client
│   ├── types/                  \# TypeScript interfaces
│   │   └── index.ts
│   ├── .env.local              \# Environment variables
│   ├── package.json            \# Node dependencies
│   └── tailwind.config.js      \# Tailwind CSS config
│
├── .gitignore                  \# Git ignore rules
└── README.md                   \# This file

```

---

## 📡 API Documentation

### **Presentations**

- `GET /api/presentations/` - List all presentations
- `POST /api/presentations/` - Create new presentation
- `GET /api/presentations/{id}/` - Get presentation details
- `PATCH /api/presentations/{id}/` - Update presentation (upload document)
- `DELETE /api/presentations/{id}/` - Delete presentation
- `POST /api/presentations/{id}/generate_qa/` - Generate Q&A
- `GET /api/presentations/{id}/progress/` - Get progress stats

### **Recordings**

- `GET /api/recordings/` - List all recordings
- `POST /api/recordings/` - Upload new recording (triggers analysis)
- `GET /api/recordings/{id}/` - Get recording details
- `GET /api/recordings/{id}/reanalyze/` - Re-analyze recording

### **Badges**

- `GET /api/badges/` - List all badges
- `GET /api/badges/by_presentation/?presentation_id={id}` - Get badges for presentation

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Python 3.13 Compatibility Error**
```

TypeError: argument of type 'NoneType' is not iterable

```

**Solution**: Use Python 3.11 instead of 3.13
```


# Remove old venv

rmdir /s venv  \# Windows
rm -rf venv    \# macOS/Linux

# Create new venv with Python 3.11

py -3.11 -m venv venv

# Reinstall dependencies

pip install -r requirements.txt

```

#### **2. FFmpeg Not Found Warning**
```

RuntimeWarning: Couldn't find ffmpeg or avconv

```

**Solution**: This is just a warning. The app will work fine using librosa for audio processing. To remove the warning, install FFmpeg:
- Windows: `choco install ffmpeg` (requires Chocolatey)
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

#### **3. Gemini API Key Error**
```

GEMINI_API_KEY not found in environment variables

```

**Solution**: Make sure you've added your API key to `backend/.env`:
```

GEMINI_API_KEY=AIza...your-key-here

```

#### **4. CORS Errors**
```

Access to XMLHttpRequest has been blocked by CORS policy

```

**Solution**: Verify `CORS_ALLOWED_ORIGINS` in `backend/.env` includes your frontend URL:
```

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

```

#### **5. Whisper Model Download Slow**

First time running audio analysis downloads the Whisper model (~150MB). This is normal and happens once.

---

## 🧪 Testing the Application

### **Test Flow:**

1. Create a new presentation with title and description
2. (Optional) Upload a PDF or PowerPoint document
3. Upload an audio recording (MP3, WAV, or M4A)
4. Wait for analysis (1-2 minutes)
5. View results: scores, metrics, AI feedback, transcription
6. Check gamification: XP earned, level progress, badges
7. Generate Q&A questions based on content
8. Upload another recording to see improvement tracking
9. View progress tab for score history and trends

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **OpenAI Whisper** for powerful speech-to-text
- **Google Gemini** for AI capabilities
- **Django** and **Next.js** communities
- All contributors and testers

---

<div align="center">

**Built with ❤️ by the PreseGuide Team**

⭐ Star us on GitHub if you find this helpful!

</div>
```


***

## **Quick Setup Summary**

After creating these files, run these commands to get started:

```bash
# Backend
cd backend
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Add GEMINI_API_KEY to .env
python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL
npm run dev
```

