cd $(dirname $BASH_SOURCE)
PORT=${API_PORT:-8000}
uvicorn app.main:app --host 0.0.0.0 --port $PORT
