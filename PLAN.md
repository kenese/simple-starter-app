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
5. [x] Feature 5 - Multi User Mouse Tracking (WebRTC cursor positions)

## Active Sprint
- Feature: Feature 5 - Multi User Mouse Tracking
- Status: completed
- Plan:
  - Shared: CursorPosition, SDPPayload, ICEPayload types; WebRTC signaling events on SocketClientEvents/SocketServerEvents
  - Server: userId→socketId map, relay webrtc-offer/answer/ice-candidate between peers, cleanup on disconnect
  - Web: useWebRTC hook manages RTCPeerConnection per peer, data channels for cursor broadcast, throttled at 50ms
  - Store: remoteCursors array with setRemoteCursor/removeRemoteCursor/clearRemoteCursors actions
  - Canvas: onMouseMove on Stage broadcasts cursor position; RemoteCursors overlay renders colored SVG arrows with userId labels
  - Socket.io remains for document operations; WebRTC used only for ephemeral cursor positions
- Verification: 80 unit tests passing (25 server, 55 web), 26 E2E tests passing, lint clean
- Notes: Existing users initiate WebRTC offers to new joiners. Data channels are peer-to-peer so cursor data never hits the server. Cursors auto-remove on peer disconnect.

## Next Step
- All features complete. Ready for review.
