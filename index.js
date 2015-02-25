var CommentParser = require("./CommentParser.js");

// var commentLoader = require("./commentLoader.js");

// var videoID = process.argv[2];

// if(!videoID) {
// 	console.error("No Video ID!");
// 	process.exit(1);
// }

// commentLoader.load(videoID, function(err) {
// 	if(err)
// 		console.error(err);
// }); 

var CommentScraper = require("./CommentScraper.js");

var c = new CommentScraper("tug71xZL7yc", function(err) {
	if(err)	
		return console.error(err);

	c.getCommentPage(null, function(error, pageContent, nextPageToken) {
		if(error) 
			console.error(error);
		
		console.log("CONTENT: " + pageContent.length);
		console.log("PAGE TOKEN: " + nextPageToken.length);

		var cp = new CommentParser(c);
		
		cp.parseComments(pageContent, function(comments) {
			console.log(comments);
		})

	});
});