/******************
**SETUP/VARIABLES**
*******************/
import { gameplays } from './gameplays.js';

const gamePlayNum = Math.round(Math.random() * gameplays.length);
const currentGamePlay = gameplays[gamePlayNum];
const { spanGram, validWords, prompt } = currentGamePlay;

// Set grid size
const numRows = 8;
const numCols = 6;

// Grid div element
const gridHTML = document.getElementById("grid");
// Map word -> array of [row, col] placement
let wordPaths = {};
// Track segments that have been placed to avoid intersections
let placedSegments = [];

// Keep track of whether user is dragging/swiping
let isDragging = false;
// Keep track of whether user has been dragging/swiping
let hasDragged = false;
let dragStartX = 0;
let dragStartY = 0;
const dragThreshold = 10;
// Store letters that have been selected
let selectedCells = [];
// Keep track of current word
let selectedWord = "";

/*******************
**HELPER FUNCTIONS**
********************/

// Helper function to check if cells are adjacent
function isAdjacent(cell1, cell2) {
    // Get row/col coordinates
    const row1 = cell1.dataset.row;
    const col1 = cell1.dataset.col;
    const row2 = cell2.dataset.row;
    const col2 = cell2.dataset.col;
    
    // Get distance in rows and columns
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    
    const isAdjacent = (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    
    return isAdjacent;
}

// Determine if three points are in a counterclockwise order
// Compute the signed area of the triangle formed by the points
// Positive area -> CCW
// Negative area -> CW
// Zero area -> No turn (colinear)
function ccw(p1, p2, p3) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
}

// Check if two segments AB and CD intersect
// Check if C and D are on opposite sides of AB
// and if A and B are on opposites sides of CD
// If both are true, the segments intersect
function segmentsIntersect(a, b, c, d) {
    return (
        ccw(a, c, d) !== ccw(b, c, d) && // C and D are on opposite sides of AB
        ccw(a, b, c) !== ccw(a, b, d)    // A and B are on opposite sides of CD
    );
}

// Get the coordinates for the center of the cell based on row/col positions
function getVirtualCellCenter(row, col) {
    const x = col + 0.5;
    const y = row + 0.5;
    return { x, y };
}

// Ensure spangram spans the board
function spansAcrossBoard(path) {
    //Define rows and columns
    const rows = path.map(p => p[0]);
    const cols = path.map(p => p[1]);
    
    // Check which bounadries are included
    const touchesTop = rows.includes(0);
    const touchesBottom = rows.includes(numRows - 1);
    const touchesLeft = cols.includes(0);
    const touchesRight = cols.includes(numCols - 1)
    
    return ((touchesTop && touchesBottom) || (touchesLeft && touchesRight));
}

/**************
**CREATE GRID**
***************/

// Create an empty row x cols 2D array
function createEmptyGrid(rows, cols) {
    return Array.from({ length: rows }, () => 
        Array.from({ length: cols}, () => null)
    );
}

// Create a div element with class "cell" and an index
function createCell(letter, row, col) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = letter;
    cell.dataset.row = row;
    cell.dataset.col = col;
    return cell
}

// Shuffle letters in-place using Fisher-Yates algorithm
function shuffle(array) {
    // Start at the end of the array and work backwards
    for (let i = array.length -1; i > 0; i--) {
        // Get a random position (j) between 0 and i (inclusive)
        const j = Math.floor(Math.random() * (i + 1));
        // Swap the element at i with the element at j
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Get the neighbors of a given cell
function getNeighbors(row, col, grid) {
    // Initialize blank array
    const neighbors = [];
    // Check all 8 directions around the cell using delta row/col
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            // Skip the actual cell
            if (dr === 0 && dc === 0) continue;
            //Next position to move onto
            const newRow = row + dr;
            const newCol = col + dc;
            // Push to neighbors if a valid cell is null
            if(
                newRow >= 0 && newRow < grid.length &&
                newCol >= 0 && newCol < grid[0].length &&
                grid[newRow][newCol] === null
            ) {
                neighbors.push([newRow, newCol]);
            }
        }
    }
    return neighbors
}

