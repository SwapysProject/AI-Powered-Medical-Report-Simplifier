/**
 * Similarity Matcher Service - Advanced NLP-based fuzzy matching for medical test data
 * Uses multiple NLP algorithms to handle any spelling mistakes dynamically
 */

// Import NLP libraries (to be installed)
let natural, Fuse, metaphone, soundex, levenshtein;

try {
    natural = require('natural');
    Fuse = require('fuse.js');
    metaphone = natural.Metaphone;
    soundex = natural.SoundEx;
    levenshtein = natural.LevenshteinDistance;
} catch (error) {
    console.warn('NLP libraries not found. Install with: npm install natural fuse.js');
    // Fallback implementations will be used
}

class SimilarityMatcher {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase || {};
        
        // Advanced similarity thresholds
        this.thresholds = {
            testName: 0.5,      // Lower threshold for better fuzzy matching
            unit: 0.6,          // Unit matching threshold
            status: 0.5,        // Status matching threshold
            exact: 0.95,        // Threshold for "exact" match
            phonetic: 0.8,      // Threshold for phonetic matches
            semantic: 0.7       // Threshold for semantic similarity
        };

        // Base status and unit vocabularies (minimal hardcoding)
        this.baseStatuses = ['high', 'low', 'normal', 'elevated', 'decreased', 'abnormal'];
        this.baseUnits = ['g/dL', '/uL', 'mg/dL', 'mEq/L', 'U/L', '%', 'mIU/L', 'ng/dL', 'pg/mL', 'mm/hr', 'mg/L'];
        
        // Build comprehensive lookup tables
        this.buildLookupTables();

