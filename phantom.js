var spawn = require('child_process').spawn;

module.exports = function(url, callback) {
	var html = "";
	var casper = spawn("casperjs", ["casperScript.js", url]);

	casper.stdout.on('data', function(data) {
		html += data;
	});

	casper.stderr.on('data', function(data) {
		casper.kill('SIGTERM');
		callback(new Error(stderr));
	});
	
	casper.on('close', function(code, signal) {
		if(code !== 0)
			return callback("CasperJS error [" + err.code + "]: " + err);

		callback(null, html);
	})
};