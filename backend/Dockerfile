FROM python:3.12-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PORT=8080
EXPOSE 8080

# Shell form so ${PORT} is expanded at runtime (Fly sets it).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
