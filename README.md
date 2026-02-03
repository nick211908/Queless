# Queless

A modern web application built with React, TypeScript, and Supabase.

## 🚀 Project Structure

```
Queless/
├── frontend/          # React + Vite + TypeScript frontend
├── backend/           # FastAPI backend (optional - using Supabase)
└── README.md
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (v3.8 or higher) - for backend
- **Git**
- **Supabase Account** - [Sign up here](https://supabase.com)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/nick211908/Queless.git
cd Queless
```

### 2. Supabase Configuration

1. Create a new project on [Supabase](https://supabase.com)
2. Go to **Project Settings** → **API**
3. Copy your:
   - Project URL
   - `anon` public key (for frontend)
   - `service_role` key (for backend)

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Backend Setup (Optional)

> **Note**: The backend is optional as most operations use Supabase directly. Only needed for specific server-side operations.

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env file with your Supabase credentials
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_KEY=your_supabase_service_role_key
```

### 5. Database Setup

Run the SQL migrations in your Supabase SQL Editor:

```bash
# Connect to Supabase dashboard → SQL Editor
# Run migration files from backend/database/ folder in order
```

## 🏃 Running the Project

### Frontend Development Server

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

### Backend Server (if needed)

```bash
cd backend

# Activate virtual environment first
# Windows:
venv\Scripts\activate

# Run the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## 📦 Build for Production

### Frontend

```bash
cd frontend
npm run build
```

The production-ready files will be in the `frontend/dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🧰 Available Scripts

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend

- `uvicorn app.main:app --reload` - Start development server with auto-reload
- `uvicorn app.main:app` - Start production server

## 🔧 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **Supabase JS** - Database client
- **Lucide React** - Icons

### Backend
- **FastAPI** - Python web framework
- **Supabase** - Database & authentication
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

## 🌍 Environment Variables

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (`.env`)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
```

> ⚠️ **Important**: Never commit `.env` files to version control. Use `.env.example` as a template.

## 📝 Development Notes

- Make sure to activate the Python virtual environment before working on backend code
- Frontend uses Vite hot module replacement for fast development
- Supabase handles most backend operations (auth, database, storage)
- The backend is mainly for custom business logic and integrations

## 🔐 Security

- Keep your Supabase service role key secret
- Use Row Level Security (RLS) policies in Supabase
- Never expose sensitive keys in frontend code
- Use environment variables for all configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👤 Author

**Nick**
- GitHub: [@nick211908](https://github.com/nick211908)

## 🐛 Troubleshooting

### Port already in use
```bash
# Frontend (kill process using port 5173)
# Windows: netstat -ano | findstr :5173
# Then: taskkill /PID <PID> /F

# Backend (kill process using port 8000)
# Windows: netstat -ano | findstr :8000
# Then: taskkill /PID <PID> /F
```

### Module not found errors
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### Supabase connection issues
- Verify your environment variables are correct
- Check if your Supabase project is active
- Ensure you're using the correct API keys

---

**Happy Coding! 🚀**
