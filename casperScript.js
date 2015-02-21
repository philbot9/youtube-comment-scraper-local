var casper = require('casper').create();
var url = casper.cli.args[0];

if(!url) {
	casper.echo("No URL specified", "ERROR").exit(1);
}

casper.start(url, function() {
    var self = this;
    var cont = true;

    var expandReplies = function () {
    	self.evaluate(function() {
    		var elements = document.querySelectorAll(".show-more");
			for(var i = 0; i < elements.length; i++) {
          		elements[i].click();
			}
    	});
		
		/* We're done. so output to stdout */
		self.echo(self.getHTML('#yt-comments-list'));
    };

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
    };
	
    this.click("#yt-comments-order-button");
    this.clickLabel("Newest first" , "li");
    
	this.wait(3000, function() {
		loadComments();	
	});
});

casper.run();