# CertLab - Client-Side Certification Learning Platform

CertLab is a browser-based certification study platform that uses IndexedDB for local data storage. Study for certifications like CISSP, CISM, and more with adaptive quizzes, achievements, and progress tracking.

## 🌟 Features

- **Client-Side Storage**: All data stored in browser's IndexedDB - no server required
- **Offline Capable**: Works completely offline after initial load
- **Adaptive Learning**: Quiz difficulty adapts to your performance
- **Achievement System**: Earn badges and track your progress
- **Study Groups**: Create and join study groups (local to your browser)
- **Practice Tests**: Full-length practice exams
- **Export/Import**: Backup and restore your data

## 🚀 Architecture

### Client-Side Only
CertLab runs entirely in your browser using:
- **React** for the UI
- **IndexedDB** for data persistence
- **TanStack Query** for state management
- **Vite** for building and development

### No Backend Required
All features run locally:
- Authentication is browser-based
- Data stays in your browser's IndexedDB
- No API calls or server communication
- Perfect for GitHub Pages hosting

## 📦 Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server will start at `http://localhost:5000`

### First Time Setup

1. Open the app in your browser
2. Click "Get Started" to create an account
3. Initial sample data (categories, questions, badges) will be automatically seeded

## 📚 Usage

### Creating a Quiz
1. Navigate to the dashboard
2. Select certification categories
3. Choose difficulty level and question count
4. Start your quiz!

### Study Features
- **Study Mode**: See correct answers immediately
- **Quiz Mode**: Full test experience with final score
- **Adaptive Mode**: Difficulty adjusts based on performance

### Data Management

#### Export Your Data
```javascript
import { clientStorage } from './lib/client-storage';

// Export to JSON
const jsonData = await clientStorage.exportData();
// Save to file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Download the file
```

#### Import Data
```javascript
import { clientStorage } from './lib/client-storage';

// Import from JSON string
await clientStorage.importData(jsonString);
```

## 🔒 Security & Privacy

- **Local Only**: Your data never leaves your browser
- **Password Hashing**: Passwords hashed using Web Crypto API
- **No Tracking**: No analytics or external tracking
- **Private**: Single-user per browser, no data sharing

## 🌐 Deployment

### GitHub Pages

The app is configured for automatic deployment to GitHub Pages:

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to `main` branch - automatic deployment via GitHub Actions
4. Access at `https://[username].github.io/certlab/`

**Note for Forks/Different Repository Names:**
If you fork this repository or use a different name, update the base path:
- Set the `VITE_BASE_PATH` environment variable in your build command
- Or update `vite.config.ts` to change the default `/certlab/` path
- For custom domains (root path), set `VITE_BASE_PATH=/`

Example:
```bash
VITE_BASE_PATH=/my-repo-name/ npm run build
```

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy the dist/ folder to any static hosting
# Files are in: ./dist/
```

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Radix UI** - Component primitives
- **TanStack Query** - State management
- **IndexedDB** - Browser storage
- **Wouter** - Client-side routing

## ⚠️ Limitations

As a client-side only application:

- **Single User**: One user per browser/profile
- **Browser-Bound**: Data doesn't sync across devices
- **Local Storage**: Data tied to browser (can be cleared)
- **No AI Features**: Original AI lecture generation removed
- **No Payments**: Credit system and payments removed
- **No Multi-User**: No collaboration or shared study groups

## 🔄 Migration from Server Version

If migrating from the original server-based version:

1. Export your data from the old version
2. Import into the new client-side version
3. Note: Some features like AI lectures are no longer available

## 📝 Data Structure

The app stores data in these IndexedDB stores:

- `users` - User accounts and profiles
- `categories` - Certification categories (CISSP, CISM, etc.)
- `subcategories` - Topic subcategories
- `questions` - Question bank
- `quizzes` - Quiz attempts and results
- `userProgress` - Learning progress per category
- `lectures` - Study materials
- `masteryScores` - Performance tracking
- `badges` - Achievement definitions
- `userBadges` - User's earned badges
- `userGameStats` - Gamification stats
- `challenges` - Daily/quick challenges
- `challengeAttempts` - Challenge results
- `studyGroups` - Study groups
- `studyGroupMembers` - Group memberships
- `practiceTests` - Practice test definitions
- `practiceTestAttempts` - Practice test results
- `settings` - App settings and current user

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built for certification students worldwide who want a free, private, and offline-capable study tool.
