/**
 * Enhanced Patient-Friendly Explanation Service
 * Generates comprehensive, contextual, non-diagnostic explanations with critical value detection
 * and system-based analysis for medical test results
 */
class MedicalExplanationService {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase || {};
        
        // Short and simple explanation templates
        this.explanationTemplates = {
            'hemoglobin': {
                'low': {
                    simple: 'Low hemoglobin may cause fatigue and weakness.',
                    critical: 'Critically low hemoglobin requires immediate medical attention.'
                },
                'high': {
                    simple: 'High hemoglobin can be due to dehydration or smoking.'
                }
            },
            'wbc': {
                'high': {
                    simple: 'High white blood cells often indicate infection or inflammation.'
                },
                'low': {
                    simple: 'Low white blood cells may increase infection risk.'
                }
            },
            'glucose': {
                'high': {
                    simple: 'High blood sugar may indicate diabetes risk.',
                    critical: 'Extremely high blood sugar requires immediate medical attention.'
                },
                'low': {
                    simple: 'Low blood sugar can cause dizziness or shakiness.',
                    critical: 'Dangerously low blood sugar requires immediate attention.'
                }
            },
            'cholesterol_total': {
                'high': {
                    simple: 'High cholesterol may increase heart disease risk.'
                },
                'low': {
                    simple: 'Low cholesterol is generally not concerning.'
                }
            },
            'creatinine': {
                'high': {
                    simple: 'High creatinine may indicate kidney function concerns.',
                    critical: 'Severely high creatinine requires immediate medical care.'
                }
            },
            'potassium': {
                'high': {
                    simple: 'High potassium can affect heart rhythm.',
                    critical: 'Dangerously high potassium can affect your heart.'
                },
                'low': {
                    simple: 'Low potassium can cause muscle weakness and fatigue.'
                }
            },
            'platelet count': {
                'low': {
                    simple: 'Low platelets may increase bleeding risk.'
                },
                'high': {
                    simple: 'High platelets can increase blood clot risk.'
                }
            },
            'sodium': {
                'high': {
                    simple: 'High sodium affects fluid balance in your body.'
                },
                'low': {
                    simple: 'Your sodium level is below normal',
                    detailed: 'Low sodium levels can affect nerve and muscle function, and may cause symptoms like headache, nausea, or confusion.'
                }
            }
        };

        // System-based groupings for contextual summaries
        this.testSystems = {
            cardiovascular: ['cholesterol_total', 'cholesterol_ldl', 'cholesterol_hdl', 'triglycerides', 'blood_pressure_systolic', 'blood_pressure_diastolic'],
            metabolic: ['glucose', 'hba1c', 'insulin'],
            kidney: ['creatinine', 'blood_urea_nitrogen', 'protein_urine'],
            liver: ['alt', 'ast', 'bilirubin', 'albumin'],
            hematology: ['hemoglobin', 'wbc', 'rbc', 'platelet count', 'hematocrit'],
            electrolytes: ['sodium', 'potassium', 'chloride', 'co2']
        };

