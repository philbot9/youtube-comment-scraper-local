var spawn = require('child_process').spawn;

module.exports = function(videoID, callback) {
	var html = "";
	var casper = spawn("casperjs", ["casperScript.js", videoID]);

	casper.stdout.on('data', function(data) {	
		if(data.toString() != "\\\\END//\n") {
			console.log(data.toString());
			casper.stdin.write("GO\n");
		}
	});

	casper.on('close', function(code, signal) {
		/*if(code !== 0)
			return callback("CasperJS error [" + code + "]: ");*/

		callback(null, html);
	})
};