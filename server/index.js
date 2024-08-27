const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
const logger = require('./logger');

app.use((err, req, res, next) => {
    logger.error('Server error:', { message: err.message, stack: err.stack });
    res.status(500).json({ message: 'Internal Server Error' });
});

let gameState = initializeGameState();

function initializeGameState() {
    return {
        grid: Array(5).fill(null).map(() => Array(5).fill(null)),
        players: {
            A: { characters: [], isTurn: true, socketId: null, pawns: 0, heroes: 0 },
            B: { characters: [], isTurn: false, socketId: null, pawns: 0, heroes: 0 }
        },
        playerIds: {}
    };
}

function findCharacterPosition(player, character) {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (gameState.grid[i][j] === `${player}-${character}`) {
                return { row: i, col: j };
            }
        }
    }
    return null;
}

function moveCharacter(player, character, newRow, newCol) {
    const position = findCharacterPosition(player, character);
    if (position) {
        gameState.grid[position.row][position.col] = null;
        gameState.grid[newRow][newCol] = `${player}-${character}`;
    }
}

const checkAndRemoveCharactersInPath = (fromRow, fromCol, toRow, toCol, character) => {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    //calculate the step for row and column increments
    let stepRow = rowDiff!== 0 ? rowDiff/Math.abs(rowDiff) : 0;
    let stepCol = colDiff!==0 ? colDiff/Math.abs(colDiff) : 0;

    // Initialize current position
    let row = fromRow;
    let col = fromCol;

    console.log(`Initial row: ${row}, col: ${col}`);
    console.log(`Target row: ${toRow}, col: ${toCol}`);

    while(row !== toRow || col !== toCol){
        //check if row and col are within valid grid boundary
        if(row < 0 || row >= gameState.grid.length || col < 0 || col >= gameState.grid[0].length){
            console.log('Out of bounds');
            break;
        }

        row += stepRow;
        col += stepCol;

        console.log(`Updated row: ${row}, col: ${col}`);
        console.log("character: " + character);

        const target = gameState.grid[Math.round(row)][Math.round(col)]; //Use math.round to avoid floating point issues

        console.log(`Target: ${target}`);

        if(target && target.split('-')[0] !== character.split('-')[0]){
            const opponent = target.split('-')[0];
            console.log("Opponent: " + opponent);
            const opponentCharacter = target.split('-')[1];
            console.log("Opponent Character: " + opponentCharacter);

            if(opponentCharacter.startsWith('P')){
                gameState.players[opponent].pawns--;
            }else if(opponentCharacter.startsWith('H')){
                gameState.players[opponent].heroes--;
            }

            gameState.grid[Math.round(row)][Math.round(col)] = null;
            gameState.players[opponent].characters = gameState.players[opponent].characters.filter(c => c !== opponentCharacter);
        }
    }

    console.log("Player A Pawns: " + gameState.players['A'].pawns);
    console.log("Player A Heroes: " + gameState.players['A'].heroes);
    console.log("Player B Pawns: " + gameState.players['B'].pawns);
    console.log("Player B Heroes: " + gameState.players['B'].heroes);

    //check if any player has lost all pawns and heroes
    if (gameState.players['A'].pawns === 0 && gameState.players['A'].heroes === 0) return 'B'; //B wins
    if (gameState.players['B'].pawns === 0 && gameState.players['B'].heroes === 0) return 'A'; //A wins

    return null;
};

let moveHistory = [];

