var fs = require('fs');
var sqlite3 = require("sqlite3").verbose();

var db;

module.exports = function(filename) {
	var file = "./" + (filename ? filename : "comments.db");

	if(!fs.existsSync(file)) {
		console.log("Creating DB file.");		
		fs.openSync(file, 'w');
	}
	
	db = new sqlite3.Database(file);

	return {
		createCommentsTable: createCommentsTable,
		createRepliesTable: createRepliesTable,
		insertComments: insertComments
	};
}


function createCommentsTable(videoId, overwrite) {
	var name = videoIdToTableName(videoId);

	db.serialize(function() {
		if(overwrite)
			db.run("DROP TABLE IF EXISTS '" + name + "';");

		db.run("CREATE TABLE '" + name + "' ("
			+ "id TEXT, "
			+ "user TEXT, "
			+ "date TEXT, "
			+ "timestamp INTEGER, "
			+ "likes INTEGER, "
			+ "commentText TEXT)");
	});
}

function createRepliesTable(videoId, overwrite) {
	var name = videoIdToTableName(videoId) + "_replies";

	db.serialize(function() {
		if(overwrite)
			db.run("DROP TABLE IF EXISTS '" + name + "';");

		db.run("CREATE TABLE '" + name + "' ("
			+ "id TEXT, "
			+ "commentId TEXT, "
			+ "user TEXT, "
			+ "date TEXT, "
			+ "timestamp INTEGER, "
			+ "likes INTEGER, "
			+ "commentText TEXT, "
			+ "FOREIGN KEY(commentId) REFERENCES '"
					+ videoIdToTableName(videoId) + "'(id))");
	});

	return true;
};

function insertComments(comments, videoId) {
	if(!videoId)
		throw new Error("Missing parameter: need a videoId to insert comments into database");
	
	var table   = videoIdToTableName(videoId);
	var replies = {};
	/* Turns out batch transactions are WAAAAAAAAAAAAY faster! */
	db.serialize(function() {
		db.run("begin transaction");

		var stmt = db.prepare("INSERT INTO '" + table + "' VALUES (?, ?, ?, ?, ?, ?)"); 

		for(var i = 0; i < comments.length; i++) {
			var comment = comments[i];
			stmt.run([
				comment.id,
				comment.user,
				comment.date,
				parseInt(comment.timestamp),
				parseInt(comment.likes),
				comment.commentText
			],
			function(err) {
				if(err)
					throw new Error("Database Error: " + err);
			});

			if(comment.hasReplies)
				replies[comment.id] = comment.replies;
		}
		db.run("commit transaction");

		for(var commentId in replies)
			insertReplies(replies[commentId], videoId, commentId);
	});
}

function insertReplies(replies, videoId, commentId) {
	if(!videoId)
		throw new Error("Missing parameter: need a videoId to insert replies into database");
	if(!commentId)
		throw new Error("Missing parameter: need a commentId to insert replies into database");

	var table = videoIdToTableName(videoId) + "_replies";

	db.serialize(function() {
		db.run("begin transaction");

		var stmt = db.prepare("INSERT INTO '" + table + "' VALUES (?, ?, ?, ?, ?, ?, ?)");

		for(var i = 0; i < replies.length; i++) {
			var reply = replies[i];
			stmt.run([
				reply.id,
				commentId,
				reply.user,
				reply.date,
				parseInt(reply.timestamp),
				parseInt(reply.likes),
				reply.commentText
			],
			function(err) {
				if(err)
					throw new Error("Database Error: " + err);
			});
		}
		db.run("commit transaction");
	});

}

/* get rid of invalid characters in the table name */
function videoIdToTableName(videoId) {
	return videoId.replace(/[-]/g, "_");
}