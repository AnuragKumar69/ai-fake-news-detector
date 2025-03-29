require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Verify API keys are loaded
console.log('Google API Key:', process.env.GOOGLE_FACT_CHECK_API_KEY ? 'Present' : 'Missing');
console.log('News API Key:', process.env.NEWS_API_KEY ? 'Present' : 'Missing');

// Utility functions
const sanitizeText = (text) => {
  return text.trim().substring(0, 5000); // Limit text length for API calls
};

const extractDomain = (url) => {
  try {
    const domain = new URL(url);
    return domain.hostname;
  } catch (e) {
    return null;
  }
};

// Content scraping function
async function scrapeContent(url) {
  try {
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const response = await axios.get(`${corsProxy}${encodeURIComponent(url)}`);
    
    // Extract main content using regex for basic extraction
    // This is a simplified approach - a more robust solution would use cheerio or similar
    const bodyContent = response.data.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || response.data;
    
    // Remove script and style tags
    const noScripts = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const noStyles = noScripts.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove HTML tags and get text
    const text = noStyles.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return sanitizeText(text);
  } catch (error) {
    console.error("Error scraping URL:", error);
    throw new Error("Failed to extract content from URL");
  }
}

// Google Fact Check API
async function checkGoogleFactCheck(query) {
  try {
    const response = await axios.get('https://factchecktools.googleapis.com/v1alpha1/claims:search', {
      params: {
        query: query.substring(0, 100), // Use a portion of the text as query
        key: process.env.GOOGLE_FACT_CHECK_API_KEY
      }
    });
    
    if (!response.data || !response.data.claims) {
      return { score: 50, message: "No fact checks found", details: [] };
    }
    
    // Calculate credibility based on fact check results
    const claims = response.data.claims;
    
    // Create summary of claims
    const details = claims.map(claim => ({
      claimant: claim.claimant,
      claim: claim.text,
      rating: claim.reviewRating?.textualRating || "Unknown"
    }));
    
    // Calculate a score based on ratings
    let credibilityScore = 50; // Default neutral score
    
    if (claims.length > 0) {
      // Look for negative ratings
      const negativeRatings = claims.filter(claim => {
        const rating = (claim.reviewRating?.textualRating || "").toLowerCase();
        return rating.includes("false") || 
               rating.includes("pants on fire") || 
               rating.includes("misleading") ||
               rating.includes("incorrect");
      });
      
      if (negativeRatings.length > 0) {
        credibilityScore = Math.max(10, 50 - (negativeRatings.length * 10));
      } else {
        credibilityScore = 70; // No negative fact checks found
      }
    }
    
    return {
      score: credibilityScore,
      message: claims.length > 0 ? `Found ${claims.length} fact checks related to this content` : "No specific fact checks found",
      details
    };
  } catch (error) {
    console.error("Google Fact Check API error:", error);
    return { score: 50, message: "Fact check service unavailable", details: [] };
  }
}

// Check if story is being reported by multiple sources via NewsAPI
async function checkMultipleSources(text) {
  try {
    // Extract keywords for searching
    const keywords = text.split(/\s+/)
      .filter(word => word.length > 5)
      .slice(0, 3)
      .join(' ');
    
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: keywords,
        apiKey: process.env.NEWS_API_KEY,
        language: 'en',
        pageSize: 10
      }
    });
    
    if (!response.data || !response.data.articles) {
      return { score: 50, message: "Could not verify multiple sources", details: [] };
    }
    
    const articles = response.data.articles;
    const uniqueSources = new Set(articles.map(article => article.source.name));
    
    let score = 50;
    if (uniqueSources.size >= 5) {
      score = 80; // Many sources reporting similar content
    } else if (uniqueSources.size >= 3) {
      score = 70; // Several sources
    } else if (uniqueSources.size >= 1) {
      score = 60; // At least one source
    }
    
    return {
      score,
      message: `Found ${uniqueSources.size} sources reporting similar content`,
      details: Array.from(uniqueSources).slice(0, 5)
    };
  } catch (error) {
    console.error("NewsAPI error:", error);
    return { score: 50, message: "Source verification service unavailable", details: [] };
  }
}

