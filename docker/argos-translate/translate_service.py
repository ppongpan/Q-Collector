#!/usr/bin/env python3
"""
Argos Translate FastAPI Service
Provides HTTP API for Thai→English translation

Author: Q-Collector Team
Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import argostranslate.translate
import argostranslate.package
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Argos Translate Service",
    description="Thai-English translation service for Q-Collector",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
installed_languages = None
th_en_translation = None
translation_stats = {
    "total_requests": 0,
    "total_characters": 0,
    "average_time_ms": 0,
    "errors": 0
}

@app.on_event("startup")
async def startup_event():
    """Initialize translation models on startup"""
    global installed_languages, th_en_translation

    logger.info("🚀 Starting Argos Translate Service...")

    try:
        # Get installed languages
        installed_languages = argostranslate.translate.get_installed_languages()
        logger.info(f"📚 Found {len(installed_languages)} installed languages")

        # Get Thai→English translation
        th_lang = next((l for l in installed_languages if l.code == 'th'), None)
        en_lang = next((l for l in installed_languages if l.code == 'en'), None)

        if th_lang and en_lang:
            th_en_translation = th_lang.get_translation(en_lang)
            logger.info("✅ Thai→English translation model loaded successfully")

            # Test translation
            test_text = "สวัสดี"
            test_result = th_en_translation.translate(test_text)
            logger.info(f"🧪 Test translation: '{test_text}' → '{test_result}'")
        else:
            error_msg = f"❌ Translation model not available. th_lang={th_lang}, en_lang={en_lang}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        logger.info("✅ Argos Translate Service ready!")

    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        raise

class TranslateRequest(BaseModel):
    """Translation request model"""
    text: str = Field(..., description="Text to translate", min_length=1, max_length=1000)
    from_lang: str = Field(default="th", description="Source language code")
    to_lang: str = Field(default="en", description="Target language code")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "แบบฟอร์มบันทึกข้อมูล",
                "from_lang": "th",
                "to_lang": "en"
            }
        }

class TranslateResponse(BaseModel):
    """Translation response model"""
    original: str
    translated: str
    from_lang: str
    to_lang: str
    success: bool
    characters: int
    time_ms: float

class BatchTranslateRequest(BaseModel):
    """Batch translation request"""
    texts: List[str] = Field(..., description="List of texts to translate", max_length=100)
    from_lang: str = Field(default="th", description="Source language code")
    to_lang: str = Field(default="en", description="Target language code")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    languages: List[str]
    stats: dict

@app.get("/", tags=["Info"])
async def root():
    """Root endpoint"""
    return {
        "service": "Argos Translate",
        "version": "1.0.0",
        "description": "Thai-English translation service for Q-Collector",
        "endpoints": {
            "health": "/health",
            "translate": "/translate (POST)",
            "batch": "/translate/batch (POST)",
            "stats": "/stats",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint

    Returns service status and statistics
    """
    return {
        "status": "healthy" if th_en_translation else "unhealthy",
        "model_loaded": th_en_translation is not None,
        "languages": [l.code for l in installed_languages] if installed_languages else [],
        "stats": translation_stats
    }

@app.get("/stats", tags=["Stats"])
async def get_stats():
    """Get translation statistics"""
    return {
        "stats": translation_stats,
        "model_info": {
            "source": "th",
            "target": "en",
            "loaded": th_en_translation is not None
        }
    }

@app.post("/translate", response_model=TranslateResponse, tags=["Translation"])
async def translate(request: TranslateRequest):
    """
    Translate text from Thai to English

    **Example Request:**
    ```json
    {
        "text": "แบบฟอร์มบันทึกข้อมูล",
        "from_lang": "th",
        "to_lang": "en"
    }
    ```

    **Example Response:**
    ```json
    {
        "original": "แบบฟอร์มบันทึกข้อมูล",
        "translated": "Data Recording Form",
        "from_lang": "th",
        "to_lang": "en",
        "success": true,
        "characters": 20,
        "time_ms": 245.5
    }
    ```
    """

    if not th_en_translation:
        raise HTTPException(
            status_code=503,
            detail="Translation model not loaded. Service unavailable."
        )

    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    try:
        # Record start time
        start_time = time.time()

        # Perform translation
        logger.info(f"📝 Translating: '{request.text[:50]}...'")
        translated_text = th_en_translation.translate(request.text)

        # Calculate elapsed time
        elapsed_ms = (time.time() - start_time) * 1000

        # Update stats
        translation_stats["total_requests"] += 1
        translation_stats["total_characters"] += len(request.text)

        # Update average time (running average)
        prev_avg = translation_stats["average_time_ms"]
        total_requests = translation_stats["total_requests"]
        translation_stats["average_time_ms"] = (
            (prev_avg * (total_requests - 1) + elapsed_ms) / total_requests
        )

        logger.info(f"✅ Translated in {elapsed_ms:.1f}ms: '{translated_text[:50]}...'")

        return TranslateResponse(
            original=request.text,
            translated=translated_text,
            from_lang=request.from_lang,
            to_lang=request.to_lang,
            success=True,
            characters=len(request.text),
            time_ms=round(elapsed_ms, 2)
        )

    except Exception as e:
        translation_stats["errors"] += 1
        logger.error(f"❌ Translation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )

@app.post("/translate/batch", tags=["Translation"])
async def translate_batch(request: BatchTranslateRequest):
    """
    Translate multiple texts at once

    **Example Request:**
    ```json
    {
        "texts": [
            "แบบฟอร์มบันทึกข้อมูล",
            "ชื่อเต็ม",
            "เบอร์โทรศัพท์"
        ]
    }
    ```

    **Returns:** List of translations in same order
    """

    if not th_en_translation:
        raise HTTPException(
            status_code=503,
            detail="Translation model not loaded"
        )

    if len(request.texts) > 100:
        raise HTTPException(
            status_code=400,
            detail="Batch size too large (max 100 texts)"
        )

    try:
        start_time = time.time()

        logger.info(f"📝 Batch translating {len(request.texts)} texts...")

        translated = []
        for text in request.texts:
            if text and text.strip():
                result = th_en_translation.translate(text)
                translated.append(result)
                translation_stats["total_characters"] += len(text)
            else:
                translated.append("")

        elapsed_ms = (time.time() - start_time) * 1000
        translation_stats["total_requests"] += len(request.texts)

        logger.info(f"✅ Batch translated in {elapsed_ms:.1f}ms")

        return {
            "count": len(request.texts),
            "originals": request.texts,
            "translated": translated,
            "success": True,
            "total_time_ms": round(elapsed_ms, 2),
            "avg_time_per_text_ms": round(elapsed_ms / len(request.texts), 2)
        }

    except Exception as e:
        translation_stats["errors"] += len(request.texts)
        logger.error(f"❌ Batch translation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch translation failed: {str(e)}"
        )

@app.post("/reset-stats", tags=["Stats"])
async def reset_stats():
    """Reset translation statistics"""
    global translation_stats
    translation_stats = {
        "total_requests": 0,
        "total_characters": 0,
        "average_time_ms": 0,
        "errors": 0
    }
    logger.info("📊 Statistics reset")
    return {"message": "Statistics reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8765,
        log_level="info"
    )
