var CommentScraper = require("./CommentScraper.js");
var CommentParser = require("./CommentParser.js");
var db = require("./database.js");

var CommentLoader = function(videoID, callback) {
	var self = this;
	this.videoID = videoID;
	
	this.commentScraper = new CommentScraper(videoID, function(error){
		if(error) 
			return callback(error);

		self.commentParser = new CommentParser(self.commentScraper);
		callback();
	});

	/* Initialize the database */
	if(!db.createTable(videoId, true)) {
		return callback(new Error ("cannot initialize comment database"));
	}
};

CommentLoader.prototype.load = function(callback) {
	var pageToken;

	/* Request the next comment page as longs as there is a page token
	 * If there is none we have reached the last page */
	do {
		commentScraper.getCommentPage(null, function(error, pageContent, nextPageToken) {
			pageToken = nextPageToken;
		}
	} while(pageToken);
}





var lastComment;
var vidID;
var totalComments = 0;

var dataNotify = function(data, callback) {
	if(!data)
		return;

	var nextCommentId = lastComment ? (lastComment.id + 1) : 1;

	var comments = commentParser.parse(data, nextCommentId);
	
	if(!comments.length)
		callback();

	if(lastComment) {
		if(comments[0].commentText == lastComment.commentText
		&& comments[0].user == lastComment.user) {
			comments.splice(0, 1);
		}
	}

	db.addComments(comments, vidID);
	lastComment = comments[comments.length-1];
    	totalComments += comments.length;
    	console.log("Comments scraped so far: " + totalComments);    

	/* if the database is busy we wait */
	if(db.isBusy()) {
		console.log("Waiting for Database ...");   
		db.once('notBusy', function() {
			console.log("notBusy");
			callback();
		});
	} else {
		callback();
	}
}


module.exports.load = function (videoId, callback) {
    vidID = videoId;
    
    console.log("Creating new table");
    if(!db.createTable(videoId, true)) {
        return callback(new Error ("cannot initialize comment database"));
    }

    commentScraper.scrape(videoId, dataNotify, function(err) {
		if(err) 
			callback(err);
		

		callback();
	});
};


var CommentLoader = {};

CommentLoader.prototype.loadCommentPage = function (videoId, callback) {

}

module.exports = CommentLoader;