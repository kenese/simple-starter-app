# Interview Kickoff Template

Use this as the input brief for the interview workflow skill.

## App Description

I am in a 50 minute interview.
I need to build: Canva /Figma clone. An app for creating Documents with visual elements that can be dragged in to a canvas. Documents can be saved and multiple users can work on the same document at once.

## Feature Priority

Feature 1. Design objects
Replace the counter component with a Canvas used for adding design elements. react-konva will be used to move and resize these elements. 
Remove the connter component/tests and types.
Add a sidebar to the left of the canvas, containing objects that can be dragged in to the canvas/clicked to add them in to the canvas area. 
Design objects to support: 
- square filled (can be dragged to make a rectangle)
- square border only (can be dragged to make a rectangle)
- circle filled (can be oval) 
- circle border only (can be oval) 
- textbox that the text is editable
These elements should all be movable, rotatable and resizable with the mouse. 

Feature 2. Save Document to BE
All elements and positions of elements added to the canvas should be persisted to the backend as a “document” with a documentId. Every save should include a version number. Store 10 previous versions. We will support any number of documents so set up the types to support this. 

Feature 3. Multi documents
We now want to save and retrieve any one of several documents. Update the routing to include the id of the current document being worked on. If the route path is used (no document id) redirect to a new document id so the user can start editing this doc. At the top of the sidebar, before the elements, include a dropdown to allow the user to select which document to open, with a “new” button to create a new one. 

Feature 4. Multi user
We want to allow multi users to work on the same documents. Add the concept of user to the shared state. We won’t actually implement auth, but a session should be considered a unique user.Set up socket.io and rooms based on the specific document. Let react-query handle initial document load, and the socket can handle any subsequent updates. Saves also happen via the socket. Only initial document fetch via rest.. 
- Connect to the socket before fetching the document. 
- Buffer any updates from the socket to be applied after the document arrives. 
- Discard any socket updates for version before or equal to the rest documents versionnumber. 
When an element is “selected” for editing, it should be considered locked to other users.  


Feature 5. Multi user mouse tracking
Add user mouse tracking. Mouse position will not affect the document state, just gives the user an indication of where others mouse’s are. Use webrtc to share mouse location between peers


## Acceptance Criteria

- Features are done when all mentioned expectations are complete, tests cover those scenarios and the browser agent has check it is working, with a screen shot shared to the chat 

## Constraints

- Must keep: Existing UI and architecture unless directed by me to update
- Must use: current libraries and patterns unless explicitly asked to update
- Must avoid: Extra features or refactors without checking with me first

## Working Preferences

- Preferred sprint size: 2-5 minutes
- Verification preference: browser screenshot each sprint, tests added/updated and passing
- Communication style: brief unless asked to elaborate

## Kickoff Request

Read `ARCHITECTURE.md`, restate feature #1, propose the smallest first slice, and ask for approval before coding.