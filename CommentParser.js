var EventEmitter = require("events").EventEmitter;
var cheerio = require('cheerio');

/* Constructor */
var CommentParser = function(commentScraper) {
	this.comments = [];
	this.nextCommentID = 0;
	this.commentScraper = commentScraper;
	this.ee = new EventEmitter();
}

CommentParser.prototype.parseComments = function(html, callback) {
	if(!html)
		return [];
	if(!html.length)
		return [];

	var self = this;
	this.ee.on('done', function() {
		callback(self.comments);
	});

	var $ = cheerio.load(html, {normalizeWhitespace: true});

	/* Select all comment-item divs and create a new CommentItems object from them */
	var commentItems = new CommentItems($, $("div .comment-item"));

	/* start processing the html */
	this.loopComments(commentItems, 0);
};

CommentParser.prototype.loopComments = function(commentItems, startIndex) {
	var self = this;
	commentItems.eachC(startIndex, function(commentItem, index) {
		/* if this comment is a reply to another comment ignore it*/
		if(commentItem.attr("class").indexOf("reply") > -1)
			return true;

		self.comments.push(
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
			/* get the Youtube comment id */
			var ytCommentId = commentItem.attr('data-cid').toString();
			var myCommentId = self.comments[self.comments.length-1].id;
			
			/* 
			 * break out of this loop to get the comment replies asynchronously.
			 * when done resume from index+1
			 */
			console.log("COMMENT HAS REPLY: " + ytCommentId);

			self.getCommentReplies(ytCommentId, myCommentId, function(commentReplies) {
				self.comments.push.apply(self.comments, commentReplies);
				self.loopComments(commentItems, index+1);
			});
			return false;
		}

		if(index + 1 >= commentItems.length)
			self.ee.emit('done');

	});
}

CommentParser.prototype.getCommentReplies = function(ytCommentId, parentId, callback) {
	var self = this;
	var replies = []

	var cb = function(error, html, nextPageToken){
		if(error) {
			console.error("Error retrieving replies: " + error);
			return callback([]);
		}

		var $ = cheerio.load(html, {normalizeWhitespace: true});
		var commentItems = new CommentItems($, $(".comment-item"));

		commentItems.eachC(0, function(commentItem) {
			replies.push(
				parseOneComment(commentItem, self.nextCommentID++, parentId));
		});

		if(nextPageToken) {
			self.commentScraper.getCommentReplies(ytCommentId, nextPageToken, cb);
		}
		else {
			callback(replies);
		}
	};

	this.commentScraper.getCommentReplies(ytCommentId, null, cb);
}

var parseOneComment = function(commentItemElement, commentID, replyToID) {
	var comment = {
		id: commentID,
		replyTo: replyToID,
		numReplies: 0
	};

	/* Extract comment information */
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
					.children(".like-count.on").last().text();
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


module.exports = CommentParser;

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