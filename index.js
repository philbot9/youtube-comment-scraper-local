var CommentScraper = require("./lib/comment-scraper.js");
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

var commentScraper = new CommentScraper(videoID);

var self = this;
this.prevComments = [];

var cb = function(error, commentsArr, nextPageToken) {
	if(error)  {
		console.error(error);
		process.exit(1);
	}
	
	deleteOverlap(self.prevComments, commentsArr);
	db.addComments(commentsArr, videoID);
	self.prevComments = commentsArr;

	totalComments += commentsArr.length;
	
	if(nextPageToken) {
		console.log("\nComments so far: " + totalComments + "\n");
		commentScraper.getCommentsPage(nextPageToken, cb);
	} else {
		console.log("\nScraped " + totalComments + " comments.");
	}
};

commentScraper.getCommentsPage(null, cb);


/* Sometimes the last comment on one page is the same as the first comment on the
 * next page. It's definitely Youtube's fault!
 * This function gets rid of the extra comments on the second page (currComments) */
function deleteOverlap(prevComments, currComments) {
	for(var i = prevComments.length-1; i >= 0; i--) {
		if(commentsEqual(prevComments[i], currComments[0]))
			currComments.splice(0, 1);
		else
			break;	
	}
}

/* What makes two comments equal? */
function commentsEqual(c1, c2) {
	return c1.youtubeCommentID === c2.youtubeCommentID;
}
