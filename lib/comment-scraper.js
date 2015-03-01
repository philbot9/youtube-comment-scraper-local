var parseComments = require('./comment-parser.js');

module.exports = function(videoID, callback) {
	if(!videoID)
		return console.error(new Error("comment-scraper: No video ID specified"));

	var loadCommentsPage = require('./comment-pager.js')({"videoID": videoID});
	var prevCommentID = 0;
	var allComments = [];
	var prevComments = [];

	var cb = function(error, commentsArr, nextPageToken) {
		if(error)  {
			return callback(error);
		}
		if(!commentsArr)
			return;
		/* TODO: Handle error differently: try to keep going. */

		deleteOverlap(prevComments, commentsArr);
		allComments.push.apply(allComments, commentsArr);
		prevComments = commentsArr;

		if(nextPageToken) {
			console.log("\nComments so far: " + allComments.length + "\n");
			loadCommentsPage(nextPageToken, cb);
		} else {
			console.log("\nScraped " + allComments.length + " comments.");
			callback(null, allComments);
		}
	};

	loadCommentsPage(null, cb);
};


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