        // Initialize advanced fuzzy search engines
        this.initializeFuzzySearchEngines();
    }

    /**
     * Initialize advanced fuzzy search engines using Fuse.js and NLP
     */
    initializeFuzzySearchEngines() {
        // Fuse.js configuration for test names
        this.testNamesFuse = Fuse ? new Fuse(this.testNamesArray || [], {
            includeScore: true,
            threshold: 0.4, // More lenient threshold
            distance: 100,
            keys: ['name'],
            shouldSort: true,
            findAllMatches: false,
            minMatchCharLength: 2,
            location: 0,
            ignoreLocation: true,
            ignoreFieldNorm: false,
            fieldNormWeight: 1
        }) : null;

        // Fuse.js configuration for units
        this.unitsFuse = Fuse ? new Fuse(Array.from(this.units || []), {
            includeScore: true,
            threshold: 0.3,
            distance: 50,
            shouldSort: true,
            minMatchCharLength: 1,
            ignoreLocation: true
        }) : null;

        // Fuse.js configuration for status values
        this.statusFuse = Fuse ? new Fuse(this.baseStatuses, {
            includeScore: true,
            threshold: 0.4,
            distance: 20,
            shouldSort: true,
            minMatchCharLength: 2,
            ignoreLocation: true
        }) : null;

        // Initialize phonetic encoders
        this.phoneticCache = new Map();
        this.semanticCache = new Map();
    }

    /**
     * Build comprehensive lookup tables for faster matching
     */
    buildLookupTables() {
        this.testNames = new Set();
        this.testAliases = new Map();
        this.units = new Set();
        this.testNamesArray = []; // For Fuse.js

        // Collect all test names and aliases
        Object.entries(this.knowledgeBase).forEach(([key, data]) => {
            const testItem = {
                name: key.toLowerCase(),
                key: key,
                type: 'primary'
            };
            
            this.testNames.add(key.toLowerCase());
            this.testNamesArray.push(testItem);
            
            // Check if data has a name property
            if (data && data.name) {
                const nameItem = {
                    name: data.name.toLowerCase(),
                    key: key,
                    type: 'display'
                };
                this.testNames.add(data.name.toLowerCase());
                this.testNamesArray.push(nameItem);
            }
            
            if (data && data.unit) {
                this.units.add(data.unit);
            }

            // Enhanced aliases support
            if (data && data.aliases) {
                data.aliases.forEach(alias => {
                    const aliasItem = {
                        name: alias.toLowerCase(),
                        key: key,
                        type: 'alias'
                    };
                    this.testAliases.set(alias.toLowerCase(), key);
                    this.testNames.add(alias.toLowerCase());
                    this.testNamesArray.push(aliasItem);
                });
            }
        });

        // Add base units to the set
        this.baseUnits.forEach(unit => this.units.add(unit));
        
        console.log(`DEBUG: Built lookup tables - ${this.testNames.size} test names, ${this.units.size} units`);
    }

    /**
     * Advanced fuzzy matching for test names using multiple NLP techniques
     */
    findBestTestNameMatch(inputName) {
        if (!inputName || typeof inputName !== 'string') {
            return null;
        }

        const cleanInput = inputName.trim().toLowerCase();
        
        // 1. Try exact match first
        if (this.testAliases.has(cleanInput)) {
            return {
                matched: this.testAliases.get(cleanInput),
                similarity: 1.0,
                confidence: 'exact',
                method: 'exact_match'
            };
        }

        if (this.knowledgeBase[cleanInput]) {
            return {
                matched: cleanInput,
                similarity: 1.0,
                confidence: 'exact',
                method: 'direct_lookup'
            };
        }

        // 2. Use Fuse.js for advanced fuzzy matching
        if (this.testNamesFuse) {
            const fuseResults = this.testNamesFuse.search(cleanInput);
            if (fuseResults.length > 0) {
                const bestFuseMatch = fuseResults[0];
                const similarity = 1 - bestFuseMatch.score; // Fuse.js returns score (lower is better)
                
                if (similarity >= this.thresholds.testName) {
                    return {
                        matched: bestFuseMatch.item.key,
                        similarity: similarity,
                        confidence: this.getConfidenceLevel(similarity),
                        method: 'fuse_fuzzy'
                    };
                }
            }
        }

        // 3. Phonetic matching using Metaphone and Soundex
        const phoneticMatch = this.findPhoneticMatch(cleanInput, 'testName');
        if (phoneticMatch && phoneticMatch.similarity >= this.thresholds.phonetic) {
            return {
                matched: phoneticMatch.matched,
                similarity: phoneticMatch.similarity,
                confidence: this.getConfidenceLevel(phoneticMatch.similarity),
                method: 'phonetic'
            };
        }

        // 4. Advanced string similarity algorithms
        const advancedMatch = this.findAdvancedStringMatch(cleanInput, this.testNamesArray);
        if (advancedMatch && advancedMatch.similarity >= this.thresholds.testName) {
            return {
                matched: advancedMatch.key,
                similarity: advancedMatch.similarity,
                confidence: this.getConfidenceLevel(advancedMatch.similarity),
                method: 'advanced_string'
            };
        }

        // 5. Semantic similarity (if available)
        const semanticMatch = this.findSemanticMatch(cleanInput, 'testName');
        if (semanticMatch && semanticMatch.similarity >= this.thresholds.semantic) {
            return {
                matched: semanticMatch.matched,
                similarity: semanticMatch.similarity,
                confidence: this.getConfidenceLevel(semanticMatch.similarity),
                method: 'semantic'
            };
        }

        return null;
    }

    /**
     * Find the actual test key in knowledge base for a given name/alias
     */
    findActualTestKey(testName) {
        // Direct lookup
        if (this.knowledgeBase[testName]) {
            return testName;
        }

        // Search through aliases
        for (const [key, data] of Object.entries(this.knowledgeBase)) {
            if (data && data.name && data.name.toLowerCase() === testName) {
                return key;
            }
            if (data && data.aliases && data.aliases.some(alias => alias.toLowerCase() === testName)) {
                return key;
            }
        }

        return null;
    }

    /**
     * Advanced fuzzy matching for units using NLP techniques
     */
    findBestUnitMatch(inputUnit) {
        if (!inputUnit || typeof inputUnit !== 'string') {
            return null;
        }

        const cleanInput = inputUnit.trim();
        
        // 1. Exact match
        if (this.units.has(cleanInput)) {
            return {
                matched: cleanInput,
                similarity: 1.0,
                confidence: 'exact',
                method: 'exact_match'
            };
        }

        // 2. Use Fuse.js for fuzzy unit matching
        if (this.unitsFuse) {
            const fuseResults = this.unitsFuse.search(cleanInput);
            if (fuseResults.length > 0) {
                const bestMatch = fuseResults[0];
                const similarity = 1 - bestMatch.score;
                
                if (similarity >= this.thresholds.unit) {
                    return {
                        matched: bestMatch.item,
                        similarity: similarity,
                        confidence: this.getConfidenceLevel(similarity),
                        method: 'fuse_fuzzy'
                    };
                }
            }
        }

        // 3. Advanced string matching for units
        const unitsArray = Array.from(this.units).map(unit => ({ name: unit, key: unit }));
        const advancedMatch = this.findAdvancedStringMatch(cleanInput.toLowerCase(), unitsArray);
        
        if (advancedMatch && advancedMatch.similarity >= this.thresholds.unit) {
            return {
                matched: advancedMatch.key,
                similarity: advancedMatch.similarity,
                confidence: this.getConfidenceLevel(advancedMatch.similarity),
                method: 'advanced_string'
            };
        }

        return null;
    }

    /**
     * Advanced fuzzy matching for status values using NLP techniques
     */
    findBestStatusMatch(inputStatus) {
        if (!inputStatus || typeof inputStatus !== 'string') {
            return null;
        }

        const cleanInput = inputStatus.trim().toLowerCase();
        
        // 1. Direct match with base statuses
        if (this.baseStatuses.includes(cleanInput)) {
            return {
                matched: cleanInput,
                similarity: 1.0,
                confidence: 'exact',
                method: 'exact_match'
            };
        }

        // 2. Use Fuse.js for status matching
        if (this.statusFuse) {
            const fuseResults = this.statusFuse.search(cleanInput);
            if (fuseResults.length > 0) {
                const bestMatch = fuseResults[0];
                const similarity = 1 - bestMatch.score;
                
                if (similarity >= this.thresholds.status) {
                    return {
                        matched: bestMatch.item,
                        similarity: similarity,
                        confidence: this.getConfidenceLevel(similarity),
                        method: 'fuse_fuzzy'
                    };
                }
            }
        }

        // 3. Phonetic matching for status
        const phoneticMatch = this.findPhoneticMatch(cleanInput, 'status');
        if (phoneticMatch && phoneticMatch.similarity >= this.thresholds.phonetic) {
            return {
                matched: phoneticMatch.matched,
                similarity: phoneticMatch.similarity,
                confidence: this.getConfidenceLevel(phoneticMatch.similarity),
                method: 'phonetic'
            };
        }

        // 4. Advanced string matching
        const statusArray = this.baseStatuses.map(status => ({ name: status, key: status }));
        const advancedMatch = this.findAdvancedStringMatch(cleanInput, statusArray);
        
        if (advancedMatch && advancedMatch.similarity >= this.thresholds.status) {
            return {
                matched: advancedMatch.key,
                similarity: advancedMatch.similarity,
                confidence: this.getConfidenceLevel(advancedMatch.similarity),
                method: 'advanced_string'
            };
        }

        return null;
    }

    /**
     * Phonetic matching using Metaphone and Soundex algorithms
     */
    findPhoneticMatch(input, type) {
        if (!natural || !metaphone || !soundex) {
            return null; // NLP libraries not available
        }

        const inputMetaphone = metaphone.process(input);
        const inputSoundex = soundex.process(input);
        
        let candidates = [];
        
        if (type === 'testName') {
            candidates = this.testNamesArray;
        } else if (type === 'status') {
            candidates = this.baseStatuses.map(s => ({ name: s, key: s }));
        }

        let bestMatch = null;
        let bestSimilarity = 0;

        for (const candidate of candidates) {
            const candidateMetaphone = metaphone.process(candidate.name);
            const candidateSoundex = soundex.process(candidate.name);
            
            // Check phonetic similarity
            let phoneticSimilarity = 0;
            
            if (inputMetaphone === candidateMetaphone) {
                phoneticSimilarity += 0.6;
            }
            
            if (inputSoundex === candidateSoundex) {
                phoneticSimilarity += 0.4;
            }
            
            // Combine with string similarity for better results
            const stringSimilarity = this.calculateAdvancedStringSimilarity(input, candidate.name);
            const combinedSimilarity = (phoneticSimilarity * 0.7) + (stringSimilarity * 0.3);
            
            if (combinedSimilarity > bestSimilarity) {
                bestSimilarity = combinedSimilarity;
                bestMatch = candidate;
            }
        }

        return bestMatch ? {
            matched: bestMatch.key,
            similarity: bestSimilarity
        } : null;
    }

    /**
     * Advanced string matching using multiple algorithms
     */
    findAdvancedStringMatch(input, candidates) {
        let bestMatch = null;
        let bestSimilarity = 0;

        for (const candidate of candidates) {
            const similarity = this.calculateAdvancedStringSimilarity(input, candidate.name);
            
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = candidate;
            }
        }

        return bestMatch ? {
            key: bestMatch.key,
            similarity: bestSimilarity
        } : null;
    }

    /**
     * Semantic similarity matching (placeholder for future ML models)
     */
    findSemanticMatch(input, type) {
        // This could be enhanced with word embeddings or transformer models
        // For now, return null as it requires heavy ML libraries
        return null;
    }

    /**
     * Get confidence level based on similarity score
     */
    getConfidenceLevel(similarity) {
        if (similarity >= this.thresholds.exact) return 'exact';
        if (similarity >= 0.8) return 'high';
        if (similarity >= 0.6) return 'medium';
        return 'low';
    }

    /**
     * Advanced string similarity calculation using multiple algorithms
     */
    calculateAdvancedStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        // Use Natural.js if available, otherwise fallback to basic algorithms
        if (natural && levenshtein) {
            const distance = levenshtein(str1, str2);
            const maxLength = Math.max(str1.length, str2.length);
            const levenshteinSim = 1 - (distance / maxLength);
            
            // Combine with other metrics
            const jaroSim = this.jaroSimilarity(str1, str2);
            const substringeSim = this.substringsimilarity(str1, str2);
            const nGramSim = this.calculateNGramSimilarity(str1, str2);
            
            // Weighted combination
            return (levenshteinSim * 0.3) + (jaroSim * 0.3) + (substringeSim * 0.2) + (nGramSim * 0.2);
        }
        
        // Fallback to original implementation
        return this.calculateStringSimilarity(str1, str2);
    }

    /**
     * N-gram similarity calculation
     */
    calculateNGramSimilarity(str1, str2, n = 2) {
        const getNGrams = (str, n) => {
            const ngrams = [];
            for (let i = 0; i <= str.length - n; i++) {
                ngrams.push(str.substr(i, n));
            }
            return ngrams;
        };

        const ngrams1 = new Set(getNGrams(str1.toLowerCase(), n));
        const ngrams2 = new Set(getNGrams(str2.toLowerCase(), n));
        
        const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
        const union = new Set([...ngrams1, ...ngrams2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    /**
     * Calculate string similarity using multiple algorithms (fallback method)
     */
    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        // Use a combination of different similarity metrics
        const levenshtein = this.levenshteinSimilarity(str1, str2);
        const jaro = this.jaroSimilarity(str1, str2);
        const substring = this.substringsimilarity(str1, str2);
        
        // Weighted average (Levenshtein gets highest weight for typos)
        return (levenshtein * 0.5) + (jaro * 0.3) + (substring * 0.2);
    }

    /**
     * Levenshtein distance based similarity (good for typos)
     */
    levenshteinSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
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
     * Jaro similarity (good for transpositions)
     */
    jaroSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 || len2 === 0) return 0;
        
        const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
        const matches1 = new Array(len1).fill(false);
        const matches2 = new Array(len2).fill(false);
        
        let matches = 0;
        let transpositions = 0;
        
        // Find matches
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchWindow);
            const end = Math.min(i + matchWindow + 1, len2);
            
            for (let j = start; j < end; j++) {
                if (matches2[j] || str1[i] !== str2[j]) continue;
                matches1[i] = matches2[j] = true;
                matches++;
                break;
            }
        }
        
        if (matches === 0) return 0;
        
        // Count transpositions
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!matches1[i]) continue;
            while (!matches2[k]) k++;
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }
        
        return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    }

    /**
     * Substring similarity (good for partial matches)
     */
    substringsimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1;
        
        // Check if shorter string is contained in longer
        if (longer.includes(shorter)) {
            return shorter.length / longer.length;
        }
        
        // Find longest common substring
        let maxLength = 0;
        for (let i = 0; i < shorter.length; i++) {
            for (let j = i + 1; j <= shorter.length; j++) {
                const substring = shorter.slice(i, j);
                if (longer.includes(substring) && substring.length > maxLength) {
                    maxLength = substring.length;
                }
            }
        }
        
        return maxLength / longer.length;
    }

    /**
     * Enhanced test matching that considers all aspects
     */
    findBestTestMatch(testName, value, unit, status) {
        const nameMatch = this.findBestTestNameMatch(testName);
        
        if (!nameMatch) {
            return null;
        }

        const testData = this.knowledgeBase[nameMatch.matched];
        if (!testData) {
            return null;
        }

        // Unit matching
        let unitMatch = null;
        if (unit) {
            unitMatch = this.findBestUnitMatch(unit);
            // If unit doesn't match well, use the known unit from test data
            if (!unitMatch || unitMatch.confidence === 'low') {
                unitMatch = {
                    matched: testData.unit,
                    similarity: 0.8, // Assume reasonable similarity
                    confidence: 'assumed'
                };
            }
        } else {
            unitMatch = {
                matched: testData.unit,
                similarity: 1.0,
                confidence: 'default'
            };
        }

        // Status matching
        let statusMatch = null;
        if (status) {
            statusMatch = this.findBestStatusMatch(status);
        }

        // Calculate overall confidence
        const overallConfidence = this.calculateOverallConfidence(nameMatch, unitMatch, statusMatch);

        return {
            testKey: nameMatch.matched,
            testData: testData,
            matches: {
                name: nameMatch,
                unit: unitMatch,
                status: statusMatch
            },
            confidence: overallConfidence
        };
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(nameMatch, unitMatch, statusMatch) {
        let totalWeight = 0;
        let weightedScore = 0;

        // Name match is most important
        if (nameMatch) {
            const weight = 0.6;
            weightedScore += nameMatch.similarity * weight;
            totalWeight += weight;
        }

        // Unit match
        if (unitMatch) {
            const weight = 0.25;
            weightedScore += unitMatch.similarity * weight;
            totalWeight += weight;
        }

        // Status match
        if (statusMatch) {
            const weight = 0.15;
            weightedScore += statusMatch.similarity * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? weightedScore / totalWeight : 0;
    }

    /**
     * Get similarity matching statistics
     */
    getStats() {
        return {
            testNames: this.testNames.size,
            units: this.units.size,
            statusValues: this.baseStatuses.length,
            thresholds: this.thresholds,
            nlpLibrariesAvailable: {
                natural: !!natural,
                fuse: !!Fuse,
                metaphone: !!metaphone,
                soundex: !!soundex,
                levenshtein: !!levenshtein
            },
            version: "2.0.0",
            features: [
                "Advanced Fuzzy Matching with Fuse.js",
                "Phonetic Matching (Metaphone & Soundex)",
                "N-gram Similarity",
                "Multiple String Similarity Algorithms",
                "Dynamic Spelling Correction",
                "No Hardcoded Variations Required"
            ]
        };
    }

    /**
     * Install required NLP dependencies
     */
    static getRequiredDependencies() {
        return {
            dependencies: [
                "natural",
                "fuse.js"
            ],
            installCommand: "npm install natural fuse.js",
            description: "These libraries provide advanced NLP capabilities for better fuzzy matching"
        };
    }
}

module.exports = { SimilarityMatcher };