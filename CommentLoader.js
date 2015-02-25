var CommentScraper = require("./CommentScraper.js");
var CommentParser = require("./CommentParser.js");
var db = require("./database.js");



/* TODO: I don't know what the fuck is going on, but the program stop loading comments
 * at random points (crash?, timeout?, idk) Video id: tug71xZL7yc 
 * The bug is probably in the CommentParser event 'done' not being triggered when reaching
 * the end of a list.
 */




var CommentLoader = function(videoID, callback) {
	var self = this;
	this.videoID = videoID;
	this.allComments = [];
	
	this.commentScraper = new CommentScraper(videoID, function(error){
		if(error) 
			return callback(error);

		self.commentParser = new CommentParser(self.commentScraper);
		callback();
	});

	/* Initialize the database */
	if(!db.createTable(videoID, true)) {
		return callback(new Error ("cannot initialize comment database"));
	}
};

CommentLoader.prototype.load = function(callback) {
	var self = this;
	
	var cb = function(error, pageContent, nextPageToken) {
		if(error)
			return callback(error);

		self.nextPageToken = nextPageToken;

		console.log("Parsing page");
		self.commentParser.parseComments(pageContent, function(commentObjects) {
			self.allComments.push.apply(self.allComments, commentObjects);

			//console.log(commentObjects);

			console.log("Total comments so far: " + self.allComments.length);

			//console.log(self.nextPageToken);

			if(self.nextPageToken) {
				console.log("Requesting page");
				self.commentScraper.getCommentPage(self.nextPageToken, cb);
			} else {
				console.log("DONE");
				callback(self.allComments);
			}
		});
	};

	console.log("Requesting page");
	this.commentScraper.getCommentPage(null, cb);
};

module.exports = CommentLoader;