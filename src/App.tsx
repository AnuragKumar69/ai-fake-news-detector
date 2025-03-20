import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { Shield, AlertTriangle, Check, Link, History, Brain } from 'lucide-react';

function App() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<null | { score: number; verdict: string }>(null);

  const analyzeText = async () => {
    setIsAnalyzing(true);
    // Simulated analysis - in a real app, this would call an AI service
    await new Promise(resolve => setTimeout(resolve, 2000));
    const score = Math.random() * 100;
    setResult({
      score,
      verdict: score > 70 ? 'Likely Real' : score > 40 ? 'Potentially Misleading' : 'Likely Fake'
    });
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-cyan-900/20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] opacity-10" />
        
        <div className="container mx-auto px-4 py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <Shield className="w-16 h-16 text-cyan-400" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
              AI Fake News Detector
            </h1>
            <TypeAnimation
              sequence={[
                'Detect misinformation in real-time',
                2000,
                'Protect yourself from fake news',
                2000,
                'Make informed decisions',
                2000,
              ]}
              wrapper="div"
              className="text-xl text-gray-300"
              repeat={Infinity}
            />
          </motion.div>

          {/* Main Analysis Section */}
          <div className="mt-12 max-w-3xl mx-auto backdrop-blur-xl bg-white/5 p-8 rounded-2xl border border-white/10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Enter Text to Analyze</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-32 bg-black/50 border border-white/20 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Paste the news article or content here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Or Enter URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/20 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="https://example.com/article"
                  />
                  <button className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg">
                    <Link className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={analyzeText}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="w-5 h-5 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Analyze Content
                  </>
                )}
              </motion.button>
            </div>

            {/* Results Section */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 border border-white/10 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Analysis Results</h3>
                  <div className={`px-4 py-2 rounded-full ${
                    result.score > 70 ? 'bg-green-500/20 text-green-400' :
                    result.score > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {result.verdict}
                  </div>
                </div>

                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 1 }}
                    className={`absolute h-full ${
                      result.score > 70 ? 'bg-green-500' :
                      result.score > 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  />
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  {result.score > 70 ? (
                    <Check className="text-green-400" />
                  ) : (
                    <AlertTriangle className="text-yellow-400" />
                  )}
                  <span>Confidence Score: {result.score.toFixed(1)}%</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              className="backdrop-blur-xl bg-white/5 p-6 rounded-xl border border-white/10"
            >
              <Brain className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-400">Advanced machine learning algorithms analyze content in real-time</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="backdrop-blur-xl bg-white/5 p-6 rounded-xl border border-white/10"
            >
              <History className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Track Record</h3>
              <p className="text-gray-400">Keep track of previously analyzed content and their verdicts</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="backdrop-blur-xl bg-white/5 p-6 rounded-xl border border-white/10"
            >
              <Link className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">URL Analysis</h3>
              <p className="text-gray-400">Analyze entire articles by simply pasting the URL</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;