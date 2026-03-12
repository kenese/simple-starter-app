# Interview Plan

## Context
- Goal: Build a Canva/Figma clone — canvas-based document editor with shapes, persistence, multi-doc, multi-user, and cursor tracking
- Source brief: INTERVIEW_PROMPT.md
- Last updated: 2026-03-12

## Feature Sprints
1. [x] Feature 1 - Design Objects (Canvas + Sidebar + Shapes)
2. [x] Feature 2 - Save Document to BE (persist canvas state with versioning)
3. [x] Feature 3 - Multi Documents (routing, doc switching, new doc)
4. [x] Feature 4 - Multi User (socket.io, rooms, locking, real-time sync)
5. [ ] Feature 5 - Multi User Mouse Tracking (WebRTC cursor positions)

## Active Sprint
- Feature: Feature 4 - Multi User
- Status: completed
- Plan:
  - Shared: SocketClientEvents, SocketServerEvents, ElementLock types
  - Server: socket.io with rooms per document, save/lock/unlock/join/leave events, broadcasts to room, auto-unlock on disconnect
  - Web: useSocket hook with version-gated buffering, save via socket, lock/unlock on select/deselect
  - Store: userId (session UUID), locks array, documentReady flag, isLockedByOther/getLockOwner helpers
  - Canvas: locked elements show amber dashed border, can't be selected/dragged by other users
  - REST GET remains for initial document load; all subsequent saves via socket
- Verification: 26 tests passing (10 server, 16 web), lint clean
- Notes: Each browser tab = unique user (session UUID). To test multi-user, open same doc URL in two tabs.

## Next Step
- Begin Feature 5: Multi User Mouse Tracking (WebRTC cursor positions)
