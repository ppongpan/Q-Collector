FROM python:3.11-slim

LABEL maintainer="Q-Collector Team"
LABEL description="Argos Translate Service for Thai-English translation"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    argostranslate==1.9.1 \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    requests==2.31.0

# Download and install Thai-English translation models
RUN python3 -c "\
import argostranslate.package; \
argostranslate.package.update_package_index(); \
available = argostranslate.package.get_available_packages(); \
pkg = next((p for p in available if p.from_code == 'th' and p.to_code == 'en'), None); \
if pkg: \
    print(f'Downloading {pkg.package_name}...'); \
    path = pkg.download(); \
    print(f'Installing from {path}...'); \
    argostranslate.package.install_from_path(path); \
    print('✅ Thai-English model installed successfully'); \
else: \
    print('❌ Thai-English model not found'); \
    exit(1)"

# Create app directory
WORKDIR /app

# Copy application code
COPY translate_service.py .
COPY requirements.txt .

# Install any additional requirements
RUN pip install --no-cache-dir -r requirements.txt || true

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

# Run the service
CMD ["uvicorn", "translate_service:app", "--host", "0.0.0.0", "--port", "8765", "--log-level", "info"]
