#!/usr/bin/env python3
"""
Startup script for the OCR Screening Service.
This script ensures all dependencies are available and starts the Flask server.
"""

import sys
import subprocess
import os

def check_dependencies():
    """Check if required Python packages are installed."""
    required_imports = [
        ('flask', 'Flask'),
        ('paddleocr', 'PaddleOCR'), 
        ('paddle', 'PaddlePaddle')
    ]
    
    missing_packages = []
    
    for import_name, display_name in required_imports:
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append((import_name, display_name))
            print(f"✗ Missing: {display_name}")
    
    if missing_packages:
        print("Install missing packages with: pip install -r requirements.txt")
        return False
    
    return True

def main():
    print("Starting OCR service...")
    
    if not check_dependencies():
        sys.exit(1)
    
    print("✓ Dependencies OK")
    print("✓ OCR service starting on http://localhost:5001")
    
    try:
        from run_ocr import app
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        print("\nService stopped.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()