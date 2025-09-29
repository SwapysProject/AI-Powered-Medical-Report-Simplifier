// Enhanced Medical Knowledge Base with comprehensive test data
// This maintains backward compatibility while adding new tests and improved structure

const MEDICAL_DATA = {
    // --- Hematology (Blood Counts) ---
    "hemoglobin": {
        ref_range: { low: 12.0, high: 15.0 },
        normalRange: { low: 12.0, high: 15.0 }, // For backward compatibility
        criticalRanges: { low: 7.0, high: 20.0 },
        physicalLimits: { min: 0, max: 30 },
        explanation: "Hemoglobin is the protein in red blood cells that carries oxygen. Low levels can be related to anemia.",
        name: "Hemoglobin",
        unit: "g/dL",
        category: "hematology",
        aliases: ["hgb", "hb", "hemglobin", "heoglobin", "hemglobin"]
    },
    "wbc": {
        ref_range: { low: 4000, high: 11000 },
        normalRange: { low: 4000, high: 11000 },
        criticalRanges: { low: 1000, high: 50000 },
        physicalLimits: { min: 0, max: 100000 },
        explanation: "White Blood Cells (WBCs) fight infection. High levels can indicate an infection, while low levels can indicate an immune system issue.",
        name: "WBC",
        unit: "/uL",
        category: "hematology",
        aliases: ["white blood cells", "white blood cell count", "wbc count"]
    },
    "White Blood Cell Count": {
        ref_range: { low: 4000, high: 11000 },
        normalRange: { low: 4000, high: 11000 },
        criticalRanges: { low: 1000, high: 50000 },
        physicalLimits: { min: 0, max: 100000 },
        explanation: "White Blood Cells (WBCs) fight infection. High levels can indicate an infection, while low levels can indicate an immune system issue.",
        name: "WBC",
        unit: "/uL",
        category: "hematology",
        aliases: ["white blood cells", "white blood cell count", "wbc count"]
    },
    "rbc": {
        ref_range: { low: 4.2, high: 5.4 },
        normalRange: { low: 4.2, high: 5.4 },
        criticalRanges: { low: 2.0, high: 8.0 },
        physicalLimits: { min: 0, max: 12 },
        explanation: "Red Blood Cell (RBC) count measures the number of oxygen-carrying cells.",
        name: "RBC",
        unit: "mil/uL",
        category: "hematology",
        aliases: ["red blood cells", "red blood cell count", "rbc count"]
    },
    "platelet count": {
        ref_range: { low: 150000, high: 450000 },
        normalRange: { low: 150000, high: 450000 },
        criticalRanges: { low: 20000, high: 1000000 },
        physicalLimits: { min: 0, max: 2000000 },
        explanation: "Platelets help blood to clot. Abnormal levels can indicate a bleeding disorder or other medical conditions.",
        name: "Platelet Count",
        unit: "/uL",
        category: "hematology",
        aliases: ["platelets", "plt", "platlet", "platelet"]
    },
    "hematocrit": {
        ref_range: { low: 36.0, high: 46.0 },
        normalRange: { low: 36.0, high: 46.0 },
        criticalRanges: { low: 20.0, high: 65.0 },
        physicalLimits: { min: 0, max: 100 },
        explanation: "Hematocrit measures the percentage of blood volume that is red blood cells.",
        name: "Hematocrit",
        unit: "%",
        category: "hematology",
        aliases: ["hct", "packed cell volume"]
    },

    // --- Basic Metabolic Panel (Chemistry) ---
    "glucose": {
        ref_range: { low: 70, high: 100 },
        normalRange: { low: 70, high: 100 },
        criticalRanges: { low: 40, high: 400 },
        physicalLimits: { min: 0, max: 2000 },
        explanation: "Glucose is your blood sugar level. High levels (hyperglycemia) may indicate a risk for diabetes.",
        name: "Glucose",
        unit: "mg/dL",
        category: "chemistry",
        aliases: ["blood glucose", "sugar", "glucse", "fasting glucose"]
    },
    "sodium": {
        ref_range: { low: 135, high: 145 },
        normalRange: { low: 135, high: 145 },
        criticalRanges: { low: 120, high: 160 },
        physicalLimits: { min: 100, max: 200 },
        explanation: "Sodium is an electrolyte that helps maintain fluid balance and nerve function.",
        name: "Sodium",
        unit: "mEq/L",
        category: "chemistry",
        aliases: ["na", "sodim", "serum sodium"]
    },
    "potassium": {
        ref_range: { low: 3.5, high: 5.0 },
        normalRange: { low: 3.5, high: 5.0 },
        criticalRanges: { low: 2.5, high: 6.5 },
        physicalLimits: { min: 0, max: 15 },
        explanation: "Potassium is crucial for heart and muscle function.",
        name: "Potassium",
        unit: "mEq/L",
        category: "chemistry",
        aliases: ["k", "potasium", "serum potassium"]
    },
    "creatinine": {
        ref_range: { low: 0.6, high: 1.2 },
        normalRange: { low: 0.6, high: 1.2 },
        criticalRanges: { low: 0.1, high: 15.0 },
        physicalLimits: { min: 0, max: 50 },
        explanation: "Creatinine is a waste product from muscle metabolism. Elevated levels can indicate kidney problems.",
        name: "Creatinine",
        unit: "mg/dL",
        category: "chemistry",
        aliases: ["creat", "cretinine", "serum creatinine"]
    },
    "bun": {
        ref_range: { low: 7, high: 20 },
        normalRange: { low: 7, high: 20 },
        criticalRanges: { low: 2, high: 100 },
        physicalLimits: { min: 0, max: 300 },
        explanation: "Blood Urea Nitrogen (BUN) is a waste product that helps assess kidney function.",
        name: "BUN",
        unit: "mg/dL",
        category: "chemistry",
        aliases: ["blood urea nitrogen", "urea nitrogen"]
    },
    "chloride": {
        ref_range: { low: 98, high: 107 },
        normalRange: { low: 98, high: 107 },
        criticalRanges: { low: 80, high: 130 },
        physicalLimits: { min: 50, max: 200 },
        explanation: "Chloride is an electrolyte that helps maintain fluid balance.",
        name: "Chloride",
        unit: "mEq/L",
        category: "chemistry",
        aliases: ["cl", "serum chloride"]
    },
    "co2": {
        ref_range: { low: 22, high: 29 },
        normalRange: { low: 22, high: 29 },
        criticalRanges: { low: 10, high: 40 },
        physicalLimits: { min: 0, max: 100 },
        explanation: "CO2 (carbon dioxide) helps assess acid-base balance in the blood.",
        name: "CO2",
        unit: "mEq/L",
        category: "chemistry",
        aliases: ["carbon dioxide", "bicarbonate", "hco3"]
    },

    // --- Lipid Panel ---
    "total cholesterol": {
        ref_range: { low: 0, high: 200 },
        normalRange: { low: 0, high: 200 },
        criticalRanges: { low: 0, high: 500 },
        physicalLimits: { min: 0, max: 1000 },
        explanation: "Total cholesterol measures all cholesterol in your blood. High levels increase heart disease risk.",
        name: "Total Cholesterol",
        unit: "mg/dL",
        category: "lipid",
        aliases: ["cholesterol", "chol", "total chol", "cholesterol_total"]
    },
    "ldl": {
        ref_range: { low: 0, high: 100 },
        normalRange: { low: 0, high: 100 },
        criticalRanges: { low: 0, high: 400 },
        physicalLimits: { min: 0, max: 800 },
        explanation: "LDL (bad cholesterol) can build up in arteries and increase heart disease risk.",
        name: "LDL",
        unit: "mg/dL",
        category: "lipid",
        aliases: ["ldl cholesterol", "bad cholesterol", "low density lipoprotein"]
    },
    "hdl": {
        ref_range: { low: 40, high: 999 },
        normalRange: { low: 40, high: 999 },
        criticalRanges: { low: 10, high: 200 },
        physicalLimits: { min: 0, max: 300 },
        explanation: "HDL (good cholesterol) helps remove other cholesterol from your arteries.",
        name: "HDL",
        unit: "mg/dL",
        category: "lipid",
        aliases: ["hdl cholesterol", "good cholesterol", "high density lipoprotein"]
    },
    "triglycerides": {
        ref_range: { low: 0, high: 150 },
        normalRange: { low: 0, high: 150 },
        criticalRanges: { low: 0, high: 1000 },
        physicalLimits: { min: 0, max: 5000 },
        explanation: "Triglycerides are a type of fat in your blood. High levels can increase heart disease risk.",
        name: "Triglycerides",
        unit: "mg/dL",
        category: "lipid",
        aliases: ["trig", "triglyceride"]
    },

    // --- Liver Function Tests ---
    "ast": {
        ref_range: { low: 10, high: 40 },
        explanation: "AST is an enzyme found in the liver. High levels can indicate liver damage.",
        name: "AST",
        unit: "U/L",
        category: "liver",
        aliases: ["aspartate aminotransferase", "sgot"]
    },
    "alt": {
        ref_range: { low: 7, high: 56 },
        explanation: "ALT is an enzyme found in the liver. High levels can indicate liver damage.",
        name: "ALT",
        unit: "U/L",
        category: "liver",
        aliases: ["alanine aminotransferase", "sgpt"]
    },
    "total bilirubin": {
        ref_range: { low: 0.2, high: 1.2 },
        explanation: "Bilirubin is produced when red blood cells break down. High levels can cause jaundice.",
        name: "Total Bilirubin",
        unit: "mg/dL",
        category: "liver",
        aliases: ["bilirubin", "total bili"]
    },
    "albumin": {
        ref_range: { low: 3.5, high: 5.0 },
        explanation: "Albumin is a protein made by the liver. Low levels can indicate liver or kidney problems.",
        name: "Albumin",
        unit: "g/dL",
        category: "liver",
        aliases: ["serum albumin"]
    },
    "total protein": {
        ref_range: { low: 6.0, high: 8.3 },
        explanation: "Total protein measures all proteins in your blood, including albumin and globulins.",
        name: "Total Protein",
        unit: "g/dL",
        category: "liver",
        aliases: ["protein", "serum protein"]
    },

    // --- Thyroid Function ---
    "tsh": {
        ref_range: { low: 0.4, high: 4.0 },
        explanation: "TSH (Thyroid Stimulating Hormone) helps assess thyroid function.",
        name: "TSH",
        unit: "mIU/L",
        category: "thyroid",
        aliases: ["thyroid stimulating hormone", "thyrotropin"]
    },
    "free t4": {
        ref_range: { low: 0.8, high: 1.8 },
        explanation: "Free T4 is the active form of thyroid hormone that affects metabolism.",
        name: "Free T4",
        unit: "ng/dL",
        category: "thyroid",
        aliases: ["free thyroxine", "ft4"]
    },
    "free t3": {
        ref_range: { low: 2.3, high: 4.2 },
        explanation: "Free T3 is the most active thyroid hormone.",
        name: "Free T3",
        unit: "pg/mL",
        category: "thyroid",
        aliases: ["free triiodothyronine", "ft3"]
    },

    // --- Diabetes Monitoring ---
    "hba1c": {
        ref_range: { low: 0, high: 5.7 },
        explanation: "HbA1c shows average blood sugar levels over the past 2-3 months.",
        name: "HbA1c",
        unit: "%",
        category: "diabetes",
        aliases: ["a1c", "hemoglobin a1c", "glycated hemoglobin"]
    },

    // --- Inflammatory Markers ---
    "esr": {
        ref_range: { low: 0, high: 20 },
        explanation: "ESR (sedimentation rate) is a marker of inflammation in the body.",
        name: "ESR",
        unit: "mm/hr",
        category: "inflammatory",
        aliases: ["erythrocyte sedimentation rate", "sed rate"]
    },
    "crp": {
        ref_range: { low: 0, high: 3.0 },
        explanation: "CRP (C-reactive protein) is a marker of inflammation or infection.",
        name: "CRP",
        unit: "mg/L",
        category: "inflammatory",
        aliases: ["c-reactive protein", "c reactive protein"]
    }
};

