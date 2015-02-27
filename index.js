var CommentScraper = require("./CommentScraper.js");
var db = require("./database.js");
var videoID = process.argv[2];

if(!videoID) {
	console.error("No Video ID!");
	process.exit(1);
}

/* Create a new table, overwrite if exists */
db.createTable(videoID, true);

var totalComments = 0;

var commentScraper = new CommentScraper(videoID, function(error) {
	if(error) {
		console.error(error);
		process.exit(1);
	}

	var self = this;
	this.prevComments = [];

	var cb = function(error, commentsArr, nextPageToken) {
		deleteOverlap(self.prevComments, commentsArr);
		db.addComments(commentsArr, videoID);
		self.prevComments = commentsArr;

		totalComments += commentsArr.length;
		
		//console.log(commentsArr);
		//console.log(self.prevComments);

		if(nextPageToken) {
			console.log("\nComments so far: " + totalComments + "\n");
			commentScraper.getCommentPage(nextPageToken, cb);
		} else {
			console.log("\nScraped " + totalComments + " comments.");
		}
	};

	commentScraper.getCommentPage(null, cb);
});

function deleteOverlap(prevComments, currComments) {
	for(var i = prevComments.length-1; i >= 0; i--) {
		if(commentsEqual(prevComments[i], currComments[0]))
			currComments.splice(0, 1);
		else
			break;	
	}
}

function commentsEqual(c1, c2) {
	return c1.youtubeCommentID === c2.youtubeCommentID;
}
