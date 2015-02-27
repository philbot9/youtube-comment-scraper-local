var fs = require('fs');
var events = require('events');
var util = require('util');
var sqlite3 = require("sqlite3").verbose();

var Database = function(filename) {
	/* inherit from EventEmitter */
	events.EventEmitter.call(this);


	var file = "./" + (filename ? filename : "comments.db");
	var self = this;

	if(!fs.existsSync(file)) {
		console.log("Creating DB file.");		
		fs.openSync(file, 'w');
	}
	
	this.queryCount = 0;
	this.db = new sqlite3.Database(file);

	this.isBusy = function() {
		return (this.queryCount > 0);
	};

	this.createTable = function(videoId, overwrite) {
		var name = videoIdToTableName(videoId);

		this.db.serialize(function() {
			if(overwrite)
				self.db.run("DROP TABLE IF EXISTS '" + name + "';");

			self.db.run("CREATE TABLE '" + name + "' ("
				+ "id INTEGER PRIMARY KEY, "
				+ "youtubeCommentID TEXT, "
				+ "user TEXT, "
				+ "date TEXT, "
				+ "dateYT TEXT, "
				+ "likes INTEGER, "
				+ "replyTo INTEGER, "
				+ "numReplies INTEGER, "
				+ "commentText TEXT)");
		});

		return true;
	};

	this.addComments = function(comments, videoId) {
		var table = videoIdToTableName(videoId);
		
		/* Turns out batch transactions are WAAAAAAAAAAAAY faster! */
		this.db.serialize(function() {
			self.db.run("begin transaction");

			var stmt = self.db.prepare("INSERT INTO '" + table + "' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"); 

			for(var i = 0; i < comments.length; i++) {
				var comment = comments[i];
				stmt.run([
		            parseInt(comment.id),
		            comment.youtubeCommentID,
		            comment.user,
		            comment.date,
		            comment.dateYT,
		            parseInt(comment.likes),
		            parseInt(comment.replyTo),
		            parseInt(comment.numReplies),
		            comment.commentText],
				function(err) {
					if(err) {
						return console.error("Database Error: " + err);
					}

					self.queryCount--;

					if(self.queryCount <= 0) {
						self.emit('done');
						self.queryCount = 0;
					}
				});
			}
			
			self.queryCount += comments.length;
			self.db.run("commit transaction");
		});
	};
};



/* get rid of invalid characters in the table name */
function videoIdToTableName(videoId) {
	return videoId.replace(/[-]/g, "_");
}

util.inherits(Database, events.EventEmitter);
module.exports = new Database();