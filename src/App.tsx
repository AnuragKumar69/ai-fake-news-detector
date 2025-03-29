import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { Shield, AlertTriangle, Check, Link, History, Brain, ExternalLink } from 'lucide-react';
import axios from 'axios'; // You'll still need axios for URL scraping

// Add these utility functions
// Credibility indicators database (local)
const credibilityIndicators = {
  sensationalistPhrases: [
    "you won't believe", "shocking", "mind-blowing", "outrageous",
    "unbelievable", "jaw-dropping", "sensational", "incredible",
    "insane", "unreal", "bombshell", "breaking", "explosive",
    "conspiracy", "secret", "they don't want you to know", "wake up",
    "mainstream media won't tell you", "they're hiding", "government doesn't want you"
  ],
  
  clickbaitPatterns: [
    /^\d+\s+(?:ways|things|reasons|facts|tips|tricks|ideas|steps)/i,
    /(?:what happens next|you won't believe|wait until you see)/i,
    /(?:how to|this one trick|doctors hate)/i,
    /(?:secrets|revealed|shocking truth|mind-?blown)/i
  ],
  
  factualLanguageIndicators: [
    "according to", "study shows", "research indicates", "evidence suggests",
    "data from", "analysis of", "survey of", "reported by", "conducted by"
  ],
  
  credibleDomains: [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org', 'pbs.org',
    'nytimes.com', 'washingtonpost.com', 'economist.com', 'nature.com',
    'science.org', 'nationalgeographic.com', 'scientificamerican.com',
    'theguardian.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'ap.org',
    'cnn.com', 'time.com', 'usatoday.com', 'latimes.com', 'chicagotribune.com'
  ],
  
  lowCredibilityDomains: [
    'infowars.com', 'naturalnews.com', 'breitbart.com', 'dailywire.com',
    'activistpost.com', 'worldnewsdailyreport.com', 'beforeitsnews.com',
    'zerohedge.com', 'wnd.com', 'truthrevolt.org'
  ],
  
  satireSites: [
    'theonion.com', 'babylonbee.com', 'clickhole.com', 'thebeaverton.com',
    'waterfordwhispersnews.com', 'duffelblog.com', 'thehardtimes.net'
  ]
};

function App() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<null | { 
    score: number; 
    verdict: string;
    issues: string[];
    insights: string[];
    detailedAnalysis: any;
  }>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    content: string;
    score: number;
    date: Date;
  }>>([]);
  const [userFeedback, setUserFeedback] = useState<{
    [contentId: string]: { 
      originalScore: number;
      userScore: number;
      reasons: string[];
    }
  }>({});

  // Add these new states to store the learned weights
  const [analysisWeights, setAnalysisWeights] = useState({
    sensationalist: 1.0,
    clickbait: 0.8,
    factualLanguage: 1.5,
    textFormatting: 0.5,
    balance: 1.2,
    domain: 2.0,
    length: 0.3,
    sentiment: 1.0,
    readability: 0.7,
    topic: 0.3,
    politicalBias: 1.0,
    factualClaims: 1.8,
    sourceCitations: 1.5,
    historyComparison: 0.5
  });

  // Extract domain from URL
  const extractDomain = (url: string): string | null => {
    try {
      const domain = new URL(url);
      return domain.hostname;
    } catch (e) {
      return null;
    }
  };

  // Check for sensationalist language
  const analyzeSensationalistLanguage = (content: string) => {
    const contentLower = content.toLowerCase();
    const matches = credibilityIndicators.sensationalistPhrases.filter(phrase => 
      contentLower.includes(phrase.toLowerCase())
    );
    
    let score = 100;
    if (matches.length > 0) {
      score = Math.max(30, 100 - (matches.length * 10));
    }
    
    return {
      score,
      hasIssue: matches.length > 0,
      message: matches.length > 0 ? 
        `Contains ${matches.length} sensationalist phrases that may indicate clickbait` : 
        "No obvious sensationalist language detected",
      matches
    };
  };

  // Check for clickbait patterns in headlines
  const analyzeClickbaitPatterns = (content: string) => {
    // Try to extract a headline (first 100 chars or up to first period)
    const potentialHeadline = content.substring(0, Math.min(100, content.indexOf('.') > 0 ? content.indexOf('.') : 100));
    
    const matches = credibilityIndicators.clickbaitPatterns.filter(pattern => 
      pattern.test(potentialHeadline)
    );
    
    const score = matches.length > 0 ? Math.max(40, 100 - (matches.length * 20)) : 100;
    
    return {
      score,
      hasIssue: matches.length > 0,
      message: matches.length > 0 ? 
        "Contains clickbait headline patterns" : 
        "No obvious clickbait patterns detected",
      matches: matches.map(m => m.toString())
    };
  };

  // Check for factual language indicators
  const analyzeFactualLanguage = (content: string) => {
    const contentLower = content.toLowerCase();
    const matches = credibilityIndicators.factualLanguageIndicators.filter(phrase => 
      contentLower.includes(phrase.toLowerCase())
    );
    
    const score = matches.length > 0 ? Math.min(100, 80 + (matches.length * 5)) : 80;
    
    return {
      score,
      hasIssue: matches.length === 0,
      message: matches.length > 0 ? 
        `Contains ${matches.length} indicators of factual reporting` : 
        "Few or no explicit indicators of factual reporting",
      matches
    };
  };

  // Check for all-caps text and excessive punctuation
  const analyzeTextFormatting = (content: string) => {
    // Check for ALL CAPS segments
    const capsRegex = /[A-Z]{5,}/g;
    const capsMatches = content.match(capsRegex) || [];
    
    // Check for excessive punctuation
    const excessivePunctRegex = /[!?]{2,}/g;
    const punctMatches = content.match(excessivePunctRegex) || [];
    
    const score = Math.max(50, 100 - (capsMatches.length * 5) - (punctMatches.length * 5));
    
    return {
      score,
      hasIssue: capsMatches.length > 0 || punctMatches.length > 0,
      message: (capsMatches.length > 0 || punctMatches.length > 0) ?
        "Contains formatting often used for emotional manipulation (ALL CAPS, excessive punctuation)" :
        "Text formatting appears normal",
      details: {
        capsSegments: capsMatches.length,
        excessivePunctuation: punctMatches.length
      }
    };
  };

  // Check for balance of perspective
  const analyzeBalanceOfPerspective = (content: string) => {
    const contentLower = content.toLowerCase();
    
    // Keywords indicating presenting multiple viewpoints
    const balancedIndicators = ["however", "on the other hand", "critics say", "while some", 
      "others argue", "alternatively", "both sides", "different perspective"];
    
    // Very one-sided language
    const onesidedIndicators = ["clearly", "obviously", "undoubtedly", "without question",
      "absolutely", "certainly", "definitely", "unquestionably", "only one conclusion"];
    
    const balancedMatches = balancedIndicators.filter(term => contentLower.includes(term));
    const onesidedMatches = onesidedIndicators.filter(term => contentLower.includes(term));
    
    let score = 80;
    
    if (balancedMatches.length > 1) {
      score += Math.min(15, balancedMatches.length * 5);
    }
    
    if (onesidedMatches.length > 1) {
      score -= Math.min(20, onesidedMatches.length * 4);
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      hasIssue: balancedMatches.length === 0 && onesidedMatches.length > 2,
      message: balancedMatches.length > 0 ? 
        "Content shows some balance in perspectives" : 
        onesidedMatches.length > 2 ? 
          "Content presents a one-sided perspective" : 
          "Unable to determine balance of perspectives",
      details: {
        balancedTerms: balancedMatches,
        onesidedTerms: onesidedMatches
      }
    };
  };

  // Check domain reputation
  const analyzeDomainReputation = (url: string | null) => {
    if (!url) {
      return {
        score: 70,
        hasIssue: false,
        message: "No URL provided for domain analysis",
        domain: null,
        reputation: "Unknown"
      };
    }
    
    const domain = extractDomain(url);
    if (!domain) {
      return {
        score: 70,
        hasIssue: false,
        message: "Invalid URL format",
        domain: null,
        reputation: "Unknown"
      };
    }
    
    // Check if domain matches or contains any credible domains
    const isCredible = credibilityIndicators.credibleDomains.some(d => domain.includes(d));
    
    // Check if domain matches or contains any low credibility domains
    const isLowCredibility = credibilityIndicators.lowCredibilityDomains.some(d => domain.includes(d));
    
    // Check if it's a known satire site
    const isSatire = credibilityIndicators.satireSites.some(d => domain.includes(d));
    
    if (isSatire) {
      return {
        score: 30,
        hasIssue: true,
        message: "This appears to be a satirical website, not meant to be taken as factual news",
        domain,
        reputation: "Satire"
      };
    }
    
    if (isCredible) {
      return {
        score: 95,
        hasIssue: false,
        message: "Content comes from a generally reliable source",
        domain,
        reputation: "Generally reliable"
      };
    }
    
    if (isLowCredibility) {
      return {
        score: 20,
        hasIssue: true,
        message: "Content comes from a source with a history of misinformation",
        domain,
        reputation: "Potentially unreliable"
      };
    }
    
    return {
      score: 70,
      hasIssue: false,
      message: "Source reputation unknown",
      domain,
      reputation: "Unknown"
    };
  };

  // Article length analysis
  const analyzeContentLength = (content: string) => {
    const wordCount = content.split(/\s+/).length;
    
    let score = 50;
    let message = "";
    
    if (wordCount < 100) {
      score = 40;
      message = "Content is very short, which can lack context and detail";
    } else if (wordCount < 300) {
      score = 60;
      message = "Content is relatively brief";
    } else if (wordCount < 800) {
      score = 75;
      message = "Content has reasonable length for covering a topic";
    } else {
      score = 80;
      message = "Content is detailed and substantive in length";
    }
    
    return {
      score,
      hasIssue: wordCount < 200,
      message,
      wordCount
    };
  };

  // Scrape URL content using a CORS proxy
  const scrapeUrl = async (url: string) => {
    try {
      // Use AllOrigins as a CORS proxy (free and reliable)
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const response = await axios.get(`${corsProxy}${encodeURIComponent(url)}`);
      
      // Simple extraction of text from HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, 'text/html');
      
      // Extract text from paragraphs, headings, etc.
      const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article');
      let extractedText = '';
      
      paragraphs.forEach(element => {
        extractedText += element.textContent + ' ';
      });
      
      return extractedText.trim();
    } catch (error) {
      console.error("Error scraping URL:", error);
      throw new Error("Failed to extract content from URL");
    }
  };

  // Add functions for advanced text analysis
  const analyzeReadabilityLevel = (content: string) => {
    // Simple implementation of the Flesch-Kincaid readability test
    const sentences = content.split(/[.!?]+/).filter(Boolean).length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const syllables = countSyllables(content);
    
    // Flesch-Kincaid Grade Level formula
    const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
    
    return {
      score: gradeLevel > 12 ? 60 : gradeLevel < 6 ? 70 : 90,
      hasIssue: gradeLevel > 15 || gradeLevel < 5,
      message: gradeLevel > 15 
        ? "Content uses unnecessarily complex language, which can obscure meaning" 
        : gradeLevel < 5 
          ? "Content uses very simple language, which may oversimplify complex topics"
          : "Content has appropriate readability level",
      details: { gradeLevel }
    };
  };

  // Helper function for syllable counting
  const countSyllables = (text: string) => {
    // Simple syllable counting algorithm (not perfect but works for demo)
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]{2,}/g, 'a')
      .replace(/[^aeiouy]e\b/g, '')
      .match(/[aeiouy]/g)?.length || 0;
  };

  // Add the missing analyzeSentiment function
  const analyzeSentiment = (content: string) => {
    // Simple lexicon-based sentiment analysis
    const positiveWords = ["good", "great", "excellent", "positive", "benefit", "happy", 
                           "wonderful", "fantastic", "amazing", "successful", "win"];
    const negativeWords = ["bad", "terrible", "awful", "negative", "poor", "failure", 
                           "horrible", "disappointing", "wrong", "catastrophic", "disaster"];
    
    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    const sentimentScore = (positiveCount - negativeCount) / Math.max(1, words.length * 0.05);
    const emotionalIntensity = (positiveCount + negativeCount) / Math.max(1, words.length * 0.05);
    
    return {
      score: Math.min(100, Math.max(0, 50 + (sentimentScore * 5))),
      hasIssue: emotionalIntensity > 0.2, // High emotional content can be manipulative
      message: emotionalIntensity > 0.2 
        ? "Content has high emotional language that may be used to manipulate"
        : "Content uses relatively neutral emotional language",
      details: {
        sentimentScore,
        emotionalIntensity,
        positiveCount,
        negativeCount
      }
    };
  };

  // Modify the analyzeUrl function to handle scraped content differently
  const analyzeUrl = async () => {
    if (!url) return;
    
    setIsAnalyzing(true);
    try {
      // Scrape the content but don't update the text input field
      const scrapedContent = await scrapeUrl(url);
      
      // Analyze the scraped content directly without setting it to the text state
      await analyzeContentDirectly(scrapedContent, url);
        } catch (error) {
      console.error("Error analyzing URL:", error);
          setResult({
            score: 0,
            verdict: "Analysis Failed",
            issues: ["Could not extract content from the provided URL"],
            insights: [],
            detailedAnalysis: {}
          });
    } finally {
          setIsAnalyzing(false);
        }
  };
      
  // Add a separate function to analyze content without updating text input
  const analyzeContentDirectly = async (contentToAnalyze: string, sourceUrl: string) => {
    try {
      if (!contentToAnalyze) {
        setResult({
          score: 0,
          verdict: "Analysis Failed",
          issues: ["No content extracted from URL"],
          insights: [],
          detailedAnalysis: {}
        });
        return;
      }
      
      // Run all analyses
      const sensationalistResult = analyzeSensationalistLanguage(contentToAnalyze);
      const clickbaitResult = analyzeClickbaitPatterns(contentToAnalyze);
      const factualLanguageResult = analyzeFactualLanguage(contentToAnalyze);
      const textFormattingResult = analyzeTextFormatting(contentToAnalyze);
      const balanceResult = analyzeBalanceOfPerspective(contentToAnalyze);
      const domainResult = analyzeDomainReputation(sourceUrl);
      const lengthResult = analyzeContentLength(contentToAnalyze);
      
      // Add new analysis results
      const sentimentResult = analyzeSentiment(contentToAnalyze);
      const readabilityResult = analyzeReadabilityLevel(contentToAnalyze);
      const topicResult = analyzeTopicRelevance(contentToAnalyze);
      const politicalBiasResult = analyzePoliticalBias(contentToAnalyze);
      const factualClaimsResult = analyzeFactualClaims(contentToAnalyze);
      const sourceCitationsResult = analyzeSourceCitations(contentToAnalyze);
      
      // Add history comparison if we have previous entries
      let historyComparisonResult = null;
      if (analysisHistory.length > 0) {
        historyComparisonResult = compareWithHistory(contentToAnalyze);
      }
      
      // Calculate weighted score using the learned weights
      const analysisResults = [
        { result: sensationalistResult, weight: analysisWeights.sensationalist },
        { result: clickbaitResult, weight: analysisWeights.clickbait },
        { result: factualLanguageResult, weight: analysisWeights.factualLanguage },
        { result: textFormattingResult, weight: analysisWeights.textFormatting },
        { result: balanceResult, weight: analysisWeights.balance },
        { result: domainResult, weight: analysisWeights.domain },
        { result: lengthResult, weight: analysisWeights.length },
        { result: sentimentResult, weight: analysisWeights.sentiment },
        { result: readabilityResult, weight: analysisWeights.readability },
        { result: topicResult, weight: analysisWeights.topic },
        { result: politicalBiasResult, weight: analysisWeights.politicalBias },
        { result: factualClaimsResult, weight: analysisWeights.factualClaims },
        { result: sourceCitationsResult, weight: analysisWeights.sourceCitations }
      ];
      
      // Add history comparison to results if available
      if (historyComparisonResult) {
        analysisResults.push({ 
          result: historyComparisonResult, 
          weight: analysisWeights.historyComparison 
        });
      }
      
      const totalWeight = analysisResults.reduce((sum, item) => sum + item.weight, 0);
      const weightedScore = analysisResults.reduce((sum, item) => 
        sum + (item.result.score * item.weight), 0) / totalWeight;
      
      // Collect issues and insights
      const issues = [];
      const insights = [];
      
      if (sensationalistResult.hasIssue) issues.push(sensationalistResult.message);
      if (clickbaitResult.hasIssue) issues.push(clickbaitResult.message);
      if (factualLanguageResult.hasIssue) issues.push(factualLanguageResult.message);
      if (textFormattingResult.hasIssue) issues.push(textFormattingResult.message);
      if (balanceResult.hasIssue) issues.push(balanceResult.message);
      if (domainResult.hasIssue) issues.push(domainResult.message);
      if (lengthResult.hasIssue) issues.push(lengthResult.message);
      if (sentimentResult.hasIssue) issues.push(sentimentResult.message);
      if (readabilityResult.hasIssue) issues.push(readabilityResult.message);
      if (politicalBiasResult.hasIssue) issues.push(politicalBiasResult.message);
      if (factualClaimsResult.hasIssue) issues.push(factualClaimsResult.message);
      if (sourceCitationsResult.hasIssue) issues.push(sourceCitationsResult.message);
      if (historyComparisonResult?.hasIssue) issues.push(historyComparisonResult.message);
      
      // Add positive insights
      if (!sensationalistResult.hasIssue) insights.push(sensationalistResult.message);
      if (!clickbaitResult.hasIssue) insights.push(clickbaitResult.message);
      if (!factualLanguageResult.hasIssue) insights.push(factualLanguageResult.message);
      if (!domainResult.hasIssue && domainResult.reputation !== "Unknown") 
        insights.push(domainResult.message);
      if (balanceResult.details.balancedTerms.length > 0) 
        insights.push("Content presents multiple perspectives");
      if (sentimentResult.hasIssue) insights.push(sentimentResult.message);
      
      // Determine verdict
      let verdict;
      if (weightedScore >= 85) {
        verdict = "Very Likely Real";
      } else if (weightedScore >= 70) {
        verdict = "Likely Real";
      } else if (weightedScore >= 50) {
        verdict = "Uncertain";
      } else if (weightedScore >= 30) {
        verdict = "Potentially Misleading";
      } else {
        verdict = "Likely Fake";
      }
      
      // Special case for satire
      if (domainResult.reputation === "Satire") {
        verdict = "Satirical Content";
      }
      
      // Save to history for future comparison
      setAnalysisHistory(prev => [...prev, {
        content: contentToAnalyze,
        score: Math.round(weightedScore),
        date: new Date()
      }]);
      
      setResult({
        score: Math.round(weightedScore),
        verdict,
        issues,
        insights,
        detailedAnalysis: {
          sensationalist: sensationalistResult,
          clickbait: clickbaitResult,
          factualLanguage: factualLanguageResult,
          textFormatting: textFormattingResult,
          balance: balanceResult,
          domain: domainResult,
          length: lengthResult,
          sentiment: sentimentResult,
          readability: readabilityResult,
          topic: topicResult,
          politicalBias: politicalBiasResult,
          factualClaims: factualClaimsResult,
          sourceCitations: sourceCitationsResult,
          historyComparison: historyComparisonResult
        }
      });
    } catch (error) {
      console.error("Analysis error:", error);
      setResult({
        score: 0,
        verdict: "Analysis Failed",
        issues: ["An error occurred during analysis"],
        insights: [],
        detailedAnalysis: {}
      });
    }
  };

  // Update the main analyzeText function to reuse the analyzeContentDirectly logic
  const analyzeText = async () => {
    setIsAnalyzing(true);
    try {
      if (!text && url) {
        // If there's a URL but no text, use the URL analysis
        await analyzeUrl();
        return;
      }
      
      if (!text) {
        setResult({
          score: 0,
          verdict: "Analysis Failed",
          issues: ["No content provided for analysis"],
          insights: [],
          detailedAnalysis: {}
        });
        setIsAnalyzing(false);
        return;
      }
      
      // Analyze the text directly
      await analyzeContentDirectly(text, url);
    } catch (error) {
      console.error("Analysis error:", error);
      setResult({
        score: 0,
        verdict: "Analysis Failed",
        issues: ["An error occurred during analysis"],
        insights: [],
        detailedAnalysis: {}
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeTopicRelevance = (content: string) => {
    // Define topic keywords
    const topicKeywords: Record<string, string[]> = {
      "politics": ["government", "election", "president", "vote", "political", "party", "democrat", "republican"],
      "health": ["doctor", "medical", "disease", "cure", "treatment", "patient", "hospital", "health"],
      "science": ["research", "study", "scientist", "experiment", "discovery", "theory", "evidence"],
      "finance": ["money", "market", "stock", "invest", "financial", "economy", "economic", "bank"]
      // Add more topics as needed
    };
    
    // Count keyword matches per topic
    const contentLower = content.toLowerCase();
    const topicMatches: Record<string, number> = {};
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      topicMatches[topic] = keywords.filter(keyword => contentLower.includes(keyword)).length;
    });
    
    // Find dominant topics
    const sortedTopics = Object.entries(topicMatches)
      .sort(([, countA], [, countB]) => countB - countA)
      .filter(([, count]) => count > 0)
      .map(([topic]) => topic);
    
    return {
      score: 70, // Neutral score as this is informational
      hasIssue: false,
      message: sortedTopics.length > 0 
        ? `Content primarily discusses: ${sortedTopics.slice(0, 2).join(", ")}`
        : "Unable to determine main topics",
      details: { 
        topics: sortedTopics,
        topicMatches
      }
    };
  };

  const analyzeFactualClaims = (content: string) => {
    // Regex patterns to detect claims
    const claimPatterns = [
      /(\w+\s){2,10}(is|are|was|were)(\s\w+){2,10}/g,  // "X is Y" patterns
      /according to(\s\w+){2,10}/gi,                   // "According to X" patterns
      /studies (show|indicate|suggest)(\s\w+){2,10}/gi, // "Studies show X" patterns
      /(\d+)%\s+of(\s\w+){2,10}/g                      // Statistical claims "X% of Y"
    ];
    
    // Find claim matches
    const claims: string[] = [];
    claimPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) claims.push(...matches);
    });
    
    // Check for citations or evidence
    const hasCitations = /\(\d{4}\)|\[[\d,]+\]|cited|source|reference/i.test(content);
    
    return {
      score: claims.length > 0 && !hasCitations ? 50 : claims.length > 0 ? 80 : 70,
      hasIssue: claims.length > 2 && !hasCitations,
      message: claims.length > 2 && !hasCitations 
        ? "Contains multiple factual claims without citations or evidence"
        : claims.length > 0 && hasCitations
          ? "Contains factual claims with some form of citation"
          : "Few specific factual claims detected",
      details: {
        claimsCount: claims.length,
        hasCitations,
        examples: claims.slice(0, 3)
      }
    };
  };

  const analyzeSourceCitations = (content: string) => {
    // Patterns for different citation types
    const citationPatterns = {
      academic: /(doi:|et al\.|[A-Z][a-z]+ & [A-Z][a-z]+, \d{4}|\(\d{4}\))/g,
      news: /(reported by|according to) ([A-Z][a-z]+ ?)+/g,
      quotes: /"([^"]{15,})"/g,
      stats: /(\d+(\.\d+)?%|\d+ (out of|of) \d+)/g
    };
    
    // Find citation matches
    const citations: Record<string, string[]> = {
      academic: content.match(citationPatterns.academic) || [],
      news: content.match(citationPatterns.news) || [],
      quotes: content.match(citationPatterns.quotes) || [],
      stats: content.match(citationPatterns.stats) || []
    };
    
    const totalCitations = Object.values(citations).reduce((sum, arr) => sum + arr.length, 0);
    
    return {
      score: totalCitations === 0 ? 50 : Math.min(100, 60 + totalCitations * 5),
      hasIssue: totalCitations === 0,
      message: totalCitations === 0 
        ? "No clear citations or evidence found" 
        : `Content includes ${totalCitations} citations or pieces of evidence`,
      details: citations
    };
  };

  // Add a function to store and compare with history - fix the return type to match other analyzers
  const compareWithHistory = (content: string) => {
    // Simple text similarity using Jaccard index
    const getTokens = (text: string) => 
      text.toLowerCase().split(/\W+/).filter(Boolean);
    
    const currentTokens = new Set(getTokens(content));
    
    const similarities = analysisHistory.map(item => {
      const historyTokens = new Set(getTokens(item.content));
      const intersection = new Set([...currentTokens].filter(x => historyTokens.has(x)));
      const union = new Set([...currentTokens, ...historyTokens]);
      
      return {
        score: item.score,
        similarity: intersection.size / union.size,
        date: item.date
      };
    });
    
    // Sort by similarity
    const mostSimilar = similarities.sort((a, b) => b.similarity - a.similarity)[0];
    
    // Convert to the expected format that matches other analyzers
    const similarItems = similarities
      .filter(s => s.similarity > 0.3)
      .map(s => `Similar content (${Math.round(s.similarity * 100)}% match) analyzed on ${s.date.toLocaleDateString()}`);
    
    return {
      score: mostSimilar?.similarity > 0.7 ? mostSimilar.score : 70,
      hasIssue: false,
      message: mostSimilar?.similarity > 0.7
        ? `Content is ${Math.round(mostSimilar.similarity * 100)}% similar to previously analyzed content`
        : "No significant similarity to previously analyzed content",
      details: {
        similarContent: similarItems,
        // Make sure details field is Record<string, string[]> compatible
        similarityScores: similarities
          .filter(s => s.similarity > 0.3)
          .map(s => `${Math.round(s.similarity * 100)}%`)
      }
    };
  };

  const analyzePoliticalBias = (content: string) => {
    const contentLower = content.toLowerCase();
    
    // Define political bias indicators
    const biasIndicators = {
      left: ["progressive", "liberal", "democrat", "socialism", "welfare", "diversity", 
             "equality", "green", "abortion rights", "gun control"],
      right: ["conservative", "republican", "freedom", "tradition", "tax cuts", 
              "second amendment", "pro-life", "religious liberty", "tough on crime"]
    };
    
    // Count bias indicators
    const leftCount = biasIndicators.left.filter(term => contentLower.includes(term)).length;
    const rightCount = biasIndicators.right.filter(term => contentLower.includes(term)).length;
    
    // Calculate bias score (-100 to 100, negative is left, positive is right)
    const totalTerms = leftCount + rightCount;
    const biasScore = totalTerms === 0 ? 0 : ((rightCount - leftCount) / totalTerms) * 100;
    
    return {
      score: Math.abs(biasScore) > 50 ? 60 : 85, // Lower score for heavily biased content
      hasIssue: Math.abs(biasScore) > 50,
      message: Math.abs(biasScore) < 20 
        ? "Content appears politically balanced" 
        : biasScore < 0 
          ? `Content appears to lean left politically (${Math.abs(Math.round(biasScore))}% bias level)`
          : `Content appears to lean right politically (${Math.round(biasScore)}% bias level)`,
      details: {
        biasScore: Math.round(biasScore),
        leftTerms: leftCount,
        rightTerms: rightCount
      }
    };
  };

  // Add a feedback learning function that adjusts weights based on user feedback
  const learnFromFeedback = (feedback: { 
    originalScore: number; 
    userScore: number; 
    reasons: string[];
  }) => {
    // Calculate discrepancy between our score and user score
    const discrepancy = feedback.userScore - feedback.originalScore;
    
    // If there's minimal discrepancy, no need to adjust
    if (Math.abs(discrepancy) < 10) return;
    
    // Log the feedback for the specific content
    console.log(`Learning from feedback for content ID: ${feedback.originalScore}`);
    
    // Clone current weights
    const newWeights = {...analysisWeights};
    
    // Adjust weights based on specific feedback reasons
    feedback.reasons.forEach(reason => {
      switch(reason) {
        case 'Missing Context':
          // Increase weights for context-related factors
          newWeights.factualLanguage *= 1.05;
          newWeights.balance *= 1.05;
          newWeights.sourceCitations *= 1.05;
          break;
        case 'Incorrect Source Assessment':
          // Adjust domain weight
          newWeights.domain *= discrepancy > 0 ? 0.95 : 1.05;
          break;
        case 'Missed Sensationalism':
          // Increase weight for sensationalism detection
          newWeights.sensationalist *= 1.1;
          newWeights.clickbait *= 1.05;
          break;
        case 'Too Strict':
          // Generally decrease weights of negative factors
          newWeights.sensationalist *= 0.95;
          newWeights.clickbait *= 0.95;
          break;
        case 'Too Lenient':
          // Generally increase weights of negative factors
          newWeights.sensationalist *= 1.05;
          newWeights.clickbait *= 1.05;
          break;
        default:
          // General adjustment based on discrepancy
          Object.keys(newWeights).forEach(key => {
            newWeights[key as keyof typeof newWeights] *= (1 + (discrepancy / 500));
          });
      }
    });
    
    // If no specific reasons given, make a general adjustment
    if (feedback.reasons.length === 0) {
      Object.keys(newWeights).forEach(key => {
        newWeights[key as keyof typeof newWeights] *= (1 + (discrepancy / 1000));
      });
    }
    
    // Normalize weights to maintain relative importance
    const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    const targetTotal = Object.values(analysisWeights).reduce((sum, w) => sum + w, 0);
    const normalizationFactor = targetTotal / totalWeight;
    
    Object.keys(newWeights).forEach(key => {
      newWeights[key as keyof typeof newWeights] *= normalizationFactor;
    });
    
    // Update weights state
    setAnalysisWeights(newWeights);
    
    // Optional: Store weights in localStorage to persist learning across sessions
    localStorage.setItem('analysisWeights', JSON.stringify(newWeights));
  };

  // Modify the submitFeedback function in FeedbackComponent to use the learning function
  const FeedbackComponent = ({ contentId, originalScore }: { contentId: string, originalScore: number }) => {
    const [userScore, setUserScore] = useState<number | null>(null);
    const [reasons, setReasons] = useState<string[]>([]);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    
    const submitFeedback = () => {
      if (userScore === null) return;
      
      const feedback = {
        originalScore,
        userScore,
        reasons
      };
      
      // Update the feedback state
      setUserFeedback(prev => ({
        ...prev,
        [contentId]: feedback
      }));
      
      // Learn from this feedback (passing only the feedback object)
      learnFromFeedback(feedback);
      
      // Show success message
      setFeedbackSubmitted(true);
    };
    
    return (
      <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Was our analysis correct?</h4>
        
        {!feedbackSubmitted ? (
          <>
            <div className="flex gap-2 mb-3">
              {[0, 25, 50, 75, 100].map(score => (
                <button
                  key={score}
                  onClick={() => setUserScore(score)}
                  className={`px-3 py-1 text-xs rounded ${
                    userScore === score ? 'bg-purple-500' : 'bg-gray-700'
                  }`}
                >
                  {score === 0 ? 'Very Inaccurate' :
                   score === 25 ? 'Somewhat Inaccurate' :
                   score === 50 ? 'Neutral' :
                   score === 75 ? 'Somewhat Accurate' :
                   'Very Accurate'}
                </button>
              ))}
            </div>
            
            {userScore !== null && userScore < 75 && (
              <div className="mb-3">
                <p className="text-sm mb-2">What did we miss?</p>
                <div className="flex flex-wrap gap-2">
                  {['Missing Context', 'Incorrect Source Assessment', 'Missed Sensationalism', 
                    'Too Strict', 'Too Lenient'].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setReasons(prev => 
                        prev.includes(reason) 
                          ? prev.filter(r => r !== reason)
                          : [...prev, reason]
                      )}
                      className={`px-2 py-1 text-xs rounded ${
                        reasons.includes(reason) ? 'bg-blue-500' : 'bg-gray-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={submitFeedback}
              disabled={userScore === null}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded text-sm font-medium disabled:opacity-50"
            >
              Submit Feedback
            </button>
          </>
        ) : (
          <div className="text-green-400 text-center py-2">
            Thank you! Your feedback helps our system improve.
          </div>
        )}
      </div>
    );
  };

  // Add a useEffect to load saved weights on app initialization
  useEffect(() => {
    const savedWeights = localStorage.getItem('analysisWeights');
    if (savedWeights) {
      try {
        const parsedWeights = JSON.parse(savedWeights);
        setAnalysisWeights(parsedWeights);
      } catch (error) {
        console.error("Failed to parse saved weights:", error);
      }
    }
  }, []);

  // Use the userFeedback in a useEffect or other function
  // This is just to prevent the "declared but never read" warning
  const getFeedbackStats = () => {
    const feedbackCount = Object.keys(userFeedback).length;
    const accurateAnalyses = Object.values(userFeedback)
      .filter(feedback => feedback.userScore >= 75).length;
    
    return {
      total: feedbackCount,
      accurate: accurateAnalyses,
      accuracyRate: feedbackCount > 0 ? (accurateAnalyses / feedbackCount) * 100 : 0
    };
  };

  // Add a UI component to show the current learning state
  const LearningStatusComponent = () => {
    const totalFeedback = Object.keys(userFeedback).length;
    
    return (
      <div className="mt-8 p-4 bg-gray-800/30 rounded-lg">
        <h3 className="text-lg font-medium mb-2">AI Learning Status</h3>
        <div className="text-sm text-gray-300">
          <p>Model has learned from {totalFeedback} user feedback submissions.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <h4 className="text-xs text-gray-400">Current Feature Importance:</h4>
              <ul className="mt-1 space-y-1">
                {Object.entries(analysisWeights)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([key, weight]) => (
                    <li key={key} className="text-xs flex justify-between">
                      <span>{key}</span>
                      <span className="text-purple-400">{weight.toFixed(2)}</span>
                    </li>
                  ))
                }
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-gray-400">Model Accuracy:</h4>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 bg-gray-700 rounded-full flex-grow overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${getFeedbackStats().accuracyRate}%` }}
                  />
                </div>
                <span className="text-xs">{Math.round(getFeedbackStats().accuracyRate)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            // Reset weights to default
            setAnalysisWeights({
              sensationalist: 1.0,
              clickbait: 0.8,
              factualLanguage: 1.5,
              textFormatting: 0.5,
              balance: 1.2,
              domain: 2.0,
              length: 0.3,
              sentiment: 1.0,
              readability: 0.7,
              topic: 0.3,
              politicalBias: 1.0,
              factualClaims: 1.8,
              sourceCitations: 1.5,
              historyComparison: 0.5
            });
            localStorage.removeItem('analysisWeights');
          }}
          className="mt-3 text-xs px-3 py-1 bg-red-800/40 hover:bg-red-800/60 rounded"
        >
          Reset Learning
        </button>
      </div>
    );
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
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg"
                    onClick={analyzeUrl}
                  >
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

            {/* Updated Results Section */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 border border-white/10 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Analysis Results</h3>
                  <div className={`px-4 py-2 rounded-full ${
                    result.verdict === "Likely Real" ? 'bg-green-500/20 text-green-400' :
                    result.verdict === "Possibly Real" ? 'bg-blue-500/20 text-blue-400' :
                    result.verdict === "Potentially Misleading" ? 'bg-yellow-500/20 text-yellow-400' :
                    result.verdict === "Satirical Content" ? 'bg-purple-500/20 text-purple-400' :
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
                      result.score > 75 ? 'bg-green-500' :
                      result.score > 55 ? 'bg-blue-500' :
                      result.score > 35 ? 'bg-yellow-500' :
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
                  <span>Credibility Score: {result.score}%</span>
                </div>

                {/* New Findings Section */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="space-y-2 bg-red-900/20 p-4 rounded-lg border border-red-900/30">
                      <h4 className="font-medium text-red-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Credibility Issues
                      </h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {result.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-gray-300">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Insights */}
                  {result.insights.length > 0 && (
                    <div className="space-y-2 bg-green-900/20 p-4 rounded-lg border border-green-900/30">
                      <h4 className="font-medium text-green-300 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Positive Indicators
                      </h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {result.insights.map((insight, index) => (
                          <li key={index} className="text-sm text-gray-300">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Domain Info */}
                {result.detailedAnalysis.domain && result.detailedAnalysis.domain.domain && (
                  <div className="mt-4 bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Source: {result.detailedAnalysis.domain.domain}</span>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      result.detailedAnalysis.domain.reputation === "Generally reliable" ? 'bg-green-500/20 text-green-300' :
                      result.detailedAnalysis.domain.reputation === "Satire" ? 'bg-purple-500/20 text-purple-300' :
                      result.detailedAnalysis.domain.reputation === "Potentially unreliable" ? 'bg-red-500/20 text-red-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {result.detailedAnalysis.domain.reputation}
                    </div>
                  </div>
                )}
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

          {/* Learning Status */}
          {Object.keys(userFeedback).length > 0 && (
            <LearningStatusComponent />
          )}

          {/* Feedback Component */}
          {result && (
            <FeedbackComponent contentId={result.score.toString()} originalScore={result.score} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;