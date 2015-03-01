var scrapeComments = require("./lib/comment-scraper.js");
var db = require("./database.js");
var videoID = process.argv[2];

if(!videoID) {
	console.error("No Video ID!");
	process.exit(1);
}

var totalComments = 0;
var allComments = [];

/* Create a new table, overwrite if exists */
db.createTable(videoID, true);

scrapeComments(videoID, function(error, comments) {
	console.log("\nAdding comments to DB.");
	db.addComments(comments, videoID);
});