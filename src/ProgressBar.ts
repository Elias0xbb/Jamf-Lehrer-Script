
var width = 20;
var offsetLeft = '';

/*-< initProgressBar(_width, _offsetLeft) >-----------+
| Sets the environment variables for the progress bar |
+----------------------------------------------------*/
function initProgressBar(_width: number, _offsetLeft = '') {
	width = _width;
	offsetLeft = _offsetLeft;
}

/*-< displayProgressBar(progress, showPercentage, character) >------------------------+
| Displays a progress bar that is 'width' characters long. Displays 'offsetLeft'      |
| in front of the bar and the percentage on the right (if showPercentage is true).    |
| to change the design of the bar, character can be set to a different char than '-'. |
+------------------------------------------------------------------------------------*/
function displayProgressBar(progress: number, showPercentage: boolean, character = '-') {
	if(progress > 1) return;

	// Filled bar characters
	let filled = character.repeat(Math.floor(progress * width));
	let empty = " ".repeat(Math.floor(width * (1 - progress)));

	process.stdout.write('\r' + offsetLeft +'[' + filled + empty + ']');
	if(showPercentage) process.stdout.write(` (${Math.ceil(progress * 100)}%)`);
}

export { initProgressBar, displayProgressBar }

