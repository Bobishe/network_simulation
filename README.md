# Satellite Network Topology Builder (Prototype)

This prototype uses **React 18**, **TypeScript 5** and **Vite** for the frontend and a **FastAPI** backend.

- Palette bar with tool buttons, including a HAPS (High Altitude Platform Station) node
- Graph canvas powered by `reactflow`
- Properties panel with a Formik form
- State management via Redux Toolkit

## Project Structure

- `frontend/` – React application
- `backend/` – FastAPI service

## Running with Docker

Ensure a PostgreSQL database is available and reachable via the `DATABASE_URL` environment variable. Then build and start both services:

```bash
docker-compose up --build
```

The frontend will be available at http://localhost:3000 and the backend at http://localhost:8000.