        // Disclaimer messages
        this.disclaimers = [
            "These explanations are for informational purposes only.",
            "Always consult your healthcare provider for medical advice.",
            "Do not use this information for self-diagnosis or treatment."
        ];
    }

    /**
     * Enhanced patient-friendly summary with critical value detection and system analysis
     */
    generatePatientSummary(normalizedTests, originalText = '') {
        try {
            // Input validation
            if (!this.validateInput(normalizedTests)) {
                return {
                    status: "unprocessed",
                    reason: "Invalid or empty test data provided"
                };
            }

            const explanations = [];
            const summaryParts = [];
            const abnormalTests = [];
            const criticalTests = [];

            for (const test of normalizedTests) {
                if (!this.validateTestStructure(test)) {
                    console.log(`DEBUG: Invalid test structure:`, test);
                    continue;
                }

                const testName = test.name.toLowerCase();
                const status = test.status.toLowerCase();

                // Check for critical values first
                if (this.isCriticalValue(test)) {
                    const criticalExplanation = this.getCriticalExplanation(testName, status);
                    if (criticalExplanation) {
                        explanations.push(`⚠️ URGENT: ${criticalExplanation}`);
                        criticalTests.push(test);
                    }
                }
                // Handle abnormal values
                else if (status === 'low' || status === 'high') {
                    const explanation = this.getDetailedExplanation(testName, status);
                    if (explanation) {
                        explanations.push(explanation);
                        summaryParts.push(`${status} ${testName}`);
                        abnormalTests.push({ name: testName, status, value: test.value, unit: test.unit });
                    }
                }
            }

            // Generate contextual summary
            let summary;
            if (criticalTests.length > 0) {
                summary = `Critical values detected that require immediate medical attention: ${criticalTests.map(t => t.name).join(', ')}.`;
            } else if (summaryParts.length === 0) {
                summary = "All test values are within normal ranges.";
            } else {
                // Pass total test count for better summary
                summary = this.generateContextualSummary(abnormalTests, normalizedTests.length);
            }

            const result = {
                summary: summary,
                explanations: explanations,
                abnormal_tests_count: abnormalTests.length,
                critical_tests_count: criticalTests.length,
                total_tests_count: normalizedTests.length,
                system_analysis: this.generateSystemAnalysis(abnormalTests)
            };

            // Add appropriate disclaimers
            if (criticalTests.length > 0) {
                result.urgent_notice = "🚨 CRITICAL VALUES DETECTED - Seek immediate medical attention";
            } else if (abnormalTests.length > 0) {
                result.disclaimer = "Please consult your healthcare provider to discuss these results.";
            }

            console.log(`DEBUG: Generated explanations for ${explanations.length} tests (${criticalTests.length} critical, ${abnormalTests.length} abnormal) out of ${normalizedTests.length} total tests`);

            return result;

        } catch (error) {
            console.error("Error generating patient summary:", error);
            return {
                status: "error",
                reason: "Failed to generate patient summary"
            };
        }
    }

    /**
     * Check if a test value is in critical range
     */
    isCriticalValue(test) {
        const testData = this.knowledgeBase[test.name.toLowerCase()];
        if (!testData || !testData.criticalRanges || !test.value) {
            return false;
        }

        const { low, high } = testData.criticalRanges;
        return test.value < low || test.value > high;
    }

    /**
     * Get critical value explanation
     */
    getCriticalExplanation(testName, status) {
        const testKey = testName.toLowerCase();
        const explanationData = this.explanationTemplates[testKey];
        
        if (explanationData && explanationData[status] && explanationData[status].critical) {
            return explanationData[status].critical;
        }

        return `Critical ${testName} level detected that requires immediate medical attention.`;
    }

    /**
     * Generate direct summary listing abnormal tests
     */
    generateContextualSummary(abnormalTests, totalTests = 0) {
        if (abnormalTests.length === 0) {
            return "All test values are within normal ranges.";
        }

        // Create descriptive list of abnormal tests
        const testDescriptions = abnormalTests.map(test => {
            const statusMap = {
                'high': 'high',
                'low': 'low',
                'critically high': 'critically high',
                'critically low': 'critically low'
            };
            return `${statusMap[test.status] || test.status} ${test.name}`;
        });

        // Join with "and" for natural language
        if (testDescriptions.length === 1) {
            return `${testDescriptions[0].charAt(0).toUpperCase() + testDescriptions[0].slice(1)}.`;
        } else if (testDescriptions.length === 2) {
            return `${testDescriptions[0].charAt(0).toUpperCase() + testDescriptions[0].slice(1)} and ${testDescriptions[1]}.`;
        } else {
            const lastTest = testDescriptions.pop();
            return `${testDescriptions.join(', ').charAt(0).toUpperCase() + testDescriptions.join(', ').slice(1)}, and ${lastTest}.`;
        }
    }

    /**
     * Group tests by body system
     */
    groupTestsBySystem(tests) {
        const groups = {
            cardiovascular: [],
            metabolic: [],
            kidney: [],
            liver: [],
            hematology: [],
            electrolytes: [],
            other: []
        };

        for (const test of tests) {
            let assigned = false;
            for (const [system, systemTests] of Object.entries(this.testSystems)) {
                if (systemTests.includes(test.name)) {
                    groups[system].push(test);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                groups.other.push(test);
            }
        }

        return groups;
    }

    /**
     * Create system-specific summary
     */
    createSystemSummary(system, tests) {
        const testNames = tests.map(t => t.name).join(', ');
        
        const systemDescriptions = {
            cardiovascular: `Heart and blood vessel related tests (${testNames}) show abnormal values.`,
            metabolic: `Metabolism related tests (${testNames}) show abnormal values.`,
            kidney: `Kidney function tests (${testNames}) show abnormal values.`,
            liver: `Liver function tests (${testNames}) show abnormal values.`,
            hematology: `Blood cell counts (${testNames}) show abnormal values.`,
            electrolytes: `Electrolyte levels (${testNames}) show abnormal values.`
        };

        return systemDescriptions[system] || `Tests related to ${system} (${testNames}) show abnormal values.`;
    }

    /**
     * Generate system analysis for detailed reporting
     */
    generateSystemAnalysis(abnormalTests) {
        const systemGroups = this.groupTestsBySystem(abnormalTests);
        const analysis = {};

        for (const [system, tests] of Object.entries(systemGroups)) {
            if (tests.length > 0) {
                analysis[system] = {
                    affected_tests: tests.length,
                    tests: tests.map(t => ({
                        name: t.name,
                        status: t.status,
                        value: t.value,
                        unit: t.unit
                    }))
                };
            }
        }

        return analysis;
    }

    /**
     * Validate input structure
     */
    validateInput(tests) {
        if (!tests || !Array.isArray(tests)) {
            console.log("DEBUG: Invalid input - not an array");
            return false;
        }

        if (tests.length === 0) {
            console.log("DEBUG: Empty test array");
            return false;
        }

        return true;
    }

    /**
     * Check for hallucinated tests
     */
    checkForHallucination(tests, originalText) {
        if (!originalText) {
            // If no original text provided, assume validation passes
            // This maintains backward compatibility
            return { isValid: true, invalidTests: [] };
        }

        const originalLower = originalText.toLowerCase();
        const invalidTests = [];

        for (const test of tests) {
            const testName = test.name.toLowerCase();
            
            // Check if test name or common aliases appear in original text
            if (!this.testExistsInOriginal(testName, originalLower)) {
                invalidTests.push(test.name);
            }
        }

        return {
            isValid: invalidTests.length === 0,
            invalidTests
        };
    }

    /**
     * Check if test exists in original text
     */
    testExistsInOriginal(testName, originalLower) {
        // Direct name match
        if (originalLower.includes(testName)) {
            return true;
        }

        // Check common abbreviations and aliases
        const aliases = this.getTestAliases(testName);
        return aliases.some(alias => originalLower.includes(alias));
    }

    /**
     * Get common aliases for test names
     */
    getTestAliases(testName) {
        const aliasMap = {
            'hemoglobin': ['hgb', 'hb', 'hemglobin'],
            'wbc': ['white blood cell', 'white blood cells', 'wbc count'],
            'rbc': ['red blood cell', 'red blood cells', 'rbc count'],
            'platelet count': ['platelets', 'plt', 'platlet'],
            'glucose': ['blood glucose', 'sugar', 'glucse'],
            'creatinine': ['creat', 'cretinine'],
            'sodium': ['na', 'sodim'],
            'potassium': ['k', 'potasium']
        };

        return aliasMap[testName] || [testName];
    }

    /**
     * Validate individual test structure
     */
    validateTestStructure(test) {
        const requiredFields = ['name', 'value', 'unit', 'status'];
        return requiredFields.every(field => test.hasOwnProperty(field) && test[field] !== undefined);
    }

    /**
     * Get explanation for specific test and status
     */
    getExplanation(testName, status) {
        // First check our explanation templates
        const testKey = testName.toLowerCase();
        const explanationData = this.explanationTemplates[testKey];
        
        if (explanationData && explanationData[status]) {
            return explanationData[status].simple;
        }

        // Fallback to knowledge base explanation if available
        const knownTestData = this.knowledgeBase[testKey];
        if (knownTestData && knownTestData.explanation) {
            return knownTestData.explanation;
        }

        // Generic fallback
        return `${status.charAt(0).toUpperCase() + status.slice(1)} ${testName} levels detected.`;
    }

    /**
     * Generate natural summary text
     */
    generateSummaryText(summaryParts) {
        if (summaryParts.length === 1) {
            return summaryParts[0].charAt(0).toUpperCase() + summaryParts[0].slice(1) + " detected.";
        } else if (summaryParts.length === 2) {
            return summaryParts.join(' and ').charAt(0).toUpperCase() + summaryParts.join(' and ').slice(1) + " detected.";
        } else {
            const lastPart = summaryParts.pop();
            return summaryParts.join(', ') + ', and ' + lastPart + " detected.";
        }
    }

    /**
     * Get simple explanation for test results
     */
    getDetailedExplanation(testName, status) {
        const testKey = testName.toLowerCase();
        const explanationData = this.explanationTemplates[testKey];
        
        if (explanationData && explanationData[status]) {
            // Always return simple explanation
            return explanationData[status].simple;
        }

        // Fallback to knowledge base explanation if available
        const knownTestData = this.knowledgeBase[testKey];
        if (knownTestData && knownTestData.explanation) {
            return knownTestData.explanation;
        }

        // Simple generic fallback
        const statusDescriptions = {
            'high': 'elevated',
            'low': 'below normal range'
        };

        return `Your ${testName} level is ${statusDescriptions[status] || status}. This may require discussion with your healthcare provider.`;
    }
}

module.exports = { MedicalExplanationService };