// Create reverse mapping for aliases to improve lookup performance
const ALIAS_MAP = {};
for (const [testKey, testData] of Object.entries(MEDICAL_DATA)) {
    if (testData.aliases) {
        for (const alias of testData.aliases) {
            ALIAS_MAP[alias.toLowerCase()] = testKey;
        }
    }
    // Also map the main name
    ALIAS_MAP[testData.name.toLowerCase()] = testKey;
}

/**
 * Enhanced lookup function that checks aliases
 */
function findTestByName(testName) {
    if (!testName || typeof testName !== 'string') {
        return null;
    }

    const cleanName = testName.trim().toLowerCase();
    
    // Direct lookup
    if (MEDICAL_DATA[cleanName]) {
        return { key: cleanName, data: MEDICAL_DATA[cleanName] };
    }

    // Alias lookup
    if (ALIAS_MAP[cleanName]) {
        const testKey = ALIAS_MAP[cleanName];
        return { key: testKey, data: MEDICAL_DATA[testKey] };
    }

    return null;
}

/**
 * Get all tests in a specific category
 */
function getTestsByCategory(category) {
    const tests = {};
    for (const [key, data] of Object.entries(MEDICAL_DATA)) {
        if (data.category === category) {
            tests[key] = data;
        }
    }
    return tests;
}

/**
 * Get comprehensive test information
 */
function getTestInfo(testName) {
    const result = findTestByName(testName);
    if (result) {
        return {
            ...result.data,
            key: result.key,
            found: true
        };
    }
    return { found: false };
}

/**
 * Get statistics about the knowledge base
 */
function getKnowledgeBaseStats() {
    const categories = {};
    let totalTests = 0;
    let totalAliases = 0;

    for (const [key, data] of Object.entries(MEDICAL_DATA)) {
        totalTests++;
        if (data.aliases) {
            totalAliases += data.aliases.length;
        }
        
        const category = data.category || 'uncategorized';
        categories[category] = (categories[category] || 0) + 1;
    }

    return {
        totalTests,
        totalAliases,
        categories,
        version: "2.0.0-enhanced"
    };
}

// Maintain backward compatibility
module.exports = MEDICAL_DATA;

// Export enhanced functions as separate module
module.exports.enhanced = {
    findTestByName,
    getTestsByCategory,
    getTestInfo,
    getKnowledgeBaseStats,
    ALIAS_MAP,
    MEDICAL_DATA
};