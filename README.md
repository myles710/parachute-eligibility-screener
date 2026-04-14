# Parachute Plasma Donor Eligibility Screener

An AI-powered conversational eligibility screener for plasma donation centers, 
built with React, Vite, and the Anthropic Claude API.

Donors answer natural language questions and receive a clear 
Eligible / Deferred / Call Center verdict based on FDA eligibility criteria.

## Stack
React · Vite · Claude API · Cursor

## Prerequisites
- Node.js 20.19+ or 22+ ([download here](https://nodejs.org))
- An Anthropic API key ([get one here](https://console.anthropic.com))

## Setup & Run

1. Clone the repo
   git clone https://github.com/myles710/parachute-eligibility-screener.git
   cd parachute-eligibility-screener

2. Install dependencies
   npm install

3. Create a .env file in the project root
   VITE_ANTHROPIC_API_KEY=your_api_key_here

4. Start the dev server
   npx vite

5. Open your browser to http://localhost:5173

## Updating Eligibility Rules
All FDA eligibility rules are defined in a single plain-English system prompt 
at the top of src/parachute-eligibility-chatbot.jsx in the SYSTEM_PROMPT constant.
To update a rule — for example if a deferral period changes — edit that value 
and save. The dev server hot-reloads instantly with no redeployment needed.

## Note
This is a pre-screening tool only. Final eligibility is always determined 
at the donation center by trained staff.

