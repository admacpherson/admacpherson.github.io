import { WORDS } from "./words.js";

// === GAME STATE VARIABLES ===
const NUMBER_OF_GUESSES = 6; // Number of allowed guesses
let guessesRemaining = NUMBER_OF_GUESSES; // Remaining guesses
let currentGuess = []; // Array to hold current letters typed
let nextLetter = 0; // Index for next letter input
let rightGuessString = WORDS[Math.floor(Math.random() * WORDS.length)]; // Pick random word from word list

// === INITIALIZE GAME BOARD ===
function initBoard() {
    const board = document.getElementById("game-board");

    // Create each row
    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        let row = document.createElement("div");
        row.className = "letter-row";
        
        // Create each box
        for (let j = 0; j < 5; j++) {
            const box = document.createElement("div");
            box.className = "letter-box";
            row.appendChild(box); // Add box to row
        }
        
        board.appendChild(row); // Add row to board
    }
}

// === SHADE KEYBOARD BASED ON GUESS ===
function shadeKeyBoard(letter, color) {
    // Iterate through each keyboard button
    for (const elem of document.getElementsByClassName("keyboard-button")) {
        // Verify letter is the one we want to update
        if (elem.textContent === letter) {
            const oldColor = elem.style.backgroundColor;
        
            // Don't overwrite green if already correct
            if (oldColor === "green") return;

            // Don't overwrite yellow if already correct
            if (oldColor === "green" && color !== "yellow") return;

            // Apply new background and text colors
            elem.classList.add(color);
            
            break;
        }
    }
}

// === BACKSPACE FUNCTION ===
function deleteLetter() {
    // Get box with last letter typed
    let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    let box = row.children[nextLetter - 1];
    
    box.textContent = "";
    box.classList.remove("filled-box"); 
    currentGuess.pop(); // Remove from guess array
    nextLetter -= 1; // Move current input back
}

// === DETERMINE IF WORD IS VALID
async function isValidWord(word) {
    // Use dictionary API
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    
    // If word is valid return true
    if (response.ok) {
        return true;
    } else return false;
}

// === CHECK GUESS FOR CORRECTNESS ===
async function checkGuess() {
    let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    let guessString = currentGuess.join("");
    let rightGuess = Array.from(rightGuessString); // Copy the correct word as an array

    // Validate guess length
    if (guessString.length != 5) {
        toastr.error("Not enough letters!");
        return;
    }

    // Validate gussed word is allowed
    if (!await (isValidWord(guessString))) {
        toastr.error("Word not in list!");
        return;
    }

    // Default all boxes to gray
    let letterColor = Array(5).fill("gray")

    // Check for correct letters in correct position (green)
    for (let i = 0; i < 5; i++) {
        if (rightGuess[i] == currentGuess[i]) {
            letterColor[i] = "green"; // Green class name
            rightGuess[i] = null; // Mark as used
        }
    }

    // Check for correct letters in wrong position (yellow)
    for (let i = 0; i < 5; i++) {
        if (letterColor[i] == "green") continue; // Skip already correct letters
            
        for (let j = 0; j < 5; j++) {
            if (rightGuess[j] == currentGuess[i]) {
                letterColor[i] = "yellow"; // Yellow class name
                rightGuess[j] = null; // Mark as used
            }
        }
    }

    // Apply colors to boxes and keyboard
    for (let i = 0; i < 5; i++) {
        const box = row.children[i];
        const delay = 250 * i; // Sequence animation
        
        // Update letter colors
        setTimeout(() => {
            animateCSS(box, "flipInX"); // Flip animation
            box.classList.remove("green", "yellow", "gray");
            box.classList.add(letterColor[i]); // Set box color
        }, delay);
    }
    
    // Update keyboard after letters flip
    setTimeout(() => {
        for (let i = 0; i < 5; i++ ) {
            shadeKeyBoard(currentGuess[i], letterColor[i]) 
        }
        
        // Check win condition
        if (guessString === rightGuessString) {
            toastr.success("You guessed right! Its \"horse\" again!");
            guessesRemaining = 0; // Prevent further input
            return;
        } else {
            guessesRemaining -= 1;
            currentGuess = []; // Reset guess
            nextLetter = 0;

            if (guessesRemaining === 0) {
                toastr.error("You've run out of guesses! Game over!");
                toastr.info(`The right word was: "${rightGuessString}"`);
            }
        }
    }, 250 * 5);

    
}

// === ADD A LETTER TO THE CURRENT GUESS ===
function insertLetter(pressedKey) {
    // Max five letters
    if (nextLetter === 5) {
        return;
    }
    
    pressedKey = pressedKey.toLowerCase(); // Convert to lowercase to check against dictionary

    const row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    const box = row.children[nextLetter];
    
    animateCSS(box, "pulse"); // Slight animation when pressed
    box.textContent = pressedKey;
    box.classList.add("filled-box");
    currentGuess.push(pressedKey);
    nextLetter += 1;
}

// === ANIMATE ELEMENT USING animate.css LIBRARY ===
const animateCSS = (element, animation, prefix = "animate__") =>

    // Create a Promise and return it
    new Promise((resolve, reject) => {
        const animationName = `${prefix}${animation}`;
        // const node = document.querySelector(element);
        const node = element;
        
        node.style.setProperty("--animate-duration", "0.3s"); // Set animation duration

        node.classList.add(`${prefix}animated`, animationName); // Add animation class

        // Cleanup after animation ends
        function handleAnimationEnd(event) {
            event.stopPropagation();
            node.classList.remove(`${prefix}animated`, animationName);
            resolve("Animation ended"); // Resolve the promise
        }

        node.addEventListener("animationend", handleAnimationEnd, { once: true });
});

// === HANDLE KEYBOARD INPUT ===
document.addEventListener("keyup", async (e) => {
    // Game overm do nothing
    if (guessesRemaining === 0) return;

    let pressedKey = String(e.key);
    
    if (pressedKey === "←" && nextLetter !== 0) {
        deleteLetter();
        return;
    }

    if (pressedKey === "Enter") {
        await checkGuess();
        return;
    }

    // Match to valid letters only
    let found = pressedKey.match(/[a-z]/gi);

    if (!found || found.length > 1) {
        return;
    } else {
        insertLetter(pressedKey);
    }
});

// === HANDLE CLICKS ON ONSCREEN KEYBOARD ===
document.getElementById("keyboard").addEventListener("click", (e) => {
    const target = e.target;

    // Only handle clicks on keyboard buttons
    if (!target.classList.contains("keyboard-button")) {
        return;
    }
    
    let key = target.textContent;

    // Map delete key to backspace
    if (key === "Del") {
        key = "Backspace";
    }

    // Simulate a real ketboard event
    document.dispatchEvent(new KeyboardEvent("keyup", { key: key }));
});

// === START THE GAME ===
initBoard(); /// Build the board when the script loads
