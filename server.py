from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
from googletrans import Translator
import os
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure CORS properly

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize EasyOCR and Translator
reader = easyocr.Reader(['en'])
translator = Translator()

@app.route('/test', methods=['GET'])
def test_connection():
    return jsonify({'status': 'Server is running'}), 200


@app.route('/process', methods=['POST'])
def process_image():
    try:
        logger.info("Received image processing request")
        
        # Check if an image is uploaded
        if 'image' not in request.files:
            logger.error("No image file in request")
            return jsonify({'error': 'No image provided'}), 400

        # Get the uploaded image and the target language
        image = request.files['image']
        target_language = request.form.get('language', 'en')
        
        logger.info(f"Processing image for language: {target_language}")

        # Validate the image file
        if not image.filename:
            logger.error("Empty filename")
            return jsonify({'error': 'Invalid image file'}), 400

        # Create temp directory if it doesn't exist
        os.makedirs("temp", exist_ok=True)
        
        # Save the image temporarily with a secure filename
        image_path = os.path.join("temp", image.filename)
        image.save(image_path)
        
        logger.info(f"Image saved temporarily at: {image_path}")

        # Perform OCR to extract text
        try:
            results = reader.readtext(image_path)
            extracted_text = ' '.join([text[1] for text in results])
            logger.info(f"Extracted text: {extracted_text}")
            
            if not extracted_text:
                return jsonify({'error': 'No text detected in image'}), 400
                
        except Exception as e:
            logger.error(f"OCR failed: {str(e)}")
            return jsonify({'error': f'OCR failed: {str(e)}'}), 500
        finally:
            # Clean up the temporary file
            if os.path.exists(image_path):
                os.remove(image_path)

        # Translate the extracted text
        try:
            translated = translator.translate(extracted_text, dest=target_language)
            translated_text = translated.text
            logger.info(f"Translated text: {translated_text}")
            
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            return jsonify({'error': f'Translation failed: {str(e)}'}), 500

        return jsonify({
            'extracted_text': extracted_text,
            'translated_text': translated_text,
            'source_language': translated.src,
            'target_language': target_language
        })

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    # Run the server on all available network interfaces
  app.run(host='0.0.0.0', port=5000, debug=True)