/**
 * Hallucination Validator - Prevents adding tests not present in original input
 * Critical component for maintaining medical accuracy
 */
class HallucinationValidator {
    constructor() {
        // Known medical test patterns that should be validated
        this.medicalTestPatterns = [
            'hemoglobin', 'wbc', 'rbc', 'platelet', 'glucose', 'cholesterol',
            'creatinine', 'sodium', 'potassium', 'bun', 'ast', 'alt',
            'total protein', 'albumin', 'bilirubin', 'ldl', 'hdl', 'triglycerides'
        ];

        // Common medical abbreviations
        this.medicalAbbreviations = {
            'hgb': 'hemoglobin',
            'hb': 'hemoglobin',
            'wbc': 'white blood cells',
            'rbc': 'red blood cells',
            'plt': 'platelets',
            'glu': 'glucose',
            'chol': 'cholesterol',
            'creat': 'creatinine',
            'na': 'sodium',
            'k': 'potassium'
        };
    }

    /**
     * Main validation method - ensures no hallucinated tests
     */
    validateNoHallucination(originalText, extractedTests) {
        if (!originalText || !Array.isArray(extractedTests)) {
            console.log("DEBUG: Invalid input to hallucination validator");
            return {
                isValid: false,
                reason: "Invalid input provided for validation"
            };
        }

        console.log(`DEBUG: Validating ${extractedTests.length} extracted tests`);
        console.log(`DEBUG: Original text: "${originalText}"`);

        const originalLower = originalText.toLowerCase();
        const invalidTests = [];
        const validationResults = [];

        for (const test of extractedTests) {
            const testName = this.getTestName(test);
            if (!testName) {
                invalidTests.push('unknown_test');
                continue;
            }

            console.log(`DEBUG: Validating test: "${testName}"`);
            
            const isValid = this.testExistsInOriginal(testName, originalLower);
            validationResults.push({
                testName,
                isValid,
                foundIn: isValid ? this.findTestMentions(testName, originalLower) : []
            });

            if (!isValid) {
                console.log(`DEBUG: ❌ Test "${testName}" marked as invalid`);
                invalidTests.push(testName);
            } else {
                console.log(`DEBUG: ✅ Test "${testName}" validated`);
            }
        }

        console.log(`DEBUG: Hallucination validation - ${validationResults.filter(r => r.isValid).length}/${extractedTests.length} tests validated`);

        const isValid = invalidTests.length === 0;
        
        if (!isValid) {
            console.log(`DEBUG: Invalid tests found: ${invalidTests.join(', ')}`);
        }

        return {
            isValid,
            invalidTests,
            validationResults
        };
    }

    /**
     * Extract test name from various test object formats
     */
    getTestName(test) {
        if (typeof test === 'string') {
            return test.toLowerCase().trim();
        }

        if (typeof test === 'object') {
            return (test.name || test.testName || test.rawTestName || '').toLowerCase().trim();
        }

        return null;
    }

    /**
     * Check if test exists in original text using multiple strategies
     */
    testExistsInOriginal(testName, originalLower) {
        if (!testName || !originalLower) {
            return false;
        }

        console.log(`DEBUG: Checking if "${testName}" exists in original text`);

        // Strategy 1: Direct name match
        if (originalLower.includes(testName.toLowerCase())) {
            console.log(`DEBUG: Direct match found for "${testName}"`);
            return true;
        }

        // Strategy 2: Check abbreviations
        const abbreviations = this.getTestAbbreviations(testName);
        for (const abbrev of abbreviations) {
            if (originalLower.includes(abbrev)) {
                console.log(`DEBUG: Abbreviation match found: "${abbrev}" for "${testName}"`);
                return true;
            }
        }

        // Strategy 3: Enhanced multi-word test matching
        const words = testName.toLowerCase().split(/\s+/);
        if (words.length > 1) {
            // For multi-word tests, check if all significant words are present
            const significantWords = words.filter(word => word.length > 2);
            const foundWords = significantWords.filter(word => originalLower.includes(word));
            
            console.log(`DEBUG: Multi-word test "${testName}": found ${foundWords.length}/${significantWords.length} words [${foundWords.join(', ')}]`);
            
            // If at least 70% of significant words are found, consider it valid
            if (foundWords.length >= Math.ceil(significantWords.length * 0.7)) {
                console.log(`DEBUG: Multi-word match validated for "${testName}"`);
                return true;
            }

            // Special case: Check if words appear in sequence (even if separated)
            if (this.checkSequentialWords(significantWords, originalLower)) {
                console.log(`DEBUG: Sequential word match found for "${testName}"`);
                return true;
            }
        }

        // Strategy 4: Check for common medical test patterns
        if (this.checkMedicalTestPatterns(testName, originalLower)) {
            console.log(`DEBUG: Medical pattern match found for "${testName}"`);
            return true;
        }

        // Strategy 5: Fuzzy matching for typos
        const fuzzyResult = this.fuzzyMatch(testName, originalLower);
        if (fuzzyResult) {
            console.log(`DEBUG: Fuzzy match found for "${testName}"`);
        }
        return fuzzyResult;
    }

