$('#auth').onclick = () => authenticate(true);
$('#out').onclick = signOut;

authFromURL();

// Pick random element from iterable
function randElem(iterable) {
	return iterable[Math.floor(Math.random() * iterable.length)];
}

// Game class
class MainApp extends CustomElement {
	// Get the blue cards
	get blue_cards() {
		return this.$$('.blue.card');
	}

	// Get the red cards
	get red_cards() {
		return this.$$('.red.card');
	}

	// Get the white cards
	get white_cards() {
		return this.$$('.card:not(.blue):not(.red)');
	}

	constructor() {
		super();
	}

	// Initialize the game
	async init() {
		$('#out').disabled = false;

		const data = await getAccountInfo();
		$('#auth').innerText = data.name;

		// Load words
		const words = await fetchJSON('words.json');

		// Create a grid with 24 random words
		const grid = new Set();
		while (grid.size < 24) grid.add(randElem(words));

		let line = null;

		for (let word of grid) {
			// Add a new line every 4 cards
			if ($$('.card').length % 4 === 0) {
				line = render(html`<div class="line"></div>`);
				this.appendChild(line);
			}

			// Capitalize the first letter of the word
			word = word[0].toUpperCase() + word.slice(1);

			// Create a card with the word
			const card = render(html`<div class="card">${word}</div>`);
			line.appendChild(card);
		}

		// Make 8 cards blue
		while (this.blue_cards.length < 8) {
			randElem(this.white_cards).classList.add('blue');
		}

		// Make 8 cards red
		while (this.red_cards.length < 8) {
			randElem(this.white_cards).classList.add('red');
		}
	}
}

defineComponent(html`<main-app />`);

window.game = $('main-app');
if (userSignedIn()) game.init();
