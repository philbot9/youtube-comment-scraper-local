var commentScraper = require("./commentScraper.js");
var commentParser = require("./commentParser.js");
var db = require("./database.js");

var lastCommentId = 0;

var dataNotify = function(data, callback) {
	if(!data)
		return;

	var comments = commentParser.parse(data, ++lastCommentId);

	if(comments)
		lastCommentId = comments[comments.length-1].id;

	for(var i = 0; i < comments.length; i++) {
        db.addComment(comments[i]);
    }

    /* if the database is still processing our queries we wait */
    if(db.isBusy()) {
        console.log("Waiting for Database ...");   
        db.once('notBusy', function() {
        	console.log("notBusy");
        	callback();
        });
    }
    else {
    	callback();
    }
}


module.exports.load = function (videoId, callback) {
	commentScraper.scrape(videoId, dataNotify, function(err) {
		if(err) 
			callback(err);
		
		console.log("Waiting for Database ...");   
        db.once('done', function() {
        	console.log("database is done");
        	callback();
        });

	});
};