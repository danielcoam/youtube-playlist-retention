chrome.tabs.query({active: true, currentWindow: true}, extensionCallback);

async function extensionCallback(tabs) {
	const windowUrl = tabs[0].url;
	const videoId = extractYoutubeVideoId(windowUrl);
	let playlistId = extractYoutubePlaylistId(windowUrl);
	playlistId = playlistId || await getPlaylistId(videoId);

	if (videoId === null && playlistId === null) {
		setTextToElement('errorMessage', 'Not a valid youtube video or playlist')
		return
	}
	await setPlaylistStats(playlistId)
}

async function setPlaylistStats(playlistId) {
	const playlistVideos = (await (await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=100&key=${API_KEY}`)).json()).items;
	if (playlistVideos.length > 0) {
		const selectedVideos = [0, ~~(playlistVideos.length / 2), playlistVideos.length - 1].map(i => playlistVideos[i]).filter(e => typeof e !== 'undefined')
		const videoIds = selectedVideos.map(item => item.contentDetails.videoId).join(',')
		const videoStats = await (await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&maxResults=100&key=${API_KEY}`)).json();
		const first = videoStats.items[0].statistics.viewCount
		const half = videoStats.items[1].statistics.viewCount
		const end = videoStats.items[2].statistics.viewCount
		setTextToElement('startedPlaylist', `Out of ${nFormatter(first)} people that started this playlist`)
		setTextToElement('halfPlaylist', `Watched half - ${getPercentage(half, first)}%`)
		setTextToElement('finishedPlaylist', `Finished - ${getPercentage(end, first)}%`)
	} else
		setTextToElement('errorMessage', 'This video is not part of a youtube playlist')
}

function extractYoutubeVideoId(url) {
	const match = url.match(/v=(?<video>[A-Za-z0-9-_]{5,15})/);
	return (match && match.groups.video) ? match.groups.video : null;
}

function extractYoutubePlaylistId(url) {
	const match = url.match(/list=(?<playlist>[A-Za-z0-9-_]{10,50})/);
	return (match && match.groups.playlist) ? match.groups.playlist : null;
}

function nFormatter(num, digits) {
	const lookup = [
		{value: 1, symbol: ''},
		{value: 1e3, symbol: 'k'},
		{value: 1e6, symbol: 'M'},
		{value: 1e9, symbol: 'G'},
		{value: 1e12, symbol: 'T'},
		{value: 1e15, symbol: 'P'},
		{value: 1e18, symbol: 'E'}
	];
	const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	const item = lookup.slice().reverse().find(function (item) {
		return num >= item.value;
	});
	return item ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol : '0';
}

function setTextToElement(elementId, text) {
	document.getElementById(elementId).textContent = text;
}

function getPercentage(first, second) {
	return ~~((first / second) * 100)
}

async function getChanelId(videoId) {
	const videoDetails = await (await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`)).json();
	return videoDetails.items[0].snippet.channelId
}

async function getPlaylistId(videoId) {
	if (videoId) {
		console.log('Finding the right playlist')
		const chanelId = await getChanelId(videoId)
		const allChanelPlaylists = await (await fetch(`https://youtube.googleapis.com/youtube/v3/playlists?channelId=${chanelId}&maxResults=100&key=${API_KEY}`)).json();
		for (const playlist of allChanelPlaylists.items) {
			const playlistItems = await (await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?playlistId=${playlist.id}&videoId=${videoId}&key=${API_KEY}`)).json();
			if (playlistItems.items.length > 0)
				return playlist.id
		}
	}
	return null
}



