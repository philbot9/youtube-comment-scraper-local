var cheerio = require('cheerio');

module.exports.parse = function(html, nextCommentID) {
	if(!html)
		return [];
	if(!html.length)
		return [];

	var $ = cheerio.load(html,
        {normalizeWhitespace: true});

	var comments = [];
    var threadParent;
    var nextID = nextCommentID || 0;

    /* Select all comment items and iterate over them */
    $("div .comment-item").each(function(i, elem) {
        var comment = {
            id: nextID++,
            replyTo: -1,
            numReplies: 0
        };     

        /* if this comment is a reply to another comment */
        if($(this).attr('class').indexOf("reply") > -1) {
            if(threadParent) {
                comment.replyTo = threadParent.id;
                threadParent.numReplies = threadParent.numReplies + 1;
            }
        }
        else {
            threadParent = comment;
        }

        /* Extract comment information */
        comment.user = $(this)
                        .children(".content")
                        .children("div .comment-header")
                        .children(".user-name")
                        .text();
        var dateYT = $(this)
                        .children(".content")
                        .children("div .comment-header")
                        .children(".time")
                        .text().trim();
        comment.date = convertYtDate(dateYT);
        comment.dateYT = dateYT;                        
        comment.commentText = $(this)
                        .children(".content")                        
                        .children("div .comment-text")
                        .children("div .comment-text-content")
                        .text();
        var likes = $(this)
                        .children(".content")
                        .children("div .comment-footer")
                        .children("div .comment-footer-actions")
                        .children(".like-count.on").last().text();
        comment.likes = parseInt(likes) - 1;

        comments.push(comment);
    });

    if(comments.length == 0) {
    	console.error("Error parsing comments!");
    }

    return comments;
}

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