// Use DFS search with backtracking at the word level
function dfsPlaceWord(grid, word, row, col, index, path) {
    // Stop once word is placed
    if (index === word.length) return true;
    
    // Get available neighbors
    const neighbors = getNeighbors(row, col, grid);
    // Get prevoiously placed cell
    const prev = [row, col];
    
    // Iterate through each neighbor
    for (const [r, c] of neighbors) {
        // Check if neighboring cell is empty
        if (grid[r][c] === null) {
            // Get line segment of last placed cell to current cell
            const newSegment = [prev, [r, c]]
            // Convert segment endpoints to (x, y) screen coords
            const p1 = getVirtualCellCenter(...newSegment[0]);
            const p2 = getVirtualCellCenter(...newSegment[1]);
            // Check that cells exist
            if (!p1 || !p2) continue;
            
            //Assume lines do not intersect to initialize
            let crosses = false;
            
            // Iterate through placed segments to check for potential intersections
            for (const [endpoint1, endpoint2] of placedSegments) {
                // Convert segment endpoints to (x, y) screen coords
                const startCoords = getVirtualCellCenter(...endpoint1);
                const endCoords = getVirtualCellCenter(...endpoint2);
                // Check if segments intersect
                if (segmentsIntersect(p1, p2, startCoords, endCoords)) {
                    crosses = true;
                    break;
                }
            }
            
            // If segments intersect do not place
            if (crosses) continue;
            
            // Fill in the next letter and store the path
            grid[r][c] = word[index];
            path.push([r, c]);
            placedSegments.push(newSegment);
            
            //Recursively try to place the rest of the word
            if (dfsPlaceWord(grid, word, r, c, index + 1, path)) return true;
            
            //Backtrack if recursive call fails by undoing placement and removing path
            grid[r][c] = null;
            path.pop();
            placedSegments.pop();
        }
    }
    // Return false is unable to place word
    return false;
}

// Place an individual word using DFS recursively
function placeWord(grid, word, mustSpan = false) {
    //Create a 2D positions array
    const positions = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            positions.push([r, c]);
        }
    }
    
    // Shuffle positions
    shuffle(positions);
    
    // Iterate through shuffled positions
    for (const [r, c] of positions) {
        // If a cell is available, start placing the word
        if(grid[r][c] === null) {
            // Place the first letter
            grid[r][c] = word[0];
            // Store the first cell in the path
            const path = [[r, c]];
            // Recusrively place the rest of the cells
            if (dfsPlaceWord(grid, word, r, c, 1, path)) {
                // Ensure spangram actually spans and undo if not
                if (mustSpan && !spansAcrossBoard(path)) {
                    // Clear cells that were just placed
                    path.forEach(([r, c]) => grid[r][c] = null);
                    placedSegments.splice(placedSegments.length - (word.length - 1));
                    continue;
                }
                // Save path and return true
                wordPaths[word] = path.slice();
                return true;
            }
            
            // If unable to place word, undo placement and move on
            grid[r][c] = null;
        }
    }
    // Return false if unable to place word
    return false;
}

// Attempt to place all words once
function placeAllWords(grid, words) {
    // Iterate through words
    for (const word of words) {
        // Return false if a word can't be placed
        if (!placeWord(grid, word, word === spanGram)) {
            return false;
        }
    }
    // Return true once words are all placed
    return true;
}

// Generate a valid grid using algorithm
function generateValidGrid(maxAttempts = 1000) {
    validWords.push(spanGram);
    for (let i = 0; i < maxAttempts; i++) {
        // Reset placed segments on each attempt
        placedSegments = [];
        
        // Create a grid
        const grid = createEmptyGrid(numRows, numCols);
        
        // Place in length order to reduce conflicts
        const blueWordsSorted = [...validWords].sort((a,b) => b.length - a.length);
        
        // Add spangram and move to front to ensure first placement
        const validWordsSorted = [
            ...blueWordsSorted.filter(word => word === spanGram),
            ...blueWordsSorted.filter(word => word !== spanGram)
        ]
        
        // Attempt to place words using placeAllWords
        if(placeAllWords(grid, validWordsSorted)) {
            console.log(`Succesfully placed all words in ${i} attempts`);
            return grid;
        } 
    }
    throw new Error(`Failed to place all words after ${maxAttempts} attempts`);
}

// Create a cell on the DOM for each letter in the grid
function createGrid(grid) {
    // Iterate through each cell
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Get the letter at the specified position
            const letter = grid[row][col];
            // Append to the DOM
            gridHTML.appendChild(createCell(letter, row, col));
        }
    }
    const todaysPrompt = document.getElementById("prompt");
    todaysPrompt.innerText = prompt;
}

// Setup game board
const grid = generateValidGrid();
createGrid(grid);
resetSelection();
updateBannerText("\n");

/*********************
**GAMEPLAY FUNCTIONS**
**********************/

// Mark a cell/letter as selected
function selectCell(cell) {
    //Ensure it is not already selected
    if (selectedCells.includes(cell)) {
        return
    }
    
    // Only check adjacency if not the first selection
    if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        // Ignore non-adjacent selections
        if (!isAdjacent(lastCell, cell)) return;
    }
    
    cell.classList.add("selected");
    selectedCells.push(cell);
    drawLinesBetweenCells(selectedCells);
}

// Check if the input the user has entered is the correct path for a word
function isSelectionValid(selection) {
    // Get coords
    const selectedCoords = selection.map(cell => [
        Number(cell.dataset.row),
        Number(cell.dataset.col)
    ]);
    
    // Iterate through coordinates of words
    for (const [word, path] of Object.entries(wordPaths)) {
        // Skip comparing words that are not the same length as the user selection
        if (path.length !== selectedCoords.length) continue;
        let match = true;
        
        // Check if each set of coords match
        for (let i = 0; i < path.length; i++) {
            if (path[i][0] !== selectedCoords[i][0] || path[i][1] !== selectedCoords[i][1]) {
                match = false;
                break;
            }
        }
        
        // Return true if all letters match
        if (match) return true;
    }
    // Else return false
    return false;
}

