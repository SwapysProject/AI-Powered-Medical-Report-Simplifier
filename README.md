# Me## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+ (Python 3.12 was preferred as it was used)

### Installation & Setup
```bash
# 1. Install dependencies
npm install
pip install -r ocr-screening/requirements.txt

# 2. Start services (order matters!)
python start_server.py       # Terminal 1: Start Python OCR service (port 5001)
node index.js               # Terminal 2: Start Node.js API server (port 3000)

# 3. Test the main API endpoint
curl http://localhost:3000/health

# Note: Python OCR service runs internally - users only interact with Node.js API
```fier 🩺

> **AI-powered medical report processor that converts complex lab results into patient-friendly explanations with OCR support and advanced spell correction.**

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+ (Python 3.12 was used)

### Installation & Setup
```bash
# 1. Install dependencies
npm install
pip install -r ocr-screening/requirements.txt

# 2. Start services
python start_server.py       # Terminal 1 (OCR service)
node index.js               # Terminal 2 (API service)

# 3. Test
curl http://localhost:3000/health
```

## 📋 System Overview

### Core Features
- **OCR Processing**: Extract text from medical report images
- **Smart Spell Correction**: Advanced NLP-based fuzzy matching handles any typos
- **Test Normalization**: Standardize medical test names, values, and units
- **Patient Explanations**: Convert medical jargon to simple language
- **Safety Guardrails**: Prevent hallucinated results, validate all outputs

### Architecture Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     User        │───▶│   Node.js API   │───▶│  Python OCR     │
│ (POST to :3000) │    │  (Port 3000)    │    │  (Port 5001)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │◄──── OCR Text ─────────┘
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Patient-Friendly│◄───│  Knowledge Base │◄───│ NLP Processing  │
│   JSON Response │    │  (29 Tests)     │    │ & Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**User Flow:**
1. **User** → Sends request to Node.js API (localhost:3000)
2. **Node.js** → Forwards images to Python OCR service (localhost:5001) 
3. **Python** → Returns extracted text to Node.js
4. **Node.js** → Processes text, validates, explains
5. **Node.js** → Returns final JSON to user

> **Note**: Users never directly interact with the Python OCR service. All communication goes through the Node.js API.

## 🔧 API Usage

### Single Entry Point
All requests go to the **Node.js API server** on port 3000:

### Process Medical Report
```http
POST http://localhost:3000/simplify-report
Content-Type: multipart/form-data

# Image upload
image_input: <medical_report_image>

# OR text input  
text_input: "Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
```

> **Internal Flow**: Node.js automatically forwards images to Python OCR service (port 5001) and processes the results.

### Response Example
```json
{
  "tests": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": "low",
      "ref_range": {"low": 12.0, "high": 15.0}
    },
    {
      "name": "WBC", 
      "value": 11200,
      "unit": "/uL",
      "status": "high",
      "ref_range": {"low": 4000, "high": 11000}
    }
  ],
  "summary": "Low hemoglobin and high white blood cell count.",
  "explanations": [
    "Low hemoglobin may cause fatigue and weakness.",
    "High white blood cells often indicate infection or inflammation."
  ],
  "confidence": 0.92,
  "warnings": ["Status 'high' may not match value 11200 for WBC"],
  "critical_alert": {
    "message": "🚨 CRITICAL VALUES DETECTED - Seek immediate medical attention",
    "critical_tests": ["Hemoglobin"]
  },
  "processing_confidence": {
    "overall": 0.92,
    "ocr": 0.95,
    "normalization": 0.89
  },
  "test_statistics": {
    "total_tests_count": 2,
    "abnormal_tests_count": 2,
    "critical_tests_count": 1
  },
  "system_analysis": {
    "hematology": "Low hemoglobin with elevated WBC suggests possible anemia with infection"
  },
  "status": "ok_with_warnings"
}
```

**Note**: Response fields are conditional - only included when relevant:
- `warnings`: Only if validation warnings exist
- `critical_alert`: Only if critical values detected  
- `processing_confidence`: Only if enhanced parsing used
- `test_statistics`: Only if enhanced explanations available
- `system_analysis`: Only if advanced analysis performed

## 🧠 Smart Features

### Advanced Spell Correction
Uses multiple NLP algorithms to handle any spelling mistakes:

| Input Error | Corrected To | Method |
|-------------|--------------|---------|
| `Heoglobin` | `Hemoglobin` | Character transposition |
| `Glucse` | `Glucose` | Missing character |
| `WBC 11200 /uL (Hgh)` | `WBC 11200 /uL (High)` | Status normalization |
| `Hem0gl0bin` | `Hemoglobin` | OCR error correction |

### Knowledge Base
- **29 Medical Tests**: Complete reference ranges and explanations
- **Smart Aliases**: Handles abbreviations (HGB → Hemoglobin)
- **Categories**: Hematology, Chemistry, Lipid, Liver, Thyroid
- **Safety Ranges**: Critical value detection

## 🛡️ Safety & Validation

