const stringSimilarity = require('string-similarity');
const { SimilarityMatcher } = require('./similarityMatcher');

/**
 * Enhanced OCR processor that handles text extraction, typo correction, 
 * and confidence scoring while maintaining existing functionality
 */
class MedicalOCRProcessor {
    constructor(knowledgeBase = {}) {
        this.similarityMatcher = new SimilarityMatcher(knowledgeBase);
        // Common OCR typo corrections
        this.commonTestNameCorrections = {
            'hemglobin': 'hemoglobin',
            'hgb': 'hemoglobin',
            'hgb count': 'hemoglobin',
            'wbc count': 'wbc',
            'rbc count': 'rbc',
            'platlet': 'platelet',
            'platlet count': 'platelet count',
            'glucse': 'glucose',
            'cretinine': 'creatinine',
            'sodim': 'sodium',
            'potasium': 'potassium'
        };

        this.statusCorrections = {
            'hgh': 'high',
            'hi': 'high',
            'hig': 'high',
            'lw': 'low',
            'lo': 'low',
            'clow': 'low',
            'nrml': 'normal',
            'norm': 'normal',
            'ok': 'normal'
        };

        this.unitCorrections = {
            'g1dL': 'g/dL',
            'g1dl': 'g/dL',
            'g/1dL': 'g/dL',
            'mg1dL': 'mg/dL',
            'mg1dl': 'mg/dL',
            'mg/1dL': 'mg/dL',
            '1uL': '/uL',
            '/1uL': '/uL',
            'mil1uL': 'mil/uL',
            'mEq1L': 'mEq/L'
        };
    }

    /**
     * Enhanced preprocessing with typo correction
     */
    preprocessOcrText(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return '';
        }

        // Split by newlines, filter empty lines, then join with spaces
        let processed = rawText.split('\n')
            .filter(line => line.trim() !== '')
            .join(' ')
            .trim();

        // Apply common corrections
        processed = this.applyCommonCorrections(processed);
        
