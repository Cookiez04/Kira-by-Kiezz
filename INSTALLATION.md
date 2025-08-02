# 🚀 Installation Guide - Kira by Kiezz

Quick installation guide to get your financial management app up and running in minutes!

## ⚡ Quick Install

### Step 1: Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/) (version 16 or higher)

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the App
```bash
npm start
```

Your app will open at `http://localhost:3000` 🎉

## 🛠️ What Gets Installed

When you run `npm install`, these packages are installed:

### Core React Dependencies:
- **react** & **react-dom**: The React framework
- **react-router-dom**: Navigation between pages
- **react-scripts**: Build tools and development server

### Database & API:
- **@supabase/supabase-js**: Database integration
- **date-fns**: Date manipulation utilities

### Styling:
- **tailwindcss**: Modern CSS framework
- **autoprefixer** & **postcss**: CSS processing

### Charts & Visualization:
- **recharts**: Charts and graphs for reports

## 📦 Package.json Contents

Here's what's inside your `package.json`:

```json
{
  "name": "kira-by-kiezz",
  "version": "1.0.0",
  "description": "Personal Financial Management App by Kiezz",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.5",
    "react": "^18.2.0", 
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "react-scripts": "5.0.1",
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16", 
    "postcss": "^8.4.32"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## 🔧 Available Scripts

After installation, you can run these commands:

### `npm start`
- Starts the development server
- Opens your app at `http://localhost:3000`
- Automatically reloads when you save changes
- Shows lint errors in the console

### `npm run build`
- Creates an optimized production build
- Files are saved to the `build/` folder
- Ready for deployment to any web server

### `npm test`
- Launches the test runner
- Runs any tests you create
- Watches for changes and re-runs tests

### `npm run eject`
- **⚠️ Warning: This is permanent!**
- Removes the single build dependency
- Gives you full control over configuration
- Only use if you need advanced customization

## 🗂️ File Structure After Installation

```
kira-by-kiezz/
├── node_modules/           # Installed packages (auto-generated)
├── public/
│   ├── index.html         # Main HTML file
│   └── favicon.ico        # Browser icon
├── src/
│   ├── components/        # React components
│   ├── services/          # Supabase integration
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Helper functions
│   ├── styles/           # CSS files
│   ├── App.jsx           # Main app component
│   └── index.js          # Entry point
├── docs/                 # Documentation
├── package.json          # Project configuration
├── tailwind.config.js    # Tailwind CSS config
├── postcss.config.js     # PostCSS config
└── README.md            # Main documentation
```

## 🌐 Browser Support

Your app works in all modern browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Mobile Installation

Your app is already mobile-friendly! To use it like a native app:

1. Open the app in your mobile browser
2. **iOS**: Tap Share → "Add to Home Screen"
3. **Android**: Tap Menu → "Add to Home Screen"
4. The app will appear like a native app on your phone

## 🔒 Environment Setup (Optional)

For production use, create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Then update `src/services/supabase.js`:
```javascript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
```

## 🐛 Troubleshooting

### Common Installation Issues:

**Error: "command not found: npm"**
- Install Node.js from [nodejs.org](https://nodejs.org/)

**Error: "EACCES: permission denied"**
- On macOS/Linux: Use `sudo npm install -g npm`
- Or use a Node version manager like nvm

**Error: "Module not found"**
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

**App won't start**
- Make sure you're in the correct directory
- Check if port 3000 is already in use
- Try `npm start -- --port 3001` to use a different port

### Performance Issues:

**Slow installation**
- Use `npm ci` instead of `npm install` for faster installs
- Clear npm cache: `npm cache clean --force`

**Large bundle size**
- Run `npm run build` and check the `build/` folder
- Use `npm run build -- --analyze` to see what's taking space

## ✅ Verification

After installation, verify everything works:

1. **Start the app**: `npm start`
2. **Check the dashboard**: Should show welcome message and stats
3. **Test navigation**: Click between Dashboard, Add Transaction, etc.
4. **Try adding a transaction**: Form should work (saves to mock data initially)
5. **Check mobile view**: Resize browser or open on phone

## 🎯 Next Steps

Once installation is complete:

1. **Explore the app**: Click around and get familiar
2. **Set up Supabase**: Follow the setup guide in `docs/SETUP_GUIDE.md`
3. **Customize**: Change colors, categories, or add features
4. **Deploy**: When ready, follow deployment instructions

## 💡 Development Tips

- **Fast Refresh**: Saves automatically reload the app
- **Error Messages**: Check the browser console for helpful errors
- **Hot Reloading**: CSS changes appear instantly
- **Port Conflicts**: Use `--port` flag to change the port

---

**That's it!** You now have a fully functional React app ready for development. The installation includes everything you need to start building your personal finance tracker. 🎉

For detailed setup instructions, see `docs/SETUP_GUIDE.md`.
For feature information, see `docs/FEATURES.md`.