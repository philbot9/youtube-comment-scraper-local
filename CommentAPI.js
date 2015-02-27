var xhrc = require("xmlhttprequest-cookie");
var XMLHttpRequest = xhrc.XMLHttpRequest;
var CookieJar = xhrc.CookieJar;

var YT_COMMENTS_URL   = "https://www.youtube.com/all_comments?v=";
var YT_AJAX_URL       = "https://www.youtube.com/comment_ajax?action_load_comments=1&order_by_time=True&filter=";
var YT_AJAX_REPLY_URL = "https://www.youtube.com/comment_ajax?action_load_replies=1&order_by_time=True&tab=inbox";

/* Constructor */
var CommentAPI = function(videoID, callback) {
	this.videoID = videoID;
	var self = this;

	getSessionToken(videoID, function(error, sessionToken) {
		if(error)
			return callback(error);
		
		self.sessionToken = sessionToken;
		callback();
	});
};

CommentAPI.prototype.getCommentPage = function(pageToken, callback) {
	var params = {};
	params['session_token'] = this.sessionToken;

	if(!pageToken) 
		params['video_id'] = this.videoID; /* get the first comment page */
	else
		params['page_token'] = pageToken; /* get a specific comment page */

	xhrPost(YT_AJAX_URL + this.videoID, params, function(xhr) {
		if(xhr.status != 200) {
			return callback(new Error("Requesting comment page failed. Status " + xhr.status));
		}
		if(!xhr.responseText) {
			return callback(new Error("No comments received from server. Status " + xhr.status));
		}

		var commentsPage = {};
		try {
			var commentPageStr = xhr.responseText.toString().trim();
			commentsPage = JSON.parse(cleanJSON(commentPageStr));
		} catch(e) {
			return callback(new Error("Error parsing Server response: " + e));
		}

		var nextPageToken = commentsPage['page_token'];

		callback(null, commentsPage.html, nextPageToken);
	});
};

CommentAPI.prototype.getCommentReplies = function(commentID, pageToken, callback) {
	if(!commentID) {
		callback(new Error("No comment ID specified. Cannot get replies."));
	}

	params = {};
	params['session_token'] = this.sessionToken;
	params['video_id'] = this.videoID;
	params['comment_id'] = commentID;

	if(pageToken)
		params['page_token'] = pageToken;

	xhrPost(YT_AJAX_REPLY_URL, params, function(xhr){
		if(xhr.status != 200) {
			return callback(new Error("Requesting replies failed. Status " + xhr.status));
		}
		if(!xhr.responseText) {
			return callback(new Error("No replies received from server. Status " + xhr.status));
		}

		var repliesPage;
		try {
			var repliesPageStr = xhr.responseText.toString().trim();
			repliesPage = JSON.parse(cleanJSON(repliesPageStr));
		} catch(e) {
			return callback(new Error("Error parsing Server response: " + e));
		}

		var nextPageToken = repliesPage['page_token'];
		callback(null, repliesPage.html, nextPageToken);
	});
	
}



/******************************************************
 *
 *   Helper Functions 
 *
 ******************************************************/

var cleanJSON = function(str) {
	var re = /(\\[^"\/bfnrtu\\])/;
	var re_g = /(\\[^"\/bfnrtu\\])/g;
	var m;
	
	/* 
	 * Sometimes we get '\U' which should be '\u'. So try to replace any invalid 
	 * escape sequences with their lowercase versions first.
	 */

	while ((m = re.exec(str)) != null) {
		if(!re.test(m[0].toLowerCase()))
			str = str.replace(re, m[0].toLowerCase());
		else
			str = str.replace(re, "");
	}
	return str;
};


var getSessionToken = function(videoID, callback) {
	xhrGet(YT_COMMENTS_URL + videoID, function(xhr){
		if(xhr.status != 200) {
			callback(new Error("Unable to retrieve video page. Status " + xhr.status));
		}
		
		var re = /\'XSRF_TOKEN\'\s*\n*:\s*\n*"(.*)"/;
		var m = re.exec(xhr.responseText.toString());

		if(!m)
			return callback(new Error("Unable to find session token"));

		if(m.length <= 1)
			return callback(new Error("Unable to find session token"));

		if(CookieJar.cookieList.length == 0)
			return callback(new Error("No cookie received"));

		callback(null, m[1]);
	});
};

/* XHR GET requests */
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

/* XHR POST requests */
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

module.exports = CommentAPI;