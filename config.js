// Configuration for the Exam Platform
const EXAM_CONFIG = {
    // Basic settings
    examTitle: "JEE/NEET Mock Test",
    totalTimeInMinutes: 180, // Default 3 hours
    showTimer: true, // Toggle timer visibility
    
    // Marking scheme
    marksPerCorrect: 4,
    marksPerIncorrect: -1, // Negative marking
    
    // DataSource:
    // If you want to use Google Sheets (via Google Apps Script) to manage questions without coding:
    // 1. Create a Google Sheet.
    // 2. Add columns: id, type (single/multiple), question, optionA, optionB, optionC, optionD, correctOption
    // 3. Go to Extensions > Apps Script. Paste a script to serve sheet as JSON.
    // 4. Deploy as Web App, allow anyone to access.
    // 5. Paste the Web App URL below.
    // Leave it empty "" to use the local questions.json file instead.
    googleAppsScriptUrl: "",
};
