import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

const DEFAULT_CHARACTERS = {
    A: ['P1', 'P2', 'H1', 'H2', 'P3'],
    B: ['P1', 'P2', 'H1', 'H2', 'P3']
};

function App(){
    const [player, setPlayer] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [availableMoves, setAvailableMoves] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [winner, setWinner] = useState(null);
    const [error, setError] = useState('');
    const [placementMode, setPlacementMode] = useState(false);

    useEffect(() =>{
        socket.on('playerId', (id) =>{
            setPlayerId(id);
        });
    
        socket.on('gameState', (state) =>{
            setGameState(state);
        });
    
        socket.on('moveHistory', (history) => {
            setMoveHistory(history);
        });
    
        socket.on('error', (message) => {
            setError(message);
            setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
        });
    
        socket.on('gameOver', ({ winner }) => {
            setWinner(winner);
        });
    
        return()=>{
            socket.off('playerId');
            socket.off('gameState');
            socket.off('moveHistory'); 
            socket.off('error');
            socket.off('gameOver');
        };
    }, []);

    const joinGame = (player)=> {
        setPlayer(player);
        socket.emit('joinGame', player);

        const characters = DEFAULT_CHARACTERS[player];
        socket.emit('placeCharacters', { player, characters });
        setPlacementMode(false);
    };
    const updateAvailableMoves = (character, row, col) =>{
        const charType = character.charAt(0);
        let moves = [];

        switch (charType) {
            case 'P':
                moves = calculatePawnMoves(row, col);
                break;
            case 'H':
                if (character === 'H1') {
                    moves = calculateHero1Moves(row, col);
                } else if (character === 'H2') {
                    moves = calculateHero2Moves(row, col);
                }
                break;
            default:
                break;
        }

        // Mirror moves for Player B
        if (player === 'B') {
            moves = moves.map(move => ({
                ...move,
                newRow: 4 - move.newRow,
                newCol: 4 - move.newCol
            }));
        }

        setAvailableMoves(moves);
    };

    const handleCellClick = (row, col) => {
        if (!gameState || !gameState.grid) return;

        // Map coordinates based on player perspective
        const [mappedRow, mappedCol] = player === 'B'
            ? [4 - row, 4 - col]
            : [row, col];

        const cellContent = gameState.grid[mappedRow][mappedCol];

        if(cellContent && cellContent.startsWith(`${player}-`)){
            const character = cellContent.split('-')[1];
            setSelectedCharacter(character);
            updateAvailableMoves(character, mappedRow, mappedCol);
        }else if(selectedCharacter) {
            const [validationRow, validationCol] = player === 'B' ? [row, col] : [row, col];
            const moveDirection = availableMoves.find(move => move.newRow === validationRow && move.newCol === validationCol);

            if(moveDirection){
                const [emitRow, emitCol] = player === 'B'
                    ? [4 - validationRow, 4 - validationCol]
                    : [validationRow, validationCol];

                socket.emit('makeMove', { player, character: selectedCharacter, newRow: emitRow, newCol: emitCol });
                setSelectedCharacter(null);
                setAvailableMoves([]);
            }
        }
    };

    const calculatePawnMoves = (row, col) =>{
        const moves = [];
        if (row > 0) moves.push({ move: 'F', newRow: row - 1, newCol: col });
        if (row < 4) moves.push({ move: 'B', newRow: row + 1, newCol: col });
        if (col > 0) moves.push({ move: 'L', newRow: row, newCol: col - 1 });
        if (col < 4) moves.push({ move: 'R', newRow: row, newCol: col + 1 });
        return moves;
    };

    const calculateHero1Moves = (row, col) => {
        const moves = [];
        if (row > 1) moves.push({ move: 'F2', newRow: row - 2, newCol: col });
        if (row < 3) moves.push({ move: 'B2', newRow: row + 2, newCol: col });
        if (col > 1) moves.push({ move: 'L2', newRow: row, newCol: col - 2 });
        if (col < 3) moves.push({ move: 'R2', newRow: row, newCol: col + 2 });
        return moves;
    };

    const calculateHero2Moves = (row, col) => {
        const moves = [];
        if (row > 1 && col > 1) moves.push({ move: 'FL', newRow: row - 2, newCol: col - 2 });
        if (row > 1 && col < 3) moves.push({ move: 'FR', newRow: row - 2, newCol: col + 2 });
        if (row < 3 && col > 1) moves.push({ move: 'BL', newRow: row + 2, newCol: col - 2 });
        if (row < 3 && col < 3) moves.push({ move: 'BR', newRow: row + 2, newCol: col + 2 });
        return moves;
    };

    const getMirroredGrid = (grid) => {
        if (!grid) return grid;

        return grid.map(row => row.slice().reverse()).reverse();
    };

    const displayGrid = () => {
        if (player === 'B') {
            return getMirroredGrid(gameState.grid);
        }
        return gameState.grid;
    };

    const restartGame = () => {
        setPlayer(null);
        setPlayerId(null);
        setGameState(null);
        setSelectedCharacter(null);
        setAvailableMoves([]);
        setMoveHistory([]);
        setWinner(null);
        setError('');
        setPlacementMode(false);

        socket.emit('restartGame');

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        for (const key in DEFAULT_CHARACTERS) {
            if (DEFAULT_CHARACTERS.hasOwnProperty(key)) {
                shuffleArray(DEFAULT_CHARACTERS[key]);
            }
        }

        setMoveHistory([]);
    };

    const mirrorMove = (move) => {
        switch (move) {
            case 'F':
                return 'B';
            case 'B':
                return 'F';
            case 'L':
                return 'R';
            case 'R':
                return 'L';
            case 'F2':
                return 'B2';
            case 'B2':
                return 'F2';
            case 'L2':
                return 'R2';
            case 'R2':
                return 'L2';
            case 'FL':
                return 'BR';
            case 'FR':
                return 'BL';
            case 'BL':
                return 'FR';
            case 'BR':
                return 'FL';
            default:
                return move;
        }
    };

    const getPieceClass = (cell) => {
        if (!cell) return '';
    
        const [cellPlayer, cellCharacter] = cell.split('-');
        let pieceClass = '';
    
        if (cellPlayer === 'A' && player === 'A') {
            pieceClass = 'playerA';
            if (cellCharacter === selectedCharacter) {
                pieceClass += ' selected';
            }
        } else if (cellPlayer === 'B' && player === 'B') {
            pieceClass = 'playerB';
            if (cellCharacter === selectedCharacter) {
                pieceClass += ' selected';
            }
        }
    
        return pieceClass;
    };

    return (
        <div className="App">
            {!player && (
                <div className="joinGame">
                    <h1>Join Game</h1>
                    <button onClick={() => joinGame('A')}>Join as Player A</button>
                    <button onClick={() => joinGame('B')}>Join as Player B</button>
                    <code>Note that join as a player A in one tab or browser and player B in another tab or browser</code>
                </div>
            )}

            {player && !placementMode && gameState && (
                <div className="gameContainer">
                    <div className="game-board-card">
                        <h2>Game Board (Player {player})</h2>
                    </div>
              
                    {winner ? (
                        <div>
                            <h2>
                                <span style={{ color: 'green' }}>Player {winner} wins!</span>
                            </h2>
                            <button onClick={restartGame}>Restart Game</button>
                        </div>
                    ) : (
                        <div>
                            <h2>Current Turn: Player {gameState.players && gameState.players[player] && gameState.players[player].isTurn ? player : player === 'A' ? 'B' : 'A'}</h2>
                            <button onClick={restartGame}>Restart Game</button>
                        </div>
                    )}

                    {error && <div className="error">{error}</div>}

                    <div className="grid"  style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 60px)', gap: '5px', margin: '20px auto', maxWidth: '300px' }}>
                        {displayGrid().map((row, rowIndex) =>
                            row.map((cell, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`cell ${getPieceClass(cell)}`}
                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                >
                                    {cell}
                                </div>
                            ))
                        )}
                    </div>

                    {availableMoves.length > 0 && (
                        <div className="controls">
                            <h3>Available Moves</h3>
                            <div className="moveButtons">
                                {availableMoves.map((move, index) => (
                                    <button key={`${move.newRow}-${move.newCol}-${index}`} onClick={() => handleCellClick(move.newRow, move.newCol)}>
                                        { player === "B" ? mirrorMove(move.move) : move.move}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="moveHistory">
                        <h3>Move History</h3>
                        <ul>
                            {moveHistory.map((move, index) => (
                                <li key={index}>
                                    Player {move.player}: {move.character} to ({move.newRow + 1}, {move.newCol + 1})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;