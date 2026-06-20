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

	// Get the remaining blue words
	get remaining_blue_words() {
		return [...this.$$('.blue.card:not(.found)')].map(card => card.innerText);
	}

	// Get the red cards
	get red_cards() {
		return this.$$('.red.card');
	}

	// Get the remaining red words
	get remaining_red_words() {
		return [...this.$$('.red.card:not(.found)')].map(card => card.innerText);
	}

	// Get the white cards
	get white_cards() {
		return this.$$('.card:not(.blue):not(.red)');
	}

	// Get the remaining white words
	get remaining_white_words() {
		return [...this.$$('.card:not(.blue):not(.red):not(.found)')].map(card => card.innerText);
	}

	// Get the remaining words
	get remaining_words() {
		return [...this.$$('.card:not(.found)')].map(card => card.innerText);
	}

	// Get UI line
	get ui() {
		return this.$('.line.ui');
	}

	// Get history element
	get history() {
		return $('#history');
	}

	// Check is it is user spymaster turn
	get user_spymaster_turn() {
		return this.turn_color === 'blue' && document.body.classList.contains('spymaster');
	}

	// Check is it is user operative turn
	get user_operative_turn() {
		return this.turn_color === 'blue' && !document.body.classList.contains('spymaster');
	}

	// Get a card from word
	getCard(word) {
		return [...this.$$('.card')].find(card => card.innerText === word.toUpperCase());
	}

	constructor() {
		super();
		this.turn_color = 'blue';
	}

	addHistory(color, content) {
		this.history.appendChild(render(html`<div class="${color}">${content}</div>`));
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
		const n = innerWidth < 650 ? 3 : 4;

		for (const word of grid) {
			// Add a new line every n cards
			if ($$('.card').length % n === 0) {
				line = render(html`<div class="line"></div>`);
				this.appendChild(line);
			}

			// Create a card with the word
			const card = render(html`<div class="card">${word.toUpperCase()}</div>`);
			line.appendChild(card);

			card.select = () => {
				// Add the found class to the card
				card.classList.add('found');
				let color = 'white';
				if (card.classList.contains('blue')) color = 'blue';
				if (card.classList.contains('red')) color = 'red';

				// Add the card to the history
				this.addHistory(this.turn_color, html`Guess: <span class="${color}">${card.innerText}</span>`);

				// If one of the teams has no more cards, end the game
				if (this.remaining_blue_words.length === 0) {
					setTimeout(() => alert('Blue team wins!'), 1000);
					body_class.add('done');
					this.addHistory('blue', html`<b class="blue">Blue team wins!</b>`);
					return false;
				}

				if (this.remaining_red_words.length === 0) {
					setTimeout(() => alert('Red team wins!'), 1000);
					body_class.add('done');
					this.addHistory('red', html`<b class="red">Red team wins!</b>`);
					return false;
				}

				// If the card is not the same color as the turn, pass the turn
				return color === this.turn_color;
			};

			// Add event listener to the card
			card.oncontextmenu = e => {
				e?.preventDefault();

				// Prevent the user from clicking on the cards if it is not their turn
				if (!this.can_guess) return;

				// Select the card
				const good = card.select();

				// Pass the turn if the card is not the user's color
				if (!good) this.ui.onsubmit();
			};

			card.onclick = e => card.classList.toggle('blue-mark');
		}

		// Make 8 cards blue
		while (this.blue_cards.length < 8) {
			randElem(this.white_cards).classList.add('blue');
		}

		// Make 8 cards red
		while (this.red_cards.length < 8) {
			randElem(this.white_cards).classList.add('red');
		}

		// Add a line for UI
		line = html`
			<form class="line ui">
				<button id="spymaster" class="red">Espion</button>
				<button id="operative" class="blue">Agent</button>
			</form>
		`;

		this.appendChild(render(line));

		// Add event listeners
		$('#spymaster').onclick = () => this.start(true);
		$('#operative').onclick = () => this.start(false);

		// Add history
		const history = render(html`<div id="history"></div>`);
		document.body.appendChild(history);
	}

	// Start game
	start(spymaster) {
		// If playing as spymaster, add .spymaster to the body
		document.body.classList.toggle('spymaster', spymaster);

		// Remove the start buttons
		$('#spymaster').remove();
		$('#operative').remove();

		this.play();
	}

	// Ask user for a clue
	askForClue(use_AI = false) {
		return new Promise(async resolve => {
			let placeholder = 'Type a clue for your operative';
			if (use_AI) placeholder = 'Your spymaster is thinking...';
			if (this.turn_color === 'red') placeholder = 'The oponent spymaster is thinking...';

			// Show the UI
			this.ui.innerHTML = html`
				<input class="${this.turn_color}" id="clue" placeholder="${placeholder}" required />
				<input class="${this.turn_color}" id="number" type="number" placeholder="#" min="1" max="8" required />
				<button class="${this.turn_color}" id="submit">Submit</button>
			`;

			// Submit the clue
			const submit = () => {
				const clue = $('#clue').value;
				const number = $('#number').value;
				resolve({ clue, number });
			};

			this.ui.onsubmit = e => {
				e.preventDefault();
				$('#clue').value = $('#clue').value.toUpperCase();
				submit();
			};

			// Stop here if user is playing as spymaster
			if (!use_AI) return navigator.vibrate?.(15);

			// Lock the UI to prevent user input
			$('#clue').disabled = true;
			$('#number').disabled = true;
			$('#submit').disabled = true;
			$('#submit').hidden = true;

			// AI spymaster system
			const system = `
				You are playing the spymaster of a CodeNames game.
				You have to give a clue to your operative to guess the words related to your team.
				Make sure your clue can not be related to the other team's words or the white words, otherwise your operative might choose them.
				You can only give one word for the clue, the number of words related to the clue, and the words related to the clue (used to check if the clue is valid).
				The game is currently in french, so you'll probably want to give a french clue.

				Output: "CLUE;number;WORD1;WORD2;WORD3;..."
				Don't say anything else, just the clue, the number, and the words related, separated by a semicolon.
			`;

			// AI spymaster user
			const user = `
				The blue team's remaining words are: ${this.remaining_blue_words.join(', ')}.
				The red team's remaining words are: ${this.remaining_red_words.join(', ')}.
				The remaining white words are: ${this.remaining_white_words.join(', ')}.
				Your team is the ${this.turn_color} team.

				What is your clue?
			`;

			// Generate clue
			const ai_res = await AI.generate({ system, user });

			// Split the clue and number
			const [clue, number] = ai_res.replace(/clue:\s*/i, '').split(';');

			// Set the clue and number in the form
			$('#clue').value = clue;
			$('#number').value = number;

			// Submit the clue
			submit();
		});
	}

	// Operative turn
	async operativeTurn(clue, number, use_AI = false) {
		return new Promise(async resolve => {
			// Lock the UI to prevent user input
			$('#clue').disabled = true;
			$('#number').disabled = true;
			$('#submit').disabled = false;
			$('#submit').hidden = false;
			$('#submit').innerText = 'Terminé';

			// Allow the user to click on the cards
			this.can_guess = !use_AI;

			// Resolve the promise on submit
			this.ui.onsubmit = e => {
				e?.preventDefault();
				resolve();
			};

			// If the user is playing as the operative, return
			if (!use_AI) return navigator.vibrate?.(15);

			// Remove the button
			$('#submit').disabled = true;
			$('#submit').hidden = true;

			// AI operative system
			const system = `
				You are playing the operative of a CodeNames game.
				You have to guess the words related to your team using the clue given by your spymaster.
				The game is currently in french, so the words and the clue will be in french.
				
				Output: "word1;word2;word3;..."
				Don't say anything else, just the words separated by semicolons.
				Put the more likely words first, in case one of them is wrong and passes the turn.
			`;

			// AI operative user
			const user = `
				Your team is the ${this.turn_color} team.
				The clue is: "${clue}", ${number} words.
				The remaining words are: ${this.remaining_words.join(', ')}.

				What are your guesses?
			`;

			// Generate guesses
			const ai_res = await AI.generate({ system, user });
			const guesses = ai_res.split(';');

			// Mark each guess
			for (const guess of guesses) {
				this.getCard(guess)?.classList.add(`${this.turn_color}-mark`);
				await delay(1000);
			}

			await delay(2000);

			// Select each guess
			for (const guess of guesses) {
				// Click on the card
				const good = this.getCard(guess)?.select();

				// If the card is not the same color as the player, pass the turn
				if (!good) return this.ui.onsubmit();

				// Wait a bit
				await delay(2000);
			}

			// Submit the guesses
			resolve();
		});
	}

	// Play a turn
	async play() {
		// Remove all marks
		[...this.$$('.card.blue-mark')].forEach(card => card.classList.remove('blue-mark'));
		[...this.$$('.card.red-mark')].forEach(card => card.classList.remove('red-mark'));

		// Get the clue from the spymaster
		const { clue, number } = await this.askForClue(!this.user_spymaster_turn);

		// Add the clue to the history
		this.addHistory(this.turn_color, html`<b>${clue} (${number})</b>`);

		// Let the operative guess the words
		await this.operativeTurn(clue, number, !this.user_operative_turn);

		// Switch the turn
		this.can_guess = false;
		this.turn_color = this.turn_color === 'blue' ? 'red' : 'blue';

		// Play the next turn
		if (!body_class.contains('done')) this.play();
	}
}

defineComponent(html`<main-app />`);

window.app = $('main-app');
if (userSignedIn()) app.init();
