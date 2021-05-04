/**
 * ----------------------------------------------
 *    =====    PROJET D'INGENIERIE S2    =====
 * ----------------------------------------------
 *  Jeu de dames dans le cadre de notre projet
 *  du 2ème semestre.
 * 
 */


//------------------------------------------------------------ Constantes

// 1 => IA // 2 => PvP

const nbDeJoueurs = 1;
const iaTurn = Math.floor(Math.random() * 2);


// Plateau
const BoardColors = ["#FFF", "#000", "#ffb703"]; // White & Black & Gray
const CheckersColors = ["#F00", "#00F", "#ffb703"]; // Red & Blue & Gold
const SCALE = Math.floor(window.innerHeight / 10); // adapt scale to window

// Pieces
const Pieces = {
    white : 2,
    black : 3,
    queen : 4
};
/**
 * Il y a 4 différentes valeur pour une pièce (toutes != 0).
 * On regarde leur représentation binaire sur 3 bits.
 * 
 *   white         = 2 || 010
 *   black         = 3 || 011
 *   white | queen = 6 || 110
 *   black | queen = 7 || 111
 * 
 * On a donc une représentation binaire de la forme :
 *   (Bit d'état) + (Bit anti 0) + (Bit d'équipe)
 */

// Fonctions utiles
const bet = (n, m, M) => (n >= m && n <= M);
const valid = (n) => (bet(n, 0, 9));
const inside = (arr, elem) => {
    return arr.length ? arr.includes(elem) : false;
};
const normalize = (x) => (Math.floor(x / SCALE));
const remove = (arr, elem) => {
    for (let i = 0 ; i < arr.length ; i++) {
        if (arr[i] == elem) {
            arr.splice(i, 1);
        }
    }
    return arr;
};
// fast intersect : https://stackoverflow.com/a/37041756
const intersect = (a, b) => {
    let setB = new Set(b);
    return [...new Set(a)].filter(x => setB.has(x));
};

// Fonction de conversion des coordonnées d'un click en indice du tableau
const clickToIndex = (x, y) => {return (x+y) % 2 ? (x - x % 2) / 2 + 5 * y : null;};

// On précalcule les mouvments pour gagner du temps
var datas = precomputeData();
const MoveMap = datas.move;
const NumberSquaresToBorder = datas.num;
const SquaresBetween = datas.between;
delete datas;

function precomputeData() {
    // create table of nearby squares
    let moves = [];
    for (let i = 0 ; i < 50 ; i++) {
        let lineValue = Math.floor(i / 5) % 2;
        let nw = i - 5 - lineValue;
        let ne = i - 4 - lineValue;
        let sw = i + 5 - lineValue;
        let se = i + 6 - lineValue;
        moves.push([
            (nw >= 0 && Math.floor(nw / 5) % 2 != lineValue) ? nw : null,
            (ne >= 0 && Math.floor(ne / 5) % 2 != lineValue) ? ne : null,
            (sw <= 49 && Math.floor(sw / 5) % 2 != lineValue) ? sw : null,
            (se <= 49 && Math.floor(se / 5) % 2 != lineValue) ? se : null
        ]);
    }

    // create table of number of squares to border
    let numbers = [];
    for (let i = 0 ; i < 50 ; i++) {
        let arr = [];
        for (let j = 0 ; j < 4 ; j++) {
            let k = -1;
            let old = i;
            while (old !== null) {
                k++;
                old = moves[old][j];
            }
            arr.push(k);
        }
        numbers.push(arr);
    }

    // create 3d table of squares indexes between two squares
    let betweens = {};
    for (let i = 0 ; i < 50 ; i++) {
        betweens[i] = {};
        for (let j = 0 ; j < 4 ; j++) {
            let arr = [];
            let old = i;
            for (let n = 0 ; n < numbers[i][j] ; n++) {
                old = moves[old][j];
                arr.push(old);
            }
            for (let k = 1 ; k < arr.length ; k++) {
                betweens[i][arr[k]] = arr.slice(0, k);
            }
        }
    }

    return {
        move : moves,
        num : numbers,
        between : betweens
    };
}


//------------------------------------------------------------ Variables de Jeu

var turn = 0; // White to move
var isHolding = 0;
var pieceEating = -1;
var oldPosition;
var mostRecentMove = -1;
var piecesToBeEaten = [];

// Board with beginning position
var board = [
    ...Array(20).fill(Pieces.black),
    ...Array(10).fill(0),
    ...Array(20).fill(Pieces.white)
]; 

