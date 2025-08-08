import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-white text-xl font-bold">Kira by Kiezz</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Open Source</a>
            <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
            <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{top: '20%', left: '10%'}}></div>
            <div className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{top: '40%', right: '20%'}}></div>
            <div className="absolute w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{bottom: '30%', left: '80%'}}></div>
          </div>

          <div className="relative z-10">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 mb-6 leading-tight">
              Financial Freedom
              <br />
              <span className="text-white">For Everyone</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              The world's most intelligent financial management platform. 
              <span className="text-blue-400 font-semibold"> 100% free</span> and 
              <span className="text-purple-400 font-semibold"> open-source</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <Link to="/register" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
                Start Managing Money 🚀
              </Link>
              <a href="https://github.com/Cookiez04/Kira-by-Kiezz" className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                <span>⭐ Star on GitHub</span>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center space-x-8 text-gray-400 text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>100% Free Forever</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Open Source</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <span>Privacy‑focused by design</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Kira is <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Different</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for the future. Designed for humans. Free for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Analytics</h3>
              <p className="text-gray-300 leading-relaxed">
                Intelligent insights that actually help you save money. No AI costs - just clever algorithms that understand your spending patterns.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-purple-500 transition-all duration-300 transform hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Beautiful Design</h3>
              <p className="text-gray-300 leading-relaxed">
                The first truly beautiful financial app. Dark, futuristic interface that makes budgeting feel like using technology from the future.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-green-500 transition-all duration-300 transform hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl">🔓</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Open Source</h3>
              <p className="text-gray-300 leading-relaxed">
                Full transparency. Your data stays yours. Community-driven development. No vendor lock-in. Free forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">100%</div>
              <div className="text-gray-300">Free Forever</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500">Open</div>
              <div className="text-gray-300">Source Code</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Smart</div>
              <div className="text-gray-300">Analytics</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Take Control of Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Financial Future?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of users who've transformed their relationship with money using Kira.
          </p>
          <Link to="/register" className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-500/25">
            Start Your Journey Today ✨
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-white text-xl font-bold">Kira by Kiezz</span>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-400">
              <a href="https://github.com/Cookiez04/Kira-by-Kiezz" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://github.com/Cookiez04/Kira-by-Kiezz#readme" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Documentation</a>
              <a href="mailto:kiezzyee@gmail.com" className="hover:text-white transition-colors">Support</a>
              <a href="https://github.com/sponsors/Cookiez04" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">💝 Donate</a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 Kira by Kiezz. Open source, made with ❤️ for financial freedom.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;