        console.log("DEBUG: Enhanced OCR preprocessing:", processed);
        return processed;
    }

    /**
     * Apply common OCR error corrections
     */
    applyCommonCorrections(text) {
        let corrected = text;

        // Fix common test name typos
        for (const [typo, correction] of Object.entries(this.commonTestNameCorrections)) {
            const regex = new RegExp(`\\b${typo}\\b`, 'gi');
            corrected = corrected.replace(regex, correction);
        }

        // Fix common unit typos
        for (const [typo, correction] of Object.entries(this.unitCorrections)) {
            const regex = new RegExp(`\\b${typo}\\b`, 'gi');
            corrected = corrected.replace(regex, correction);
        }

        // Fix common status typos (both with and without parentheses)
        for (const [typo, correction] of Object.entries(this.statusCorrections)) {
            const regex1 = new RegExp(`\\(${typo}\\)`, 'gi');
            const regex2 = new RegExp(`\\b${typo}\\)`, 'gi');
            corrected = corrected.replace(regex1, `(${correction})`);
            corrected = corrected.replace(regex2, `${correction})`);
        }

        return corrected;
    }

    /**
     * Extract tests with enhanced pattern matching and confidence scoring
     */
    extractTestsWithConfidence(ocrText) {
        const processedText = this.preprocessOcrText(ocrText);
        const testResults = [];
        
        // Enhanced regex patterns for different test formats
        const patterns = [
            // Pattern 1: Standard format with parentheses
            /((?:[A-Za-z]+(?:\s+[A-Za-z]+)*?))\s+([\d.,]+)\s+([\w\/1]+(?:\s*mil\/uL)?)\s+\(([^)]+)\)/gi,
            // Pattern 2: Handle malformed parentheses (missing opening parenthesis)
            /((?:[A-Za-z]+(?:\s+[A-Za-z]+)*?))\s+([\d.,]+)\s+([\w\/1]+(?:\s*mil\/uL)?)\s+([A-Za-z]+)\)/gi,
            // Pattern 3: Handle cases where test name and value are on different lines
            /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*\n?\s*([\d.,]+)\s+([\w\/1]+)\s+\(([^)]+)\)/gi,
            // Pattern 4: Handle OCR errors in units (like g1dL instead of g/dL)
            /((?:[A-Za-z]+(?:\s+[A-Za-z]+)*?))\s+([\d.,]+)\s+(g1dL|[\w\/1]+(?:\s*mil\/uL)?)\s*([A-Za-z]+)?\)?\s*/gi
        ];
        
        let match;
        const confidenceScores = [];
        const processedMatches = new Set(); // Prevent duplicates
        
        for (const regex of patterns) {
            regex.lastIndex = 0; // Reset regex
            
            while ((match = regex.exec(processedText)) !== null) {
                const rawTestName = match[1].trim();
                const valueString = match[2].replace(/,/g, '');
                const value = parseFloat(valueString);
                const unit = match[3] ? match[3].trim() : '';
                const ocrStatus = match[4] ? match[4].trim() : '';

                // Create unique key to avoid duplicates
                const matchKey = `${rawTestName.toLowerCase()}_${value}_${unit}`;
                if (processedMatches.has(matchKey)) {
                    continue;
                }
                processedMatches.add(matchKey);

                // Skip invalid values
                if (isNaN(value)) {
                    console.log(`DEBUG: Skipping invalid value: ${valueString} for test ${rawTestName}`);
                    continue;
                }

                // Fix common unit errors manually here as well
                let correctedUnit = unit;
                if (this.unitCorrections[unit]) {
                    correctedUnit = this.unitCorrections[unit];
                    console.log(`DEBUG: Corrected unit "${unit}" to "${correctedUnit}"`);
                }

                // Use similarity matching to find best test match
                const testMatch = this.similarityMatcher.findBestTestMatch(rawTestName, value, correctedUnit, ocrStatus);
                
                if (testMatch && testMatch.confidence >= 0.5) { // Lowered threshold for better matching
                    // Calculate confidence for this match
                    const matchConfidence = this.calculateMatchConfidence(match, testMatch);
                    confidenceScores.push(matchConfidence);

                    // Use the corrected values from similarity matching
                    const correctedStatus = testMatch.matches.status ? 
                        testMatch.matches.status.matched : 
                        this.correctStatus(ocrStatus);

                    testResults.push({
                        rawTestName: testMatch.testData.name, // Use standardized name
                        value,
                        unit: testMatch.matches.unit.matched, // Use standardized unit
                        status: correctedStatus,
                        confidence: matchConfidence,
                        similarityMatch: {
                            originalName: rawTestName,
                            matchedName: testMatch.testData.name,
                            similarity: testMatch.confidence
                        }
                    });

                    console.log(`DEBUG: Similarity matched "${rawTestName}" -> "${testMatch.testData.name}": ${value} ${testMatch.matches.unit.matched} (${correctedStatus}) [confidence: ${matchConfidence.toFixed(2)}]`);
                } else {
                    console.log(`DEBUG: No good similarity match found for "${rawTestName}" (confidence: ${testMatch ? testMatch.confidence.toFixed(2) : 'N/A'})`);
                }
            }
        }

        const overallConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
            : 0.0;

        return {
            tests: testResults,
            confidence: overallConfidence,
            processedText
        };
    }

    /**
     * Calculate confidence score for a regex match with similarity matching context
     */
    calculateMatchConfidence(match, testMatch = null) {
        let confidence = 0.8; // Base confidence

        const [, testName, value, unit, status] = match;

        // Reduce confidence for very short test names
        if (testName.trim().length < 3) {
            confidence -= 0.2;
        }

        // Reduce confidence for missing or very short units
        if (!unit || unit.trim().length < 2) {
            confidence -= 0.1;
        }

        // Reduce confidence if value parsing seems questionable
        if (isNaN(parseFloat(value))) {
            confidence -= 0.3;
        }

        // Boost confidence if status is clearly recognizable
        if (['high', 'low', 'normal'].includes(status.toLowerCase())) {
            confidence += 0.1;
        }

        // Incorporate similarity matching confidence if available
        if (testMatch) {
            // Weight the similarity match confidence
            confidence = (confidence * 0.6) + (testMatch.confidence * 0.4);
            
            // Boost confidence for high-quality matches
            if (testMatch.matches.name && testMatch.matches.name.confidence === 'exact') {
                confidence += 0.1;
            }
            
            if (testMatch.matches.unit && testMatch.matches.unit.confidence === 'exact') {
                confidence += 0.05;
            }
        }

        return Math.max(0.0, Math.min(1.0, confidence));
    }

    /**
     * Correct status using string similarity
     */
    correctStatus(ocrStatus) {
        if (!ocrStatus) return 'normal';

        const validStatuses = ['high', 'low', 'normal'];
        const bestMatch = stringSimilarity.findBestMatch(ocrStatus.toLowerCase(), validStatuses);
        
        // Use corrected status if similarity is high enough
        if (bestMatch.bestMatch.rating > 0.6) {
            const correctedStatus = bestMatch.bestMatch.target;
            if (correctedStatus !== ocrStatus.toLowerCase()) {
                console.log(`DEBUG: Corrected status "${ocrStatus}" to "${correctedStatus}" (similarity: ${bestMatch.bestMatch.rating.toFixed(2)})`);
            }
            return correctedStatus;
        }

        return ocrStatus.toLowerCase();
    }
}

module.exports = { MedicalOCRProcessor };