var spawn = require('child_process').spawn;

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

module.exports.scrape = function(videoID, dataNotify, callback) {
	var buffer = "";
	var casper = spawn("casperjs", ["casperScript.js", videoID]);

	casper.stdout.on('data', function(data) {	
		if(endsWith(data.toString(), "\\\\END//")) {
			buffer += data.toString()
						.substring(0, data.toString().length - "\\\\END//".length + 1);
			
			dataNotify(buffer, function() {
				casper.stdin.write("GO\n");
			});
			buffer = "";
		}
		else if(!endsWith(data.toString(), "\\\\COMMENTS-END//")) {
			buffer += data.toString();
		}
	});

	casper.on('close', function(code, signal) {
		/*if(code !== 0)
			return callback("CasperJS error [" + code + "]: ");*/

		callback(null);
	})
};