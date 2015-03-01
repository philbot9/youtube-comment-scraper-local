var parseComments = require('./comment-parser.js');

module.exports = function(options) {
	/* make sure no one's trying to screw with us... */
	if(!options) 
		return console.error("comment-api: No video ID specified.");
	if(typeof options === 'object') {
		if(!options.videoID)
			return console.error("comment-api: No video ID specified.");
		videoID = options.videoID;
	} else if(typeof options === 'string') {
		videoID = options;
	} else {
		return console.error("comment-api: No video ID specified.");
	}

	var commentAPI = require('./comment-api.js')({"videoID": videoID});
	var prevCommentID = 0;


	return function(pageToken, callback) {
		console.log("--Requesting Comment Page " + pageToken);
		commentAPI.getCommentsPage(pageToken, function(error, pageContent, nextPageToken) {
			if(error)
				return callback(error);

			console.log("--Parsing Comment Page");
			parseComments(pageContent, commentAPI, (prevCommentID + 1), function(error, commentsArr) {
				if(error)
					return callback(error);

				if(commentsArr.length)
					prevCommentID = commentsArr[commentsArr.length-1].id;

				callback(null, commentsArr, nextPageToken);
			});
		});
	};
}
