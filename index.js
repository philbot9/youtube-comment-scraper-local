var videoID = process.argv[2];
if(!videoID) {
	console.error("No Video ID!");
	process.exit(1);
}


var db = require("./lib/database.js")();
/* Create a new table, overwrite if exists */
db.createCommentsTable(videoID, true);
db.createRepliesTable(videoID, true);

var commentStream = require("youtube-comment-stream")(videoID);
var JSONStream = require('json-stream');
var totalComments = 0;
var commentBuffer = [];

var jsonStream = new JSONStream();

jsonStream.on('data', function(comment) {
	commentBuffer.push(comment);
	//count the replies for the comment as well
	totalComments += 1 + (comment.hasReplies ? comment.replies.length : 0);
	
	if(totalComments % 500 === 0) {
		console.log("-- Scraped " + totalComments + " comments so far");
		db.insertComments(commentBuffer, videoID);
		commentBuffer = [];
	}
});

jsonStream.on('end', function() {
	db.insertComments(commentBuffer, videoID);
	console.log("\nScraped " + totalComments + " comments total.");
});

console.log("Scraping comments");
commentStream.pipe(jsonStream);
