var fs = require('fs');
var events = require('events');
var util = require('util');
var sqlite3 = require("sqlite3").verbose();

var BUSY_THRESHOLD = 500;

var Database = function() {
	
	events.EventEmitter.call(this);

	var file = "./comments.db";
	var exists = fs.existsSync(file);
	var self = this;

	if(!exists) {
		console.log("Creating DB file.");		
		fs.openSync(file, "w");
		exists = true;
	}
	
	this.queryCount = 0;
	this.db = new sqlite3.Database(file);

	this.isBusy = function() {
		return (self.queryCount > BUSY_THRESHOLD);
	}

	this.createTable = function(videoId, overwrite) {
		var name = vidIdToTableName(videoId);

		self.db.serialize(function() {
			if(overwrite)
				self.db.run("DROP TABLE IF EXISTS '" + name + "';");

			self.db.run("CREATE TABLE '" + name + "' ("
				+ "id INTEGER PRIMARY KEY, "
				+ "user TEXT, "
				+ "date TEXT, "
				+ "dateYT TEXT, "
				+ "likes INTEGER, "
				+ "replyTo INTEGER, "
				+ "numReplies INTEGER, "
				+ "commentText TEXT)");
			exists = true;
		});

		return true;
	}

	this.addComments = function(comments, videoId) {
		var table = vidIdToTableName(videoId);
		
		self.db.serialize(function() {
			self.db.run("begin transaction");

			var stmt = self.db.prepare("INSERT INTO '" + table + "' VALUES (?, ?, ?, ?, ?, ?, ?, ?)"); 
	
			for(var i = 0; i < comments.length; i++) {
				var comment = comments[i];
				stmt.run([
		            parseInt(comment.id),
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

					if(self.queryCount <= BUSY_THRESHOLD) {
						self.emit('notBusy');
					}
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
}

function vidIdToTableName(vidId) {
	return vidId.replace(/[-]/g, "_");
}

util.inherits(Database, events.EventEmitter);

module.exports = new Database();