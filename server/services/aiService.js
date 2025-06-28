const OpenAI = require('openai');
const { logger } = require('../utils/logger');

// Initialize OpenRouter client
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
  defaultHeaders: process.env.OPENROUTER_API_KEY ? {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'Library Management System'
  } : undefined,
  dangerouslyAllowBrowser: false
});

// Use the user's specified model
const DEFAULT_MODEL = process.env.AI_MODEL || 'openrouter/cinematika-7b';

// Check if AI is enabled
const isAIEnabled = () => {
  return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
};

// Semantic search for books
const semanticSearch = async (query, options = {}) => {
  if (!isAIEnabled()) {
    logger.warn('AI is disabled - falling back to basic search');
    return { books: [], total: 0 };
  }

  try {
    const { limit = 20, filters = {} } = options;
    
    const prompt = `Given the search query: "${query}", generate a list of relevant book titles, authors, and subjects that would match this query. 
    Focus on academic and educational books that would be found in a college library.
    Return only the most relevant keywords and phrases, separated by commas.`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful library search assistant. Provide relevant search terms for finding books.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const searchTerms = completion.choices[0].message.content;
    
    // Use the generated search terms to find books in the database
    const Book = require('../models/Book');
    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { genre: { $in: searchTerms.split(',').map(term => term.trim()) } },
        { subjects: { $in: searchTerms.split(',').map(term => term.trim()) } }
      ],
      isActive: true
    };

    // Apply additional filters
    if (filters.genre) searchQuery.genre = { $in: Array.isArray(filters.genre) ? filters.genre : [filters.genre] };
    if (filters.availableOnly) searchQuery.availableCopies = { $gt: 0 };

    const books = await Book.find(searchQuery)
      .populate('addedBy', 'firstName lastName')
      .sort({ popularityScore: -1, averageRating: -1 })
      .limit(limit);

    const total = await Book.countDocuments(searchQuery);

    return { books, total };
  } catch (error) {
    logger.error('Error in semantic search:', error);
    throw new Error('Search failed');
  }
};

// Get personalized book recommendations
const getBookRecommendations = async (userId, options = {}) => {
  if (!isAIEnabled()) {
    logger.warn('AI is disabled - returning popular books');
    const Book = require('../models/Book');
    return await Book.getPopularBooks(options.limit || 10);
  }

  try {
    const { limit = 10, type = 'general' } = options;
    
    // Get user's borrowing history
    const Borrowing = require('../models/Borrowing');
    const userBorrowings = await Borrowing.find({ student: userId })
      .populate('book', 'title author genre subjects')
      .sort({ borrowedAt: -1 })
      .limit(20);

    if (userBorrowings.length === 0) {
      // If no borrowing history, return popular books
      const Book = require('../models/Book');
      return await Book.getPopularBooks(limit);
    }

    // Analyze user preferences
    const genres = [...new Set(userBorrowings.flatMap(b => b.book.genre || []))];
    const subjects = [...new Set(userBorrowings.flatMap(b => b.book.subjects || []))];
    const authors = [...new Set(userBorrowings.map(b => b.book.author))];

    const prompt = `Based on the user's reading history, recommend ${limit} books. 
    User has borrowed books in these genres: ${genres.join(', ')}
    Subjects: ${subjects.join(', ')}
    Authors: ${authors.join(', ')}
    
    Recommend diverse books that match their interests but also introduce new topics.
    Return only book titles and authors, one per line.`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable librarian. Recommend books based on user preferences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const recommendations = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [title, ...authorParts] = line.split(' by ');
        return { title: title.trim(), author: authorParts.join(' by ').trim() };
      });

    // Find matching books in database
    const Book = require('../models/Book');
    const recommendedBooks = [];
    
    for (const rec of recommendations) {
      const book = await Book.findOne({
        title: { $regex: rec.title, $options: 'i' },
        author: { $regex: rec.author, $options: 'i' },
        isActive: true,
        availableCopies: { $gt: 0 }
      }).populate('addedBy', 'firstName lastName');
      
      if (book) {
        recommendedBooks.push(book);
        if (recommendedBooks.length >= limit) break;
      }
    }

    // If we don't have enough recommendations, fill with similar books
    if (recommendedBooks.length < limit) {
      const similarBooks = await Book.find({
        _id: { $nin: recommendedBooks.map(b => b._id) },
        $or: [
          { genre: { $in: genres } },
          { subjects: { $in: subjects } },
          { author: { $in: authors } }
        ],
        isActive: true,
        availableCopies: { $gt: 0 }
      })
      .populate('addedBy', 'firstName lastName')
      .sort({ popularityScore: -1, averageRating: -1 })
      .limit(limit - recommendedBooks.length);

      recommendedBooks.push(...similarBooks);
    }

    return recommendedBooks;
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    // Fallback to popular books
    const Book = require('../models/Book');
    return await Book.getPopularBooks(limit);
  }
};

