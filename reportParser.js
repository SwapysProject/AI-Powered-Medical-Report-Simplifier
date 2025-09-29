const MEDICAL_DATA = require('./knowledgeBase');
const stringSimilarity = require('string-similarity');

// Import new enhanced services
const { MedicalOCRProcessor } = require('./services/ocrProcessor');
const { MedicalTestNormalizer } = require('./services/testNormalizer');
const { MedicalExplanationService } = require('./services/explanationService');
const { HallucinationValidator } = require('./services/hallucinationValidator');

// Initialize enhanced services
const ocrProcessor = new MedicalOCRProcessor(MEDICAL_DATA);
const testNormalizer = new MedicalTestNormalizer(MEDICAL_DATA);
const explanationService = new MedicalExplanationService(MEDICAL_DATA);
const hallucinationValidator = new HallucinationValidator();

/**
 * ENHANCED parseReportText - Now uses all the new services while maintaining backward compatibility
 */
function parseReportText(text, options = {}) {
    try {
        console.log("DEBUG: Starting enhanced report parsing...");
        
        // Use enhanced preprocessing if available
        const processedText = ocrProcessor.preprocessOcrText(text);
        console.log("DEBUG: Enhanced preprocessing completed");

        // Step 1: Enhanced OCR processing with confidence scoring
        const ocrResult = ocrProcessor.extractTestsWithConfidence(text);
        console.log(`DEBUG: OCR extracted ${ocrResult.tests.length} tests with confidence ${ocrResult.confidence.toFixed(2)}`);

        // Step 2: Validate against hallucination
        const hallucinationCheck = hallucinationValidator.validateNoHallucination(text, ocrResult.tests);
        if (!hallucinationCheck.isValid && options.strictValidation !== false) {
            console.log(`DEBUG: Hallucination detected: ${hallucinationCheck.invalidTests.join(', ')}`);
            return {
                status: "unprocessed",
                reason: `Hallucinated tests not present in input: ${hallucinationCheck.invalidTests.join(', ')}`,
                tests: []
            };
        }

        // Step 3: Normalize tests using the enhanced normalizer
        const normalizedResult = testNormalizer.normalizeTests(ocrResult.tests);
        console.log(`DEBUG: Normalized ${normalizedResult.tests.length} tests with confidence ${normalizedResult.normalization_confidence.toFixed(2)}`);

        // If no tests were successfully normalized, fall back to legacy parsing
        if (normalizedResult.tests.length === 0) {
            console.log("DEBUG: No tests normalized, falling back to legacy parsing...");
            return legacyParseReportText(text);
        }

        // Step 4: Generate enhanced explanations
        const explanationResult = explanationService.generatePatientSummary(normalizedResult.tests, text);
        
        // Check for processing errors
        if (explanationResult.status === "unprocessed" || explanationResult.status === "error") {
            return explanationResult;
        }

        // Step 5: Build enhanced response
        const enhancedResponse = {
            tests: normalizedResult.tests,
            summary: explanationResult.summary,
            status: "ok",
            
            // Enhanced features
            explanations: explanationResult.explanations || [],
            processing_confidence: {
                ocr: ocrResult.confidence,
                normalization: normalizedResult.normalization_confidence,
                overall: (ocrResult.confidence + normalizedResult.normalization_confidence) / 2
            },
            test_statistics: {
                total_tests: normalizedResult.tests.length,
                abnormal_tests: explanationResult.abnormal_tests_count || 0
            }
        };

        // Add disclaimer if there are abnormal results
        if (explanationResult.disclaimer) {
            enhancedResponse.disclaimer = explanationResult.disclaimer;
        }

        console.log(`DEBUG: Enhanced parsing completed successfully with ${normalizedResult.tests.length} tests`);
        return enhancedResponse;

    } catch (error) {
        console.error("Error in enhanced parsing:", error);
        console.log("DEBUG: Falling back to legacy parsing due to error...");
        return legacyParseReportText(text);
    }
}

