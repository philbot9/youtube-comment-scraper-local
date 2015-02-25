var CommentScraper = require("./CommentScraper.js");
var CommentParser = require("./CommentParser.js");
var db = require("./database.js");

var CommentLoader = function(videoID, callback) {
	var self = this;
	this.videoID = videoID;
	this.commentCount = 0;
	
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
			

			/* TODO: eliminate duplicates (last and first comment) */


			db.addComments(commentObjects, self.videoID);
			self.commentCount += commentObjects.length;

			console.log("Total comments so far: " + self.commentCount);

			if(self.nextPageToken) {
				console.log("Requesting page");
				self.commentScraper.getCommentPage(self.nextPageToken, cb);
			} else {
				console.log("DONE");
				callback();
			}
		});
	};

	console.log("Requesting page");
	this.commentScraper.getCommentPage(null, cb);
};

module.exports = CommentLoader;