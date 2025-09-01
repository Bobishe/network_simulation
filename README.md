# Satellite Network Topology Builder (Prototype)

This prototype uses **React 18**, **TypeScript 5** and **Vite**. It provides a simple interface with:

- Palette bar with tool buttons, including a HAPS (High Altitude Platform Station) node
- Graph canvas powered by `reactflow`
- Properties panel with a Formik form
- State management via Redux Toolkit

All data is stored in the local Redux slice `network`.

## Backend API

The `backend` directory contains a minimal **FastAPI** application that
persists network topologies in a PostgreSQL 17 database. Each topology record
includes a user supplied name, the JSON representation of the topology and the
timestamp when it was created.

### Running

1. Install dependencies:

   ```bash
   pip install -r backend/requirements.txt
   ```

2. Start the API (ensure the `DATABASE_URL` environment variable points to your
   PostgreSQL instance):

   ```bash
   uvicorn backend.main:app --reload
   ```

3. Use `POST /topologies` to save a topology and `GET /topologies` to list all
   saved entries.
