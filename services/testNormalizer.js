/**
 * Medical Test Normalizer - Standardizes test names, units, ranges, and statuses
 * while maintaining compatibility with existing knowledgeBase.js
 */
const { SimilarityMatcher } = require('./similarityMatcher');

class MedicalTestNormalizer {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase || {};
        this.similarityMatcher = new SimilarityMatcher(knowledgeBase);
        
        // Extended reference ranges for additional tests
        this.extendedRanges = {
            'complete blood count': {
                'hemoglobin': { 
                    male: { low: 13.5, high: 17.5 }, 
                    female: { low: 12.0, high: 15.0 },
                    default: { low: 12.0, high: 15.0 }
                },
                'hematocrit': {
                    male: { low: 38.3, high: 48.6 },
                    female: { low: 35.5, high: 44.9 },
                    default: { low: 35.5, high: 48.6 }
                }
            }
        };

        // Test name aliases and mappings
        this.testNameMappings = {
            'hemoglobin': 'hemoglobin',
            'hgb': 'hemoglobin',
            'hb': 'hemoglobin',
            'white blood cells': 'wbc',
            'white blood cell count': 'wbc',
            'wbc count': 'wbc',
            'red blood cells': 'rbc',
            'red blood cell count': 'rbc',
            'rbc count': 'rbc',
            'platelet count': 'platelet count',
            'platelets': 'platelet count',
            'plt': 'platelet count',
            'blood glucose': 'glucose',
            'fasting glucose': 'glucose',
            'serum creatinine': 'creatinine',
            'creat': 'creatinine',
            'serum sodium': 'sodium',
            'na': 'sodium',
            'serum potassium': 'potassium',
            'k': 'potassium'
        };
    }

    /**
     * Normalize extracted tests to standard format
     */
    normalizeTests(extractedTests) {
        if (!Array.isArray(extractedTests)) {
            console.log("DEBUG: Invalid input to normalizeTests - not an array");
            return { tests: [], normalization_confidence: 0.0 };
        }

        const normalizedTests = [];
        const confidenceScores = [];

        for (const extractedTest of extractedTests) {
            try {
                const normalized = this.normalizeIndividualTest(extractedTest);
                if (normalized && normalized.test) {
                    normalizedTests.push(normalized.test);
                    confidenceScores.push(normalized.confidence);
                } else {
                    console.log(`DEBUG: Failed to normalize test:`, extractedTest);
                    confidenceScores.push(0.0);
                }
            } catch (error) {
                console.error(`Error normalizing test:`, extractedTest, error.message);
                confidenceScores.push(0.0);
            }
        }

        const avgConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
            : 0.0;

        console.log(`DEBUG: Normalized ${normalizedTests.length} tests with avg confidence ${avgConfidence.toFixed(2)}`);

        return {
            tests: normalizedTests,
            normalization_confidence: avgConfidence
        };
    }

    /**
     * Normalize a single test
     */
    normalizeIndividualTest(extractedTest) {
        const { rawTestName, value, unit, status, confidence } = extractedTest;

        // Normalize the test name
        const normalizedName = this.normalizeTestName(rawTestName);
        if (!normalizedName) {
            console.log(`DEBUG: Unknown test name: ${rawTestName}`);
            return null;
        }

        // Check if this test exists in our knowledge base
        const knownTestData = this.knowledgeBase[normalizedName];
        if (!knownTestData) {
            console.log(`DEBUG: Test not in knowledge base: ${normalizedName}`);
            return null;
        }

        // Get reference range
        const refRange = this.getReferenceRange(normalizedName, knownTestData);

        // Determine final status
        const finalStatus = this.determineStatus(value, refRange, status);

        // Calculate normalization confidence
        const normalizationConfidence = this.calculateNormalizationConfidence(
            rawTestName, normalizedName, value, unit, status, confidence
        );

        const normalizedTest = {
            name: knownTestData.name,
            value: parseFloat(value),
            unit: knownTestData.unit,
            status: finalStatus,
            ref_range: {
                low: refRange.low,
                high: refRange.high
            }
        };

        console.log(`DEBUG: Normalized ${rawTestName} -> ${knownTestData.name}: ${value} ${knownTestData.unit} (${finalStatus})`);

        return {
            test: normalizedTest,
            confidence: normalizationConfidence
        };
    }

    /**
     * Normalize test name using similarity matching
     */
    normalizeTestName(rawName) {
        if (!rawName || typeof rawName !== 'string') {
            return null;
        }

        // First try the similarity matcher
        const testMatch = this.similarityMatcher.findBestTestNameMatch(rawName);
        if (testMatch && testMatch.confidence !== 'low') {
            console.log(`DEBUG: Similarity matched "${rawName}" to "${testMatch.matched}" (confidence: ${testMatch.confidence})`);
            return testMatch.matched;
        }

        // Fallback to existing logic for backward compatibility
        const cleanName = rawName.trim().toLowerCase();
        
        // Direct mapping
        if (this.testNameMappings[cleanName]) {
            return this.testNameMappings[cleanName];
        }

        // Check if it exists directly in knowledge base
        if (this.knowledgeBase[cleanName]) {
            return cleanName;
        }

        // Legacy fuzzy matching for partial matches
        const knownTests = Object.keys(this.knowledgeBase);
        for (const knownTest of knownTests) {
            if (cleanName.includes(knownTest) || knownTest.includes(cleanName)) {
                if (Math.abs(cleanName.length - knownTest.length) <= 2) {
                    console.log(`DEBUG: Legacy fuzzy matched "${cleanName}" to "${knownTest}"`);
                    return knownTest;
                }
            }
        }

        console.log(`DEBUG: Could not normalize test name: "${rawName}"`);
        return null;
    }

    /**
     * Get reference range for a test
     */
    getReferenceRange(testName, knownTestData) {
        // Use knowledge base reference range
        if (knownTestData.ref_range) {
            return knownTestData.ref_range;
        }

        // Fallback to default range
        return { low: 0, high: 100 };
    }

    /**
     * Determine the correct status based on value and reference range
     */
    determineStatus(value, refRange, providedStatus) {
        const numericValue = parseFloat(value);
        
        if (isNaN(numericValue)) {
            return providedStatus || 'unknown';
        }

        // Calculate status based on reference range
        let calculatedStatus = 'normal';
        if (numericValue < refRange.low) {
            calculatedStatus = 'low';
        } else if (numericValue > refRange.high) {
            calculatedStatus = 'high';
        }

        // If provided status conflicts with calculated, use calculated but log it
        if (providedStatus && providedStatus !== calculatedStatus) {
            console.log(`DEBUG: Status mismatch - provided: ${providedStatus}, calculated: ${calculatedStatus}, using calculated`);
        }

        return calculatedStatus;
    }

    /**
     * Calculate confidence score for normalization
     */
    calculateNormalizationConfidence(rawName, normalizedName, value, unit, status, inputConfidence) {
        let confidence = inputConfidence || 0.8;

        // Boost confidence for exact name matches
        if (rawName.toLowerCase() === normalizedName.toLowerCase()) {
            confidence += 0.1;
        }

        // Boost confidence for valid numeric values
        if (!isNaN(parseFloat(value))) {
            confidence += 0.05;
        }

        // Boost confidence for recognized status values
        if (['high', 'low', 'normal'].includes(status)) {
            confidence += 0.05;
        }

        return Math.max(0.0, Math.min(1.0, confidence));
    }

    /**
     * Add guardrail to prevent hallucinated tests
     */
    validateTestExists(testName, originalText) {
        if (!originalText || !testName) {
            return false;
        }

        const originalLower = originalText.toLowerCase();
        const testLower = testName.toLowerCase();

        // Check if any variation of the test name appears in original text
        const variations = [
            testLower,
            testLower.replace(/\s+/g, ''),
            ...Object.keys(this.testNameMappings).filter(key => this.testNameMappings[key] === testLower)
        ];

        return variations.some(variation => originalLower.includes(variation));
    }
}

module.exports = { MedicalTestNormalizer };