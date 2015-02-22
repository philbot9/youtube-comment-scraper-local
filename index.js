var commentLoader = require("./commentLoader.js");

var videoID = process.argv[2];

if(videoID) {
	commentLoader.load(videoID, function(err) {
		if(err)
			console.error(err);
	});
} 