# AI-Augmented Library Management System

A comprehensive MERN-stack library management system for college campuses with AI-powered features including semantic search, personalized recommendations, sentiment analysis, and predictive analytics.

## 🚀 Features

### Core Features

- **Multi-role Authentication**: Admin, Library Staff, and Student roles
- **Automated Library Operations**: Lending, returns, fines, and notifications
- **Student Dashboard**: Personalized borrowing history and recommendations
- **Institutional UI**: Professional landing page with college branding
- **PWA Support**: Progressive Web App features for mobile access

### AI-Powered Features

- **Semantic Search**: Intelligent book discovery using natural language
- **Personalized Recommendations**: AI-driven book suggestions based on reading history
- **Sentiment Analysis**: Analyze peer book reviews for insights
- **Predictive Analytics**: Overdue prediction and risk assessment
- **Smart Notifications**: Context-aware reminders and alerts

### Technical Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG compliant with screen reader support
- **Real-time Updates**: WebSocket integration for live notifications
- **Advanced Security**: JWT authentication, rate limiting, and input validation
- **Comprehensive Logging**: Detailed audit trails and error tracking

## 🛠️ Tech Stack

### Frontend

- **React 18** with hooks and context
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **React Query** for state management
- **Framer Motion** for animations

### Backend

- **Node.js** with Express
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **SendGrid** for email notifications
- **OpenRouter/OpenAI** for AI features
- **Cron jobs** for automated tasks

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or cloud)
- SendGrid account for email notifications
- OpenRouter account for AI features (free tier available)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LIBRARYMANAGEMENT
```

### 2. Install Dependencies

```bash
npm run install-all
```

### 3. Environment Configuration

#### Server Configuration (`server/.env`)

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/library_management?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=your_verified_sender_email@yourdomain.com

# AI Configuration - OpenRouter (Recommended)
OPENROUTER_API_KEY=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
AI_MODEL=openai/gpt-3.5-turbo

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000
```

#### Client Configuration (`client/.env`)

```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=Library Management System
```

### 4. Database Setup

```bash
# Start MongoDB (if local)
mongod

# Or use MongoDB Atlas cloud database
```

### 5. Start Development Servers

```bash
# Start both server and client
npm run dev

# Or start individually
npm run server
npm run client
```

### 6. Initialize Admin Account

The system will automatically create an admin account on first run:

- **Email**: admin@library.com
- **Password**: admin123

## 🔑 API Keys Setup

### 1. MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and replace in `MONGODB_URI`

### 2. SendGrid (Email Notifications)

1. Sign up at [SendGrid](https://sendgrid.com)
2. Create API key in Settings > API Keys
3. Verify sender email in Settings > Sender Authentication
4. Add to `SENDGRID_API_KEY` and `EMAIL_FROM`

### 3. OpenRouter (AI Features)

1. Sign up at [OpenRouter](https://openrouter.ai)
2. Get your API key from the dashboard
3. Add to `OPENROUTER_API_KEY`
4. Choose your preferred model in `AI_MODEL` (default: openai/gpt-3.5-turbo)

**Note**: Your OpenRouter API key is already configured: `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`

## 👥 User Roles & Test Credentials

### Admin (LIB01 / 123@321)

- Full system access
- User management
- System configuration
- Analytics and reports

### Library Staff (STAFF01 / 123@321)

- Book management
- Lending operations
- Student assistance
- Basic reporting

### Student (STU01 / 123@321)

- Book browsing and borrowing
- Personal dashboard
- Review submission
- Notification management

## 📁 Project Structure

```
LIBRARYMANAGEMENT/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Node.js backend
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── utils/           # Utility functions
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

## 🔧 Available Scripts

### Root Level

- `npm run install-all` - Install dependencies for all packages
- `npm run dev` - Start both server and client in development
- `npm run build` - Build for production
- `npm run start` - Start production servers

### Server

- `npm run server` - Start server in development
- `npm run server:prod` - Start server in production
- `npm run seed` - Seed database with sample data

### Client

- `npm run client` - Start client in development
- `npm run build` - Build client for production

## 🌟 AI Features Explained

### 1. Semantic Search

- Uses natural language processing to understand search intent
- Generates relevant keywords and concepts
- Provides more accurate search results than simple text matching

### 2. Personalized Recommendations

- Analyzes user borrowing history
- Considers academic department and year
- Suggests books based on reading patterns and preferences

### 3. Sentiment Analysis

- Analyzes book reviews for sentiment (positive/negative/neutral)
- Extracts key topics and themes
- Helps identify popular and well-received books

### 4. Predictive Analytics

- Predicts likelihood of overdue returns
- Considers factors like due date proximity, book popularity
- Enables proactive reminder strategies

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions per user role
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Environment Variables**: Secure configuration management

## 📧 Email Notifications

The system sends automated emails for:

- Book lending confirmations
- Due date reminders
- Overdue notifications
- Fine assessments
- Password resets
- Welcome messages

## 🚀 Deployment

### Environment Variables

Ensure all environment variables are properly configured for production:

- Use strong JWT secrets
- Configure production database URLs
- Set up production email services
- Configure CORS for production domain

### Build Process

```bash
# Build client
cd client && npm run build

# Start production server
cd server && npm run server:prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the documentation
- Review the code comments
- Create an issue in the repository

## 🔄 Updates

The system includes:

- Automated database backups
- Regular dependency updates
- Security patches
- Feature enhancements

---

**Note**: This system is designed for educational institutions and includes comprehensive logging, security measures, and scalability considerations for production deployment.
