# Ledger — World-Class Personal Finance Tracker

A modern, self-hosted personal finance management platform with advanced analytics, transaction categorization, goal tracking, and tax optimization. Built with Node.js, Express, and PostgreSQL.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D22.0-green)

---

## ✨ Features

### 📊 **Core Modules**

- **Dashboard** — Real-time financial overview with key metrics and net worth tracking
- **Accounts** — Manage multiple bank, investment, and savings accounts
- **Transactions** — Track income, expenses, transfers with full search and filtering
- **Categories** — Smart categorization with customizable rules and automatic tagging
- **Statements** — Bulk import CSV statements from any bank or financial institution
- **Goals** — Set and monitor financial goals with progress tracking
- **Tax Planning** — Comprehensive tax calculations, deductions, and optimization
- **Rules Engine** — Automate transaction categorization and processing

### 🔐 **Security & Authentication**

- Google OAuth 2.0 authentication
- Session-based security with JWT support
- Password-less login
- Secure API endpoints with authentication middleware

### 📈 **Advanced Capabilities**

- Real-time dashboard analytics
- Pattern recognition in spending habits
- Recurring transaction detection and automation
- CSV import with intelligent mapping
- Multi-account net worth calculations
- Scheduled reports and notifications

---

## 🚀 Quick Start

### Requirements

- **Node.js** 22+ (uses built-in `node:sqlite` and PostgreSQL client)
- **npm** or **yarn**
- PostgreSQL database (local or cloud-hosted)

### Installation

```bash
# Clone the repository
git clone https://github.com/vishvacyber/Ledger.git
cd Ledger

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your environment variables
# (see Environment Variables section below)
nano .env
```

### Run Locally

```bash
# Start the server
npm start

# Server runs on http://localhost:3000
```

### Development Mode

With automatic restart on file changes:

```bash
npm run dev
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory with:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ledger

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session & JWT
SESSION_SECRET=your-secret-session-key
JWT_SECRET=your-jwt-secret

# Client
CLIENT_URL=http://localhost:3000
```

---

## 📋 API Endpoints

All endpoints require authentication (via Google OAuth or JWT token).

### Authentication
- `GET /auth/google` — Initiate Google OAuth login
- `GET /auth/google/callback` — OAuth callback handler
- `GET /auth/logout` — Logout user
- `GET /auth/user` — Get current user info

### Core Resources
- `GET/POST /api/accounts` — Manage accounts
- `GET/POST /api/transactions` — Manage transactions
- `GET/POST /api/categories` — Manage categories
- `GET/POST /api/goals` — Manage financial goals
- `GET/POST /api/rules` — Manage automation rules
- `POST /api/import` — Import CSV statements
- `GET /api/dashboard` — Dashboard analytics
- `GET /api/tax` — Tax calculations and reports

---

## 🗄️ Database

Ledger uses PostgreSQL for data persistence. The schema includes:

- **users** — User accounts and authentication
- **accounts** — Bank/investment accounts
- **transactions** — All financial transactions
- **categories** — Transaction categories
- **goals** — Financial goals
- **rules** — Automation rules
- **tax_records** — Tax-related data

Run migrations:

```bash
npm run migrate
```

---

## 🌐 Deployment

### Deploy to Render (Recommended)

1. **Push to GitHub** — Ensure your repository is on GitHub
2. **Set up Google OAuth** in Google Cloud Console
3. **Create Render Blueprint**:
   - Go to [render.com](https://render.com)
   - Create new Blueprint
   - Connect your GitHub repo
   - Set environment variables (see DEPLOY.md for details)
4. **Deploy** — Render automatically builds and deploys

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md).

### Deploy to Other Platforms

The application can also be deployed to:
- **Heroku** — Use `Procfile` (update if needed)
- **AWS/Lambda** — Requires serverless framework setup
- **Self-hosted** — Docker or direct Node.js deployment

---

## 📁 Project Structure

```
ledger/
├── src/
│   ├── server.js              # Express server entry point
│   ├── db/                    # Database configuration & migrations
│   ├── routes/                # API route handlers
│   ├── services/              # Business logic & utilities
│   │   └── cronJobs.js       # Scheduled tasks
│   └── middleware/            # Express middleware
├── public/                    # Frontend assets
│   ├── index.html            # Main dashboard
│   └── login.html            # Login page
├── migrations/               # Database migrations
├── package.json
├── render.yaml              # Render deployment config
├── DEPLOY.md                # Deployment guide
├── START.md                 # Quick start guide
└── README.md               # This file
```

---

## 🔄 Workflow

### Import Statements

1. Navigate to **Statements** section
2. Download CSV from your bank
3. Drag & drop CSV file
4. Ledger auto-detects columns and imports transactions
5. Review and categorize imported transactions

### Set Up Rules

1. Go to **Rules** section
2. Create rules for automatic categorization
3. Rules apply to new transactions automatically

### Monitor Goals

1. Create financial goals (e.g., "Save $10,000 by Dec 2025")
2. Ledger tracks progress based on savings account balance
3. View goal progress on Dashboard

### Tax Planning

1. Review **Tax** module for current year calculations
2. Categorize transactions properly for accurate tax reporting
3. Export tax summary for accountant

---

## 🛠️ Development

### Scripts

```bash
npm start      # Start production server
npm run dev    # Start development server with auto-reload
npm run migrate # Run database migrations
```

### Testing

```bash
# Run tests (configure test setup in package.json)
npm test
```

### Code Structure

- **Routes** (`src/routes/`) — Handles HTTP requests
- **Services** (`src/services/`) — Business logic
- **Database** (`src/db/`) — Schema and migrations
- **Middleware** (`src/middleware/`) — Custom middleware

---

## 🔐 Security Considerations

- All API endpoints require authentication
- Google OAuth provides secure login without password storage
- Sessions are secured with HTTP-only cookies in production
- CORS configured to prevent unauthorized cross-origin requests
- Environment variables keep secrets out of source code

---

## 📞 Support & Contributing

### Issues & Feedback

Found a bug? Have a feature request? Please [open an issue](https://github.com/vishvacyber/Ledger/issues).

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Express.js](https://expressjs.com/) — Web framework
- [PostgreSQL](https://www.postgresql.org/) — Database
- [Passport.js](http://www.passportjs.org/) — Authentication
- [Render](https://render.com/) — Hosting platform

---

## 📚 Additional Resources

- [API Documentation](docs/API.md) — Detailed API reference
- [Deployment Guide](DEPLOY.md) — Step-by-step deployment instructions
- [Quick Start](START.md) — Get started in 2 minutes
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2) — OAuth documentation

---

**Made with ❤️ by Vishva**

For questions or support, reach out via [GitHub Issues](https://github.com/vishvacyber/Ledger/issues).
