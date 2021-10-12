let p1active = true, redoTurn = false;
let ply1 = { name: "Player 1", board: null };
let ply2 = { name: "Player 2", board: null };

const currentPlayer = () => p1active ? ply1 : ply2;
const opponentPlayer = () => p1active ? ply2 : ply1;

const useName = (id='player-name-label') => {
    let docs = document.getElementsByClassName(id);
    for (let doc of docs)
        doc.innerHTML = currentPlayer().name;
}

const toggle = (id, type='block') => {
    window.getComputedStyle(document.getElementById(id)).display === 'none'
    ?   document.getElementById(id).style.display = type
    :   document.getElementById(id).style.display = 'none';
}

const switchPlayer = (msg) => {
    p1active = !p1active;
    if (!msg) msg = `${currentPlayer().name}'s turn.`;
    useName();
    modal(msg);
}

const modal = (msg) => {
    document.getElementById('modal').style.display = 'block';
    document.getElementById('modal-text').innerText = msg;
    document.getElementById('modal-submit').focus();
    return null;
}

const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
}

const hasWinner = () => {
    let ply = opponentPlayer();
    let allPlacedHit = true;
    
    rows: for (let row of ply.board) {
        for (let pos of row) {
            if(pos.placed && !pos.hit) {
                allPlacedHit = false;
                break rows;
            }
        }
    }

    return allPlacedHit;
}

const getRowPos = (id) => {
    const places = id.split('-');
    return [places[1], places[2]];
}

const getHitType = (id) => {
    const opp = p1active ? ply2 : ply1;
    const [row, pos] = getRowPos(id);
    return opp.board[row][pos].type || 'miss';
}

const getFullType = (id) => {
    switch (getHitType(id)) {
        case 'A': return 'Aircraft carrier';        
        case 'B': return 'Battleship';        
        case 'S': return 'Submarine';       
        default : return 'No ship';
    }
}

const isSink = (type) => {
    let typeHitCount = 0;
    for (let row of opponentPlayer().board) {
        for (let pos of row) {
            if (pos.type === type && pos.hit)
                typeHitCount++;
        }
    }
    switch (type) {
        case 'A': if (typeHitCount === 5) return true;
                    break;
        case 'B': if (typeHitCount === 4) return true;
                    break;
        case 'S': if (typeHitCount === 3) return true;
                    break;
        default : return false;
    }
}

const doPlayerAction = (id) => {
    const opp = p1active ? ply2 : ply1;
    const [row, pos] = getRowPos(id);
    const block = opp.board[row][pos];

    if (block.placed) {
        block.hit = true;
        if (isSink( getHitType(id) )) 
            return `${getFullType(id)} sunk! ${opp.name}'s turn!`;
        return `Hit! ${opp.name}'s turn!`;
    } else {
        block.miss = true;
        return `Miss! ${opp.name}'s turn!`;
    }
}

const alreadyAttacked = (id) => {
    const opp = p1active ? ply2 : ply1;
    const [row, pos] = getRowPos(id);
    return opp.board[row][pos].hit || opp.board[row][pos].miss;
}

const displayBoards = () => {
    let ply = currentPlayer();
    let opp = p1active ? ply2 : ply1;
    
    // Display current player's board
    let board = document.getElementById('player-board');
    for (let row=0; row < board.children.length; row++) {
        for (let pos=0; pos < board.children[row].children.length; pos++) {
            let block = board.children[row].children[pos];
            if (ply.board[row][pos].placed) {
                console.log('here')
                block.innerText = ply.board[row][pos].type;
                
                if (ply.board[row][pos].hit) {
                    block.style.backgroundColor = 'var(--med-red)';
                } else if (ply.board[row][pos].miss) {
                    block.style.backgroundColor = '#eee';
                }
            } else {
                // Reset
                block.innerText = null;
                block.style.backgroundColor = 'var(--lt-blue)';
            }
        }
    }

    // Display opponent's board from POV of current player
    board = document.getElementById('opponent-board');
    for (let row=0; row < board.children.length; row++) {
        for (let pos=0; pos < board.children[row].children.length; pos++) {
            let block = board.children[row].children[pos];
            if (opp.board[row][pos].hit) {
                block.style.backgroundColor = 'var(--med-red)';
            } else if (opp.board[row][pos].miss) {
                block.style.backgroundColor = '#eee';
            } else {
                // Reset
                block.style.backgroundColor = 'var(--lt-blue)';
            }
        }
    }
}