// Analyze sentiment of text
const analyzeSentiment = async (text) => {
  if (!isAIEnabled()) {
    logger.warn('AI is disabled - returning neutral sentiment');
    return { score: 0, label: 'neutral', keywords: [] };
  }

  try {
    const prompt = `Analyze the sentiment of this text and provide:
    1. A sentiment score from -1 (very negative) to 1 (very positive)
    2. A sentiment label: negative, neutral, or positive
    3. Key words or phrases that indicate the sentiment
    
    Text: "${text}"
    
    Respond in JSON format: {"score": 0.5, "label": "positive", "keywords": ["great", "excellent"]}`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze text and return structured JSON responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.1
    });

    const response = completion.choices[0].message.content;
    
    try {
      const result = JSON.parse(response);
      return {
        score: result.score || 0,
        label: result.label || 'neutral',
        keywords: result.keywords || []
      };
    } catch (parseError) {
      logger.error('Error parsing sentiment response:', parseError);
      return { score: 0, label: 'neutral', keywords: [] };
    }
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    return { score: 0, label: 'neutral', keywords: [] };
  }
};

// Predict overdue probability
const predictOverdue = async (borrowing) => {
  if (!isAIEnabled()) {
    logger.warn('AI is disabled - returning basic overdue prediction');
    const daysOverdue = Math.ceil((new Date() - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24));
    return {
      probability: daysOverdue > 0 ? 0.8 : 0.2,
      riskLevel: daysOverdue > 0 ? 'high' : 'low',
      factors: ['basic calculation']
    };
  }

  try {
    const prompt = `Predict the probability of this book being returned late.
    
    Book: ${borrowing.book.title} by ${borrowing.book.author}
    Student: ${borrowing.student.firstName} ${borrowing.student.lastName}
    Due Date: ${borrowing.dueDate}
    Days until due: ${Math.ceil((new Date(borrowing.dueDate) - new Date()) / (1000 * 60 * 60 * 24))}
    
    Consider factors like:
    - How close to the due date
    - Student's borrowing history
    - Book popularity and demand
    - Academic calendar timing
    
    Return a JSON response: {"probability": 0.3, "riskLevel": "medium", "factors": ["close to due date", "popular book"]}`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a library analytics expert. Predict overdue probability based on various factors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.2
    });

    const response = completion.choices[0].message.content;
    
    try {
      const result = JSON.parse(response);
      return {
        probability: result.probability || 0.5,
        riskLevel: result.riskLevel || 'medium',
        factors: result.factors || []
      };
    } catch (parseError) {
      logger.error('Error parsing prediction response:', parseError);
      return {
        probability: 0.5,
        riskLevel: 'medium',
        factors: ['prediction failed']
      };
    }
  } catch (error) {
    logger.error('Error predicting overdue:', error);
    return {
      probability: 0.5,
      riskLevel: 'medium',
      factors: ['prediction failed']
    };
  }
};

// Generate book embedding (simplified version for OpenRouter)
const generateBookEmbedding = async (book) => {
  if (!isAIEnabled()) {
    logger.warn('AI is disabled - returning placeholder embedding');
    return [0.1, 0.2, 0.3, 0.4, 0.5]; // Placeholder embedding
  }

  try {
    const text = `${book.title} ${book.author} ${book.description || ''} ${book.genre?.join(' ')} ${book.subjects?.join(' ')}`;
    
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a book embedding generator. Convert book information into numerical representation.'
        },
        {
          role: 'user',
          content: `Generate a simple numerical representation for this book: ${text}`
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    // For simplicity, we'll create a basic embedding based on text characteristics
    const embedding = [];
    const textLength = text.length;
    const wordCount = text.split(' ').length;
    const hasDescription = book.description ? 1 : 0;
    const genreCount = book.genre?.length || 0;
    const subjectCount = book.subjects?.length || 0;

    embedding.push(
      Math.min(textLength / 1000, 1), // Normalized text length
      Math.min(wordCount / 100, 1),   // Normalized word count
      hasDescription,                  // Has description
      Math.min(genreCount / 5, 1),    // Normalized genre count
      Math.min(subjectCount / 10, 1)  // Normalized subject count
    );

    return embedding;
  } catch (error) {
    logger.error('Error generating book embedding:', error);
    return [0.1, 0.2, 0.3, 0.4, 0.5]; // Fallback embedding
  }
};

module.exports = {
  semanticSearch,
  getBookRecommendations,
  analyzeSentiment,
  predictOverdue,
  generateBookEmbedding,
  isAIEnabled
}; 