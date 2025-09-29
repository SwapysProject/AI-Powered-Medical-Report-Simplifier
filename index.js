const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { parseReportText } = require('./reportParser');
const { logger } = require('./services/logger');
const { GuardrailService } = require('./services/guardrailService');
const knowledgeBase = require('./knowledgeBase');

// Initialize Guardrail Service
const guardrailService = new GuardrailService(knowledgeBase);

// Enhanced parser with new services (optional)
let enhancedParser = null;
try {
    enhancedParser = require('./reportParser');
    logger.info("Enhanced medical processing services loaded successfully");
} catch (error) {
    logger.warn("Enhanced services not available, using standard parser", { error: error.message });
}

const app = express();
const PORT = 3000;
const PYTHON_OCR_URL = 'http://localhost:5001/ocr'; // Updated to use new OCR screening service

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

const upload = multer({ storage: multer.memoryStorage() });

// Middleware for request logging
app.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        guardrail_stats: guardrailService.getValidationStats(),
        version: '2.0.0'
    });
});

app.post('/simplify-report', upload.single('image_input'), async (req, res) => {
    const startTime = Date.now();
    let processingSteps = [];
    
    try {
        let rawText = '';

        // Step 1: Input Processing
        if (req.file) {
            logger.info("Processing image upload");
            
            const form = new FormData();
            form.append('file', req.file.buffer, { filename: req.file.originalname });

            try {
                const response = await axios.post(PYTHON_OCR_URL, form, {
                    headers: { ...form.getHeaders() },
                    timeout: 60000
                });
                
                // Check if response is valid
                if (!response.data) {
                    throw new Error("No data received from OCR service");
                }
                
                if (response.data.error) {
                    throw new Error(`OCR service error: ${response.data.error}`);
                }
                
                // Extract text from response
                rawText = response.data.text || '';
                
                if (!rawText && response.data.status !== 'no_text_found') {
                    logger.warn("OCR service returned empty text");
                }

            } catch (pythonError) {
                logger.error("Python OCR service failed");
                
                let errorMessage = "The OCR processing service failed.";
                let errorCode = "OCR_SERVICE_FAILED";
                
                if (pythonError.code === 'ECONNREFUSED') {
                    errorMessage = "Cannot connect to the OCR service. Please ensure the Python OCR service is running on port 5001.";
                    errorCode = "OCR_SERVICE_UNAVAILABLE";
                } else if (pythonError.code === 'ECONNABORTED') {
                    errorMessage = "OCR processing timed out.";
                    errorCode = "OCR_TIMEOUT";
                }
                
                return res.status(500).json({ 
                    status: "error", 
                    message: errorMessage,
                    error_code: errorCode
                });
            }
        } 
        else if (req.body && req.body.text_input) {
            rawText = req.body.text_input;
        } 
        else {
            logger.warn("No input provided in request");
            return res.status(400).json({ 
                status: "error", 
                message: "No input provided.",
                error_code: "NO_INPUT"
            });
        }

        // Step 2: Enhanced Processing with Guardrail Validation
        let parsedData;
        let originalText = rawText; // Store original for guardrail validation
        
        if (enhancedParser) {
            try {
                parsedData = enhancedParser.parseReportText(rawText, {
                    useEnhancedParsing: true,
                    strictValidation: true,
                    includeConfidenceScores: true,
                    includeExplanations: true
                });
                
            } catch (enhancedError) {
                logger.warn("Enhanced processing failed, using fallback");
                parsedData = parseReportText(rawText);
            }
        } else {
            parsedData = parseReportText(rawText);
        }

        // Step 3: Guardrail Validation (Critical - prevents hallucination)
        const validation = guardrailService.validateTests(parsedData.tests || [], originalText);

        // Handle guardrail failures (hallucination detected)
        if (validation.status === "unprocessed") {
            logger.warn("Guardrail validation failed - potential hallucination detected");
            
            return res.status(400).json({
                status: "unprocessed",
                reason: validation.reason
            });
        }

        // Use validated tests instead of original tests
        parsedData.tests = validation.validated_tests;
        
        // Step 4: Final Result Validation
        if (parsedData.status === "unprocessed") {
            return res.status(400).json({
                status: "unprocessed",
                reason: parsedData.reason || "Could not find any recognizable test results in the provided input."
            });
        }

        if (parsedData.status === "error") {
            return res.status(500).json({
                status: "error",
                message: parsedData.reason || "An error occurred during processing."
            });
        }

        if (!parsedData.tests || parsedData.tests.length === 0) {
            return res.status(400).json({
                status: "unprocessed",
                reason: "Could not find any recognizable test results in the provided input."
            });
        }

        // Step 5: Build Enhanced Response
        const totalProcessingTime = Date.now() - startTime;
        
        const finalResponse = {
            tests: parsedData.tests,
            summary: parsedData.summary,
            explanations: parsedData.explanations || []
        };

        // Add confidence scores
        const overallConfidence = Math.min(
            parsedData.processing_confidence?.overall || 1.0,
            validation.confidence || 1.0
        );
        
        finalResponse.confidence = overallConfidence;

        // Add enhanced features if available
        if (parsedData.explanations && parsedData.explanations.length > 0) {
            finalResponse.explanations = parsedData.explanations;
        }

        if (parsedData.processing_confidence) {
            finalResponse.processing_confidence = parsedData.processing_confidence;
        }

        if (parsedData.test_statistics) {
            finalResponse.test_statistics = parsedData.test_statistics;
        }

        // Add system analysis if available (from enhanced explanation service)
        if (parsedData.system_analysis) {
            finalResponse.system_analysis = parsedData.system_analysis;
        }

        // Status at bottom as prescribed in problem statement
        finalResponse.status = validation.status === "error" ? "error" : "ok";

        logger.info("Request completed successfully");
        res.json(finalResponse);



    } catch (error) {
        const totalTime = Date.now() - startTime;
        
        logger.error("Internal server error during processing", {
            error: error.message,
            error_stack: error.stack,
            endpoint: '/simplify-report',
            processing_time_ms: totalTime,
            processing_steps: processingSteps,
            has_file: !!req.file,
            has_text: !!(req.body && req.body.text_input),
            input_length: req.body?.text_input?.length || (req.file?.size || 0)
        });

        // Determine error type and provide appropriate response
        let errorResponse = {
            status: "error",
            message: "An internal server error occurred while processing your request.",
            error_code: "INTERNAL_SERVER_ERROR",
            metadata: {
                processing_time: totalTime,
                processing_steps: processingSteps,
                timestamp: new Date().toISOString()
            }
        };

        // Enhanced error categorization
        if (error.message.includes('OCR')) {
            errorResponse.error_code = "OCR_PROCESSING_ERROR";
            errorResponse.message = "An error occurred during OCR text extraction.";
        } else if (error.message.includes('validation')) {
            errorResponse.error_code = "VALIDATION_ERROR";
            errorResponse.message = "An error occurred during data validation.";
        } else if (error.message.includes('parsing')) {
            errorResponse.error_code = "PARSING_ERROR";
            errorResponse.message = "An error occurred while parsing the medical data.";
        } else if (error.message.includes('timeout')) {
            errorResponse.error_code = "TIMEOUT_ERROR";
            errorResponse.message = "Request timed out during processing.";
        }

        return res.status(500).json(errorResponse);
    }
});



