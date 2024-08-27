# Turn-Based Chess-Like Game

## Overview

This project is a turn-based, chess-like game that utilizes real-time websocket communication. The game is designed for two players: Player A and Player B, who connect through a websocket. The objective is to eliminate all the opponent's pawns and heroes. All operations occur in real time, providing a dynamic and engaging experience.

## Components

### 1. Server
- *Language*: Node.js, Express.js
- *Purpose*: The server handles the core game logic, processes requests from the clients (Player A and Player B), and maintains the game state while providing appropriate responses.

### 2. Websocket Layer
- *Function*: Manages real-time communication between the client and server, handling events such as game initialization, moves, and notification updates.

### 3. Client
- *Technologies Used*: React.js
- *Purpose*: The client provides the user interface and interacts with the server through the websocket layer.

## How to Set Up the Game

Follow these steps to set up and run the game on your local machine:

### 1. Clone the Repository
First, clone this repository to your local machine:
```bash
git clone <Repo-link>
```

### 2. Set Up the Server
- Navigate to the server folder and install the necessary packages:
```bash
cd server
npm install express cors nodemon winston-daily-rotate-file socket.io
```

- Start the server by running:
```bash
npm start
```
or
```bash
nodemon index.js
```

### 3. Set Up the Client
- Navigate to the client directory from Home directory:
```bash
cd client
npm install react react-dom socket.io-client axios
```

- Start the client by running:
```bash
npm start
```

### 4. Access the Game
Open the local host link provided in your terminal after starting the client.

### 5. Start Playing
Open two tabs in your web browser with the same local host link. Join as Player A from one tab and Player B from the other tab.

### Enjoy the game!
