var db = require("./database.js");
var videoID = process.argv[2];

if(!videoID) {
	console.error("No Video ID!");
	process.exit(1);
}

/* Create a new table, overwrite if exists */
db.createTable(videoID, true);

var scraper = require("./lib/comment-scraper.js")(videoID);

scraper.on('data', function(comment) {
	db.addComments([comment], videoID);
});
