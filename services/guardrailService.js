/**
 * Guardrail Service - Prevents hallucination and validates medical test data
 * Ensures no fabricated tests are added and all results are grounded in input data
 */
class GuardrailService {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase || {};
        this.validTestNames = new Set(Object.keys(knowledgeBase));
        
        // Build alias mappings for better validation
        this.aliasMap = new Map();
        this.buildAliasMap();
        
        // Physical limits for common tests (prevents impossible values)
        this.physicalLimits = {
            'hemoglobin': { min: 0, max: 30 },
            'glucose': { min: 0, max: 2000 },
            'cholesterol_total': { min: 0, max: 1000 },
            'creatinine': { min: 0, max: 50 },
            'wbc': { min: 0, max: 100000 },
            'platelet_count': { min: 0, max: 2000000 },
            'sodium': { min: 100, max: 200 },
            'potassium': { min: 0, max: 15 }
        };
    }

    /**
     * Build alias mapping for comprehensive test validation
     */
    buildAliasMap() {
        Object.entries(this.knowledgeBase).forEach(([key, data]) => {
            // Map the key to itself
            this.aliasMap.set(key.toLowerCase(), key);
            
            // Map display name if available
            if (data.name) {
                this.aliasMap.set(data.name.toLowerCase(), key);
            }
            
            // Map all aliases
            if (data.aliases && Array.isArray(data.aliases)) {
                data.aliases.forEach(alias => {
                    this.aliasMap.set(alias.toLowerCase(), key);
                });
            }
        });
        
        console.log(`DEBUG: Built alias map with ${this.aliasMap.size} entries`);
    }

    /**
     * Main validation method - prevents hallucination and validates test data
     */
    validateTests(extractedTests, originalText) {
        const validation = {
            status: "ok",
            warnings: [],
            errors: [],
            confidence: 1.0,
            validated_tests: [],
            rejected_tests: []
        };

        console.log(`DEBUG: Validating ${extractedTests.length} extracted tests`);

        for (const test of extractedTests) {
            const testValidation = this.validateSingleTest(test, originalText);
            
            if (testValidation.isValid) {
                validation.validated_tests.push(test);
                if (testValidation.warnings.length > 0) {
                    validation.warnings.push(...testValidation.warnings);
                    validation.confidence *= testValidation.confidence;
                }
            } else {
                validation.rejected_tests.push({
                    test: test,
                    reason: testValidation.rejectionReason
                });
                validation.errors.push(testValidation.rejectionReason);
                
                // Check if this is a hallucination (test not in original)
                if (testValidation.rejectionReason.includes('not found in original')) {
                    console.log(`DEBUG: Hallucination detected - rejecting test: ${test.name}`);
                    return {
                        status: "unprocessed",
                        reason: `hallucinated tests not present in input: ${test.name}`,
                        confidence: 0,
                        rejected_tests: validation.rejected_tests
                    };
                }
            }
        }

        // Update final status based on confidence and errors
        if (validation.confidence < 0.3) {
            validation.status = "unprocessed";
            validation.reason = "Overall confidence too low due to validation issues";
        } else if (validation.confidence < 0.6) {
            validation.status = "low_confidence";
            validation.reason = "Multiple validation warnings detected";
        } else if (validation.warnings.length > 0) {
            validation.status = "ok_with_warnings";
        }

        console.log(`DEBUG: Validation complete - Status: ${validation.status}, Validated: ${validation.validated_tests.length}, Rejected: ${validation.rejected_tests.length}`);

        return validation;
    }

    /**
     * Validate a single test against multiple criteria
     */
    validateSingleTest(test, originalText) {
        const result = {
            isValid: true,
            warnings: [],
            confidence: 1.0,
            rejectionReason: null
        };

        // 1. Check if test structure is valid
        if (!this.isValidTestStructure(test)) {
            result.isValid = false;
            result.rejectionReason = `Invalid test structure for ${test.name}`;
            return result;
        }

        // 2. Check if test exists in knowledge base
        const normalizedTestName = this.normalizeTestName(test.name);
        if (!normalizedTestName) {
            result.warnings.push(`Unknown test: ${test.name}`);
            result.confidence *= 0.7;
        }

        // 3. Critical check - ensure test was mentioned in original text
        if (!this.isTestMentionedInOriginal(test.name, originalText)) {
            result.isValid = false;
            result.rejectionReason = `Test '${test.name}' not found in original text - potential hallucination`;
            return result;
        }

        // 4. Validate value is realistic
        if (!this.isValueRealistic(test)) {
            result.warnings.push(`Unrealistic value for ${test.name}: ${test.value} ${test.unit}`);
            result.confidence *= 0.6;
        }

        // 5. Validate unit matches expected for this test
        if (!this.isUnitValid(test)) {
            result.warnings.push(`Unexpected unit for ${test.name}: ${test.unit}`);
            result.confidence *= 0.8;
        }

        // 6. Check status consistency with value and range
        if (!this.isStatusConsistent(test)) {
            result.warnings.push(`Status '${test.status}' may not match value ${test.value} for ${test.name}`);
            result.confidence *= 0.9;
        }

        return result;
    }

    /**
     * Check if test structure has all required fields
     */
    isValidTestStructure(test) {
        const requiredFields = ['name', 'value', 'unit', 'status'];
        return requiredFields.every(field => 
            test.hasOwnProperty(field) && 
            test[field] !== undefined && 
            test[field] !== null &&
            test[field] !== ''
        );
    }

    /**
     * Normalize test name to match knowledge base
     */
    normalizeTestName(testName) {
        const normalizedInput = testName.toLowerCase().trim();
        return this.aliasMap.get(normalizedInput) || null;
    }

    /**
     * Critical method - Check if test was actually mentioned in original text
     */
    isTestMentionedInOriginal(testName, originalText) {
        if (!originalText || typeof originalText !== 'string') {
            console.log(`DEBUG: No original text provided for validation`);
            return true; // If no original text, assume valid (backward compatibility)
        }

        const normalizedText = originalText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const testNameLower = testName.toLowerCase();

        // Direct name match
        if (normalizedText.includes(testNameLower)) {
            return true;
        }

        // Check aliases and abbreviations
        const testData = this.knowledgeBase[testNameLower] || this.knowledgeBase[this.normalizeTestName(testName)];
        if (testData && testData.aliases) {
            for (const alias of testData.aliases) {
                if (normalizedText.includes(alias.toLowerCase())) {
                    return true;
                }
            }
        }

        // Check common abbreviations and variations
        const commonVariations = this.getCommonVariations(testNameLower);
        for (const variation of commonVariations) {
            if (normalizedText.includes(variation)) {
                return true;
            }
        }

        // Fuzzy matching for OCR errors (more lenient)
        if (this.fuzzyMatchInText(testNameLower, normalizedText)) {
            return true;
        }

        console.log(`DEBUG: Test '${testName}' not found in original text: "${originalText.substring(0, 100)}..."`);
        return false;
    }

    /**
     * Get common variations for a test name
     */
    getCommonVariations(testName) {
        const variations = {
            'hemoglobin': ['hgb', 'hb', 'hemglobin', 'haemoglobin'],
            'wbc': ['white blood cell', 'white blood cells', 'wbc count', 'leukocyte'],
            'rbc': ['red blood cell', 'red blood cells', 'rbc count', 'erythrocyte'],
            'glucose': ['blood glucose', 'sugar', 'glucse', 'glukose'],
            'creatinine': ['creat', 'cretinine'],
            'cholesterol_total': ['cholesterol', 'chol', 'cholestrol'],
            'platelet_count': ['platelets', 'plt', 'platlet', 'thrombocyte']
        };

        return variations[testName] || [testName];
    }

    /**
     * Fuzzy matching for OCR errors
     */
    fuzzyMatchInText(testName, text) {
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.length >= 3 && this.calculateSimilarity(testName, word) > 0.7) {
                return true;
            }
        }
        return false;
    }

    /**
     * Simple similarity calculation
     */
    calculateSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
    }

    /**
     * Levenshtein distance calculation
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
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    /**
     * Check if value is within realistic physical limits
     */
    isValueRealistic(test) {
        const testKey = test.name.toLowerCase();
        const normalizedKey = this.normalizeTestName(test.name);
        
        const limits = this.physicalLimits[testKey] || this.physicalLimits[normalizedKey];
        if (!limits || typeof test.value !== 'number') {
            return true; // No limits defined or non-numeric value
        }

        return test.value >= limits.min && test.value <= limits.max;
    }

    /**
     * Check if unit is valid for the test
     */
    isUnitValid(test) {
        const normalizedKey = this.normalizeTestName(test.name);
        const testData = this.knowledgeBase[normalizedKey];
        
        if (!testData || !testData.unit) {
            return true; // No expected unit defined
        }

        // Direct match
        if (test.unit === testData.unit) {
            return true;
        }

        // Common unit variations
        const unitVariations = {
            'g/dL': ['g/dl', 'gm/dl', 'gram/dl'],
            '/uL': ['/ul', 'per ul', '/μL', '/microL'],
            'mg/dL': ['mg/dl', 'mgdl'],
            '%': ['percent', 'pct']
        };

        const expectedVariations = unitVariations[testData.unit] || [];
        return expectedVariations.includes(test.unit.toLowerCase());
    }

    /**
     * Check if status is consistent with value and reference range
     */
    isStatusConsistent(test) {
        const normalizedKey = this.normalizeTestName(test.name);
        const testData = this.knowledgeBase[normalizedKey];
        
        if (!testData || !testData.normalRange || typeof test.value !== 'number') {
            return true; // Can't validate without reference range
        }

        const { low, high } = testData.normalRange;
        const value = test.value;
        const status = test.status.toLowerCase();

        if (value < low && status !== 'low') {
            return false;
        }
        if (value > high && status !== 'high') {
            return false;
        }
        if (value >= low && value <= high && status !== 'normal') {
            return false;
        }

        return true;
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            known_tests: this.validTestNames.size,
            alias_mappings: this.aliasMap.size,
            physical_limits: Object.keys(this.physicalLimits).length,
            validation_features: [
                "Hallucination Detection",
                "Physical Value Limits",
                "Unit Validation", 
                "Status Consistency Check",
                "Fuzzy Text Matching",
                "Alias Resolution"
            ],
            version: "1.0.0"
        };
    }
}

module.exports = { GuardrailService };