# BLAST - Code Challenge

This project parses and visualizes data from a real competitive CS:GO match.
It was built as part of the BLAST match analysis code challenge.

The solution includes both a backend for parsing and aggregating match data,
and a frontend for visualizing the match summary and statistics.

---

## Features

### Backend
- Parses raw match log data
- Extracts structured events (rounds, kills, bomb events, team sides)
- Derives match statistics:
  - Round outcomes
  - Scoreboard progression
  - Player kills, deaths and K/D
  - Average active round length
- Exposes data via a simple API

### Frontend
- Match summary UI inspired by BLAST styling
- Round-by-round visual timeline
- Team tables with player statistics
- Clear separation of components and data logic

---

## Project Structure
server/   – Node.js + TypeScript backend (log parsing & API)
web/      – React + TypeScript frontend (visualization)

---

## Running Project Locally
Open two terminals.

### Backend
cd server
npm install
npm run dev

### Frontend
cd web
npm install
npm run dev