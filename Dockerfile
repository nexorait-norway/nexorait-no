FROM python:3.12-slim
WORKDIR /app
COPY . /app
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "billing.atomic_receiver"]
