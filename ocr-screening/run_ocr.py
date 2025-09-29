from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import os
import tempfile
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)

# Initialize PaddleOCR with determined working settings
print("✓ Initializing OCR engine...")
ocr = PaddleOCR(lang='en', use_textline_orientation=False, use_doc_orientation_classify=False, use_doc_unwarping=False)
print("✓ OCR ready")

# Directory to save visualized OCR results from the predict API
output_dir = 'ocr_output_predict'
os.makedirs(output_dir, exist_ok=True) # Create output directory if it doesn't exist

# Temporary directory for uploaded images
temp_dir = 'temp_uploads'
os.makedirs(temp_dir, exist_ok=True)

def process_ocr_image(image_path):
    """Process an image using OCR and return extracted text."""
    prediction_results = ocr.predict(image_path)

    if prediction_results:
        all_extracted_texts = []
        
        for i, res_obj in enumerate(prediction_results):
            item_text = None
            if hasattr(res_obj, 'json') and isinstance(res_obj.json, dict):
                json_data = res_obj.json
                if 'res' in json_data and isinstance(json_data['res'], dict):
                    res_content = json_data['res']
                    if 'rec_texts' in res_content and isinstance(res_content['rec_texts'], list):
                        meaningful_texts = [text for text in res_content['rec_texts'] if isinstance(text, str) and text.strip()]
                        if meaningful_texts:
                            item_text = "\n".join(meaningful_texts)
            
            if item_text:
                all_extracted_texts.append(item_text)

            # Save visualization quietly
            if hasattr(res_obj, 'save_to_img'):
                try:
                    res_obj.save_to_img(output_dir)
                except Exception:
                    pass  # Silently continue if visualization fails
            
        if all_extracted_texts:
            extracted_text = "\n---\n".join(all_extracted_texts)
            return extracted_text
        else:
            return ""
    else:
        return ""

@app.route('/ocr', methods=['POST'])
def perform_ocr():
    """API endpoint to perform OCR on uploaded images."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400

    temp_file_path = None
    try:
        # Generate a unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        temp_file_path = os.path.join(temp_dir, filename)
        
        # Save and process the file
        file.save(temp_file_path)
        extracted_text = process_ocr_image(temp_file_path)
        
        if extracted_text:
            return jsonify({"text": extracted_text, "status": "success"})
        else:
            return jsonify({"text": "", "status": "no_text_found"})

    except Exception as e:
        return jsonify({"error": "OCR processing failed", "details": str(e)}), 500
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass  # Silently ignore cleanup errors

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)