// Keeping track of pieces position
var blackPieces = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
var whitePieces = [30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49];

//------------------------------------------------------------ p5 functions

function setup() {
    createCanvas(SCALE * 10, SCALE * 10);
}

function draw() {
    if (nbDeJoueurs === 1 && turn === iaTurn) {
        ia()
    }

    drawBoard();
    if (isHolding) {
        drawPiece(mouseX, mouseY, isHolding);
    }
}

//------------------------------------------------------------ Draw functions

function drawBoard() {
    let k = 0;
    
    // Get valid moves
    let valid = validMoves();

    // display board
    for (let i = 0 ; i < 10 ; i++) {
        for (let j = 0 ; j < 10 ; j++) {
            // display most recent move
            if (mostRecentMove === -1) {
                fill(BoardColors[(i+j) % 2]);
            } else {
                if ((((mostRecentMove >> 6) === k) || ((mostRecentMove & 63) === k)) && (i+j) % 2) {
                    fill(BoardColors[2]);
                } else {
                    fill(BoardColors[(i+j) % 2]);
                }
            }
            rect(j * SCALE, i * SCALE, SCALE, SCALE);

            // display possible moves when a piece is picked
            if (inside(valid, oldPosition | (k << 6)) && (i+j) % 2) {
                push();
                noFill();
                strokeWeight(5);
                stroke("hotpink");
                ellipse(j*SCALE + SCALE/2, i*SCALE + SCALE/2, SCALE*0.75);
                pop();
            }

            // display pieces that can move if not in hand
            if (inside(valid.map(x => x & 63), k) && (i+j) % 2 && k !== oldPosition) {
                push();
                noFill();
                strokeWeight(5);
                stroke("white");
                ellipse(j*SCALE + SCALE/2, i*SCALE + SCALE/2, SCALE*0.75);
                pop();
            }

            // Draw current state of board
            if ((i+j) % 2) {
                if (board[k] && k !== oldPosition) {
                    drawPiece(j*SCALE + SCALE/2, i*SCALE + SCALE/2, board[k]);
                }
                k++;
            }
        }
    }

    if (!valid.length) {
        let toBlit;
        if (turn) {
            toBlit = "Victoire des\nBlancs";
            if (nbDeJoueurs === 1 && turn !== iaTurn) {
                toBlit += " (IA)";
            } else {
                toBlit += " (Joueur)";
            }
        } else {
            toBlit = "Victoire des\nNoirs";
            if (nbDeJoueurs === 1 && turn !== iaTurn) {
                toBlit += " (IA)";
            } else {
                toBlit += " (Joueur)";
            }
        }
        push();
        fill(CheckersColors[2]);
        stroke(0);
        strokeWeight(3);
        rectMode(CENTER);
        textSize(SCALE*(2/3));
        textAlign(CENTER, CENTER);
        text(toBlit, SCALE*5, SCALE*5);
        pop();
    }
}

function drawPiece(x, y, piece) {
    // Draw regular one
    fill(CheckersColors[piece & 1]);
    ellipse(x, y, SCALE*0.75);

    if (piece & Pieces.queen) {
        // Draw crown
        push();
        fill(CheckersColors[2]);
        beginShape();
        vertex(x - SCALE*0.2, y + SCALE*0.2);
        vertex(x - SCALE*0.25, y - SCALE*0.2);
        vertex(x - SCALE*0.11, y - SCALE*0.03);
        vertex(x, y - SCALE*0.23);
        vertex(x + SCALE*0.11, y - SCALE*0.03);
        vertex(x + SCALE*0.25, y - SCALE*0.2);
        vertex(x + SCALE*0.2, y + SCALE*0.2);
        endShape(CLOSE);
        pop();
    }
}

//------------------------------------------------------------ Drag and drop function

function mousePressed() {
    // normalize coordinates
    let mx = normalize(mouseX);
    let my = normalize(mouseY);
    if (valid(mx) && valid(my)) { // && !turn) {
        // pick piece
        let index = clickToIndex(mx, my);
        if (index !== null && board[index] % 2 === turn) {
            isHolding = board[index];
            oldPosition = index;
        }
    }
}

function mouseReleased() {
    // normalize coordinates
    let mx = normalize(mouseX);
    let my = normalize(mouseY);
    let index = clickToIndex(mx, my);

    // drop piece on position chosen if valid, else get put back to old place
    if (isHolding && valid(mx) && valid(my) && inside(validMoves(), oldPosition | (index << 6))) {
        movePiece(isHolding, oldPosition, index);
        isHolding = 0;
    } else {
        board[oldPosition] = isHolding;
        isHolding = 0;
    }
    oldPosition = -1;
}

