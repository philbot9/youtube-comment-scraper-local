var casper = require('casper').create();
var url = casper.cli.args[0];
var videoId = casper.cli.args[1];
var commentsFolder = "./comments/";

if(!url) {
	casper.echo("ERROR! NO URL SPECIFIED!").exit(1);
}

casper.start(url, function() {
    this.click("#yt-comments-order-button");
    this.clickLabel("Newest first" , "li");
    
    var self = this;
    var count = 0;
    var cont = true;

    var expandReplies = function () {
    	self.evaluate(function() {
    		var elements = document.querySelectorAll(".show-more");
			for(var i = 0; i < elements.length; i++) {
          		elements[i].click();
			}
    	});
		
		var fs = require('fs');
		var filename = (!videoId) ? "casperOut" : videoId
		fs.write(commentsFolder + filename, self.getHTML('#yt-comments-list'), 'w');	
    }

    var loadComments = function() {
    	if(cont) {
			if(!self.visible('#yt-comments-paginator')) {
				cont = false;
				expandReplies();
			} else {
				self.click('#yt-comments-paginator');
				self.wait(3000, loadComments);
			}
    	}
    }
	
	this.wait(3000, function() {
		loadComments();	
	});
});

casper.run();