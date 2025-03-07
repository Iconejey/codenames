$('#auth').onclick = () => authenticate(true);
$('#out').onclick = signOut;

authFromURL();

async function onAuth() {
	$('#out').disabled = false;
	$('#write').disabled = false;

	const data = await getAccountInfo();
	$('#name').innerText = data.name;
	$('#email').innerText = data.email;
}

if (userSignedIn()) onAuth();

STORAGE.onChange(console.log);
$('#write').onclick = e => STORAGE.write('test.txt', 'Hello, World!');