//------------------------------------------------------------ DEBUGGING functions

/**
 *  Change state of board
 *  LEFT ARROW => put black material
 *  RIGHT ARROW => put white material
 *  UP ARROW => Queen/no queen
 * 
 *  DEL => REMOVE EVERYTHING FROM BOARD
 *  BACKSPACE => REMOVE THE PIECE
 * 
 *  T => CHANGE TURN
 * 
 */

function keyPressed() {
    let mx = normalize(mouseX);
    let my = normalize(mouseY);
    let index = clickToIndex(mx, my);

    if (keyCode == 84) {
        turn = 1 - turn;
    }
    else if (keyCode == DELETE) {
        board = Array(50).fill(0);
        whitePieces = [];
        blackPieces = [];
    }
    else if (valid(mx) && valid(my) && index !== null)
    {
        if (keyCode == LEFT_ARROW) {
            board[index] = Pieces.black;
            remove(whitePieces, index);
            remove(blackPieces, index);
            blackPieces.push(index);
        }
        if (keyCode == RIGHT_ARROW) {
            board[index] = Pieces.white;
            remove(whitePieces, index);
            remove(blackPieces, index);
            whitePieces.push(index);
        }
        if (keyCode == UP_ARROW && board[index]) {
            board[index] ^= Pieces.queen;
        }
        if (keyCode == BACKSPACE && board[index]) {
            board[index] = 0;
            remove(whitePieces, index);
            remove(blackPieces, index);
        }
    }
}

//------------------------------------------------------------ Game functions

// Calculate nth move in a direction
const slide = (start, dir, number) => {
    if (number > 1) {
        return slide(MoveMap[start][dir], dir, number - 1);
    } else {
        return MoveMap[start][dir];
    }
}

// Get all valid moves
function validMoves(inMultiple = false) {
    let positions = (turn ? blackPieces : whitePieces);
    let pseudoLegalMoves = [];
    let eatingMoves = [];
    // quick check of moves
    for (let i = 0 ; i < positions.length ; i++) {
        if (pieceEating !== -1 && positions[i] !== pieceEating) {
            continue;
        }
        for (let j = 0 ; j < 4 ; j++) {
            
            // Look in all directions toward number of squares available
            for (let n = 1 ; n <= NumberSquaresToBorder[positions[i]][j] ; n++) {

                // compute move
                let target = slide(positions[i], j, n);

                if (!board[target]) {
                    // noone there
                    pseudoLegalMoves.push(positions[i] | (target << 6));
                } else {
                    // oh no, there's someone
                    if (board[target] % 2 === (1 - turn) && !inside(piecesToBeEaten, target)) {
                        for (let m = 1 ; m <= NumberSquaresToBorder[target][j] ; m++) {
                            // compute square index behind the guy
                            let jump = slide(positions[i], j, n + m);
                            if (!board[jump]) {
                                eatingMoves.push(positions[i] | (jump << 6));
                            } else {
                                break;
                            }
                            // restrain to one move if not queen
                            if (!(board[positions[i]] & Pieces.queen)) {
                                break;
                            }
                        }
                    }
                    break;
                }
                // restrain to one move if not queen
                if (!(board[positions[i]] & Pieces.queen)) {
                    break;
                }
            }
        }
    }

    if (eatingMoves.length) {
        // treat multiple eating
        if (inMultiple) {
            return eatingMoves;
        } else {
            return multipleEating(eatingMoves);
        }
    } else {
        // treat non-forward moves for non-queen pieces
        let legalMoves = [];
        for (let i = 0 ; i < pseudoLegalMoves.length ; i++) {
            if (turn) {
                if (board[pseudoLegalMoves[i] & 63] & Pieces.queen || (pseudoLegalMoves[i] & 63) < (pseudoLegalMoves[i] >> 6)) {
                    legalMoves.push(pseudoLegalMoves[i]);
                }
            } else {
                if (board[pseudoLegalMoves[i] & 63] & Pieces.queen || (pseudoLegalMoves[i] & 63) > (pseudoLegalMoves[i] >> 6)) {
                    legalMoves.push(pseudoLegalMoves[i]);
                }
            }
        }
        return legalMoves;
    }
}