// System Information Endpoint
app.get('/info', (req, res) => {
    res.json({
        service: "Medical Report Simplifier",
        version: "2.0.0",
        status: "ok"
    });
});

// Input Validation Endpoint
app.post('/validate', express.json(), (req, res) => {
    try {
        const { text_input } = req.body;
        
        if (!text_input) {
            return res.status(400).json({
                valid: false,
                reason: "No text input provided"
            });
        }

        if (typeof text_input !== 'string') {
            return res.status(400).json({
                valid: false,
                reason: "Input must be a string"
            });
        }

        if (text_input.trim().length === 0) {
            return res.status(400).json({
                valid: false,
                reason: "Input cannot be empty"
            });
        }

        if (text_input.length > 10000) {
            return res.status(400).json({
                valid: false,
                reason: "Input too long (maximum 10,000 characters)"
            });
        }

        let validation = { 
            valid: true, 
            text_length: text_input.length,
            estimated_processing_time_ms: Math.min(text_input.length * 2, 5000)
        };
        
        if (enhancedParser && enhancedParser.validateInput) {
            const enhancedValidation = enhancedParser.validateInput(text_input);
            validation = {
                ...validation,
                valid: enhancedValidation.isValid,
                reason: enhancedValidation.reason,
                enhanced_validation: true
            };
        }

        logger.info("Input validation performed", {
            valid: validation.valid,
            text_length: text_input.length,
            enhanced: !!enhancedParser
        });

        res.json(validation);

    } catch (error) {
        logger.error("Validation endpoint error", { error: error.message });
        res.status(500).json({
            valid: false,
            reason: "Internal validation error"
        });
    }
});

// Log Statistics Endpoint (for monitoring)
app.get('/logs', (req, res) => {
    try {
        const logStats = logger.getLogStats();
        res.json({
            message: "Log statistics",
            ...logStats
        });
    } catch (error) {
        logger.error("Failed to get log statistics", { error: error.message });
        res.status(500).json({
            error: "Failed to retrieve log statistics"
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.logError(error, {
        url: req.url,
        method: req.method,
        user_agent: req.headers['user-agent']
    });

    res.status(500).json({
        status: "error",
        message: "Internal server error",
        error_code: "MIDDLEWARE_ERROR"
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn("404 - Route not found", {
        url: req.url,
        method: req.method,
        user_agent: req.headers['user-agent']
    });

    res.status(404).json({
        status: "error",
        message: "Route not found",
        error_code: "ROUTE_NOT_FOUND"
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info("Received SIGTERM, starting graceful shutdown");
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info("Received SIGINT, starting graceful shutdown");
    process.exit(0);
});

// Unhandled promise rejection logging
process.on('unhandledRejection', (reason, promise) => {
    logger.error("Unhandled Promise Rejection", {
        reason: reason.toString(),
        stack: reason.stack
    });
});

// Start server
app.listen(PORT, () => {
    logger.info("Server started successfully");

    console.log(`✓ Node.js service running on http://localhost:${PORT}`);
    console.log(`✓ Python OCR service expected on ${PYTHON_OCR_URL}`);
    console.log(`✓ Enhanced features: ${enhancedParser ? 'Enabled' : 'Disabled'}`);
});