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
	}
	this.queryCount = 0;
	this.db = new sqlite3.Database(file);

	this.db.serialize(function() {
		if(!exists) {
			self.db.run("CREATE TABLE comments ("
				+ "id INTEGER PRIMARY KEY, "
				+ "user TEXT, "
				+ "date TEXT, "
				+ "dateYT TEXT, "
				+ "likes INTEGER, "
				+ "replyTo INTEGER, "
				+ "numReplies INTEGER, "
				+ "commentText TEXT)");
			exists = true;
		}
	});

	this.isBusy = function() {
		return (self.queryCount > BUSY_THRESHOLD);
	}

	this.addComment = function(comment) {
		self.db.serialize(function() {
	        var stmt = self.db.prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?)"); 

	        self.queryCount++;
	        
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

				if(--self.queryCount <= BUSY_THRESHOLD) {
					self.emit('notBusy');
				}
				if(self.queryCount <= 0) {
					self.emit('done');
				}
	        });

	        stmt.finalize();
	    });
	};

	this.deleteDuplicates = function(callback) {
		self.db.serialize(function() {
			var stmt = self.db.prepare(
				"DELETE FROM comments WHERE id IN "
					+ "(SELECT id FROM comments d WHERE "
						+ "1 < (SELECT count(*) FROM comments a WHERE "
							+ "a.user = d.user AND a.commentText = d.commentText AND d.id >= a.id))"

				);
			stmt.run();
			stmt.finalize();
		});
	};
}


util.inherits(Database, events.EventEmitter);

module.exports = new Database();