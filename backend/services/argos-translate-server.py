#!/usr/bin/env python3
"""
Argos Translate Server for Thai-English Translation
Provides REST API for offline translation using Argos Translate

Features:
- Thai → English translation
- English → Thai translation
- Automatic model download on startup
- Health check endpoint
- Translation statistics

Port: 5000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import argostranslate.package
import argostranslate.translate
import os
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Translation statistics
stats = {
    'total_translations': 0,
    'thai_to_english': 0,
    'english_to_thai': 0,
    'start_time': time.time()
}

def install_language_packages():
    """Install Thai-English language packages on startup"""
    logger.info("Starting language package installation...")

    try:
        # Update package index
        logger.info("Updating package index...")
        argostranslate.package.update_package_index()

        # Get available packages
        available_packages = argostranslate.package.get_available_packages()
        logger.info(f"Found {len(available_packages)} available packages")

        # Install Thai → English
        logger.info("Looking for Thai → English package...")
        th_en_package = next(
            (pkg for pkg in available_packages
             if pkg.from_code == 'th' and pkg.to_code == 'en'),
            None
        )

        if th_en_package:
            logger.info(f"Downloading Thai → English package (v{th_en_package.package_version})...")
            download_path = th_en_package.download()
            logger.info(f"Installing from {download_path}...")
            argostranslate.package.install_from_path(download_path)
            logger.info("✅ Thai → English package installed successfully")
        else:
            logger.error("❌ Thai → English package not found!")

        # Install English → Thai
        logger.info("Looking for English → Thai package...")
        en_th_package = next(
            (pkg for pkg in available_packages
             if pkg.from_code == 'en' and pkg.to_code == 'th'),
            None
        )

        if en_th_package:
            logger.info(f"Downloading English → Thai package (v{en_th_package.package_version})...")
            download_path = en_th_package.download()
            logger.info(f"Installing from {download_path}...")
            argostranslate.package.install_from_path(download_path)
            logger.info("✅ English → Thai package installed successfully")
        else:
            logger.warning("⚠️  English → Thai package not found (optional)")

        # Verify installation
        installed_languages = argostranslate.translate.get_installed_languages()
        logger.info(f"Installed languages: {[lang.code for lang in installed_languages]}")

        # Test translation
        thai_lang = next((lang for lang in installed_languages if lang.code == 'th'), None)
        en_lang = next((lang for lang in installed_languages if lang.code == 'en'), None)

        if thai_lang and en_lang:
            translation = thai_lang.get_translation(en_lang)
            if translation:
                test_text = "สวัสดี"
                result = translation.translate(test_text)
                logger.info(f"✅ Translation test: '{test_text}' → '{result}'")
            else:
                logger.error("❌ Translation model not available!")

        return True

    except Exception as e:
        logger.error(f"❌ Error installing language packages: {e}")
        import traceback
        traceback.print_exc()
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    installed_languages = argostranslate.translate.get_installed_languages()
    language_codes = [lang.code for lang in installed_languages]

    has_thai = 'th' in language_codes
    has_english = 'en' in language_codes

    return jsonify({
        'status': 'healthy' if (has_thai and has_english) else 'degraded',
        'service': 'Argos Translate Server',
        'version': '1.0.0',
        'installed_languages': language_codes,
        'thai_support': has_thai,
        'english_support': has_english,
        'uptime_seconds': int(time.time() - stats['start_time'])
    })

@app.route('/languages', methods=['GET'])
def get_languages():
    """Get list of installed languages"""
    installed_languages = argostranslate.translate.get_installed_languages()

    languages = []
    for lang in installed_languages:
        languages.append({
            'code': lang.code,
            'name': lang.name
        })

    return jsonify({
        'languages': languages,
        'count': len(languages)
    })

@app.route('/translate', methods=['POST'])
def translate():
    """
    Translate text

    Request body:
    {
        "q": "text to translate",
        "source": "th",  # optional, defaults to "th"
        "target": "en"   # optional, defaults to "en"
    }

    Response:
    {
        "translatedText": "translated text",
        "source": "th",
        "target": "en",
        "original": "original text"
    }
    """
    try:
        data = request.get_json()

        if not data or 'q' not in data:
            return jsonify({
                'error': 'Missing required parameter: q'
            }), 400

        text = data.get('q', '')
        source_code = data.get('source', 'th')
        target_code = data.get('target', 'en')

        if not text.strip():
            return jsonify({
                'translatedText': text,
                'source': source_code,
                'target': target_code,
                'original': text
            })

        # Get installed languages
        installed_languages = argostranslate.translate.get_installed_languages()

        # Find source and target languages
        source_lang = next(
            (lang for lang in installed_languages if lang.code == source_code),
            None
        )
        target_lang = next(
            (lang for lang in installed_languages if lang.code == target_code),
            None
        )

        if not source_lang:
            return jsonify({
                'error': f'Source language "{source_code}" not available'
            }), 400

        if not target_lang:
            return jsonify({
                'error': f'Target language "{target_code}" not available'
            }), 400

        # Get translation model
        translation = source_lang.get_translation(target_lang)

        if not translation:
            return jsonify({
                'error': f'No translation model available from {source_code} to {target_code}'
            }), 400

        # Translate
        start_time = time.time()
        translated_text = translation.translate(text)
        duration = time.time() - start_time

        # Update statistics
        stats['total_translations'] += 1
        if source_code == 'th' and target_code == 'en':
            stats['thai_to_english'] += 1
        elif source_code == 'en' and target_code == 'th':
            stats['english_to_thai'] += 1

        logger.info(f"Translated ({source_code}→{target_code}) in {duration:.2f}s: {text[:50]}...")

        return jsonify({
            'translatedText': translated_text,
            'source': source_code,
            'target': target_code,
            'original': text,
            'duration_seconds': round(duration, 3)
        })

    except Exception as e:
        logger.error(f"Translation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get translation statistics"""
    uptime = int(time.time() - stats['start_time'])

    return jsonify({
        'total_translations': stats['total_translations'],
        'thai_to_english': stats['thai_to_english'],
        'english_to_thai': stats['english_to_thai'],
        'uptime_seconds': uptime,
        'uptime_minutes': round(uptime / 60, 1),
        'translations_per_minute': round(stats['total_translations'] / (uptime / 60), 2) if uptime > 0 else 0
    })

@app.route('/', methods=['GET'])
def index():
    """API information"""
    return jsonify({
        'service': 'Argos Translate Server',
        'version': '1.0.0',
        'description': 'Offline translation API for Thai-English',
        'endpoints': {
            '/health': 'GET - Health check',
            '/languages': 'GET - List installed languages',
            '/translate': 'POST - Translate text',
            '/stats': 'GET - Translation statistics'
        },
        'example': {
            'url': '/translate',
            'method': 'POST',
            'body': {
                'q': 'แบบฟอร์มติดต่อลูกค้า',
                'source': 'th',
                'target': 'en'
            }
        }
    })

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Starting Argos Translate Server")
    logger.info("=" * 60)

    # Install language packages
    success = install_language_packages()

    if not success:
        logger.error("⚠️  Server starting with limited functionality")

    logger.info("=" * 60)
    logger.info("✅ Server ready on http://0.0.0.0:5000")
    logger.info("=" * 60)

    # Start Flask server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False
    )
