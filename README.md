# AegisDesk 🚀

An AI-powered mini operating system website that replaces scattered life-management apps with a single desktop-style interface. Manage your tasks, notes, weather, and interact with an AI assistant all in one beautiful, persistent, and personalized environment.

![AegisDesk](https://img.shields.io/badge/AegisDesk-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🖥️ Desktop-Style Interface
- **Draggable Windows**: Move windows around like a real desktop OS
- **Resizable Windows**: Adjust window size to your preference
- **Window Management**: Minimize, maximize, and close windows
- **Taskbar**: Quick access to pinned apps and active windows
- **Persistent Storage**: All your data is saved locally using browser storage

### 📱 Applications

#### ✅ Tasks App
- Create and manage your to-do list
- Mark tasks as complete
- Delete tasks
- All tasks are automatically saved

#### 📝 Notes App
- Rich text notes with titles
- Auto-save functionality
- Multiple notes management
- Quick access to recent notes

#### 🌤️ Weather App
- Real-time weather for **30+ cities in Tamil Nadu**
- Beautiful city cards with detailed weather information
- Temperature, humidity, wind speed, and conditions
- Cities included: Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, and more!

#### 🤖 AI Assistant
- Chat with an AI-powered assistant
- Ask questions, get help, or just chat
- Optional OpenAI API integration for enhanced capabilities
- Local fallback responses for basic queries

#### 🌐 Browser
- Built-in web browser
- Navigate to any website
- Support for Google, YouTube, and custom URLs
- Browser history and navigation controls

#### ⚙️ Settings
- Customize your experience
- Configure AI API keys
- Manage animations and auto-save
- Clear all data option

### 🎨 Beautiful UI
- Modern glassmorphism design
- Smooth animations and transitions
- Dark theme with gradient backgrounds
- Responsive layout
- Professional and polished interface

## 🚀 Getting Started

### Installation

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. That's it! No build process or dependencies required.

### Usage

- **Open Apps Menu**: Click the app icon in the taskbar or press `Alt + Space`
- **Open Apps**: Click on app tiles in the menu or use pinned icons in the taskbar
- **Keyboard Shortcuts**:
  - `Alt + Space`: Open/Close apps menu
  - `Alt + 1-9`: Open pinned apps (1-9)
  - `Escape`: Close apps menu
- **Search**: Use the search bar in the taskbar to quickly find and open apps
- **Drag Windows**: Click and drag window title bars to move them
- **Resize Windows**: Drag window edges or corners to resize

## 🔧 Configuration

### Mail (Resend)

See [MAIL.md](MAIL.md) for setup. Required server variables: `RESEND_API_KEY`, `MAIL_FROM`. Optional: `MAIL_REPLY_TO`, `MAIL_FOUNDER_NAME`, `MAIL_APP_URL`. Never put the API key in the browser.

### AI Assistant Setup

The AI Assistant uses a secure serverless API endpoint to keep your API key safe. You have two options:

#### Option 1: Serverless API (Recommended - Secure)

1. **Deploy to Vercel** (or similar platform with serverless functions):
   - Connect your repository to Vercel
   - Add environment variable: `OPENAI_API_KEY` with your OpenAI API key
   - The `/api/chat.js` endpoint will handle API calls securely
   - No API key needed in the browser!

2. **Get your OpenAI API key**:
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy it to your deployment platform's environment variables

#### Option 2: Client-Side (Legacy - Less Secure)

If you're running locally without a serverless function:
1. Open the Settings app
2. Navigate to "AI Assistant" section
3. Enter your OpenAI API key
4. The key is stored locally in your browser

**Note**: The serverless API approach is recommended for production deployments as it keeps your API key secure on the server side.

### Weather API

The weather app uses Open-Meteo API (free, no key required) for real-time weather data. If the API is unavailable, it falls back to sample data.

## 📁 Project Structure

```
AegisDesk/
├── index.html              # Main HTML file
├── api/
│   └── chat.js            # Serverless API endpoint (Vercel/Netlify)
├── styles/
│   ├── main.css           # Main styles and desktop UI
│   ├── window.css         # Window styles
│   └── apps.css           # App-specific styles
├── js/
│   ├── main.js            # Application entry point
│   ├── utils/
│   │   ├── storage.js     # Local storage utility
│   │   └── drag.js        # Drag and drop functionality
│   ├── core/
│   │   ├── desktop.js     # Desktop core functionality
│   │   └── window-manager.js  # Window management system
│   └── apps/
│       ├── tasks.js       # Tasks app
│       ├── notes.js       # Notes app
│       ├── weather.js     # Weather app
│       ├── ai-chat.js     # AI Assistant app
│       ├── browser.js     # Browser app
│       └── settings.js    # Settings app
└── README.md              # This file
```

## 🛠️ Technologies Used

- **HTML5**: Structure and markup
- **CSS3**: Modern styling with glassmorphism, gradients, and animations
- **Vanilla JavaScript (ES6+)**: No frameworks, pure JavaScript for maximum performance
- **Local Storage API**: Persistent data storage
- **Open-Meteo API**: Weather data
- **OpenAI API** (optional): AI chat capabilities

## 🎯 Features Roadmap

- [ ] Multiple desktop workspaces
- [ ] Custom wallpaper support
- [ ] App marketplace for adding more apps
- [ ] File manager
- [ ] Calendar and events
- [ ] Email integration
- [ ] Music player
- [ ] Themes and customization
- [ ] Multi-language support

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 💡 Tips

- **Persistent Data**: All your tasks, notes, and settings are saved automatically
- **Multiple Windows**: Open multiple instances of apps by clicking the app icon again
- **Window Positions**: Window positions and sizes are remembered between sessions
- **Search**: Type URLs or app names in the search bar for quick access
- **Keyboard Navigation**: Use keyboard shortcuts for faster navigation

## 🐛 Troubleshooting

- **Weather not loading**: Check your internet connection. The app will use sample data if the API is unavailable.
- **AI not responding**: 
  - If using serverless API: Check that `OPENAI_API_KEY` environment variable is set in your deployment platform
  - If using client-side: Make sure you've entered a valid OpenAI API key in Settings
  - Check browser console for error messages
- **Windows not saving position**: Clear your browser cache and try again
- **Data not persisting**: Ensure localStorage is enabled in your browser

## 📧 Support

For issues, questions, or suggestions, please open an issue on the repository.

---

Made with ❤️ for organizing your digital life.