const nextTurn = (msg) => {
    switchPlayer(msg);
    document.getElementById('modal-submit').onclick = () => {
        useName();
        displayBoards();
        toggle('modal');
        !redoTurn && toggle('game-area', 'flex');
    }
}

const calculateScore = (ply) => {
    let hits = 0;
    for (let row of ply.board) {
        for (let pos of row) {
            if (pos.hit) hits++;
        }
    }
    return 24 - (hits * 2);
}

const startGame = () => {
    toggle('main-menu'); // Hide main menu
    nextTurn();
}

document.addEventListener('DOMContentLoaded', () => {
    useName();
});

document.getElementById('opponent-board').addEventListener('click', e => {
    e.preventDefault();
    if (alreadyAttacked(e.target.id)) {
        redoTurn = true;
        return modal('You\'ve already attacked this spot! Try again!');
    }
    redoTurn = false;

    let msg = doPlayerAction(e.target.id);
    toggle('game-area');

    if (hasWinner()) {
        modal(`${currentPlayer().name} has won! ${currentPlayer().name}'s score: ${calculateScore(currentPlayer())}
                    ${opponentPlayer().name}'s score: ${calculateScore(opponentPlayer())}`);

        // Wait for 'close'
        document.getElementById('modal-submit').onclick = () =>
            window.location.reload();
        return;
    }

    nextTurn(msg);
});

const parsePlacement = (input) => {
    let re = /\s*([ABS])\(([a-jA-J](?:[1-9]|10)-[a-jA-J](?:[1-9]|10))\);\s*/gi;
    let matches = [...input.matchAll(re)];

    // Set up player boards of 10x10 objects of placed/hit
    let board = new Array(10).fill(null).map( _ => (
        new Array(10).fill(null).map( _ => ({placed: false, hit: false, miss: false, type: null}))
    ));

    if (matches.length != 3) {
        return modal("Unable to read board placement");
    }

    const validate = (ship, length) => {
        let type;
        switch (ship)
        {
            case 'A': 
                if (length != 5) return modal("Bad aircraft carrier length");
                type = 'A';
                break;                        
            case 'B':
                if (length != 4) return modal("Bad battleship length");
                type = 'B';
                break;                      
            case 'S':
                if (length != 3) return modal("Bad submarine length");
                type = 'S';
                break;                        
            default: 
                type = null;
                console.log("Match error.");
        }
        return type;
    }

    for (let match of matches) {
        let positions = match[2].split('-');

        if (positions[0].charAt(0) === positions[1].charAt(0))
        {
            // Same row A(B1-B5);B(C6-F6);S(A10-C10);
            let length = Math.abs(positions[0].charCodeAt(1) - positions[1].charCodeAt(1)) + 1;
            let col = parseInt(positions[0].split(/\D/)[1]) - 1;
            let max = parseInt(positions[1].split(/\D/)[1]) - 1;
            let row = positions[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
 
            let type = validate(match[1].toUpperCase(), length);
            if (!type) return null;
            // Place ships on board
            while (col <= max) {
                if (board[row][col].placed) 
                    return modal('Ships can\'t overlap!');
                board[row][col].placed = true;
                board[row][col].type = type;
                col++;
            }
        } 
        else 
        {
            // Same column
            let length = Math.abs(positions[0].charCodeAt(0) - positions[1].charCodeAt(0)) + 1;
            let row = positions[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
            let max = positions[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
            let col = parseInt(positions[0].split(/\D/)[1]) - 1;

            let type = validate(match[1].toUpperCase(), length);
            if (!type) return null;

            // Place ships on board
            while (row <= max) {
                if (board[row][col].placed) 
                    return modal('Ships can\'t overlap!');
                board[row][col].placed = true;
                board[row][col].type = type;
                row++;
            }
        }
    }

    return board;
}

const submitInfo = () => {
    if (p1active) {
        // Player 1
        ply1.name = document.getElementById("player-name").value;
        ply1.board = parsePlacement(document.getElementById("player-placement").value);
        if (!ply1.board) return;
        switchPlayer();
    } else {
        // Player 2
        ply2.name = document.getElementById("player-name").value;
        ply2.board = parsePlacement(document.getElementById("player-placement").value);
        if (!ply2.board) return;
        startGame();
    }
}