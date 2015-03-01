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
	ee.on('done', function() {
		allCommentsScraped = true;
	});


	function getNextPage(callback) {
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
			}
			callback();
		});
	};

	var rStream = new Readable({objectMode: true});

	rStream._read = function(size) {
		if(!commentsArr.length) {
			return getNextPage(function() {
				if(error) {
					console.error(error);
					rStream.push(null);
					/* TODO: handle errors differently: try to keep going. */
				}
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
 * This function gets rid of the extra comments on the second page */
function deleteOverlap(firstPage, secondPage) {
	for(var i = firstPage.length-1; i >= 0; i--) {
		if(commentsEqual(firstPage[i], secondPage[0]))
			sPage.splice(0, 1);
		else
			break;	
	}
}

/* What makes two comments equal? */
function commentsEqual(c1, c2) {
	return c1.youtubeCommentID === c2.youtubeCommentID;
}
