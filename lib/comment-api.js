var xhrc = require("xmlhttprequest-cookie");
var XMLHttpRequest = xhrc.XMLHttpRequest;
var CookieJar = xhrc.CookieJar;

/* 
 * IMPORTANT:
 * Youtube expects a session token AND a Cookie with each ajax request. The regular
 * XMLHttpRequest does not send cookies, so I used the xmlhttprequest-cookie module.
 * Not sure what exactly that Cookie contains and there is no authentication needed to 
 * get it. It is just added to the repsonse when requesting the comment website 
 * (YT_COMMENTS_URL).
 */

var YT_COMMENTS_URL   = "https://www.youtube.com/all_comments?v=";
var YT_AJAX_URL       = "https://www.youtube.com/comment_ajax?action_load_comments=1&order_by_time=True&filter=";
var YT_AJAX_REPLY_URL = "https://www.youtube.com/comment_ajax?action_load_replies=1&order_by_time=True&tab=inbox";

module.exports = function(options) {
	var videoID;

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

	return {
		getCommentsPage: getCommentsPage,
		getCommentReplies:  getCommentReplies
	};

	function getCommentsPage(pageToken, callback) {
		requestSessionToken(function(error, sessionToken) {
			if(error)
				return callback(error);

			var params = {};
			params['session_token'] = sessionToken;

			if(!pageToken) 
				params['video_id'] = videoID; /* get the first comment page */
			else
				params['page_token'] = pageToken; /* get a specific comment page */

			xhrPost(YT_AJAX_URL + videoID, params, function(xhr) {
				if(xhr.status != 200)
					return callback(new Error("Requesting comments page failed.\n" + xhr));
				if(!xhr.responseText)
					return callback(new Error("No comments received from server.\n" + xhr));

				var commentsPage = {};
				try {
					var commentPageStr = xhr.responseText.toString().trim();
					commentsPage = JSON.parse(cleanJSON(commentPageStr));
				} catch(e) {
					return callback(new Error("Error parsing Server response: " + e));
				}

				var nextPageToken = commentsPage['page_token'];
				callback(null, commentsPage.html, nextPageToken);
				nextPageToken = "";
			});
		});
	}

	function getCommentReplies(commentID, pageToken, callback) {
		if(!commentID) 
			return callback(new Error("No comment ID specified. Cannot get replies."));

		requestSessionToken(function(error, sessionToken) {
			if(error)
				return callback(error);

			params = {};
			params['session_token'] = sessionToken;
			params['video_id'] = videoID;
			params['comment_id'] = commentID;

			if(pageToken)
				params['page_token'] = pageToken;

			xhrPost(YT_AJAX_REPLY_URL, params, function(xhr){
				if(xhr.status != 200)
					return callback(new Error("Requesting replies failed. Status " + xhr.status));
				if(!xhr.responseText)
					return callback(new Error("No replies received from server. Status " + xhr.status));

				var repliesPageStr = xhr.responseText.toString().trim();
				var repliesPage;

				try {
					repliesPage = JSON.parse(cleanJSON(repliesPageStr));
				} catch(e) {
					return callback(new Error("Error parsing Server response: " + e));
				}
				
				var nextPageToken = repliesPage['page_token'];
				callback(null, repliesPage.html, nextPageToken);
			});
		});
	}

	var sessionToken;

	function requestSessionToken(callback) {
		if(sessionToken)
			return callback(null, sessionToken);

		xhrGet(YT_COMMENTS_URL + videoID, function(xhr){
			if(xhr.status != 200) 
				return callback(new Error("Unable to retrieve video page. Status " + xhr.status));
			
			
			var re = /\'XSRF_TOKEN\'\s*\n*:\s*\n*"(.*)"/;
			var m = re.exec(xhr.responseText.toString());

			if(!m)
				return callback(new Error("Unable to find session token"));
			if(m.length <= 1)
				return callback(new Error("Unable to find session token"));
			if(CookieJar.cookieList.length == 0)
				return callback(new Error("No cookie received"));

			sessionToken = m[1];
			callback(null, sessionToken);
		});
	}
}


/******************************************************
 *   Helper Functions 
 ******************************************************/

/* clear any invalid escape sequences in a JSON string */
var cleanJSON = function(str) {
	/* 
	 * Sometimes Youtube uses '\U' which should be '\u'. So try to replace any invalid 
	 * escape sequences with their lowercase versions first.
	 */
	var re = /(\\[^"\/bfnrtu\\])/g;
	return str.replace(re, function(m) {
		if(!re.test(m.toLowerCase()))
			return m.toLowerCase();
		else
			return "";
	});
};

/* XMLHttpRequest - GET */
var xhrGet = function (url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.debug = false;

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			callback(xhr);
		}
	};
	xhr.open("GET", url);
	xhr.send();
};

/* XMLHttpRequest - POST */
var xhrPost = function(url, params, callback) {
	var xhr = new XMLHttpRequest();
	xhr.debug = false;

	xhr.open("POST", url, true);

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			callback(xhr);
		}
	}

	var requestBody;
	if (params) {
		var bodyParam = [];
		for (var name in params) {
			bodyParam.push(name + '=' + encodeURIComponent(params[name]));
		}
		requestBody = bodyParam.join('&');
		if (requestBody) {
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8"); 
		}
	}

	xhr.send(requestBody);
};