// Remove lines between all incorrect cells
function removeLines() {
    // Get line layer
    const svg = document.getElementById("line-layer");
    // Remove each one
    Array.from(svg.children).forEach(line => {
        if (!line.classList.contains("confirmed-line")) {
            svg.removeChild(line);
        }
    });
}

// Reset current selection of cells/letters
function resetSelection() {
    // De-select all incorrect cells
    selectedCells.forEach( cell => {
        if (!cell.classList.contains("confirmed")) {
            cell.classList.remove("selected");
        }
    });
    
   removeLines();
    
    // Reset selection variables
    selectedCells = [];
    selectedWord = "";
}

// Update the text in the top banner
function updateBannerText(message) {
    // Display message for 2 seconds
    document.getElementById("message").innerText = message;
    setTimeout(() => {
        // Set back to blank
        document.getElementById("message").innerText = "\n";
    }, 2000)
    
}

// Handle guesses to check for correct words
function handleGuess() {
    //Join all selected cells into an overall word
    selectedWord = selectedCells.map(cell => cell.textContent).join('');
    //Check if guess is valid and correct
    if (validWords.includes(selectedWord) && isSelectionValid(selectedCells)) {
        const isSpanGram = selectedWord === spanGram;
        // Display banner text
        updateBannerText("Correct");
        
        // Mark correct word cells permanently
        selectedCells.forEach(cell => {
            cell.classList.add("confirmed");
            if (isSpanGram) {
                cell.classList.add("spangram");
            }
        })
        drawLinesBetweenCells(selectedCells, true, isSpanGram);
        
    } else {
        // Display banner text
        updateBannerText("Incorrect");
    }
    resetSelection();
}

// Draw lines between cells
function drawLinesBetweenCells(cells, permanent = false, isSpangram = false) {
    // Get line layer and coordinates as JS element
    const svg = document.getElementById("line-layer");
    const svgRect = svg.getBoundingClientRect();
    
    for (let i = 0; i < cells.length - 1; i++) {
        // Get cooridnates of origin and destination cells
        const origin = cells[i].getBoundingClientRect();
        const dest = cells[i+1].getBoundingClientRect();
        
        // Calculate centers
        const x1 = origin.left + origin.width / 2 - svgRect.left;
        const y1 = origin.top + origin.height / 2 - svgRect.top;
        const x2 = dest.left + dest.width / 2 - svgRect.left;
        const y2 = dest.top + dest.height / 2 - svgRect.top;
        
        // SVG namespace
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        // Translate to SVG layer coordinates
        line.setAttribute("x1", x1);
        line.setAttribute("x2", x2);
        line.setAttribute("y1", y1);
        line.setAttribute("y2", y2);
        
        if (permanent) {
            line.classList.add("confirmed-line");
            if (isSpangram) {
                line.classList.add("spangram-line");
            }
        }
        console.log("Line classes:", line.className.baseVal);
        // Add to SVG layer
        svg.appendChild(line);
    }
}

/*****************
**INPUT HANDLERS**
******************/

// Pointer down event listener
gridHTML.addEventListener("pointerdown", (e) => {
    //Ignore clicks outside of the grid
   if (!e.target.classList.contains("cell")) {
       return;
   }
    // Note that the user is holding down
    isDragging = true;
    // Reset drag status
    hasDragged = false;
    
    // Keep track of dragging
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});

// Pointer movement event listener
gridHTML.addEventListener("pointermove", (e) => {
    // Ignore if the user isn't holding down or on the grid
    if (!isDragging || !e.target.classList.contains("cell")) return;
    
    // Calculate distance moved in drag
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only register drag after threshold to prevent small movements
    if (distance < dragThreshold) return;
    
    if(!selectedCells.includes(e.target) && distance >= dragThreshold) {
        //Select the cell the user moves over
        selectCell(e.target);
        // Note the user has been dragging
        hasDragged = true;
    }
});

// Pointer up event listener
gridHTML.addEventListener("pointerup", () => {
    isDragging = false;
    // Only finalize guess if they are done dragging (ignore clicks)
    if (hasDragged) {
        handleGuess();
    }
    
    // Indicate that the user is no longer holding down
    hasDragged = false;
});

// Click event listener
gridHTML.addEventListener("click", (e) => {
    //Ignore clicks outside of the grid
   if (!e.target.classList.contains("cell")) {
       return;
   }
    
    // Check if the selected element is the same as the last cell selected (i.e. double tapped)
    const isLastSelected = selectedCells[selectedCells.length - 1] === e.target;
    
    // If already selected, confirm word, else add to word
    if (isLastSelected && selectedCells.includes(e.target)) {
        handleGuess();
    } else {
        selectCell(e.target);
    }
});

// Redraw lines when window is resized
window.addEventListener("resize", () => {
    removeLines();
    drawLinesBetweenCells(selectedCells);
    drawLinesBetweenCells(placedSegments);
})