function multipleEating(moves, first=true) {
    /**
     * Function that allow to find the moves that eat the biggest amout of material
     * Which is a rule that we must respect
     */
    // Initialize counting table
    let counts = [];
    
    // Save the current/emulated state of the board
    let boardSave = [...board];
    let whiteSave = [...whitePieces];
    let blackSave = [...blackPieces];
    let turnSave = turn;
    let piecesToBeEatenSave = [...piecesToBeEaten];
    let pieceEatingSave = pieceEating;

    // loop through eating moves
    for (let i = 0 ; i < moves.length ; i++) {
        // start counting
        let count = 1;
        movePiece(board[moves[i] & 63], moves[i] & 63, moves[i] >> 6, true);
        // continue if necessary
        if (canEat(moves[i] >> 6)) {
            count += multipleEating(validMoves(true), false);
        }
        // final count thanks to recursivity
        counts.push(count);

        // restore state of board
        board = [...boardSave];
        whitePieces = [...whiteSave];
        blackPieces = [...blackSave];
        turn = turnSave;
        piecesToBeEaten = [...piecesToBeEatenSave];
        pieceEating = pieceEatingSave;
    }

    // return depend on from where you arrived
    if (first) {
        // take moves with the maximum of eating potential (must-do moves)
        let legalMoves = [];
        let max = Math.max(...counts);
        for (let i = 0 ; i < moves.length ; i++) {
            if (counts[i] == max) {
                legalMoves.push(moves[i]);
            }
        }
        return legalMoves;
    } else {
        // return the maximum eating potential of the move before
        return Math.max(...counts);
    }
}

function canEat(position) {
    // quick check of moves (same code as above but with returns)
    for (let j = 0 ; j < 4 ; j++) {
        for (let n = 1 ; n <= NumberSquaresToBorder[position][j] ; n++) {
            let target = slide(position, j, n);
            if (board[target]) {
                if (board[target] % 2 === (1 - turn) && !inside(piecesToBeEaten, target)) {
                    for (let m = 1 ; m <= NumberSquaresToBorder[target][j] ; m++) {
                        let jump = slide(position, j, n + m);
                        if (!board[jump]) {
                            return true;
                        } else {
                            break;
                        }
                    }
                }
                break;
            }
            if (!(board[position] & Pieces.queen)) {
                break;
            }
        }
    }
    return false;
}

function movePiece(piece, start, target, emulate = false) {
    // keep track if has eaten or not in order to change turn or not
    let hasEaten = false;

    // change positions known
    if (turn) {
        if (canEat(start)) {
            // add piece to the to-be-eaten ones
            piecesToBeEaten.push(intersect(SquaresBetween[start][target], whitePieces)[0]);
            hasEaten = true;
            pieceEating = target;
        }
        for (let i = 0 ; i < blackPieces.length ; i++) {
            if (blackPieces[i] == start) {
                blackPieces[i] = target;
                break;
            }
        }
    } else {
        if (canEat(start)) {
            // add piece to the to-be-eaten ones
            piecesToBeEaten.push(intersect(SquaresBetween[start][target], blackPieces)[0]);
            hasEaten = true;
            pieceEating = target;
        }
        for (let i = 0 ; i < whitePieces.length ; i++) {
            if (whitePieces[i] == start) {
                whitePieces[i] = target;
                break;
            }
        }
    }
    // move piece on the board
    board[target] = piece;
    board[start] = 0;

    // refresh most recent move
    if (!emulate) {
        mostRecentMove = start | (target << 6);
    }

    // handle multiple eating
    if (!hasEaten || !canEat(target)) {
        for (disappear of piecesToBeEaten) {
            if (turn) {
                remove(whitePieces, disappear);
            } else {
                remove(blackPieces, disappear);
            }
            board[disappear] = 0;
        }
        if (turn) {
            if (target > 44) {
                board[target] |= Pieces.queen;
            }
        } else {
            if (target < 5) {
                board[target] |= Pieces.queen;
            }
        }
        piecesToBeEaten = [];
        pieceEating = -1;
        turn = 1 - turn;
    }
}

//------------------------------------------------------------ AI functions

const ia = pickRandom;

// RANDOM IA

function pickRandom() {
    // Simple "AI" that picks a random possible move, not a good player tbh
    let valid = validMoves();
    if (valid.length) { // avoid creating a piece and making a phantom move
        let randomMove = valid[Math.floor(Math.random() * valid.length)];
        movePiece(board[randomMove & 63], randomMove & 63, randomMove >> 6);
    }
}