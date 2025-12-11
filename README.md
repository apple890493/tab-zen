# 🧘 Tab Zen

**Stay focused. Finish reading before switching tabs.**

Tab Zen is a Chrome extension that helps you stay focused while reading. When you start reading an article, Tab Zen prevents you from switching to other tabs until you finish reading.

## ✨ Features

- **Focus Mode**: Set the current tab as your "reading task" — you can't switch to other tabs until you complete it
- **Smart Unlock**: Determines reading completion based on time spent (default: 20 seconds) and scroll progress (default: 80%)
- **Related Tab Tracking**: Automatically tracks links opened from the main tab as "minor tabs"
- **Allowed Domains**: Set domains that you can always switch to (e.g., Gmail, Slack)
- **Friendly Reminders**: Shows your current reading progress when you try to leave

## 📦 Installation

### Development Setup

1. Clone the repository

```bash
git clone https://github.com/your-username/tab-zen.git
cd tab-zen
```

2. Install dependencies

```bash
yarn install
```

3. Build the project

```bash
yarn build
```

4. Load the extension in Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked"
   - Select the `dist` folder

### Development Mode

```bash
yarn dev
```

## 🎯 How to Use

1. **Start Reading**: Click the extension icon and select "Add current tab to queue" to set the current tab as your reading task
2. **Focus on Reading**: Read the article — Tab Zen tracks your reading time and scroll progress
3. **Unlock**: Once you reach the reading goal (20 seconds + 80% scroll), you can freely switch tabs
4. **Manage Allowed Domains**: Add or remove domains that you can always access in the Popup

## 🔧 Unlock Requirements

Default unlock requirements:

| Requirement | Default Value |
|-------------|---------------|
| Minimum reading time | 20 seconds |
| Minimum scroll percentage | 80% |

## 🛠️ Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite 7
- **Extension**: Chrome Extension Manifest V3

## 📝 How It Works

1. **Set Main Tab**: User sets the current tab as a reading task via the Popup
2. **Track Progress**: Content Script listens to scroll events and tracks reading time
3. **Intercept Switching**: Background Service Worker listens to `tabs.onActivated` events
4. **Check Unlock Status**: Checks if reading time and scroll progress meet the requirements
5. **Block or Allow**: If not complete, switches back to the main tab and shows a reminder; if complete, allows the switch

## 🤝 Contributing

Issues and Pull Requests are welcome!
