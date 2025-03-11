$('#auth').onclick = () => authenticate(true);
$('#out').onclick = signOut;

authFromURL();

// Game class
class MainApp extends CustomElement {
	constructor() {
		super();
	}

	async init() {
		$('#out').disabled = false;

		const data = await getAccountInfo();
		$('#auth').innerText = data.name;

		// Load words
		const words = await fetchJSON('words.json');

		// Create a grid with 24 random words
		const grid = new Set();
		while (grid.size < 24) grid.add(words[Math.floor(Math.random() * words.length)]);

		let line = null;

		for (let word of grid) {
			if ($$('.card').length % 4 === 0) {
				line = render(html`<div class="line"></div>`);
				this.appendChild(line);
			}

			word = word[0].toUpperCase() + word.slice(1);
			const card = render(html`<div class="card">${word}</div>`);
			line.appendChild(card);
		}
	}
}

defineComponent(html`<main-app />`);

if (userSignedIn()) $('main-app').init();
