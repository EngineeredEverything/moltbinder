// Add this to server-simple.js

// Feedback endpoint
app.post('/feedback', (req, res) => {
    const { type, message, contact } = req.body;
    
    if (!message || message.length > 1000) {
        return res.status(400).json({ error: 'Message required (max 1000 chars)' });
    }
    
    const feedback = {
        id: Date.now(),
        type: type || 'general',
        message: message.substring(0, 1000),
        contact: contact ? contact.substring(0, 100) : 'anonymous',
        timestamp: new Date().toISOString(),
        ip: req.ip
    };
    
    // Log to file
    const fs = require('fs');
    const feedbackFile = path.join(__dirname, 'data', 'feedback.json');
    
    let feedbackList = [];
    if (fs.existsSync(feedbackFile)) {
        feedbackList = JSON.parse(fs.readFileSync(feedbackFile));
    }
    
    feedbackList.push(feedback);
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbackList, null, 2));
    
    res.json({ success: true, message: 'Feedback received! Thank you.' });
});

// Get feedback (for Clay to review)
app.get('/feedback/list', (req, res) => {
    const fs = require('fs');
    const feedbackFile = path.join(__dirname, 'data', 'feedback.json');
    
    if (!fs.existsSync(feedbackFile)) {
        return res.json([]);
    }
    
    const feedbackList = JSON.parse(fs.readFileSync(feedbackFile));
    res.json(feedbackList);
});
