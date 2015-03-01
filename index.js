var videoID = process.argv[2];
if(!videoID) {
	console.error("No Video ID!");
	process.exit(1);
}


var db = require("./lib/database.js");
/* Create a new table, overwrite if exists */
db.createTable(videoID, true);

var scraper = require("youtube-comment-stream")(videoID);
var totalComments = 0;
var commentBuffer = [];

console.log("Scraping comments");
scraper.on('data', function(comment) {
	commentBuffer.push(JSON.parse(comment));
	
	if(++totalComments % 100 == 0) {
		console.log("Scraped " + totalComments + " comments so far");
		db.addComments(commentBuffer, videoID);
		commentBuffer = [];
	}
});

scraper.on('end', function() {
	db.addComments(commentBuffer, videoID);
	console.log("\nScraped " + totalComments + " comments total.");
	console.log("Committing remaining comments to Database...");
})
