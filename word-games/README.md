# Word Games: Letter Boxed & Strands

Recreations of the New York Times' *Letter Boxed* and *Strands* games — built using vanilla JavaScript, HTML, and CSS.

## 🔲 Letter Boxed

Connect letters around the edges of a square.

### Rules:
  * Each word must start with the last letter of the previous word
  * Each letter must come from a different side
  * Use all letters to win

### Features:
  * Tap or drag to build words
  * Animated line segments connecting selected letters using SVG
  * Automatically checks for win condition when all letters are used
  * Highlights active letter and allows backtracking

[NY Times Version](https://www.nytimes.com/puzzles/letter-boxed)

### 🔵 Strands

A word search puzzle with a hidden theme.

### Features:

  * Interactive drag or tap letter selection
  * Dynamic path visualization using SVG
  * Responsive grid layout built with dynamic DOM generation
  * DFS and backtracking logic to validate connected letter paths

[NY Times Version](https://www.nytimes.com/games/strands)

## Structure

```
letterboxed/     → Letter Boxed
  index.html     
  style.css
  letterboxed.js
  boards.js
strands/         → Strands
  index.html
  style.css
  main.js
  gameplays.js 
```

## Technologies

* HTML5 + CSS3
* JavaScript
* SVG for animated line drawing
* CSS Grid for layouts
