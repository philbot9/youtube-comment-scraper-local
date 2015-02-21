var url = process.argv[2];

if(url) {
	require("./phantom.js")(url, function(err, commentsHTML) {
		if(err)
			return console.error(err);

		console.log(commentsHTML);
	});
}