/**
 * LEGACY parseReportText - Original implementation maintained for backward compatibility
 * and as fallback when enhanced parsing fails
 */
function legacyParseReportText(text) {
    console.log("DEBUG: Using legacy parsing method");
    
    const singleLineText = preprocessOcrText(text);
    console.log("DEBUG: Reconstructed single line for parsing:", singleLineText);

    const testResults = [];
    
    // The original robust regex
    const regex = /([\w\s]+?)\s+([\d.,]+)\s+([\w\/]+\s*mil\/uL|[\w\/]+)\s+\(([^)]+)\)/gi;
    
    let match;
    while ((match = regex.exec(singleLineText)) !== null) {
        const rawTestName = match[1].trim().toLowerCase();
        
        // Check if we recognize the test name before proceeding
        if (MEDICAL_DATA[rawTestName]) {
            const valueString = match[2].replace(/,/g, '');
            const value = parseFloat(valueString);
            const ocrStatus = match[4].trim().toLowerCase();

            // Status correction using string similarity
            const validStatuses = ['high', 'low', 'normal'];
            const bestMatch = stringSimilarity.findBestMatch(ocrStatus, validStatuses);
            
            let finalStatus = ocrStatus;
            if (bestMatch.bestMatch.rating > 0.7) {
                finalStatus = bestMatch.bestMatch.target;
                console.log(`DEBUG: Corrected status "${ocrStatus}" to "${finalStatus}"`);
            }

            const knownTestData = MEDICAL_DATA[rawTestName];
            
            testResults.push({
                name: knownTestData.name,
                value: value,
                unit: knownTestData.unit,
                status: finalStatus,
                ref_range: knownTestData.ref_range
            });
        }
    }

    if (testResults.length === 0) {
        return { tests: [], status: "unprocessed", reason: "No recognizable test results found" };
    }

    const summary = testResults.map(t => `${t.status} ${t.name}`).join(' and ') + '.';
    
    return {
        tests: testResults,
        summary: summary,
        status: "ok"
    };
}

/**
 * Original preprocessing function maintained for compatibility
 */
function preprocessOcrText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return '';
    }
    return rawText.split('\n').filter(line => line.trim() !== '').join(' ').trim();
}

/**
 * Enhanced parseReportText with additional options
 */
function parseReportTextWithOptions(text, options = {}) {
    const defaultOptions = {
        useEnhancedParsing: true,
        strictValidation: true,
        includeConfidenceScores: true,
        includeExplanations: true,
        fallbackToLegacy: true
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (mergedOptions.useEnhancedParsing) {
        return parseReportText(text, mergedOptions);
    } else {
        return legacyParseReportText(text);
    }
}

/**
 * Utility function to validate input before processing
 */
function validateInput(text) {
    if (!text || typeof text !== 'string') {
        return { isValid: false, reason: "Invalid input: text must be a non-empty string" };
    }

    if (text.trim().length === 0) {
        return { isValid: false, reason: "Invalid input: text cannot be empty" };
    }

    if (text.length > 10000) {
        return { isValid: false, reason: "Invalid input: text too long (maximum 10,000 characters)" };
    }

    return { isValid: true };
}

/**
 * Get processing statistics
 */
function getProcessingStats() {
    return {
        enhanced_services_loaded: {
            ocr_processor: !!ocrProcessor,
            test_normalizer: !!testNormalizer,
            explanation_service: !!explanationService,
            hallucination_validator: !!hallucinationValidator
        },
        knowledge_base_tests: Object.keys(MEDICAL_DATA).length,
        version: "2.0.0-enhanced"
    };
}

// Export both enhanced and legacy functions for flexibility
module.exports = { 
    parseReportText,                    // Enhanced version (default)
    legacyParseReportText,             // Original implementation
    parseReportTextWithOptions,        // Enhanced with options
    preprocessOcrText,                 // Original preprocessing
    validateInput,                     // Input validation
    getProcessingStats                 // System information
};