function processMove(player, character, newRow, newCol) {
    console.log(`Processing move for ${player}-${character} to (${newRow}, ${newCol})`);

    if (!gameState.players[player].isTurn) {
        console.log('Error: Not your turn');
        return { error: 'Not your turn' };
    }

    const position = findCharacterPosition(player, character);
    if (!position) {
        console.log('Error: Character not found');
        return { error: 'Character not found' };
    }

    const { row, col } = position;
    const target = gameState.grid[newRow][newCol];

    // Check if move is within the boundary
    if (newRow < 0 || newRow >= 5 || newCol < 0 || newCol >= 5) {
        console.log('Error: Move out of bounds');
        return { error: 'Move out of bounds' };
    }

    // Ensure no skipping over other characters - like if the difference is more than 2 steps
    if (Math.abs(newRow - row) > 2 || Math.abs(newCol - col) > 2) {
        console.log('Error: Cannot skip over other characters');
        return { error: 'Cannot skip over other characters' };
    }

    const charType = character.charAt(0);
    let validMove = false;

    switch (charType) {
        case 'P': 
            validMove = (Math.abs(newRow - row) === 1 && col === newCol) || (row === newRow && Math.abs(newCol - col) === 1);
            break;
        case 'H':
            if (character === 'H1') {
                validMove = (Math.abs(newRow - row) === 2 && col === newCol) || (row === newRow && Math.abs(newNewCol - col) === 2);
            } else if (character === 'H2') {
                validMove = Math.abs(newRow - row) === 2 && Math.abs(newCol - col) === 2;
            }
            break;
        default:
            console.log('Error: Unknown character type');
            return {error: 'Unknown character type'};
    }

    if (!validMove) {
        console.log(`Error: Invalid move for ${charType}`);
        return {error: `Invalid move for ${charType}`};
    }

    const winner = checkAndRemoveCharactersInPath(row, col, newRow, newCol, `${player}-${character}`);

    if (target && target[0] === player) {
        console.log('Error: Invalid move: cannot move onto your own character');
        return {error: 'Invalid move: cannot move onto your own character'};
    }

    if (target && target[0] !== player) {
        const opponent = target[0];
        const opponentCharacter = target.split('-')[1];
        gameState.players[opponent].characters = gameState.players[opponent].characters.filter(c => c !== opponentCharacter);
    }

    moveCharacter(player, character, newRow, newCol);
    console.log('Move is successful');

    // Add the move to history
    moveHistory.push({ player, character, newRow, newCol });
    io.emit('moveHistory', moveHistory);

    if (winner) {
        io.emit('gameOver', { winner: winner });
        gameState = initializeGameState();  // Reset the game state after the game over
        moveHistory = []; // Clear move history after game over
        console.log(`Game Over and Winner is ${winner}`);
        return { winner: winner };
    }

    gameState.players[player].isTurn = false;
    gameState.players[player === 'A' ? 'B' : 'A'].isTurn = true;

    return { success: true };
}



function placeCharactersOnBoard(player, characters) {
    characters.forEach((character, index) => {
        const row = player === 'A' ? 4 : 0; //Player A's characters are placed on the last row, Player B's on the first row - this is for player A
        gameState.grid[row][index] = `${player}-${character}`;
        if (character.startsWith('P')) {
            gameState.players[player].pawns++;
        } else if (character.startsWith('H')) {
            gameState.players[player].heroes++;
        }
    });
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGame', (player) => {
        if(!gameState.players[player]){
            socket.emit('error', `Invalid player: ${player}`);
            return;
        }

        if(gameState.players[player].socketId){
            socket.emit('error', `Player ${player} is already in the game`);
            return;
        }
        
        socket.player = player;
        const id = uuidv4();
        gameState.playerIds[socket.id] = id;
        gameState.players[player].socketId = socket.id;
        console.log(`Player ${player} joined the game with ID ${id}`);
        socket.emit('playerId', id);
        socket.emit('gameState', gameState);
        socket.broadcast.emit('playerJoined', player);
    });

    socket.on('placeCharacters', (data) => {
        const { player, characters } = data;

        if (!gameState.players[player]) {
            socket.emit('error', `Invalid player: ${player}`);
            return;
        }

        gameState.players[player].characters = characters;
        placeCharactersOnBoard(player, characters);

        io.emit('gameState', gameState);
    });

    socket.on('makeMove', (data) => {
        const { player, character, newRow, newCol } = data;

        if (!gameState.players[player]) {
            socket.emit('error', `Invalid player: ${player}`);
            return;
        }

        const result = processMove(player, character, newRow, newCol);

        if (result.error) {
            socket.emit('error', result.error);
        } else if (result.winner) {
            io.emit('gameOver', { winner: result.winner });
            moveHistory = [];
            gameState = initializeGameState();  //reset the game state after the game over
            io.emit('gameState', gameState);
        } else {
            io.emit('gameState', gameState);
        }
    });

    socket.on('restartGame', () => {
        gameState = initializeGameState(); //reset the game state
        moveHistory = []; //clear the move history
        io.emit('gameState', gameState); //notify all clients about the reset
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const player = socket.player;
        if (player && gameState.players[player]) {
            gameState.players[player].socketId = null;
        }
        delete gameState.playerIds[socket.id];
    });
});

server.listen(3001, () => {
    console.log('Server is running on port 3001');
});

