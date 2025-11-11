FROM python:3.13-slim

WORKDIR /gpss-api

COPY . .
COPY requirements.txt .
COPY start.sh .
RUN pip install --no-cache-dir -r ./requirements.txt

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["bash", "./start.sh"]
