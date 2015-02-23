var casper = require('casper').create();
var system = require('system');

var videoId = casper.cli.args[0];

if(!videoId) {
	console.error("No Video Id specified.");
	caper.exit(1);
}

var commentsUrl = "https://www.youtube.com/all_comments?v=" + videoId;
var ajaxUrl = "https://www.youtube.com/comment_ajax?action_load_comments=1&order_by_time=True"
		+ "&filter=" + videoId;

casper.start(commentsUrl, function() {
    var self = this;


    var cleanJSON = function(str) {
    	var re = /(\\[^"\/bfnrtu\\])/;
    	var re_g = /(\\[^"\/bfnrtu\\])/g;
    	var m;
    	
    	while ((m = re.exec(str)) != null) {
    		if(!re.test(m[0].toLowerCase()))
    			str = str.replace(re, m[0].toLowerCase());
    		else
    			str = str.replace(re, "");
    	}
    	return str;
    };

    var sendRequest = function(url, params) {
    	var resStr = self.evaluate(function(url, params) {
			return __utils__.sendAJAX(url, "POST", params);
    	}, url, params);

    	try {
    		return JSON.parse(cleanJSON(resStr.trim()));
    	} catch(e) {
    		console.error("Error parsing AJAX response: " + e);
    		return null;
    	}
    };
    
    /* get the session token */
	var sessionToken = self.getElementAttribute('input[name="session_token"]', 'value');
	
	/* Prepare ajax request */
	var ajaxParams = {
		"session_token": sessionToken, 
		"video_id": "5yB3n9fu-rM"
	};

	/* first request */
	var resp = sendRequest(ajaxUrl, ajaxParams);

	if(!resp) {
		return;
	}

	system.stdout.write(resp.html);
	system.stdout.flush();

	system.stdout.write("\\\\END//");		
	system.stdout.flush();


	/* Keep requesting the next comment page as long as there is a page_token.
	 * Once there is none we've reached the last page */
	while(resp.page_token != "") {
		system.stdout.flush();
		system.stdin.flush();

		var input = system.stdin.read(3);
	
		if(input.substring(0, 2) != "GO")
			break;

		ajaxParams = {
			"session_token": sessionToken, 
			"page_token": resp.page_token
		};

		var resp = sendRequest(ajaxUrl, ajaxParams);

		if(!resp) {
			return;
		}

		system.stdout.write(resp.html);
		system.stdout.flush();

		system.stdout.write("\\\\END//");		
		system.stdout.flush();
	}

	system.stdout.flush();
	system.stdin.flush();
	var input = system.stdin.read(3);
		
	self.wait(500, function() {
		system.stdout.write("\\\\COMMENTS-END//");		
		system.stdout.flush();
	});
});

casper.run();

