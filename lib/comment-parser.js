var EventEmitter = require("events").EventEmitter;
var cheerio = require('cheerio');

module.exports = function(html, commentAPI, nextCommentID, callback) {
	if(!html)
		return callback(new Error("No comment code provided."));
	if(!html.length)
		return callback(new Error("No comment code provided."));

	var comments = [];
	
	var $ = cheerio.load(html, {normalizeWhitespace: true});
	/* Select all comment-item divs and create a new CommentItems object from them */
	var commentItems = new CommentItems($, $("div .comment-item"));

	var ee = new EventEmitter();
	ee.on('comment', function(commentItem) {
		comments.push(
			parseOneComment(commentItem, nextCommentID++, -1));
	});

	ee.on('replies', function(index, ytCommentId) {
		var replies = [];
		var cb = function(error, repliesHtml, nextPageToken) {
			if(error) {
				console.error("Error retrieving replies: " + error);
				console.error(ytCommentId);
				return loopCommentItems(commentItems, index+1, ee);
			}

			console.log("----Parsing comment replies");
			var $ = cheerio.load(repliesHtml, {normalizeWhitespace: true});
			var replyItems = new CommentItems($, $(".comment-item"));

			var parentCommentID = comments[comments.length-1].id;

			replyItems.eachC(0, function(item, index) {
				replies.push(
					parseOneComment(item, nextCommentID++, parentCommentID));
			});

			if(nextPageToken) {
				console.log("----Requesting MORE comment replies");
				commentAPI.getCommentReplies(ytCommentId, null, cb);
			} else {
				comments.push.apply(comments, replies);
				loopCommentItems(commentItems, index+1, ee);
			}
		};

		console.log("----Requesting comment replies");
		commentAPI.getCommentReplies(ytCommentId, null, cb);
	});

	ee.on('done', function() {
		callback(null, comments);
	});

	loopCommentItems(commentItems, 0, ee);
};

var loopCommentItems = function(commentItems, startIndex, ee) {
	/* commentItems.eachC returns true if it reached the end of the list and 
	 * false if the iteration was interrupted */
	var finished = commentItems.eachC(startIndex, function(commentItem, index) {
		/* if this comment is a reply skip it */ 
		if(commentItem.attr("class").indexOf("reply") > -1) 
		 	return;

		ee.emit('comment', commentItem);

		/* Check whether this comment item has replies */
		if(commentItem.next().text().length > 1) {
			var ytCommentId = commentItem.attr('data-cid').toString();

			ee.emit('replies', index, ytCommentId);
			return false;
		}
	});

	if(finished === true) 
		ee.emit('done');
}

var parseOneComment = function(commentItemElement, commentID, replyToID) {
	var comment = {
		id: commentID,
		replyTo: replyToID,
		numReplies: 0
	};

	/* Extract comment information */
	comment.youtubeCommentID = commentItemElement
					.attr('data-cid').toString();
	comment.user = commentItemElement
					.children(".content")
					.children("div .comment-header")
					.children(".user-name")
					.text();

	var dateYT = commentItemElement
					.children(".content")
					.children("div .comment-header")
					.children(".time")
					.text().trim();
	comment.date = convertYtDate(dateYT);
	comment.dateYT = dateYT;      

	comment.commentText = commentItemElement
	                .children(".content")
	                .children("div .comment-text")
	                .children("div .comment-text-content")
	                .text();
	var likes = commentItemElement
					.children(".content")
					.children("div .comment-footer")
					.children("div .comment-footer-actions")
					.children(".like-count.on").text();
	comment.likes = parseInt(likes) - 1;

	return comment;
}


/* CommentItems Class */
var CommentItems = function($, o) {
	this.$ = $
	for(var key in o)
		this[key] = o[key];
};
CommentItems.prototype.eachC = function(startIndex, func) {
	if(startIndex < 0)
		return;

	for(var i = startIndex; i < this.length; i++) {
		if(func(this.$(this[i]), i) === false) 
			return false;
	}
	return true;
};


function convertYtDate(ytDate) {
	var re = /(\d+)\s(\w+)\sago/;
	var m = re.exec(ytDate);

	if(m.length <= 1)
		return null;

	var num = parseInt(m[1]);
	var type = m[2];

	var date = new Date();

	if(type === "minute" || type === "minutes") {
		date.setMinutes(date.getMinutes() - num);
	}
	else if(type === "day" || type === "days") {
		date.setDate(date.getDate() - num);
	}
	else if(type === "week" || type === "weeks") {
		date.setDate(date.getDate() - (num * 7));
	}
	else if(type === "month" || type === "months") {
		date.setMonth(date.getMonth() - num);
	}  
	else if(type === "year" || type === "years") {
		date.setFullYear(date.getFullYear() - num);
	}

	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}