    /**
     * Get common abbreviations for a test name
     */
    getTestAbbreviations(testName) {
        const abbreviations = [];

        // Check our abbreviation dictionary
        for (const [abbrev, fullName] of Object.entries(this.medicalAbbreviations)) {
            if (fullName.includes(testName) || testName.includes(fullName)) {
                abbreviations.push(abbrev);
            }
        }

        // Generate common abbreviations
        if (testName.includes('hemoglobin')) {
            abbreviations.push('hgb', 'hb', 'hemglobin');
        }
        if (testName.includes('white blood')) {
            abbreviations.push('wbc');
        }
        if (testName.includes('red blood')) {
            abbreviations.push('rbc');
        }
        if (testName.includes('platelet')) {
            abbreviations.push('plt', 'platlet');
        }

        return abbreviations;
    }

    /**
     * Find where test is mentioned in original text
     */
    findTestMentions(testName, originalLower) {
        const mentions = [];
        const searchTerms = [testName, ...this.getTestAbbreviations(testName)];

        for (const term of searchTerms) {
            const index = originalLower.indexOf(term);
            if (index !== -1) {
                mentions.push({
                    term,
                    position: index,
                    context: this.getContext(originalLower, index, term.length)
                });
            }
        }

        return mentions;
    }

    /**
     * Get context around found term
     */
    getContext(text, position, termLength, contextLength = 30) {
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + termLength + contextLength);
        return text.substring(start, end).trim();
    }

    /**
     * Fuzzy matching for OCR errors
     */
    fuzzyMatch(testName, originalText) {
        // Simple fuzzy matching - check if most characters match
        if (testName.length < 4) {
            return false; // Too short for reliable fuzzy matching
        }

        // Check for character-level similarity
        const words = originalText.split(/\s+/);
        for (const word of words) {
            if (this.calculateSimilarity(testName, word) > 0.8) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if words appear in sequence in the text
     */
    checkSequentialWords(words, text) {
        if (words.length < 2) return false;

        // Create a pattern that allows for some words in between
        let pattern = words[0];
        for (let i = 1; i < words.length; i++) {
            pattern += `.*?${words[i]}`;
        }
        
        const regex = new RegExp(pattern, 'i');
        return regex.test(text);
    }

    /**
     * Check for common medical test patterns
     */
    checkMedicalTestPatterns(testName, originalLower) {
        const testLower = testName.toLowerCase();
        
        // Pattern 1: "platelet count" might appear as "platelet" + "count" separately
        if (testLower.includes('platelet')) {
            return originalLower.includes('platelet') || originalLower.includes('plt');
        }
        
        // Pattern 2: "white blood cell" variations
        if (testLower.includes('white blood')) {
            return originalLower.includes('wbc') || originalLower.includes('white blood');
        }
        
        // Pattern 3: "red blood cell" variations  
        if (testLower.includes('red blood')) {
            return originalLower.includes('rbc') || originalLower.includes('red blood');
        }

        // Pattern 4: Check for test name without "count" suffix
        if (testLower.endsWith(' count')) {
            const baseTest = testLower.replace(' count', '');
            return originalLower.includes(baseTest);
        }

        return false;
    }

    /**
     * Calculate string similarity (simple implementation)
     */
    calculateSimilarity(str1, str2) {
        if (str1.length < 3 || str2.length < 3) {
            return 0;
        }

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Validate specific test categories
     */
    validateTestCategory(testName, expectedCategory) {
        const categories = {
            'hematology': ['hemoglobin', 'wbc', 'rbc', 'platelet', 'hematocrit'],
            'chemistry': ['glucose', 'sodium', 'potassium', 'creatinine', 'bun'],
            'lipid': ['cholesterol', 'ldl', 'hdl', 'triglycerides']
        };

        if (!categories[expectedCategory]) {
            return true; // Unknown category, assume valid
        }

        return categories[expectedCategory].some(validTest => 
            testName.toLowerCase().includes(validTest)
        );
    }

    /**
     * Generate validation report
     */
    generateValidationReport(originalText, extractedTests) {
        const validation = this.validateNoHallucination(originalText, extractedTests);
        
        return {
            timestamp: new Date().toISOString(),
            originalTextLength: originalText.length,
            extractedTestsCount: extractedTests.length,
            validTestsCount: validation.validationResults.filter(r => r.isValid).length,
            invalidTestsCount: validation.invalidTests.length,
            validationPassed: validation.isValid,
            invalidTests: validation.invalidTests,
            details: validation.validationResults
        };
    }
}

module.exports = { HallucinationValidator };