// Sensationalist language detection
function checkSensationalistLanguage(text) {
  const sensationalPhrases = [
    "you won't believe", "shocking", "mind-blowing", "outrageous",
    "unbelievable", "jaw-dropping", "sensational", "incredible",
    "insane", "unreal", "bombshell", "breaking", "explosive",
    "conspiracy", "secret", "they don't want you to know", "wake up",
    "mainstream media won't tell you", "they're hiding", "government doesn't want you to know"
  ];
  
  const textLower = text.toLowerCase();
  const matches = [];
  
  sensationalPhrases.forEach(phrase => {
    if (textLower.includes(phrase.toLowerCase())) {
      matches.push(phrase);
    }
  });
  
  let score = 100;
  if (matches.length > 0) {
    score = Math.max(30, 100 - (matches.length * 10));
  }
  
  return {
    score,
    message: matches.length > 0 ? 
      `Contains ${matches.length} sensationalist phrases that may indicate clickbait` : 
      "No obvious sensationalist language detected",
    details: matches
  };
}

// Domain reputation check using basic lists
function checkDomainReputation(url) {
  if (!url) return { score: 50, message: "No URL provided", details: {} };
  
  const domain = extractDomain(url);
  if (!domain) return { score: 50, message: "Invalid URL format", details: {} };
  
  // Very basic lists - you would want to expand these or use an API
  const knownReliableDomains = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org', 'pbs.org',
    'nytimes.com', 'washingtonpost.com', 'economist.com', 'nature.com',
    'science.org', 'nationalgeographic.com', 'scientificamerican.com',
    'theguardian.com', 'bloomberg.com', 'wsj.com', 'ft.com'
  ];
  
  const knownUnreliableDomains = [
    'theonion.com', // Satire
    'infowars.com', 'naturalnews.com', 'dailywire.com',
    'breitbart.com', 'activistpost.com', 'worldnewsdailyreport.com'
  ];
  
  if (knownReliableDomains.some(d => domain.includes(d))) {
    return {
      score: 90,
      message: "Content comes from a generally reliable source",
      details: { domain, reputation: "Generally reliable" }
    };
  }
  
  if (knownUnreliableDomains.some(d => domain.includes(d))) {
    return {
      score: 20,
      message: "Content comes from a source with a history of misinformation",
      details: { domain, reputation: "Potentially unreliable" }
    };
  }
  
  return {
    score: 50,
    message: "Source reputation unknown",
    details: { domain, reputation: "Unknown" }
  };
}

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, url } = req.body;
    
    if (!text && !url) {
      return res.status(400).json({
        success: false,
        message: "Either text or URL is required for analysis"
      });
    }
    
    let contentToAnalyze = text;
    let sourceUrl = url;
    
    // If URL is provided but no text, scrape the content
    if (url && !text) {
      try {
        contentToAnalyze = await scrapeContent(url);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Failed to extract content from the provided URL"
        });
      }
    }
    
    // Run all analyses in parallel
    const [
      factCheckResult,
      multipleSources,
      sensationalistResult,
      domainResult
    ] = await Promise.all([
      checkGoogleFactCheck(contentToAnalyze),
      checkMultipleSources(contentToAnalyze),
      Promise.resolve(checkSensationalistLanguage(contentToAnalyze)),
      Promise.resolve(checkDomainReputation(sourceUrl))
    ]);
    
    // Combine scores with different weights
    const scores = [
      { value: factCheckResult.score, weight: 2.5 },      // Fact checks are highly important
      { value: multipleSources.score, weight: 2.0 },      // Multiple sources reporting adds credibility
      { value: sensationalistResult.score, weight: 1.0 }, // Sensationalist language is a moderate flag
      { value: domainResult.score, weight: 2.0 }          // Domain reputation is important
    ];
    
    const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
    const weightedScore = scores.reduce((sum, item) => sum + (item.value * item.weight), 0) / totalWeight;
    
    // Determine verdict
    let verdict;
    if (weightedScore >= 70) {
      verdict = "Likely Reliable";
    } else if (weightedScore >= 50) {
      verdict = "Mixed Reliability";
    } else if (weightedScore >= 30) {
      verdict = "Potentially Misleading";
    } else {
      verdict = "Likely Unreliable";
    }
    
    // Collect issues and insights
    const issues = [];
    if (factCheckResult.message) issues.push(factCheckResult.message);
    if (multipleSources.message) issues.push(multipleSources.message);
    if (sensationalistResult.message) issues.push(sensationalistResult.message);
    if (domainResult.message) issues.push(domainResult.message);
    
    // Return the combined analysis
    res.json({
      success: true,
      result: {
        score: Math.round(weightedScore),
        verdict,
        issues,
        details: {
          factCheck: factCheckResult,
          multipleSources,
          sensationalist: sensationalistResult,
          domain: domainResult
        }
      }
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during analysis"
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
