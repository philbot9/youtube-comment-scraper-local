var parseComments = require('./comment-parser.js');
var EventEmitter = require("events").EventEmitter;

var util = require('util');
var Readable = require('stream').Readable;

module.exports = function (videoID) {
	if(!videoID)
		return console.error(new Error("comment-scraper: No video ID specified"));

	var loadCommentsPage = require('./comment-pager.js')({"videoID": videoID});
	var prevCommentID = 0;
	var commentsArr = [];
	var prevComments = [];
	var nextPageToken = null;
	var commentsCount = 0;

	var allCommentsScraped = false;

	var ee = new EventEmitter;

	function getMoreComments(callback) {
		loadCommentsPage(nextPageToken, function(error, commentsRx, nxtPgToken) {
			if(error)  {
				return callback(error);
			}
			if(!commentsArr)
				return;
			/* TODO: Handle errors differently: try to keep going. */

			deleteOverlap(prevComments, commentsRx);

			commentsArr.push.apply(commentsArr, commentsRx);
			prevComments = commentsRx;
			commentsCount += commentsRx.length;
			nextPageToken = nxtPgToken;

			if(!nextPageToken) {
				ee.emit('done');
				return callback();
			}
			callback();
		});
	};

	var rStream = new Readable({objectMode: true});

	ee.on('done', function() {
		allCommentsScraped = true;
	});

	// function doPush() {
	// 	if(!commentsArr.length) {
	// 		return getMoreComments(function(error) {
	// 			if(!error)
	// 				doPush();
	// 		});
	// 	}
	// 	while(rStream.push(
	// 		JSON.stringify(
	// 				commentsArr
	// 				.splice(0,1)[0]
	// 		))) {}
	// }

	rStream._read = function(size) {
		if(!commentsArr.length) {
			return getMoreComments(function() {
				doPush();			
			});
		}
		doPush();
	}

	var doPush = function() {
		while(rStream.push(
			commentsArr.splice(0,1)[0]
			)) {}	
		
		if(allCommentsScraped && !commentsArr.length)
			rStream.push(null);
	}

	return rStream;
};
	
/* Sometimes the last comment on one page is the same as the first comment on the
 * next page. It's definitely Youtube's fault!
 * This function gets rid of the extra comments on the second page (currComments) */
function deleteOverlap(prevComments, currComments) {
	for(var i = prevComments.length-1; i >= 0; i--) {
		if(commentsEqual(prevComments[i], currComments[0]))
			currComments.splice(0, 1);
		else
			break;	
	}
}

/* What makes two comments equal? */
function commentsEqual(c1, c2) {
	return c1.youtubeCommentID === c2.youtubeCommentID;
}
