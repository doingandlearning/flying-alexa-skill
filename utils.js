
const airportCode = {
	London: "LON",
	Belfast: "BFS",
	Paris: "PAR",
	"New York": "NYC",
	"Chicago": "ORD"
};

function formatDuration(duration) {
	const match = duration.match(/PT(\d+H)?(\d+M)?/);
	let hours = 0;
	let minutes = 0;

	if (match[1]) {
		hours = parseInt(match[1].slice(0, -1), 10);
	}

	if (match[2]) {
		minutes = parseInt(match[2].slice(0, -1), 10);
	}

	let formattedDuration = '';
	if (hours > 0) {
		formattedDuration += `${hours} hour${hours > 1 ? 's' : ''}`;
	}
	if (minutes > 0) {
		if (formattedDuration.length > 0) {
			formattedDuration += ' and ';
		}
		formattedDuration += `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}
	return formattedDuration;
}

module.exports = { formatDuration }