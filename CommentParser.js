var EventEmitter = require("events").EventEmitter;
var cheerio = require('cheerio');

/* Constructor */
var CommentParser = function(commentScraper) {
	this.pageComments = [];
	this.nextCommentID = 0;
	this.commentScraper = commentScraper;
	this.ee = new EventEmitter();
}

CommentParser.prototype.parse = function(html, callback) {
	if(!html)
		return [];
	if(!html.length)
		return [];

	var self = this;
	
	this.ee.once('done', function() {
		callback(null, self.pageComments);
		self.pageComments = [];
	});

	var $ = cheerio.load(html, {normalizeWhitespace: true});

	/* Select all comment-item divs and create a new CommentItems object from them */
	var commentItems = new CommentItems($, $("div .comment-item"));

	/* start processing the html */
	this.loopComments(commentItems, 0);
};

/* TODO: should this be its own function? What about the pageComments array? */
CommentParser.prototype.loopComments = function(commentItems, startIndex) {
	var self = this;

	if(startIndex >= commentItems.length) {
		self.ee.emit('done');
		return false;
	}

	commentItems.eachC(startIndex, function(commentItem, index) {
		/* if this comment is a reply to another comment ignore it*/
		if(commentItem.attr("class").indexOf("reply") > -1) {
		
			/* Critical if statement. If the last comment is a reply
			 * we still need to emit 'done' or the execution stops and
			 * the program terminates*/
			if(index + 1 >= commentItems.length) 
				self.ee.emit('done');
			
			return true;
		}

		self.pageComments.push(
			parseOneComment(commentItem, self.nextCommentID++, -1));

		/* check whether this comment has replies */
		var nextElement = commentItem.next();
		if(nextElement.text().length > 1) {
			/* If the replies are hidden there is another div between the comment-item 
			 * and the comment replies. skip over it... */
			if(nextElement.attr('class')) {
				if(nextElement.attr('class').indexOf("comment-replies-header") > -1) {
					nextElement = nextElement.next();
				}
			}
			/* find the Youtube comment id */
			var ytCommentId = commentItem.attr('data-cid').toString();
			var myCommentId = self.pageComments[self.pageComments.length-1].id;
			
			/* 
			 * get out of this loop (return false) to get the comment replies asynchronously.
			 * when done resume from index+1
			 */
			self.loadCommentReplies(ytCommentId, myCommentId, function(commentReplies) {
				self.pageComments.push.apply(self.pageComments, commentReplies);
				self.loopComments(commentItems, index+1);
			});
			return false;
		}

		if(index + 1 >= commentItems.length) {
			self.ee.emit('done');
			return false;
		}

	});
}

CommentParser.prototype.loadCommentReplies = function(ytCommentId, parentId, callback) {
	var self = this;
	var replies = []

	var cb = function(error, html, nextPageToken){
		if(error) {
			console.error("Error retrieving replies: " + error);
			return callback([]);
		}

		console.log("----Parsing comment replies");

		var $ = cheerio.load(html, {normalizeWhitespace: true});
		var commentItems = new CommentItems($, $(".comment-item"));

		commentItems.eachC(0, function(commentItem, index) {
			replies.push(parseOneComment(commentItem, self.nextCommentID++, parentId));
		});

		if(nextPageToken) {
			console.log("get more replies");
			self.commentScraper.getCommentReplies(ytCommentId, nextPageToken, cb);
		}
		else {
			callback(replies);
		}
	};

	console.log("----Requesting comment replies");
	self.commentScraper.getCommentReplies(ytCommentId, null, cb);
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
	for(var i = startIndex; i < this.length; i++) {
		if(func(this.$(this[i]), i) === false) 
			break;
	}
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

module.exports = CommentParser;

