var parseComments = require('./comment-parser.js');

/* Constructor */
var CommentScraper = function(videoID) {
	var self = this;
	this.videoID = videoID;
	this.commentCount = 0;
	this.prevCommentID = 0;

	this.commentAPI = require('./comment-api.js')({"videoID": videoID});
};

/* retrieves all comments on the page specified by pageToken
 * if no pageToken is given, it will get the comments from the first page.
 * the callback passes the comments in an array and the token for the next consecutive page */
CommentScraper.prototype.getCommentsPage = function(pageToken, callback) {
	var self = this;

	console.log("--Requesting Comment Page " + pageToken);
	this.commentAPI.getCommentsPage(pageToken, function(error, pageContent, nextPageToken) {
		if(error)
			return callback(error);

		console.log("--Parsing Comment Page");
		parseComments(pageContent, self.commentAPI, (self.prevCommentID + 1), function(error, commentsArr) {
			if(error)
				return self.callback(error);

			if(commentsArr.length)
				self.prevCommentID = commentsArr[commentsArr.length-1].id;

			callback(null, commentsArr, nextPageToken);
		});
	});
};

module.exports = CommentScraper;