### Guardrail System
```javascript
// Prevents hallucination and validates results
✓ Validates all tests exist in original input text
✓ Checks value ranges against physical limits  
✓ Confirms test names against knowledge base (29 tests)
✓ Warns about unrealistic values or wrong units
✓ Returns "unprocessed" if hallucinated tests detected

// Example safety response for invalid input
{
  "status": "unprocessed",
  "reason": "Test 'cholesterol' not found in input text - potential hallucination"
}

// Example warning response
{
  "status": "ok_with_warnings",
  "warnings": ["Unrealistic value for glucose: 5000 mg/dL"]
}
```

## 📊 Processing Pipeline

### Step-by-Step Flow
1. **User Request** → POST to Node.js API (localhost:3000)
2. **Input Validation** → Check format and content
3. **OCR Processing** → Node.js forwards images to Python service (localhost:5001)
4. **Text Extraction** → Python returns extracted text to Node.js
5. **Spell Correction** → Fix typos using NLP algorithms  
6. **Pattern Matching** → Extract test names, values, units, status
7. **Normalization** → Standardize against knowledge base
8. **Validation** → Ensure no hallucinated results
9. **Explanation** → Generate patient-friendly summaries
10. **Response** → Return structured JSON to user

> **Architecture**: Microservices pattern with Node.js as API gateway and Python as OCR microservice.

### Confidence Scoring
- **Overall Confidence**: Combined processing reliability (0.0-1.0)
- **OCR Confidence**: Text extraction quality from images
- **Normalization Confidence**: Knowledge base matching accuracy
- **Validation Confidence**: Guardrail system reliability

## 🏥 Medical Test Support

### Supported Categories
| Category | Tests Included |
|----------|----------------|
| **Hematology** | Hemoglobin, WBC, RBC, Platelets, Hematocrit |
| **Chemistry** | Glucose, Creatinine, BUN, Sodium, Potassium |
| **Lipid Panel** | Total Cholesterol, LDL, HDL, Triglycerides |
| **Liver Function** | ALT, AST, Bilirubin, Albumin |
| **Thyroid** | TSH, T3, T4 |

### Reference Ranges
All tests include:
- Normal ranges (low/high values)
- Units standardization
- Status interpretation (normal/low/high)
- Patient-friendly explanations

## 🔍 Testing & Validation

### Quick Test
```bash
# Test with sample data (single API endpoint)
curl -X POST http://localhost:3000/simplify-report \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text_input=Hemoglobin 10.2 g/dL (Low)"

# Expected: Normalized hemoglobin test with explanation
# Note: Python OCR service is used internally by Node.js for image processing
```

### Error Handling
- **Invalid Input**: Clear error messages
- **OCR Failures**: Graceful fallback to text processing
- **Unknown Tests**: Safe rejection with confidence scoring
- **Service Errors**: Detailed error responses

## 🌐 Service Architecture

**✅ Microservices Design**
- **Frontend API**: Node.js server (port 3000) - User-facing endpoint
- **OCR Microservice**: Python server (port 5001) - Internal image processing
- **Data Processing**: Node.js handles all medical logic and validation
- **Privacy-compliant**: Medical data stays on local machine across both services

### Service Communication
```
User Request → Node.js API → Python OCR → Node.js Processing → User Response
```

Both services run **completely offline** once installed.

## 📁 Project Structure

```
medical-report-simplifier/
├── index.js                    # Main API server
├── reportParser.js            # Enhanced parsing logic
├── ocr-screening/
│   ├── start_server.py        # OCR service startup
│   ├── run_ocr.py            # PaddleOCR processing
│   └── requirements.txt       # Python dependencies
├── knowledgeBase.js           # Medical tests database (29 tests)
├── services/
│   ├── similarityMatcher.js   # NLP-based spell correction
│   ├── ocrProcessor.js        # OCR integration
│   ├── testNormalizer.js      # Test standardization
│   ├── explanationService.js  # Patient explanations
│   ├── guardrailService.js    # Safety validation
│   ├── hallucinationValidator.js # Additional validation
│   └── logger.js              # Logging system
└── package.json               # Dependencies
```

## 🎯 Problem Statement Compliance

| Requirement | Implementation | Status |
|-------------|----------------|---------|
| OCR/Text Extraction | PaddleOCR + advanced error correction | ✅ Complete |
| Test Normalization | Knowledge base + fuzzy matching | ✅ Complete |
| Plain-Language Explanations | Template-based explanations | ✅ Complete |
| No Hallucinations | Guardrail validation system | ✅ Complete |
| JSON Output Format | Structured API responses | ✅ Complete |

## 💡 Key Innovations

1. **Dynamic Spell Correction**: No hardcoded variations - handles any typo
2. **Multi-Algorithm Matching**: Combines phonetic, fuzzy, and pattern matching
3. **Medical Safety First**: Prevents adding non-existent test results
4. **Patient-Centric**: Simple explanations without medical jargon
5. **Production Ready**: Comprehensive error handling and logging

---

**Ready to process medical reports with AI-powered accuracy and safety! 🚀**