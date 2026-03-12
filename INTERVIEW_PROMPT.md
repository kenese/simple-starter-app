# Interview Kickoff Prompt

Paste this into a new Antigravity conversation after cloning your starter repo.
Replace `[APP DESCRIPTION]` and `[FEATURES]` with what the interview asks for.

---

## The Prompt

```
Read the ARCHITECTURE.md file in this project first — it describes the starter app architecture.

I'm in a 50-minute timed interview. I need to build [APP DESCRIPTION] using this starter app as a base. The app needs to support multiple users in real-time.

## Features to build (in priority order):
1. [FEATURE 1 - most important, show value first]
2. [FEATURE 2]
3. [FEATURE 3]
4. [FEATURE N - nice to have, may not get to]

## How I want to work:

CRITICAL RULES:
- Work in SHORT SPRINTS (2-5 minutes of coding max per sprint)
- After each sprint, use the browser subagent to verify the feature visually
- Show me a screenshot after each sprint so I can confirm before moving on
- If something breaks, fix it immediately — don't move to the next feature
- Build the SIMPLEST working version of each feature first, polish later
- Update AppState in packages/shared first, then server, then frontend

WORKFLOW FOR EACH FEATURE:
1. Tell me briefly what you're about to build (1-2 sentences)
2. Update shared types (AppState, events) if needed
3. Update server handlers if needed
4. Build the frontend UI
5. Use browser subagent to verify — show me a screenshot
6. If it works → ask if we should move to next feature. If not → fix it.
7. When I have confirmed a feature is done, add tests and documentation.

DON'T:
- Don't spend time on perfect code architecture
- Don't build features I didn't ask for
- Don't refactor existing code unless it's blocking a feature
- Don't write long explanations — show me working code
- Don't create elaborate plans — just build

DO:
- Keep the dark theme and existing design tokens from index.css
- Keep the topnav layout
- Use Zustand for all client state
- Use the existing API client pattern for new features
- Show progress visually as early as possible

Start by reading GEMINI.md, then tell me your plan for feature #1 in 2-3 sentences, and build it.
```

---

## Example: Trello Board

```
Read the GEMINI.md file in this project first — it describes the starter app architecture.

I'm in a 50-minute timed interview. I need to build a multi-user Trello-style kanban board. Multiple users should see each other's changes in real-time.

## Features to build (in priority order):
1. Display 3 columns (To Do, In Progress, Done) with cards
2. Add new cards to any column
3. Drag and drop cards between columns
4. Real-time sync — cards appear/move for all users
5. Card editing (title, description)
6. Nice to have: user avatars on cards, card colors

## How I want to work:
## How I want to work:

CRITICAL RULES:
- Work in SHORT SPRINTS (2-5 minutes of coding max per sprint)
- After each sprint, use the browser subagent to verify the feature visually
- Show me a screenshot after each sprint so I can confirm before moving on
- If something breaks, fix it immediately — don't move to the next feature
- Build the SIMPLEST working version of each feature first, polish later
- Update AppState in packages/shared first, then server, then frontend

WORKFLOW FOR EACH FEATURE:
1. Tell me briefly what you're about to build (1-2 sentences)
2. Update shared types (AppState, events) if needed
3. Update server handlers if needed
4. Build the frontend UI
5. Use browser subagent to verify — show me a screenshot
6. If it works → move to next feature. If not → fix it.

DON'T:
- Don't spend time on perfect code architecture
- Don't build features I didn't ask for
- Don't refactor existing code unless it's blocking a feature
- Don't write long explanations — show me working code
- Don't create elaborate plans — just build

DO:
- Keep the dark theme and existing design tokens from index.css
- Keep the sidebar/topnav layout (adapt labels as needed)
- Use the existing useSocket hook pattern for new real-time features
- Use Zustand for all client state
- Show progress visually as early as possible

Start by reading GEMINI.md, then tell me your plan for feature #1 in 2-3 sentences, and build it.
```

## Example: Recipe App

```
Read the GEMINI.md file in this project first — it describes the starter app architecture.

I'm in a 50-minute timed interview. I need to build a collaborative recipe management app. Multiple users should be able to add and organize recipes together in real-time.

## Features to build (in priority order):
1. Display a list of recipes with title and category tags
2. Add new recipes with title, ingredients, and steps
3. Filter/search recipes by name or category
4. Real-time sync — new recipes appear for all users
5. Edit existing recipes
6. Nice to have: favorite/bookmark recipes, categories sidebar

## How I want to work:
[...same rules as above...]
```
